'use strict';
/**
 * Protected-assets gate. Approved art is never removed, renamed, re-hashed or
 * unbound without Nick's OK through Eva (assets/protected-assets.json).
 * Protected and bound entries are enforced. Candidates are recorded only.
 * Run: node src/assets/ProtectedAssets.test.js   (part of npm test / living-macar CI)
 */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm');
const {execFileSync}=require('child_process');
const root=path.join(__dirname,'../..');
const man=JSON.parse(fs.readFileSync(path.join(root,'assets/protected-assets.json'),'utf8'));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const ctx={}; const mf=path.join(__dirname,'asset-manifest.js'); if(fs.existsSync(mf)) vm.runInNewContext(fs.readFileSync(mf,'utf8')+';this.ASSET_FILES=ASSET_FILES;',ctx);
const ASSET_FILES=ctx.ASSET_FILES||{};
const BASE_REV=process.env.PROTECTED_ASSETS_BASE||'origin/main';
let failed=0;
const ok=(c,m)=>{ if(!c){failed++;console.error('FAIL  '+m);} else console.log('ok    '+m); };
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function fnBody(name){
  const s=html.indexOf('function '+name+'('); if(s<0) return null;
  let i=html.indexOf('{',s),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'&&--d===0) return html.slice(s,i+1); } return null;
}
function literalBind(key, filePath){
  const reg=new RegExp("(?:SPRITE_FILES\\."+esc(key)+"\\s*=\\s*|\\b"+esc(key)+"\\s*:\\s*)'"+esc(filePath)+"'");
  return reg.test(html);
}
/* Idle sheets derive _w1/_w2 in the SPRITE_FILES walk loop. Those Nick Good
   walks are not literal key:path lines. */
function derivedWalk(key, filePath){
  const m=/^(.*)_w([12])$/.exec(key);
  if(!m) return false;
  const basePath=filePath.replace(new RegExp('_w'+m[2]+'\\.png$'), '.png');
  if(basePath===filePath) return false;
  if(!literalBind(m[1], basePath)) return false;
  return html.indexOf("SPRITE_FILES[k+'_w1']=stem+'_w1.png'")>=0
    && html.indexOf("SPRITE_FILES[k+'_w2']=stem+'_w2.png'")>=0;
}
function gitShow(rev, file){
  try{ return execFileSync('git',['show',rev+':'+file],{cwd:root,maxBuffer:64*1024*1024}); }
  catch(e){ return null; }
}
function gitText(rev, file){
  const buf=gitShow(rev, file);
  return buf?buf.toString('utf8'):null;
}
let baseMan=null;
const baseTxt=gitText(BASE_REV,'assets/protected-assets.json');
if(baseTxt){ try{ baseMan=JSON.parse(baseTxt); }catch(e){ baseMan=null; } }
const baseByKey=new Map();
if(baseMan) for(const e of [...(baseMan.protected||[]), ...(baseMan.bound||[])]) baseByKey.set(e.key, e);
console.log(baseMan?'base '+BASE_REV+' manifest v'+baseMan.version:'base '+BASE_REV+' has no protected-assets manifest; byte check uses the file blob');
ok(Number.isInteger(man.version)&&man.version>=1,'manifest has an integer version');
ok(Array.isArray(man.protected)&&man.protected.length>0,'manifest lists protected assets');
ok(Array.isArray(man.bound)&&man.bound.length>0,'manifest lists bound assets');
const keys=new Set();
function enforce(e, opts){
  const tag=e.key+' ('+e.path+')';
  ok(!keys.has(e.key),'unique key '+e.key); keys.add(e.key);
  if(opts.approved) ok(typeof e.approvedBy==='string'&&e.approvedBy.trim().length>3,tag+' carries approvedBy');
  const abs=path.join(root,e.path), exists=fs.existsSync(abs)&&fs.statSync(abs).isFile();
  ok(exists,tag+' file exists (not removed or renamed)');
  let h=null;
  if(exists){
    h=crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
    ok(h===e.sha256,tag+' sha256 matches the manifest'+(h===e.sha256?'':' — got '+h+'; re-approve via Eva and set approvedBy'));
  }
  ok(literalBind(e.key, e.path)||derivedWalk(e.key, e.path), tag+' is bound in SPRITE_FILES');
  ok(ASSET_FILES[e.path]===1, tag+' is in the preload registry (src/assets/asset-manifest.js)');
  const baseBlob=gitShow(BASE_REV, e.path);
  if(h && baseBlob){
    const baseHash=crypto.createHash('sha256').update(baseBlob).digest('hex');
    if(baseHash!==h){
      const oldBy=(baseByKey.get(e.key)&&baseByKey.get(e.key).approvedBy)||'';
      const nowBy=typeof e.approvedBy==='string'?e.approvedBy:'';
      ok(nowBy.length>3 && nowBy!==oldBy, tag+' byte change vs '+BASE_REV+' needs an approvedBy update in this PR');
    }
  }
  if(opts.chain){
    const uses=(html.match(new RegExp("SPR\\."+esc(e.key)+"\\b|SPR\\[['\"]"+esc(e.key)+"['\"]\\]|['\"]"+esc(e.key)+"['\"]",'g'))||[]).length;
    ok(uses>=1,tag+' is referenced by draw/load code ('+uses+' refs)');
    for(const fn of e.usedIn||[]){
      const b=fnBody(fn);
      ok(!!b,tag+' consumer '+fn+'() exists');
      if(b) ok(new RegExp('\\b'+esc(e.key)+'\\b').test(b),tag+' consumer '+fn+'() still reads it');
    }
    for(const [caller,callee] of e.callChain||[]){
      const b=fnBody(caller);
      ok(!!b&&b.indexOf(callee)>=0,tag+' draw chain: '+caller+'() still reaches '+callee);
    }
  }
}
for(const e of man.protected) enforce(e,{approved:true, chain:true});
for(const e of man.bound) enforce(e,{approved:typeof e.approvedBy==='string'&&e.approvedBy.trim().length>0, chain:false});
if(baseMan && Number.isInteger(baseMan.version)){
  const changed=(man.protected||[]).some(e=>{
    const old=(baseMan.protected||[]).find(x=>x.key===e.key);
    return !old || old.sha256!==e.sha256 || old.path!==e.path || old.approvedBy!==e.approvedBy;
  });
  if(changed) ok(man.version>baseMan.version,'a protected entry change bumps the manifest version');
}
for(const e of man.candidates||[]){
  ok(!!e.reason,'candidate '+e.key+' lists why approval is uncertain');
  ok(!e.approvedBy,'candidate '+e.key+' stays unenforced (no approvedBy)');
}
/* A sha256 is not a citation. Look at the other fields for a PR, a
   commit, or a date, and require approvedBy when one is present. */
const cited=/#\d{2,}\b|\b[0-9a-f]{7,12}\b|20\d{2}-\d{2}-\d{2}/;
for(const e of [...man.protected, ...man.bound]){
  const note={}; for(const k of Object.keys(e)) if(k!=='sha256'&&k!=='key'&&k!=='path'&&k!=='approvedBy') note[k]=e[k];
  if(cited.test(JSON.stringify(note)) && !(typeof e.approvedBy==='string'&&e.approvedBy.trim().length>3)){
    ok(false, e.key+' cites an approval but has no approvedBy');
  }
}
if(failed){ console.error(failed+' protected-asset check(s) failed'); process.exit(1); }
console.log('protected assets intact ('+man.protected.length+' protected, '+man.bound.length+' bound enforced; '+(man.candidates||[]).length+' candidates recorded)');
