#!/usr/bin/env python3
"""Build primary-source observatory time series. Python 3 standard library only.

All time series use *complete UTC calendar months* from Nov 2022. Categories
measure different things, and are intentionally never blended into a global
'anomaly pressure' index.
"""
from __future__ import annotations
import csv
import datetime as dt
import io
import json
import pathlib
import statistics
import sys
import time
import urllib.parse
import urllib.request
from collections import Counter

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "signals.json"
START = dt.date(2022, 11, 1)
UTC = dt.timezone.utc
USER_AGENT = "The Anomaly Observatory/4.0 (open-data public research project)"


def months_to(last_complete_month: dt.date):
    m=START
    while m <= last_complete_month:
        yield m.strftime('%Y-%m')
        m=dt.date(m.year+1,1,1) if m.month==12 else dt.date(m.year,m.month+1,1)


def read_url(url: str) -> bytes:
    err=None
    for attempt in range(3):
        try:
            req=urllib.request.Request(url, headers={'User-Agent':USER_AGENT, 'Accept':'application/json,text/csv,*/*'})
            with urllib.request.urlopen(req,timeout=45) as r:
                data=r.read(15000000)
                if not data: raise ValueError('empty response')
                return data
        except Exception as e:
            err=e
            time.sleep(min(4,2**attempt))
    raise RuntimeError(str(err))


def month_counts_from_date_list(dates, months):
    c=Counter(v[:7] for v in dates if isinstance(v,str) and len(v)>=7)
    return [{'month':m,'value':c.get(m,0)} for m in months]


def get_cisa(months):
    url='https://raw.githubusercontent.com/cisagov/kev-data/develop/known_exploited_vulnerabilities.json'
    obj=json.loads(read_url(url).decode('utf-8'))
    rows=obj.get('vulnerabilities',[])
    if not isinstance(rows,list) or len(rows)<500: raise ValueError('CISA catalog unexpectedly small')
    return month_counts_from_date_list([x.get('dateAdded') for x in rows],months), obj.get('catalogVersion')


def get_usgs(months, first_day_this_month):
    qs=urllib.parse.urlencode({'format':'csv','starttime':'2022-11-01','endtime':first_day_this_month.isoformat(),'minmagnitude':'5','orderby':'time-asc','limit':'20000'})
    url='https://earthquake.usgs.gov/fdsnws/event/1/query?'+qs
    txt=read_url(url).decode('utf-8-sig')
    reader=csv.DictReader(io.StringIO(txt))
    dates=[]
    for row in reader:
        date=row.get('time','')[:10]
        if date: dates.append(date)
    if len(dates)<1000: raise ValueError('USGS response too short for four years of global M5+ events')
    if len(dates)>=20000: raise ValueError('USGS API hit query result limit')
    return month_counts_from_date_list(dates,months),f'{len(dates)} catalog entries checked'


def get_vix(months):
    url='https://fred.stlouisfed.org/graph/fredgraph.csv?id=VIXCLS'
    txt=read_url(url).decode('utf-8-sig')
    reader=csv.DictReader(io.StringIO(txt))
    grouped={}
    for row in reader:
        m=(row.get('DATE') or row.get('observation_date') or '')[:7]
        v=row.get('VIXCLS','')
        if m not in months or not v or v=='.': continue
        try: grouped.setdefault(m,[]).append(float(v))
        except (ValueError,TypeError): pass
    series=[{'month':m,'value':round(statistics.mean(grouped[m]),2) if grouped.get(m) else None} for m in months]
    if sum(v['value'] is not None for v in series)<25: raise ValueError('FRED series unexpectedly sparse')
    return series,'Daily close aggregated to calendar-month average'


def indicator(key,title,unit,source,definition,interpretation,mode,rows,now,note):
    # Compare matched calendar months year over year, using only complete months.
    vals=[x['value'] for x in rows]
    window=6
    latest=vals[-window:]
    prior=vals[-(12+window):-12]
    if len(prior)<window or any(x is None for x in (latest+prior)):
        change=None;current=None;previous=None;direction='insufficient data'
    else:
        current=statistics.mean(latest);previous=statistics.mean(prior)
        change=((current/previous)-1)*100 if previous>0 else None
        direction='higher' if change is not None and change>15 else ('lower' if change is not None and change<-15 else 'similar')
    return {
        'id':key,'title':title,'unit':unit,'source':source,'definition':definition,'interpretation':interpretation,
        'mode':mode,'series':rows,'period_months':window,'latest_month':rows[-1]['month'],
        'latest_avg':round(current,2) if current is not None else None,
        'previous_avg':round(previous,2) if previous is not None else None,
        'change_pct':round(change,1) if change is not None else None,
        'direction':direction,'source_note':note,'last_success':now,
    }


def main():
    now=dt.datetime.now(UTC)
    first=dt.date(now.year,now.month,1)
    last=dt.date(first.year-1,12,1) if first.month==1 else dt.date(first.year,first.month-1,1)
    months=list(months_to(last)); nowstr=now.replace(microsecond=0).isoformat()
    if len(months)<24: raise RuntimeError('Not enough complete months')
    previous={}
    if OUT.exists():
        try: previous={x['id']:x for x in json.loads(OUT.read_text()).get('indicators',[])}
        except Exception: pass
    sources=[
        ('cisa','CISA exploited-vulnerability catalog additions','new entries / month','https://github.com/cisagov/kev-data',
         'Entries added to the US government catalog by publication date.',
         'Reflects discovery and catalog policy; not the number of cyberattacks.', 'count',lambda:get_cisa(months)),
        ('usgs','Global magnitude 5+ earthquakes','events / month','https://earthquake.usgs.gov/fdsnws/event/1/',
         'USGS catalog events worldwide, minimum magnitude 5.0, by event time.',
         'Physical events, but catalog completeness and revisions may change counts.', 'count',lambda:get_usgs(months,first)),
        ('vix','Market-implied volatility (VIX)','monthly average index','https://fred.stlouisfed.org/series/VIXCLS',
         'CBOE VIX daily close, aggregated to full calendar-month averages by FRED.',
         'Measures expected stock-market volatility, not all economic instability.', 'level',lambda:get_vix(months)),
    ]
    out=[];errors={}
    for key,title,unit,source,definition,interpretation,mode,fetch in sources:
        try:
            rows,note=fetch()
            obj=indicator(key,title,unit,source,definition,interpretation,mode,rows,nowstr,note)
            out.append(obj)
            print(f'{key}: {len(rows)} months; last={rows[-1]["value"]}; trend={obj["direction"]}',file=sys.stderr)
        except Exception as e:
            msg=str(e)[:250]
            print(f'{key}: FETCH FAILED {msg}',file=sys.stderr)
            errors[key]=msg
            if key in previous:
                p=previous[key]
                p['stale']=True
                out.append(p)
    payload={
      'schema':1,'built_at':nowstr,'last_complete_month':months[-1],
      'all_current':len(out)==3 and not errors,
      'coverage':len(out),'errors':errors,'indicators':out,
      'cautions':[ 'No single statistical measure exists for all unusual events.',
        'A rise in catalog entries, earthquakes or market volatility does not establish a common cause.',
        'These three indicators are a limited sentinel sample, not a census of geopolitics, infrastructure outages, UAP, health or culture.',
        'Event ledger entries are hand-curated, not produced by this automatic pipeline.' ]
    }
    OUT.write_text(json.dumps(payload,indent=2,ensure_ascii=False)+'\n')
    print(f'WROTE {OUT} complete={payload["all_current"]}',file=sys.stderr)
    if not out: raise RuntimeError('All feeds unavailable and no usable cache')

if __name__=='__main__': main()