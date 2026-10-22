'use strict';
/**
 * Protected-assets gate. Approved art is never removed, renamed, re-hashed or
 * unbound without Nick's OK through Eva (assets/protected-assets.json).
 * Run: node src/assets/ProtectedAssets.test.js   (part of npm test / living-macar CI)
 */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm');
const root=path.join(__dirname,'../..');
const man=JSON.parse(fs.readFileSync(path.join(root,'assets/protected-assets.json'),'utf8'));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const ctx={}; const mf=path.join(__dirname,'asset-manifest.js'); if(fs.existsSync(mf)) vm.runInNewContext(fs.readFileSync(mf,'utf8')+';this.ASSET_FILES=ASSET_FILES;',ctx);
const ASSET_FILES=ctx.ASSET_FILES||{};
let failed=0;
const ok=(c,m)=>{ if(!c){failed++;console.error('FAIL  '+m);} else console.log('ok    '+m); };
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function fnBody(name){
  const s=html.indexOf('function '+name+'('); if(s<0) return null;
  let i=html.indexOf('{',s),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'&&--d===0) return html.slice(s,i+1); } return null;
}
ok(Number.isInteger(man.version)&&man.version>=1,'manifest has an integer version');
ok(Array.isArray(man.protected)&&man.protected.length>0,'manifest lists protected assets');
const keys=new Set();
for(const e of man.protected){
  const tag=e.key+' ('+e.path+')';
  ok(!keys.has(e.key),'unique key '+e.key); keys.add(e.key);
  ok(typeof e.approvedBy==='string'&&e.approvedBy.trim().length>3,tag+' carries approvedBy');
  const abs=path.join(root,e.path), exists=fs.existsSync(abs);
  ok(exists,tag+' file exists (not removed or renamed)');
  if(exists){
    const h=crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
    ok(h===e.sha256,tag+' sha256 matches approved version'+(h===e.sha256?'':' — got '+h+'; re-approve via Eva, bump version, set approvedBy'));
  }
  const reg=new RegExp("(?:SPRITE_FILES\\."+esc(e.key)+"\\s*=\\s*|\\b"+esc(e.key)+"\\s*:\\s*)'"+esc(e.path)+"'");
  ok(reg.test(html),tag+' is bound in SPRITE_FILES');
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
  ok(ASSET_FILES[e.path]===1,tag+' is in the preload registry (src/assets/asset-manifest.js)');
}
for(const e of man.candidates||[]) ok(!!e.reason,'candidate '+e.key+' lists why approval is uncertain');
if(failed){ console.error(failed+' protected-asset check(s) failed'); process.exit(1); }
console.log('protected assets intact');
