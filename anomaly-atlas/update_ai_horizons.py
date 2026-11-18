#!/usr/bin/env python3
"""Build one independently sourced AI capability series for Anomaly Observatory.

Uses METR Time Horizon 1.1 public benchmark; metric units are minutes of
estimated human task time at 50% agent success. It is NOT the agent runtime,
nor capability on all human jobs. Snapshot may be static; checks report
source freshness separately. METR data / plot CC BY 4.0; attributed in UI.
"""
from __future__ import annotations
import datetime as dt
import json
from pathlib import Path
import re
import urllib.request

DEST=Path(__file__).resolve().parent/'ai_horizons.json'
SOURCE='https://metr.org/assets/benchmark_results_1_1.yaml'
BACKUP='https://raw.githubusercontent.com/IAPS-AI/METR-Time-Horizons/main/benchmark_results_1_1.yaml'
UA='AnomalyObservatory/1.1 (source-only; https://www.legendofmacar.com/anomaly-atlas/)'


def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':UA,'Accept':'text/plain, application/x-yaml'}),timeout=25) as f:
        return f.read(250000).decode('utf-8')


def parse_metr_yaml(text):
    if 'benchmark_name: METR-Horizon-v1.1' not in text or '\nresults:\n' not in text:
        raise ValueError('METR source schema has changed')
    m=re.search(r'from_2023_on:\s*\n(?:\s+.*\n)*?\s+point_estimate:\s*([\d.]+)',text)
    doubling=float(m.group(1)) if m else None
    models=[]
    for match in re.finditer(r'(?ms)^  ([a-zA-Z0-9_.-]+):\n(.*?)(?=^  [a-zA-Z0-9_.-]+:\n|\Z)',text.split('\nresults:\n',1)[1]):
        name,block=match.group(1),match.group(2)
        date=re.search(r'^    release_date:\s*(\d{4}-\d\d-\d\d)',block,re.M)
        met=re.search(r'(?ms)^      p50_horizon_length:\s*\n((?:^        .+\n)+)',block)
        if not date or not met:continue
        estimate=re.search(r'^        estimate:\s*([\d.]+)',met.group(1),re.M)
        if not estimate: continue
        value=float(estimate.group(1))
        if not 0<value<100000:continue
        if not '2022-11-01'<=date.group(1)<=dt.date.today().isoformat():continue
        sota=re.search(r'^      is_sota:\s*(true|false)',block,re.M)
        models.append({'model':name.replace('_inspect','').replace('_',' '),'date':date.group(1), 'minutes':round(value,3),'sota_at_evaluation':bool(sota and sota.group(1)=='true'),'reliable_range':value<=960})
    models.sort(key=lambda x:(x['date'],x['model']))
    if len(models)<12:raise ValueError('Not enough benchmark rows; source format may have changed')
    return {'from_2023_doubling_days':round(doubling,1) if doubling else None,'models':models,'model_count':len(models)}


def main():
    now=dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')
    old={}
    if DEST.exists():
        try:old=json.loads(DEST.read_text())
        except Exception:pass
    d={'schema':1,'checked_at':now,'status':'stale','last_success_at':old.get('last_success_at'),'data_as_of':old.get('data_as_of'), 'source':'https://metr.org/time-horizons/','raw_source':SOURCE,'license':'METR dataset/plot CC BY 4.0; attributed to METR','note':'Benchmarked 50% software-task completion horizon in minutes of expert task time; measurements above 16 hours are not reliable. METR announced September 2026 that its page is no longer actively updated.','from_2023_doubling_days':old.get('from_2023_doubling_days'),'models':old.get('models',[])}
    error=''
    for url in [SOURCE,BACKUP]:
        try:
            info=parse_metr_yaml(fetch(url))
            d.update(info)
            d['status']='ok' if url==SOURCE else 'mirror_ok'
            d['last_success_at']=now
            d['data_as_of']='2026-09-08' # official site says no longer maintained since this date
            d['raw_source']=url
            d.pop('error',None)
            break
        except Exception as e:error=f'{type(e).__name__}: {e}'
    else:d['error']=error[:170]
    DEST.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
    print(f"METR horizons: {len(d['models'])} models, status {d['status']}, doubling {d['from_2023_doubling_days']} d")

if __name__=='__main__':main()