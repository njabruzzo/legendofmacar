(()=>{'use strict';
const BASE_DATE='2022-11-01',MS_DAY=86400000,NS='http://www.w3.org/2000/svg';
const TAB_SPEC={
 uap:{lanes:[['observation','Sighting / airspace'],['official','Official reports'],['hearing','Oversight / hearings'],['release','Records releases'],['editorial','Civilian reporting'],['paranormal','Paranormal claims']],name:'UAP / Paranormal'},
 cyber:{lanes:[['attack','Cyberattacks / breaches'],['outage','System disruptions'],['kev','Exploited vulnerabilities'],['advisory','Official threat advisories'],['ai-release','AI model releases'],['ai-benchmark','AI benchmark results']],name:'Cyber + AI'},
 natural:{lanes:[['earthquakes','Earthquakes (M≥5.5)'],['severeStorms','Severe storms'],['wildfires','Wildfires'],['floods','Floods'],['volcanoes','Volcanic activity'],['other','Other hazards']],name:'Natural disasters'}
};
const COLORS={observation:'#b66736',official:'#2d7690',hearing:'#8c68a0',release:'#a28a36',editorial:'#a16a75',paranormal:'#677e82',attack:'#c65043',outage:'#4a789e',kev:'#138c75',advisory:'#b9a063','ai-release':'#875fad','ai-benchmark':'#644b93',earthquakes:'#b46f3b',severeStorms:'#486eab',wildfires:'#c85b40',floods:'#438eac',volcanoes:'#8967a4',other:'#7c9270'};
const SOURCES={
 uap:[
  {"name":"Associated Press (AP News)","tag":"Professional reporting · public links checked daily","url":"https://apnews.com/","description":"Independent reporting and corroboration; GDELT finds article headlines and links only. AP's official Media API requires licensed access. Multiple articles about one incident are NOT separate events."},
  {name:'AARO (U.S. DoD)',tag:'Official · periodic reports',url:'https://www.aaro.mil/',description:'Government case evaluations and published records. Reporting dates and sighting dates differ; a reporting increase is not proof of unusual physical activity.'},
  {name:'NASA UAP',tag:'Primary research · published reports',url:'https://science.nasa.gov/uap/',description:'Research methods, data-quality guidance and official study. No daily worldwide sightings feed.'},
  {name:'National Archives / UAP',tag:'Official · document releases',url:'https://www.archives.gov/research/topics/uaps',description:'Government records, historical disclosures and archives. Document release dates are not event incidence.'},
  {name:'MUFON',tag:'Public editorial feed · daily check',url:'https://mufon.com/',description:'Links to public newsroom posts only. Redistribution of member-only sighting database requires permission; media posts are not verified sightings.'},
  {name:'NUFORC',tag:'Public catalog · link only',url:'https://nuforc.org/databank/',description:'Independent civilian reports, whose individual records and datasets cannot be republished without separate permission under its 2026 terms.'},
  {"name":"GEIPAN / CNES (France)","tag":"Government investigations · structured export; connection pending","url":"https://www.geipan.fr/en/actualites/mise-a-jour-csv","description":"Public case/observation data with GEIPAN classification, identity and case history. Strong foundation for verified case-level deduplication; direct export could not yet be downloaded by our refresh job."},
  {"name":"CUFOS UFOCAT-2023","tag":"Historical database · licensing/permission required","url":"https://cufos.org/cufos-publications-databases/ufocat/","description":"300,000+ entries including 192,000+ primary reports; explicitly contains duplicates. Historical cross-reference and provenance, not a daily feed."},
  {"name":"The Black Vault","tag":"FOIA archive · discovery/corroboration","url":"https://www.theblackvault.com/documentarchive/ufo-files-search-engine/","description":"Searchable government records, OCR, videos and source metadata. Link multiple released documents back to the underlying case; disclosure date is not observation date."},
  {"name":"Jacques Vallée research","tag":"Expert archive · contextual research","url":"https://www.jacquesvallee.net/research/","description":"Historical studies, classification and reliability methodology. No verified public daily case-level API."},
  {"name":"Richard Dolan research","tag":"Researcher analysis · secondary contextual source","url":"https://richarddolanmembers.com/","description":"Analysis and long-maintained private research records; treat essays and allegations as source documents, not independent new sightings."},
  {"name":"Enigma Labs","tag":"Civilian reporting · license/API access to assess","url":"https://enigmalabs.io/about","description":"Structured crowdsourced reports, photos and witness information. Seek written data-access permission; publishing the same event through multiple apps must not create multiple incidents."},
  {"name":"AARO case resolution reports","tag":"Government case outcomes · periodic","url":"https://www.aaro.mil/UAP-Cases/UAP-Case-Resolution-Reports/","description":"Official case resolution and reevaluation, tracked by case reference rather than publication date. Unresolved is not the same as verified nonhuman."},
  {"name":"International Meteor Organization / AMS","tag":"Independent cross-check · meteor and fireball events","url":"https://www.imo.net/fireball-program/","description":"Cross-check apparent aerial anomalies against fireball reports, bright meteors and camera observations. Fireball records may contain multiple witness submissions per event."},
  {"name":"GDELT global news coverage","tag":"News discovery · not sighting incidence","url":"https://www.gdeltproject.org/","description":"Search for local media corroboration of a previously reported event; news volume is a separate media-attention metric, not number of sightings."},
  {"name":"UFOSINT dedup research","tag":"Research implementation · provenance and rights audit pending","url":"https://github.com/UFOSINT/ufo-dedup","description":"Explore candidate matching and cross-catalogue duplicates as methodology. Do not copy combined source databases unless upstream redistribution rights are confirmed."}
 ],
 cyber:[
  {name:'Cloudflare Status incidents',tag:'Official provider outage API · daily',url:'https://www.cloudflarestatus.com/api',description:'Provider-confirmed operational incidents from Cloudflare’s own status service. Only Cloudflare; these are not necessarily malicious attacks and are not global disruption totals.'},
  {name:'IODA Internet Outage Detection and Analysis',tag:'Georgia Tech measured network outages · integration pending',url:'https://ioda.inetintel.cc.gatech.edu/',description:'Measured country, network and regional connectivity drops. API and redistribution terms need validation before ingesting and counting.'},
  {"name":"Associated Press (AP News)","tag":"Professional reporting · public links checked daily","url":"https://apnews.com/","description":"Independent reporting and corroboration; GDELT finds article headlines and links only. AP's official Media API requires licensed access. Multiple articles about one incident are NOT separate events."},
  {name:'CISA KEV',tag:'Official JSON · daily',url:'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',description:'Government catalog of vulnerabilities with evidence of active exploitation. Count of new catalog entries, not attacks or victims.'},
  {name:'CISA cybersecurity advisories',tag:'Government advisories · official',url:'https://www.cisa.gov/news-events/cybersecurity-advisories',description:'Threat advisories and incident guidance; not a comprehensive day-by-day attack log.'},
  {name:'METR time horizons',tag:'Scientific benchmark · historical',url:'https://metr.org/time-horizons/',description:'Benchmark measures model ability to perform longer software tasks. The public benchmark snapshot is historical, not a daily model evaluation feed.'},
  {name:'FBI Internet Crime Reports',tag:'Official annual historical baseline',url:'https://www.ic3.gov/AnnualReport',description:'Annual reported cybercrime losses and reporting trends with lag and reporting biases.'},
  {name:'Cloudflare Radar',tag:'Internet disruptions · contextual',url:'https://radar.cloudflare.com/outage-center',description:'Internet connectivity interruptions and documented network events; not proof of cyberattacks. API integration requires separate validation.'},
  {"name":"FBI IC3 Internet Crime Reports","tag":"Federal complaint totals · annual","url":"https://www.ic3.gov/AnnualReport","description":"Official yearly complaint and reported-loss trends. A complaint is not automatically a verified hack; no daily case-level public feed."},
  {"name":"SEC EDGAR · material cyber incidents","tag":"Issuer disclosures · searchable filings","url":"https://www.sec.gov/search-filings","description":"Public-company material incident disclosures (Form 8-K Item 1.05) and amendments. Classify by actual incident date and issuer; subsequent filings are not new attacks."},
  {"name":"HHS OCR Breach Portal","tag":"Regulatory disclosure · reportable health breaches","url":"https://ocrportal.hhs.gov/ocr/breach/breach_report_hip.jsf","description":"Public U.S. health breach notifications involving 500 or more affected individuals. A report date may follow the attack by months; merge with other reporting for the same victim."},
  {"name":"VERIS Community Database (VCDB)","tag":"Open structured incident research · historical","url":"https://verisframework.org/vcdb.html","description":"Open public breach records coded with VERIS and linked to original reporting. Useful for historical attacker-action and victim-sector analysis; not a complete global census."},
  {"name":"FBI / Department of Justice cyber enforcement","tag":"Verified government investigations · publication feed","url":"https://www.justice.gov/criminal/computer-crime-and-intellectual-property-section-ccips-news","description":"Indictments, convictions, botnet disruptions and evidence statements. Law enforcement announcements may refer to older intrusions; never count announcement day as a fresh attack."},
  {"name":"UK NCSC threat reporting","tag":"National cyber authority · annual/periodic","url":"https://www.ncsc.gov.uk/section/keep-up-to-date/threat-reports","description":"UK national-level analyses and incident severity. Categories, coverage and collection processes change, so raw year-over-year totals need normalization."},
  {"name":"Cloudflare Radar outages","tag":"Measured disruptions · API access to validate","url":"https://developers.cloudflare.com/radar/investigate/outages/","description":"Internet connectivity disruptions and timing; distinguish route failures, power cuts, outages and confirmed malicious activity."},
  {"name":"Have I Been Pwned breach metadata","tag":"Public breach metadata · API/license review","url":"https://haveibeenpwned.com/API/V3","description":"Breach names and metadata for cross-source identification, subject to API credentials and license terms. Do not ingest personal affected-account data."},
  {"name":"The Record / Recorded Future News","tag":"Specialist reporting · corroboration","url":"https://therecord.media/","description":"Cyber incident journalism with victim, date and scope context; count only underlying incidents, not articles."},
  {"name":"BleepingComputer","tag":"Specialist reporting · corroboration","url":"https://www.bleepingcomputer.com/","description":"Investigative reporting, victim statements and technical updates; multiple articles on one breach should link to one incident."},
  {"name":"KrebsOnSecurity","tag":"Investigative reporting · corroboration","url":"https://krebsonsecurity.com/","description":"Specialist original investigations, useful for first identification, attribution follow-up and chronology checks."},
  {"name":"Ransomware.live","tag":"Threat actor claims · access/rights review","url":"https://www.ransomware.live/","description":"Leak-site monitoring and alleged victims; accusations are not independently verified breaches. Check permission before API ingestion or republication."}
 ],
 natural:[
  {"name":"Associated Press (AP News)","tag":"Professional reporting · public links checked daily","url":"https://apnews.com/","description":"Independent reporting and corroboration; GDELT finds article headlines and links only. AP's official Media API requires licensed access. Multiple articles about one incident are NOT separate events."},
  {name:'USGS FDSN earthquake catalog',tag:'Official API · daily',url:'https://earthquake.usgs.gov/fdsnws/event/1/',description:'Consistently defined earthquake measurements; this chart uses global M≥5.5 and may be revised after initial publication.'},
  {name:'NASA EONET v3',tag:'NASA API · daily',url:'https://eonet.gsfc.nasa.gov/',description:'Curated global wildfires, severe storms, floods, volcanoes and related monitored events. Not an exhaustive disaster census.'},
  {name:'NOAA NCEI Storm Events',tag:'Validated archive · delayed',url:'https://www.ncei.noaa.gov/access/storm-events-database/',description:'U.S. severe-weather impact data; validation and publication generally lag by about 75–90 days.'},
  {name:'GDACS',tag:'Global disaster alert · reference',url:'https://www.gdacs.org/',description:'Global disaster alerts and estimated impact classes. Listed for comparison; automated import is not yet enabled.'},
  {name:'NOAA National Hurricane Center',tag:'Official advisories · active storms',url:'https://www.nhc.noaa.gov/',description:'Hurricane advisories and post-season storm reports; a separate source of intensity and impact records.'}
 ]
};
const state={tab:'uap',ranges:{uap:'all',cyber:'365',natural:'365'},source:{uap:'all',cyber:'all',natural:'all'},curated:null,signals:null,ai:null,uap:null,live:null,infra:null,records:[],visible:[],selected:null,initTime:new Date()};
const $=id=>document.getElementById(id);
const dateTxt=s=>{if(!s||!/^\d{4}-\d\d-\d\d/.test(s))return 'Date unavailable';const d=new Date(s.slice(0,10)+'T12:00:00Z');return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'})};
const fullDate=s=>{if(!s)return 'Unavailable';let d=new Date(s);return Number.isFinite(d.getTime())?d.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'America/Chicago'}):'Unavailable'};
const fmt=n=>Number(n).toLocaleString('en-US',{maximumFractionDigits:0});
const escape=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const e=(tag,attributes={},parent,text)=>{const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attributes))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=String(text);if(parent)parent.appendChild(n);return n};
const parseTime=v=>Date.parse(v+'T12:00:00Z');
async function get(url){try{const r=await fetch(url+'?v='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error(r.status);return await r.json()}catch(error){console.warn('Observatory source unavailable:',url,error);return null}}
async function load(){const [curated,signals,ai,uap,live,infra]=await Promise.all([
  get('curated_events.json'),get('signals.json'),get('ai_horizons.json'),get('uap_sources.json'),get('events_live.json'),get('infrastructure_casebook.json')
 ]);Object.assign(state,{curated,signals,ai,uap,live,infra});transform();renderAll()}
function laneForUap(row){const k=row.eventKind||'';if(/airspace|sighting|observation/.test(k))return'observation';if(/hearing|oversight|legislation/.test(k))return'hearing';if(/release/.test(k))return'release';return'official'}
function laneForNatural(cat){if(cat==='earthquakes')return'earthquakes';if(['severeStorms','wildfires','floods','volcanoes'].includes(cat))return cat;return'other'}
function tag(row){return {id:row.id,date:row.date,title:row.title,lane:row.lane,domain:row.domain,source:row.source,sourceUrl:row.sourceUrl||null,detail:row.detail||'',kind:row.kind||'milestone',magnitude:row.magnitude,unit:row.unit||'',editorial:!!row.editorial,coverage:row.coverage||'',cause:row.cause||null}}
function transform(){const list=[];
 for(const row of (state.curated?.events||[])){
  if(row.theme==='UAP')list.push(tag({id:'curated-'+row.id,date:row.date,title:row.title,lane:laneForUap(row),domain:'uap',source:'Government / curated',sourceUrl:row.sources?.[0]?.url,detail:row.description,kind:row.eventKind,editorial:true,coverage:'Selected official milestone; not complete sighting database'}));
  else if(row.theme==='Cybersecurity')list.push(tag({id:'curated-'+row.id,date:row.date,title:row.title,lane:'attack',domain:'cyber',source:'Documented incident',sourceUrl:row.sources?.[0]?.url,detail:row.description,kind:row.eventKind,editorial:true,coverage:'Selected historical example, not all attacks'}));
  else if(row.theme==='Infrastructure')list.push(tag({id:'curated-'+row.id,date:row.date,title:row.title,lane:'outage',domain:'cyber',source:'Documented incident',sourceUrl:row.sources?.[0]?.url,detail:row.description,kind:row.eventKind,editorial:true,coverage:'Outage does not establish a cyberattack'}));
  else if(row.theme==='Technology'&&row.eventKind==='technology-release')list.push(tag({id:'curated-'+row.id,date:row.date,title:row.title,lane:'ai-release',domain:'cyber',source:'Documented model launch',sourceUrl:row.sources?.[0]?.url,detail:row.description,kind:row.eventKind,editorial:true,coverage:'Selected milestone, not complete release count'}));
  else if(row.theme==='Disasters')list.push(tag({id:'curated-'+row.id,date:row.date,title:row.title,lane:'other',domain:'natural',source:'Curated historical case',sourceUrl:row.sources?.[0]?.url,detail:row.description,kind:row.eventKind,editorial:true,coverage:'Selected historical case, not a natural-event population'}));
 }
 for(const row of (state.infra?.events||[])){
  let lane=row.id==='change-healthcare-2024'?'attack':'outage';
  list.push(tag({id:'case-'+row.id,date:row.date,title:row.title,lane,domain:'cyber',source:'Infrastructure casebook',sourceUrl:row.source,detail:row.note||row.metric,kind:'historical-case',editorial:true,cause:row.cause,coverage:'Selected historical comparator; not a full incident census'}));
 }
 for(const item of (state.uap?.items||[])){
  const day=(item.published||'').slice(0,10);
  if(!/^\d{4}-\d\d-\d\d$/.test(day)||!item.url)continue;
  list.push(tag({id:'mufon-'+hash(item.url),date:day,title:item.title,lane:'editorial',domain:'uap',source:'MUFON newsroom',sourceUrl:item.url,kind:'public-editorial-post',coverage:'Editorial material only; not reported sighting counts',editorial:true}));
 }
 for(const row of (state.live?.events||[])){
  if(row.domain==='cyber'){list.push(tag({id:row.id,date:row.date,title:row.title,lane:row.lane==='outage'?'outage':'advisory',domain:'cyber',source:row.source,sourceUrl:row.sourceUrl,detail:row.coverage,kind:row.kind,coverage:row.coverage,cause:row.cause||null}));continue;}
  if(row.domain!=='natural')continue;
  list.push(tag({id:row.id,date:row.date,title:row.title,lane:laneForNatural(row.lane),domain:'natural',source:row.source,sourceUrl:row.sourceUrl,detail:row.coverage,magnitude:row.magnitude,unit:row.magnitudeUnit||'',kind:row.kind,coverage:row.coverage}));
 }
 const kev=state.signals?.indicators?.find(x=>x.id==='cisa');
 for(const r of(kev?.series||[])){
  if(!/^\d{4}-\d\d$/.test(r.month)||!Number.isFinite(r.value))continue;
  list.push(tag({id:'kev-'+r.month,date:r.month+'-15',title:r.month+' · '+fmt(r.value)+' CISA KEV catalog additions',lane:'kev',domain:'cyber',source:'CISA KEV',sourceUrl:'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',detail:'Government-known exploited vulnerability catalog additions for the month; this is NOT a count of cyberattacks.',magnitude:r.value,unit:'catalog additions',kind:'monthly-aggregate',coverage:'Monthly government catalog activity'}));
 }
 for(const model of(state.ai?.models||[])){
  if(!model.reliable_range||!Number.isFinite(model.minutes)||model.minutes<=0)continue;
  list.push(tag({id:'metr-'+model.model+'-'+model.date,date:model.date,title:model.model.replace(/_/g,' ')+' · task horizon '+model.minutes.toFixed(1)+' min',lane:'ai-benchmark',domain:'cyber',source:'METR benchmark',sourceUrl:state.ai?.source||'https://metr.org/time-horizons/',detail:'50% estimated success horizon in expert task-minutes under METR software-task evaluations; not an attack metric.',magnitude:model.minutes,unit:'minutes',kind:'benchmark',coverage:'Historical benchmark snapshot; not current-day model performance'}));
 }
 const seen=new Set();state.records=list.filter(x=>{if(seen.has(x.id))return false;seen.add(x.id);return x.date>=BASE_DATE}).sort((a,b)=>a.date.localeCompare(b.date));
}
function renderTop(){
 const coverage=$('coverageAudit');
 if(coverage){
   const sources=state.live?.sources||{};
   const healthy=Object.values(sources).filter(x=>x.status==='ok').length;
   const failed=Object.entries(sources).filter(([,x])=>x.status!=='ok').map(([k])=>k);
   const counts=state.live?.events?.length||0;
   coverage.textContent='Coverage audit: '+fmt(counts)+' machine-indexed records; '+healthy+' live source streams healthy'+(failed.length?', missing or incomplete: '+failed.join(', '):'')+'. Selected historic cases, monthly vulnerability totals, AI milestones and advisories are not a census of disruptions. Data window and reporting criteria differ by source.';
 }
const s=state.signals,rows=s?.indicators||[];const c=rows.find(x=>x.id==='cisa'),u=rows.find(x=>x.id==='usgs'),ai=state.ai;
 const asOf=s?.all_current&&s?.built_at?s.built_at:null;
 $('asOfDate').textContent=asOf?fullDate(asOf):'Source refresh unavailable';
 $('dataCoverage').textContent='Latest complete monthly data: '+(s?.last_complete_month||'not verified')+' · event feeds have individual dates';
 if(s?.all_current&&[c,u].every(x=>Number.isFinite(x?.change_pct))){
   const higher=rows.filter(x=>Number.isFinite(x.change_pct)&&x.change_pct>0).length;
   $('mainVerdict').textContent=higher+' of '+rows.length+' measured indicators higher';
   $('mainVerdictDetail').textContent='Mixed data, not proof of a general surge. Count compares six complete months against the matching year-earlier period. AI/UAP incidence excluded.';
 }else{$('mainVerdict').textContent='Cross-domain trend not established';$('mainVerdictDetail').textContent='Available sources do not currently support a reliable combined trend.'}
 const p=v=>Number.isFinite(v)?((v>0?'+':'')+v.toFixed(1)+'%'):'Unavailable';
 const aiV=Number.isFinite(ai?.from_2023_doubling_days)?'~'+(ai.from_2023_doubling_days/30.44).toFixed(1)+' mo':'No current estimate';
 $('evidenceMetrics').innerHTML='<div class="metric-mini"><b>'+p(c?.change_pct)+'</b><span>CISA KEV catalog additions (YoY)</span></div><div class="metric-mini"><b>'+p(u?.change_pct)+'</b><span>USGS M5+ quake counts (YoY)</span></div><div class="metric-mini"><b>'+escape(aiV)+'</b><span>METR historical task-horizon doubling</span></div>';
 const ucount=state.records.filter(x=>x.domain==='uap'&&x.lane!=='editorial').length;
 const mufon=state.records.filter(x=>x.source==='MUFON newsroom').length;
 $('uapInsight').innerHTML='<b>'+ucount+' curated UAP milestones</b> plus '+mufon+' MUFON editorial posts shown. No valid denominator for changes in physical UAP incidence. More hearings are not more sightings.';
 const attacks=state.records.filter(x=>x.domain==='cyber'&&x.lane==='attack').length;
 const provider=state.live?.sources?.['cloudflare-status'];
 const outages=state.records.filter(x=>x.domain==='cyber'&&x.lane==='outage').length;
 const advisory=state.records.filter(x=>x.domain==='cyber'&&x.lane==='advisory').length;
 $('cyberInsight').innerHTML='<b>'+attacks+' selected attack records; '+outages+' selected/provider outage records; '+advisory+' advisories.</b> These are heterogeneous source records, NOT the number of global cyber disruptions. Cloudflare status: '+(provider?.status==='ok'?'feed checked':'feed unavailable')+'. CISA additions: '+p(c?.change_pct)+' YoY; NOT attack frequency.';
 const eonet=state.live?.sources?.['nasa-eonet'];
 const quakeCount=state.records.filter(x=>x.domain==='natural'&&x.source==='USGS').length;
 const nasaCount=state.records.filter(x=>x.domain==='natural'&&x.source==='NASA EONET').length;
 $('naturalInsight').innerHTML='<b>'+fmt(quakeCount)+' USGS M5.5+ earthquakes; '+fmt(nasaCount)+' NASA curated event records.</b> NASA source: '+(eonet?.status==='ok'?'date-sliced import verified':'INCOMPLETE / unavailable')+'. These counts use different criteria and are not a global disaster census. USGS monthly M5+ YoY: '+p(u?.change_pct)+'.';
 $('aiBenchmarkNote').textContent='METR reported a frontier doubling period near '+aiV+' since 2023. This benchmark is historical ('+(ai?.data_as_of||'last published date unavailable')+') and is not continuously remeasured each day.';
}
function renderSources(){const container=$('sourceDirectory');container.innerHTML='';$('sourceRegistryTitle').textContent='Data sources for '+TAB_SPEC[state.tab].name;for(const src of SOURCES[state.tab]){const card=document.createElement('article');card.className='source-card';card.innerHTML='<p class="source-type">'+escape(src.tag)+'</p><strong>'+escape(src.name)+'</strong><p>'+escape(src.description)+'</p><a href="'+escape(src.url)+'" target="_blank" rel="noopener noreferrer">Official source / information ↗</a>';container.appendChild(card)}
 const health=$('sourceHealth');health.innerHTML='';
 const states=[['CISA / USGS / FRED',state.signals?.all_current?'ok':'unavailable',state.signals?.built_at],['CISA advisories',state.live?.sources?.['cisa-advisories']?.status||'pending',state.live?.sources?.['cisa-advisories']?.lastSuccessAt],['NASA EONET',state.live?.sources?.['nasa-eonet']?.status||'pending',state.live?.sources?.['nasa-eonet']?.lastSuccessAt],['Cloudflare service incidents',state.live?.sources?.['cloudflare-status']?.status||'pending',state.live?.sources?.['cloudflare-status']?.lastSuccessAt],['USGS live earthquakes',state.live?.sources?.usgs?.status||'pending',state.live?.sources?.usgs?.lastSuccessAt],['MUFON newsroom links',state.uap?.status||'pending',state.uap?.last_success_at],['METR historic benchmark',state.ai?.status||'pending',state.ai?.last_success_at]];
 for(const [name,status,when] of states){const row=document.createElement('div');row.className='source-state';const good=status==='ok';row.innerHTML='<span>'+escape(name)+'</span><span class="'+(good?'state-ok':status==='error'?'state-error':'state-weak')+'">'+(good?'Checked '+escape(when?dateTxt(when):'—'):(status==='pending'?'Pending':'Unavailable'))+'</span>';health.appendChild(row)}
}
function populateSource(tab){const el=$(tab+'Source'),val=state.source[tab];const sources=[...new Set(state.records.filter(x=>x.domain===tab).map(x=>x.source))].sort();el.replaceChildren();const all=document.createElement('option');all.value='all';all.textContent='All accessible sources';el.appendChild(all);for(const src of sources){const o=document.createElement('option');o.value=src;o.textContent=src;el.appendChild(o)}el.value=sources.includes(val)?val:'all'}
function rangeOf(tab){const now=Date.now(),r=state.ranges[tab];return r==='all'?parseTime(BASE_DATE):now-Number(r)*MS_DAY}
function visibleRecords(tab){const min=rangeOf(tab),max=Date.now()+MS_DAY,from=state.source[tab];return state.records.filter(x=>x.domain===tab&&parseTime(x.date)>=min&&parseTime(x.date)<=max&&(from==='all'||x.source===from))}
function aggDense(rows,rangeMin){
 const grouped={};for(const item of rows){(grouped[item.lane]??=[]).push(item)}
 const out=[];
 for(const [lane,items] of Object.entries(grouped)){
  if(items.length<=175||lane==='kev'||lane==='ai-benchmark'){out.push(...items);continue}
  const bins=new Map();
  for(const item of items){const d=parseTime(item.date),weekIndex=Math.floor((d-rangeMin)/(7*MS_DAY)),key=weekIndex;let bin=bins.get(key);if(!bin){bin=[];bins.set(key,bin)}bin.push(item)}
  for(const [week,group] of bins){if(group.length===1){out.push(group[0]);continue}const dat=new Date(rangeMin+(week*7+3)*MS_DAY).toISOString().slice(0,10);out.push(tag({id:'group-'+lane+'-'+week,date:dat,title:group.length+' monitored '+lane+' events in this 7-day window',domain:group[0].domain,lane,source:group[0].source+' (aggregated)',kind:'weekly-aggregate',magnitude:group.length,unit:'events',detail:'Hover/click to see aggregate count. Individual records appear in the source feed. This grouping prevents visual overplotting.',coverage:'Weekly aggregation of fetched records; not a global event census'}))}
 }
 return out.sort((a,b)=>a.date.localeCompare(b.date));
}
function axisTicks(tab,min,max){const period=max-min;if(period<125*MS_DAY){let marks=[];for(let d=new Date(min);d<=new Date(max);d=new Date(d.getTime()+14*MS_DAY)){marks.push({at:d.getTime(),text:d.toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'})})}return marks}
 if(period<430*MS_DAY){const out=[];let d=new Date(min);d=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,1));for(;d.getTime()<=max;d=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,1))){out.push({at:d.getTime(),text:d.toLocaleDateString('en-US',{month:'short',year:'2-digit',timeZone:'UTC'})})}return out}
 const arr=[];for(let year=2023;year<=new Date(max).getUTCFullYear();year++)arr.push({at:Date.UTC(year,0,1),text:String(year)});return arr}
function markType(item){if(item.domain==='uap')return item.lane==='observation'?'circle':item.lane==='official'?'square':item.lane==='hearing'?'diamond':item.lane==='release'?'triangle':'ring';if(item.lane==='ai-benchmark'||item.lane==='ai-release')return'diamond';if(item.lane==='advisory')return'square';return'circle'}
function radius(item){if(item.lane==='kev')return Math.min(18,Math.max(3,3+Math.sqrt(Math.max(0,item.magnitude||0))*1.55));if(item.lane==='earthquakes'&&typeof item.magnitude==='number')return Math.min(14,Math.max(4,4+(item.magnitude-5.5)*4));if(item.kind==='weekly-aggregate')return Math.min(19,4+Math.sqrt(item.magnitude||1)*2);return 5.2}
function scatterSymbol(svg,item,cx,cy,r){const col=COLORS[item.lane]||'#6a7b8c',shape=markType(item),attrs={'class':'event-dot','data-id':item.id,'aria-label':item.title+' '+item.date,tabindex:0};let node;
 if(shape==='circle')node=e('circle',{...attrs,cx,cy,r,fill:col,stroke:'#fff','stroke-width':1},svg);
 else if(shape==='ring')node=e('circle',{...attrs,cx,cy,r,fill:'#fff',stroke:col,'stroke-width':2},svg);
 else if(shape==='square')node=e('rect',{...attrs,x:cx-r,y:cy-r,width:r*2,height:r*2,fill:col,stroke:'#fff','stroke-width':1},svg);
 else if(shape==='diamond')node=e('path',{...attrs,d:`M${cx} ${cy-r*1.35} L${cx+r*1.35} ${cy} L${cx} ${cy+r*1.35} L${cx-r*1.35} ${cy}Z`,fill:col,stroke:'#fff','stroke-width':.8},svg);
 else node=e('path',{...attrs,d:`M${cx} ${cy-r*1.3} L${cx+r*1.3} ${cy+r*1.15} L${cx-r*1.3} ${cy+r*1.15}Z`,fill:col,stroke:'#fff','stroke-width':.8},svg);
 e('title',{},node,item.date+' • '+item.title+(item.magnitude!=null?' • '+item.magnitude+' '+item.unit:''));
 node.addEventListener('click',()=>selectRecord(item,node));node.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();selectRecord(item,node)}});
 return node
}
function selectRecord(item,node){state.selected=item;document.querySelectorAll('.event-dot.selected').forEach(x=>x.classList.remove('selected'));if(node)node.classList.add('selected');$('selectedTitle').textContent=item.title;$('selectedDetail').textContent=dateTxt(item.date)+' · '+item.source+' · '+(item.magnitude!=null?item.magnitude+' '+item.unit+' · ':'')+(item.cause?'Reported cause: '+item.cause+'. ':'')+(item.detail||item.coverage||'Selected event with linked evidence.')+' '+(item.editorial?'This record is selected rather than population-complete.':'');const anchor=$('selectedLink');anchor.hidden=!item.sourceUrl;if(item.sourceUrl){anchor.href=item.sourceUrl;anchor.textContent='Inspect '+item.source+' source ↗'}if(window.matchMedia('(max-width:750px)').matches)$('selection').scrollIntoView({block:'nearest',behavior:'smooth'})}
function plot(tab){const svg=$('chart-'+tab);svg.replaceChildren();const spec=TAB_SPEC[tab],raw=visibleRecords(tab);state.visible=raw;const min=rangeOf(tab),max=Date.now()+MS_DAY;const points=aggDense(raw,min);const W=1160,LEFT=220,RIGHT=32,TOP=56,HEIGHT=spec.lanes.length*64+80,AXIS_BOTTOM=TOP+spec.lanes.length*64+10;
 svg.setAttribute('viewBox',`0 0 ${W} ${HEIGHT}`);
 const X=d=>LEFT+Math.max(0,Math.min(1,(parseTime(d)-min)/(max-min)))*(W-LEFT-RIGHT);
 for(const [index,[lane,label]] of spec.lanes.entries()){
  const cy=TOP+index*64+32;
  if(index%2===0)e('rect',{x:LEFT,y:TOP+index*64+2,width:W-LEFT-RIGHT,height:60,class:'lane-back'},svg);
  e('text',{x:6,y:cy+4,class:'lane-label'},svg,label);
  e('line',{x1:LEFT,y1:cy+26,x2:W-RIGHT,y2:cy+26,class:'lane-rule'},svg);
 }
 for(const tick of axisTicks(tab,min,max)){
  if(tick.at<min||tick.at>max)continue;
  const x=LEFT+(tick.at-min)/(max-min)*(W-LEFT-RIGHT);
  e('line',{x1:x,x2:x,y1:TOP-14,y2:AXIS_BOTTOM-8,class:'time-rule'},svg);
  e('text',{x,y:AXIS_BOTTOM+13,'text-anchor':'middle',class:'axis-txt'},svg,tick.text)
 }
 e('text',{x:LEFT,y:32,class:'axis-end'},svg,fmt(raw.length)+' indexed items in selected time range (not total disruptions)');
 e('text',{x:W-RIGHT,y:32,'text-anchor':'end',class:'axis-end'},svg,'Time →');
 const byLane=new Map(spec.lanes.map(([name])=>[name,[]]));
 for(const row of points){if(!byLane.has(row.lane))continue;byLane.get(row.lane).push(row)}
 for(const [i,[lane]] of spec.lanes.entries()){
  const points=byLane.get(lane)||[],placements=[],center=TOP+i*64+32;
  for(const row of points){const x=X(row.date),r=radius(row);
   // Dense lanes: stable deterministic beeswarm around the category baseline.
   let y=center,placed=false;
   const options=[0,-9,9,-18,18,-26,26,-6,6,-14,14,-23,23];const start=hash(row.id)%options.length;
   for(let j=0;j<options.length;j++){
    const cand=center+options[(start+j)%options.length];
    if(placements.every(p=>(Math.abs(p.x-x)>=p.r+r+2)||(Math.abs(p.y-cand)>=Math.max(p.r,r)+2))){y=cand;placed=true;break}
   }
   if(!placed)y=center+((hash(row.id)%2)?-1:1)*((hash(row.id)%3)*9);
   placements.push({x,y,r});scatterSymbol(svg,row,x,y,r)
  }
 }
 const limitInfo=points.length!==raw.length?' Dense lanes grouped into weekly bubbles; grouped bubble area represents record count.':'';
 const defaultNote={uap:'Symbols distinguish evidence type. Sighting frequency is not inferred from hearings, records releases or media posts.',cyber:'KEV monthly bubble area encodes catalog entry counts. An outage does not imply a malicious attack; AI is a separate track.',natural:'Earthquake circles encode magnitude; NASA EONET events are curated metadata, not all disasters worldwide.'};
 $(tab+'ChartFoot').textContent=fmt(raw.length)+' indexed records, not a complete worldwide incident census · '+defaultNote[tab]+limitInfo+(window.matchMedia('(max-width:680px)').matches?' Swipe the chart horizontally to explore earlier and later dates.':'');
}
function aiLine(){const svg=$('aiLine');svg.replaceChildren();const rows=(state.ai?.models||[]).filter(m=>m.reliable_range&&m.date>=BASE_DATE&&Number.isFinite(m.minutes)&&m.minutes>0&&m.minutes<=960).sort((a,b)=>a.date.localeCompare(b.date));if(!rows.length){e('text',{x:25,y:95,class:'axis-txt'},svg,'Validated benchmark data unavailable');return}
 const X=v=>75+(parseTime(v)-parseTime(BASE_DATE))/(Date.now()-parseTime(BASE_DATE))*790,Y=v=>156-((Math.log10(Math.max(v,1))-0)/(Math.log10(960)))*130;
 for(const n of [1,10,100,900]){const y=Y(n);e('line',{x1:74,x2:865,y1:y,y2:y,class:'time-rule'},svg);e('text',{x:66,y:y+4,class:'axis-txt','text-anchor':'end'},svg,n+' m')}
 let best=0,dominant=[];
 rows.forEach(m=>{if(m.minutes>best){best=m.minutes;dominant.push(m)}});
 if(dominant.length>1)e('path',{d:dominant.map((m,i)=>(i?'L':'M')+X(m.date).toFixed(1)+','+Y(m.minutes).toFixed(1)).join(' '),fill:'none',stroke:'#875fad','stroke-width':2.5},svg);
 rows.forEach(m=>{const dot=e('circle',{cx:X(m.date),cy:Y(m.minutes),r:4,fill:'#735b9b'},svg);e('title',{},dot,m.model.replace(/_/g,' ')+' · '+m.date+' · '+m.minutes.toFixed(1)+' min')});
 [2023,2024,2025,2026].forEach(y=>{const x=X(y+'-01-01');e('text',{x,y:179,'text-anchor':'middle',class:'axis-txt'},svg,y)});
 e('text',{x:865,y:22,'text-anchor':'end',class:'axis-txt'},svg,'Log scale · 50% task horizon (minutes)')
}
function renderActive(){for(const key of Object.keys(TAB_SPEC)){
  const active=key===state.tab;
  $('tab-'+key).setAttribute('aria-selected',String(active));
  $('tab-'+key).setAttribute('tabindex',active?'0':'-1');
  $('panel-'+key).hidden=!active;
 }
 populateSource(state.tab);plot(state.tab);renderSources();if(state.tab==='cyber')aiLine();
 for(const key of Object.keys(TAB_SPEC)){const panel=$('panel-'+key);panel.querySelectorAll('.range-controls button').forEach(b=>b.classList.toggle('active',b.dataset.range===state.ranges[key]))}
}
function toCSV(tab){const visible=visibleRecords(tab),cols=['date','lane','title','source','magnitude','unit','kind','coverage','sourceUrl'];const val=x=>'"'+String(x==null?'':x).replaceAll('"','""')+'"';const csv=[cols.join(','),...visible.map(row=>cols.map(c=>val(row[c])).join(','))].join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='observatory-'+tab+'-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)}
function setup(){document.querySelectorAll('.tabs button').forEach(button=>button.addEventListener('click',()=>{state.tab=button.dataset.tab;renderActive();history.replaceState(null,'','#'+state.tab)}));document.querySelectorAll('.range-controls button').forEach(button=>button.addEventListener('click',()=>{const tab=button.closest('.tab-panel').id.replace('panel-','');state.ranges[tab]=button.dataset.range;renderActive()}));for(const tab of Object.keys(TAB_SPEC))$(tab+'Source').addEventListener('change',event=>{state.source[tab]=event.target.value;plot(tab)});document.querySelectorAll('[data-export]').forEach(button=>button.addEventListener('click',()=>toCSV(button.dataset.export)));const hash=location.hash.slice(1);if(TAB_SPEC[hash])state.tab=hash;renderActive();load()}
function renderAll(){renderTop();renderActive()}
setup();
// An open tab also rechecks published data hourly, independently from the daily GitHub update job.
setInterval(load,3600000);
})();