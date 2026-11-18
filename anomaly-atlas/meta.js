
/* Dynamic evidence headline. Counts directions in three primary-source indicators,
   NOT statistically unusual incidents or a representative census of world events. */
(function () {
  "use strict";
  const TARGETS = [
    {id:"cisa",label:"Cybersecurity · KEV additions",source:"CISA",description:"Government catalog additions, not cyberattacks"},
    {id:"usgs",label:"Geophysical · M5+ earthquakes",source:"USGS",description:"Detected earthquakes, not infrastructure disruption"},
    {id:"vix",label:"Markets · VIX average",source:"FRED",description:"Market-implied volatility, not general economic risk"}
  ];
  const NS="http://www.w3.org/2000/svg";
  const section=document.createElement("section");
  section.className="meta-evidence";
  section.id="evidence-pulse";
  section.setAttribute("aria-labelledby","meta-title");
  section.innerHTML=[
    '<div class="meta-eyebrow">The anomaly observatory / <span id="meta-updated-label">Updated as of latest verified refresh</span> / November 2022 onward</div>',
    '<div class="meta-head"><div><h1 id="meta-title">Are unusual events becoming more widespread?</h1>',
    '<p class="meta-lead" id="meta-lead">Comparing complete months against the same six-month period a year earlier. The evidence is evaluated every day; monthly observations change only after new data are available.</p></div>',
    '<aside class="meta-result" aria-live="polite"><span class="meta-small">Evidence-based assessment</span>',
    '<strong id="meta-verdict">Checking latest data…</strong><span class="meta-asof" id="meta-asof">Checking source refresh</span></aside></div>',
    '<div class="meta-note"><span id="meta-count"><strong>—</strong> indicators higher</span>',
    '<span id="meta-explanation">Direction is not statistical rarity.</span></div>',
    '<div class="meta-trend-wrap"><div class="meta-trend-heading"><h2>How many independent indicators are rising together?</h2>',
    '<span>Number higher than their own year-earlier comparison · 0–3</span></div>',
    '<div class="meta-chart-card"><svg id="meta-breadth" class="meta-viz" role="img" aria-label="Monthly number of three monitored indicators rising versus the same period a year before" viewBox="0 0 1120 240"></svg></div>',
    '<div class="meta-trend-heading" style="margin-top:20px"><h2>Which indicators are driving the pattern?</h2><span>Six-month averages · year-over-year direction</span></div>',
    '<div class="meta-chart-card"><svg id="meta-heat" class="meta-viz" role="img" aria-label="Monthly directional heatmap for cybersecurity catalog, earthquakes and market volatility" viewBox="0 0 1120 198"></svg></div>',
    '<div class="meta-key"><span><b style="background:#b16b31"></b> Higher than year-earlier window</span>',
    '<span><b style="background:#3b8193"></b> Lower</span><span><b style="background:#c3cdce"></b> Unchanged / missing</span></div>',
    '<p class="meta-method">Method: For each source series, compare the average of the latest six complete months with the identical calendar months one year earlier. This is a <strong>directional breadth measure</strong>, not a statistical anomaly score. Three monitored indicators cannot establish the overall frequency of unusual events worldwide. Overlapping windows are highly correlated; no independence or causal relationship is assumed.</p>',
    '<div class="meta-domain-context">',
    '<div><strong>AI · historic capability acceleration</strong>METR task-horizon evaluations show strong measured growth, but the public benchmark snapshot is not a continuously updated monthly incidence series. Excluded from the breadth count.</div>',
    '<div><strong>Cyber · measured catalog activity</strong>CISA vulnerability additions enter the breadth chart. That is not a direct measure of cyberattack prevalence or damage.</div>',
    '<div><strong>UAP · incidence not measurable here</strong>AARO, MUFON and NUFORC have differing reporting systems. Document releases, hearings and civilian sighting claims cannot be merged into a comparable physical-event frequency. Excluded from the breadth count.</div>',
    '</div></div>'
  ].join("");
  const anchor=document.getElementById("pattern-overview")||document.getElementById("trends");
  if(!anchor)return;
  anchor.before(section);
  const $=id=>document.getElementById(id);
  const E=(tag,attributes,parent,body)=>{
    const node=document.createElementNS(NS,tag);
    for(const key in attributes)node.setAttribute(key,String(attributes[key]));
    if(body!==undefined)node.textContent=String(body);
    parent.appendChild(node);
    return node;
  };
  function avg(values){return values.reduce((sum,n)=>sum+n,0)/values.length;}
  function monthsFor(source){
    if(!source || !Array.isArray(source.series))return {};
    const sorted=source.series.filter(r=>r&&/^\d{4}-\d\d$/.test(r.month)&&Number.isFinite(r.value)).sort((a,b)=>a.month.localeCompare(b.month));
    const out={};
    for(let i=17;i<sorted.length;i++){
      const recent=sorted.slice(i-5,i+1);
      const earlier=sorted.slice(i-17,i-11);
      if(recent.length!==6||earlier.length!==6||earlier[0].month.slice(5)!==recent[0].month.slice(5))continue;
      const base=avg(earlier.map(x=>x.value));
      if(base===0)continue;
      const value=avg(recent.map(x=>x.value));
      out[sorted[i].month]={change:100*(value/base-1),current:value,prior:base};
    }
    return out;
  }
  function renderSvg(months,records){
    const chart=$("meta-breadth"),heat=$("meta-heat");
    chart.replaceChildren();heat.replaceChildren();
    const left=210,right=30,top=22,bottom=203,w=1120-left-right;
    const X=i=>left+w*i/(Math.max(1,months.length-1));
    const Y=n=>174-n*(125/3);
    for(let k=0;k<=3;k++){
      const y=Y(k);
      E("line",{x1:left,x2:1120-right,y1:y,y2:y,class:"meta-grid"},chart);
      E("text",{x:left-12,y:y+4,"text-anchor":"end",class:"meta-axis"},chart,k);
    }
    const counts=months.map(month=>records.reduce((n,rec)=>n+(rec[month]&&rec[month].change>0?1:0),0));
    let path=counts.map((n,i)=>(i?"L":"M")+X(i).toFixed(1)+","+Y(n).toFixed(1)).join(" ");
    E("path",{d:path,class:"meta-breadth"},chart);
    counts.forEach((n,i)=>{
      const dot=E("circle",{cx:X(i),cy:Y(n),r:i===counts.length-1?6:3,fill:"#234e66"},chart);
      E("title",{},dot,months[i]+": "+n+" of 3 indicators higher versus year-earlier window");
    });
    const years=[...new Set(months.map(m=>m.slice(0,4)))];
    for(const year of years){
      const i=months.findIndex(m=>m.startsWith(year));
      const x=X(i);
      E("text",{x,y:215,class:"meta-axis","text-anchor":"middle"},chart,year);
    }
    const last=counts[counts.length-1];
    E("text",{x:1100,y:Y(last)-14,"text-anchor":"end",class:"meta-axis"},chart,last+" of 3");
    const firstX=left,unit=w/months.length;
    TARGETS.forEach((target,r)=>{
      const yy=26+r*47;
      E("text",{x:5,y:yy+14,class:"meta-axis"},heat,target.label);
      months.forEach((month,i)=>{
        const v=records[r][month];
        let fill="#c3cdce";
        if(v)fill=v.change>0?"#b16b31":v.change<0?"#3b8193":"#c3cdce";
        const box=E("rect",{x:firstX+i*unit+1,y:yy,width:Math.max(2,unit-2),height:28,fill,rx:1},heat);
        E("title",{},box,month+" · "+target.label+" · "+(v?(v.change>0?"+":"")+v.change.toFixed(1)+"%":"insufficient data"));
      });
    });
    for(const year of years){
      const i=months.findIndex(m=>m.startsWith(year));
      E("text",{x:firstX+(i+.5)*unit,y:183,class:"meta-axis","text-anchor":"middle"},heat,year);
    }
  }
  function render(payload){
    const indicators=payload.indicators||[];
    const refs=TARGETS.map(t=>monthsFor(indicators.find(x=>x.id===t.id)));
    const common=Object.keys(refs[0]||{}).filter(m=>refs.every(x=>x[m])).sort();
    const last=payload.last_complete_month;
    if(!payload.all_current||!last||common.length<12||common[common.length-1]!==last)throw Error("Current data incomplete");
    const current=common[common.length-1];
    const changes=refs.map(x=>x[current].change);
    const higher=changes.filter(v=>v>0).length,lower=changes.filter(v=>v<0).length;
    $("meta-verdict").textContent=higher+" of 3 indicators higher";
    $("meta-count").innerHTML="<strong>"+higher+" higher</strong> · "+lower+" lower"+(3-higher-lower?" · "+(3-higher-lower)+" unchanged":"");
    $("meta-explanation").textContent="Mixed directions do not establish an overall increase in unusual events.";
    if(higher===3)$("meta-explanation").textContent="All three monitored series are rising against their year-earlier windows; this is not proof that unusual events overall are accelerating.";
    if(higher===0)$("meta-explanation").textContent="None of these three monitored series is above its year-earlier comparison; coverage remains too narrow for a global conclusion.";
    const built=new Date(payload.built_at);
    const refreshed=Number.isFinite(built.getTime())?built.toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric",timeZone:"UTC"}):"unknown";
    const age=Number.isFinite(built.getTime())?(Date.now()-built.getTime())/86400000:Infinity;
    // A day on the page is only an "updated" day if a source refresh actually succeeded.
    const freshDate=Number.isFinite(built.getTime())?built.toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric",timeZone:"America/Chicago"}):"date unavailable";
    $("meta-updated-label").textContent="Updated as of "+freshDate;
    const foot=document.getElementById("lastEvidenceRefresh");
    if(foot)foot.textContent=freshDate+(age>3?" (out of date)":"");
    $("meta-asof").textContent="Last complete data month: "+current+" · Source check: "+refreshed+(age>3?" · Refresh may be stale":"");
    if(age>3)$("meta-verdict").textContent="Last verified: "+higher+" of 3 higher";
    renderSvg(common,refs);
  }
  async function refresh(){
    try{
      const res=await fetch("signals.json?ts="+Date.now(),{cache:"no-store"});
      if(!res.ok)throw Error("Indicator service unavailable");
      render(await res.json());
    }catch{
      $("meta-updated-label").textContent="Latest refresh could not be verified";
      const foot=document.getElementById("lastEvidenceRefresh");
      if(foot)foot.textContent="unavailable";
      $("meta-verdict").textContent="Current evidence unavailable";
      $("meta-asof").textContent="Daily data could not be verified; no new conclusion is displayed.";
      $("meta-count").textContent="Sources: CISA, USGS and FRED";
      $("meta-explanation").textContent="The historic AI and UAP panels below remain separate and do not substitute for these series.";
    }
  }
  refresh();
  // Refresh the conclusion in tabs kept open across the daily data publication.
  window.setInterval(refresh, 60*60*1000);
})();
