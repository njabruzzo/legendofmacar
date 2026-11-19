#!/usr/bin/env python3
"""Daily event feed for The Anomaly Observatory.

Open, documented primary sources only. Civilian UAP case databases are deliberately
not harvested without written permission. All records retain stable source IDs;
missing feeds do not silently erase existing observations.

Refresh is a *source check*, not a claim that all events have occurred today.
Python 3 standard library only; suitable for GitHub Actions.
"""
from __future__ import annotations
import datetime as dt
import json
import pathlib
import sys
import urllib.parse
import urllib.request
import email.utils
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT / 'events_live.json'
TODAY = dt.datetime.now(dt.timezone.utc)
TODAY_ISO = TODAY.isoformat(timespec='seconds')
START = (TODAY - dt.timedelta(days=120)).date().isoformat()
EONET = 'https://eonet.gsfc.nasa.gov/api/v3/events'
CLOUDFLARE_STATUS = 'https://www.cloudflarestatus.com/api/v2/incidents.json'
PROVIDER_STATUS = {
    'github-status': ('GitHub', 'https://www.githubstatus.com/api/v2/incidents.json', 'https://www.githubstatus.com/incidents/'),
    'anthropic-status': ('Anthropic', 'https://status.claude.com/api/v2/incidents.json', 'https://status.claude.com/incidents/'),
    'openai-status': ('OpenAI', 'https://status.openai.com/api/v2/incidents.json', 'https://status.openai.com/incidents/'),
    'vercel-status': ('Vercel', 'https://www.vercel-status.com/api/v2/incidents.json', 'https://www.vercel-status.com/incidents/'),
    'npm-status': ('npm', 'https://status.npmjs.org/api/v2/incidents.json', 'https://status.npmjs.org/incidents/'),
}
CISA_RSS = 'https://www.cisa.gov/cybersecurity-advisories/all.xml'
USGS = 'https://earthquake.usgs.gov/fdsnws/event/1/query?' + urllib.parse.urlencode({
    'format':'geojson', 'starttime':START, 'endtime':(TODAY+dt.timedelta(days=1)).date().isoformat(),
    'minmagnitude':'5.5', 'orderby':'time', 'limit':'2500'
})


def get_body(url, *, max_bytes=15000000):
    req = urllib.request.Request(url, headers={'User-Agent':'AnomalyObservatory/1.0 (source-linked research dashboard; https://www.legendofmacar.com/anomaly-atlas/)', 'Accept':'application/json'})
    with urllib.request.urlopen(req, timeout=35) as r:
        data=r.read(max_bytes+1)
    if len(data)>max_bytes:raise ValueError('Source exceeded maximum response size; not counted as complete')
    return data

def get_json(url, *, max_bytes=15000000):
    return json.loads(get_body(url,max_bytes=max_bytes).decode('utf-8'))


def iso_day(value):
    if not value:return None
    if isinstance(value,int) or isinstance(value,float):
        try:return dt.datetime.fromtimestamp(value/1000,dt.timezone.utc).date().isoformat()
        except Exception:return None
    return str(value)[:10] if str(value)[:4].isdigit() else None



