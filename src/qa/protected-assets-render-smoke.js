'use strict';
/**
 * Render smoke for protected sprites: each one must draw non-zero pixels at
 * its spot. Minimum: the Bone Crown on the teeth-chapel altar.
 * Run: node src/qa/protected-assets-render-smoke.js [baseUrl]
 *   (no baseUrl: serves this checkout on a free local port)
 * Needs puppeteer-core (PUPPETEER_CORE=/path/to/puppeteer-core) and Chrome
 * (CHROME=/usr/bin/google-chrome). Viewports: laptop 1280x800, phone 390x844.
 */
const http=require('http'),fs=require('fs'),path=require('path');
const puppeteer=require(process.env.PUPPETEER_CORE||'puppeteer-core');
const root=path.join(__dirname,'../..');
const W=ms=>new Promise(r=>setTimeout(r,ms));
const VP={laptop:{width:1280,height:800},phone:{width:390,height:844,deviceScaleFactor:3,isMobile:true,hasTouch:true}};
const MIN={altarCrown:150,chapelFace:500};
const shotDir=process.env.SHOT_DIR||'';
function serve(){ return new Promise(res=>{ const types={'.html':'text/html','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.webp':'image/webp','.mp3':'audio/mpeg','.ogg':'audio/ogg'};
  const s=http.createServer((q,r)=>{ let u=decodeURIComponent(q.url.split('?')[0]); if(u==='/')u='/index.html'; const f=path.join(root,u); if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end();} r.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'}); fs.createReadStream(f).pipe(r); });
  s.listen(0,'127.0.0.1',()=>res(s)); }); }
async function run(base,vp,browser){
  const ctx=await browser.createBrowserContext(); const p=await ctx.newPage(); await p.setViewport(VP[vp]);
  const errs=[]; p.on('pageerror',e=>errs.push(String(e.message||e)));
  await p.goto(base+'/index.html',{waitUntil:'load',timeout:120000});
  await p.waitForFunction(()=>typeof G!=='undefined'&&typeof startChapter==='function'&&typeof buildTeethCrownRoom==='function',{timeout:60000});
  await p.evaluate(()=>{ startChapter(1); G.scene='play'; G.talk=null; const L=G.lvl; const sec=(L.secrets||[]).find(s=>s.kind==='teeth');
    if(sec){ sec.open=1; if(typeof applyCrownEntranceFrame==='function') applyCrownEntranceFrame(L); }
    buildTeethCrownRoom(L,sec); for(const r of L.seen) r.fill(1); L.flags.teethIntro=1;
    const h=G.ents.find(e=>e.hero); h.x=103.2; h.y=5.6; G.ents=G.ents.filter(e=>e.hero); G.cam={x:h.x,y:h.y};
    ['bone_crown','bone_crown_scene','altar_teeth','demon_dwarfface'].forEach(k=>loadSpriteKeyNow(k)); });
  await W(2500); await p.evaluate(()=>{G.talk=null;}); await W(500);
  const r=await p.evaluate(()=>{
    const cv=document.createElement('canvas'); cv.width=VW; cv.height=VH; const g=cv.getContext('2d');
    const draw=()=>{ g.setTransform(1,0,0,1,0,0); g.globalAlpha=1; g.globalCompositeOperation='source-over'; g.fillStyle='#000'; g.fillRect(0,0,VW,VH); drawWorld(g,G.lvl); return g.getImageData(0,0,VW,VH).data; };
    function diff(kind, near){ const tgt=G.props.find(q=>q.k===kind&&!q.gone); if(tgt){ G.cam={x:tgt.x+0.6,y:tgt.y+1.2}; if(typeof syncCamProj==='function') syncCamProj(); } const base=draw(); const hit=G.props.filter(q=>q.k===kind&&!q.gone); hit.forEach(q=>q.gone=1); const off=draw(); hit.forEach(q=>q.gone=0);
      let n=0,inSpot=0; const s=tgt?w2s(tgt.x,tgt.y):null; const R=Math.max(VW,VH)*0.35;
      for(let i=0;i<base.length;i+=4){ if(Math.abs(base[i]-off[i])+Math.abs(base[i+1]-off[i+1])+Math.abs(base[i+2]-off[i+2])>24){ n++; const x=(i/4)%VW,y=(i/4/VW)|0; if(!s||Math.hypot(x-s.x,y-s.y)<R) inSpot++; } }
      return {props:hit.length,px:n,inSpot}; }
    return {altarCrown:diff('bonecrown',null), chapelFace:diff('demonface',null),
      sprites:['bone_crown','bone_crown_scene','demon_dwarfface'].map(k=>k+':'+(SPR[k]&&SPR[k].width?SPR[k].width+'x'+SPR[k].height:'MISSING'))}; });
  if(shotDir) await p.screenshot({path:path.join(shotDir,'smoke-'+vp+'.png')});
  await ctx.close(); return {vp,r,errs};
}
(async()=>{
  let srv=null, base=process.argv[2];
  if(!base){ srv=await serve(); base='http://127.0.0.1:'+srv.address().port; }
  const browser=await puppeteer.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--mute-audio']});
  let failed=0;
  try{
    for(const vp of ['laptop','phone']){
      const {r,errs}=await run(base,vp,browser);
      console.log(vp+' sprites '+r.sprites.join(' '));
      for(const k of Object.keys(MIN)){ const v=r[k]; const pass=v.props>0&&v.inSpot>=MIN[k];
        console.log((pass?'ok    ':'FAIL  ')+vp+' '+k+' props='+v.props+' px='+v.px+' atSpot='+v.inSpot+' (min '+MIN[k]+')'); if(!pass) failed++; }
      if(errs.length){ console.log('FAIL  '+vp+' page errors: '+errs.slice(0,3).join(' | ')); failed++; }
    }
  } finally { await browser.close(); if(srv) srv.close(); }
  if(failed){ console.error(failed+' render smoke check(s) failed'); process.exit(1); }
  console.log('protected sprites draw');
})().catch(e=>{ console.error(e); process.exit(2); });
