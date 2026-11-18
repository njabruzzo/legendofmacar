#!/usr/bin/env python3
import csv, io, urllib.request, collections, json
URLS=[
 "https://www.geipan.fr/sites/default/files/Base_de_donn%C3%A9es_des_cas.csv",
 "https://www.geipan.fr/fr/cnes/export/cas"
]
for u in URLS:
 print("Checking",u,flush=True)
 try:
  req=urllib.request.Request(u,headers={"User-Agent":"AnomalyObservatoryDataResearch/1.0 (+https://github.com/njabruzzo/legendofmacar)","Accept":"text/csv,*/*"})
  with urllib.request.urlopen(req,timeout=35) as resp:
   raw=resp.read(20000000)
   print("HTTP",resp.status,"Bytes",len(raw),"Type",resp.headers.get("content-type"),flush=True)
  for encoding in ["utf-8-sig","cp1252","latin1"]:
   try: decoded=raw.decode(encoding);break
   except UnicodeDecodeError:continue
  print("First 200 characters",repr(decoded[:200]),flush=True)
  if decoded.lstrip().startswith("<"):continue
  dialect=csv.Sniffer().sniff(decoded[:15000],delimiters=";,\t|")
  reader=csv.DictReader(io.StringIO(decoded),dialect=dialect)
  print("Delimiter",repr(dialect.delimiter),"Columns",reader.fieldnames,flush=True)
  for _,row in zip(range(2),reader):
   print("Sample row",json.dumps(row,ensure_ascii=False,default=str)[:1800],flush=True)
  print("SUCCESS",flush=True)
 except Exception as e:print("FAILED",repr(e),flush=True)