def eonet_paged_events():
    """Split date windows when NASA EONET's response reaches its hard item cap.

    Counting a capped response as a census would silently undercount natural events.
    Date-window queries use documented start/end parameters; stable EONET IDs are
    merged across windows. Failed slices invalidate the source check instead of
    returning an apparently complete subset.
    """
    start = TODAY.date() - dt.timedelta(days=120)
    end = TODAY.date()
    counts = {"requests": 0, "splits": 0}
    unique = {}

    def visit(day_start, day_end, depth=0):
        url = EONET + '?' + urllib.parse.urlencode({
            "status": "all", "start": day_start.isoformat(),
            "end": day_end.isoformat(), "limit": "2500"
        })
        payload = get_json(url)
        events = payload.get("events")
        counts["requests"] += 1
        if not isinstance(events, list):
            raise ValueError("EONET events not returned for " + day_start.isoformat())
        if len(events) >= 2500:
            if day_start >= day_end or depth >= 12:
                raise ValueError("NASA EONET response remains capped on " + day_start.isoformat())
            middle = day_start + dt.timedelta(days=(day_end-day_start).days//2)
            counts["splits"] += 1
            visit(day_start, middle, depth+1)
            visit(middle+dt.timedelta(days=1), day_end, depth+1)
            return
        for record in eonet_events(payload):
            rid = record["id"]
            earlier = unique.get(rid)
            if earlier is None or record["date"] < earlier["date"]:
                unique[rid] = record

    visit(start, end)
    return list(unique.values()), counts


def cloudflare_status_events(payload, provider='Cloudflare', prefix='https://www.cloudflarestatus.com/incidents/'):
    """Cloudflare service-status incidents; NOT global outages or cyberattacks."""
    raw = payload.get("incidents")
    if not isinstance(raw, list):
        raise ValueError("Cloudflare official status incident array unavailable")
    rows = []
    for item in raw:
        sid = str(item.get("id") or "").strip()
        name = str(item.get("name") or "").strip()
        when = iso_day(item.get("started_at") or item.get("created_at"))
        if not sid or not name or not when or when > TODAY.date().isoformat():
            continue
        if item.get("status") in ("scheduled", "in_progress") and item.get("scheduled_for"):
            continue
        rows.append({
            "id": ("cloudflare-status-" if provider=="Cloudflare" else "status-" + provider.lower().replace(" ", "-") + "-") + sid,
            "date": when,
            "title": provider + " service incident: " + name[:175],
            "domain": "cyber", "lane": "outage",
            "kind": "provider-service-incident",
            "source": provider + " Status",
            "sourceUrl": (item.get("shortlink") if str(item.get("shortlink") or "").startswith("https://") else prefix + urllib.parse.quote(sid)),
            "magnitude": None, "magnitudeUnit": "",
            "sourceStatus": str(item.get("status") or "unknown"),
            "impact": str(item.get("impact") or "unknown"),
            "coverage": provider + " official status-page incident. API lists at most 50 recent incidents; not global outage counts and not proof of attack",
        })
    return rows

def eonet_events(payload):
    items=payload.get('events')
    if not isinstance(items,list):raise ValueError('EONET events missing')
    if len(items)>=2500: raise ValueError('EONET at limit: incomplete sampling; refusing to publish as a census')
    out=[]
    for e in items:
        eid=str(e.get('id','')).strip()
        if not eid:continue
        cats=[x.get('id','') for x in e.get('categories',[]) if isinstance(x,dict)]
        cat=str(cats[0] if cats else 'other')
        if cat in ('earthquakes', 'manmade'):continue  # USGS is earthquake catalog authority
        geo=e.get('geometry') or []
        dates=[iso_day(g.get('date')) for g in geo if isinstance(g,dict)]
        dates=[x for x in dates if x]
        date=min(dates) if dates else iso_day(e.get('date'))
        if not date:continue
        if date > TODAY.date().isoformat():continue
        source_refs=[x.get('url') for x in e.get('sources',[]) if isinstance(x,dict) and isinstance(x.get('url'),str) and x.get('url','').startswith('https://')]
        link=e.get('link') or f'https://eonet.gsfc.nasa.gov/api/v3/events/{urllib.parse.quote(eid)}'
        if not isinstance(link,str) or not link.startswith('https://'):link='https://eonet.gsfc.nasa.gov/'
        out.append({
            'id':'nasa-eonet-'+eid,'date':date,'title':str(e.get('title') or 'Natural event')[:210],
            'domain':'natural','lane':cat,'kind':'observed-event','source':'NASA EONET',
            'sourceUrl':link,'backingUrl':source_refs[0] if source_refs else None,
            'magnitude':e.get('magnitudeValue') if isinstance(e.get('magnitudeValue'),(int,float)) else None,
            'magnitudeUnit':str(e.get('magnitudeUnit') or '')[:25],
            'sourceStatus':'open' if e.get('closed') is None else 'closed',
            'coverage':'NASA curated natural-event metadata; not a global incident census',
        })
    return out


def usgs_events(payload):
    feats=payload.get('features')
    if not isinstance(feats,list):raise ValueError('USGS features missing')
    if len(feats)>=2500:raise ValueError('USGS query reached result cap: incomplete sample')
    out=[]
    for feat in feats:
        props=feat.get('properties') or {}
        event_id=str(feat.get('id','')).strip()
        day=iso_day(props.get('time'))
        mag=props.get('mag')
        if not event_id or not day or not isinstance(mag,(int,float)):continue
        if mag<5.5:continue
        link=props.get('url') or 'https://earthquake.usgs.gov/earthquakes/map/'
        if not str(link).startswith('https://'):link='https://earthquake.usgs.gov/earthquakes/map/'
        out.append({
            'id':'usgs-'+event_id,'date':day,'title':str(props.get('title') or f'M {mag:.1f} earthquake')[:210],
            'domain':'natural','lane':'earthquakes','kind':'measured-earthquake','source':'USGS',
            'sourceUrl':link,'magnitude':round(mag,2),'magnitudeUnit':'Mw (magnitude)',
            'sourceStatus':'observed','coverage':'USGS global catalog, earthquakes magnitude ≥5.5; possible revisions',
        })
    return out


def cisa_advisory_events(data):
    # Official CISA RSS. Publication is an advisory event, not necessarily an attack.
    root=ET.fromstring(data)
    items=root.findall('.//item')
    if not items: raise ValueError('CISA official RSS has no items')
    out=[]
    for item in items:
        title=(item.findtext('title') or '').strip()
        link=(item.findtext('link') or '').strip()
        raw_day=(item.findtext('pubDate') or '').strip()
        try: date=email.utils.parsedate_to_datetime(raw_day).date().isoformat()
        except (TypeError, ValueError):continue
        if not title or not link.startswith('https://www.cisa.gov/'):continue
        if date<START:continue
        out.append({
           'id':'cisa-advisory-'+str(__import__('hashlib').sha256(link.encode()).hexdigest()[:18]),
           'date':date,'title':title[:210],
           'domain':'cyber','lane':'advisory','kind':'government-advisory',
           'source':'CISA advisories','sourceUrl':link,
           'magnitude':None,'magnitudeUnit':'',
           'coverage':'Published government advisory; not a confirmed attack count',
        })
    return out

def main():
    old={}
    if OUT.exists():
        try:old=json.loads(OUT.read_text('utf-8'))
        except Exception:old={}
    last_status=old.get('sources') or {}
    existing={x.get('id'):x for x in old.get('events',[]) if isinstance(x,dict) and x.get('id')}
    errors={}
    jobs=[
        ('nasa-eonet', EONET, None),
        ('usgs', USGS, usgs_events),
        ('cisa-advisories', CISA_RSS, cisa_advisory_events),
        ('cloudflare-status', CLOUDFLARE_STATUS, cloudflare_status_events)
    ]
    for sid,(provider,endpoint,prefix) in PROVIDER_STATUS.items():
        jobs.append((sid, endpoint, lambda payload, provider=provider, prefix=prefix: cloudflare_status_events(payload, provider, prefix)))
    for sid,url,fn in jobs:
        try:
            paging = {}
            if sid == 'nasa-eonet':
                records,paging = eonet_paged_events()
            else:
                records = fn(get_body(url) if sid=='cisa-advisories' else get_json(url))
            for x in records: existing[x['id']]=x
            caveats = {
                'nasa-eonet':'NASA curated event metadata. All 120-day date windows retrieved without hitting result caps; still NOT a global disaster census.',
                'usgs':'USGS global M5.5+ earthquakes; not the number of damaging disasters.',
                'cisa-advisories':'Government advisories by publication date; not a confirmed attack census.',
                'cloudflare-status':'Cloudflare service-status incidents only. Excludes other providers, and no malicious cause is assumed.',
                **{key: info[0]+' official status incidents; latest 50 only, not all world disruptions.' for key,info in PROVIDER_STATUS.items()}
            }
            last_status[sid]={
                'status':'ok','checkedAt':TODAY_ISO,'lastSuccessAt':TODAY_ISO,
                'feedWindowStart':START,'recordsInLatestQuery':len(records),
                'sourceUrl':url,'caveat':caveats[sid], **paging
            }
            print(sid+': '+str(len(records))+' records',flush=True)
        except Exception as e:
            errors[sid]=str(e)[:240]
            prior=last_status.get(sid,{})
            last_status[sid]={**prior,'status':'error','checkedAt':TODAY_ISO,
                'error':str(e)[:200], 'sourceUrl':url}
            print(sid+' ERROR: '+str(e),file=sys.stderr,flush=True)
    # Dedup across refreshes, retain stable historic records up to 2022-11.
    all_events=sorted((x for x in existing.values() if x.get('date','')>='2022-11-01'),key=lambda e:(e['date'],e['id']))
    # Prevent sudden unbounded growth; high thresholds fail instead of pretending completeness.
    if len(all_events)>25000:raise RuntimeError('Archive exceeds safe size; review ingestion strategy')
    result={
        'schema':1,'checkedAt':TODAY_ISO,'lastSuccessfulRefreshAt':(TODAY_ISO if not errors else old.get('lastSuccessfulRefreshAt')),
        'sourceWindowDays':120,'scope':'NASA EONET curated natural events (date-paged), USGS M5.5+ earthquakes, CISA published advisories, and platform provider-status incidents, each from their own documented feed where available; NOT all disasters or cyberattacks',
        'partial':bool(errors),'sources':last_status,'events':all_events,
    }
    tmp=OUT.with_suffix('.tmp');tmp.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n','utf-8');tmp.replace(OUT)
    print('WROTE '+str(OUT)+' events='+str(len(all_events))+' partial='+str(bool(errors)))
    # Signal nonfatal partial refresh in source status; keep daily data job running.
    return 0

if __name__=='__main__':raise SystemExit(main())