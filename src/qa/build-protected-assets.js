'use strict';
/**
 * Seed / refresh assets/protected-assets.json.
 * Run: node src/qa/build-protected-assets.js [--write]
 * Protected entries are hand-curated (Nick's Good via Eva). This script only
 * recomputes sha256 for the "candidates" and "bound" lists and prints drift
 * for "protected"; it never changes a protected hash. Bumping a protected
 * hash is a manual edit that must carry a new approvedBy.
 */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.join(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
function boundSprites(){
  const out={};
  const re=/(?:SPRITE_FILES\.([A-Za-z0-9_]+)\s*=\s*|\b([A-Za-z0-9_]+)\s*:\s*)'(assets\/[^']+\.(?:png|jpg|webp))'/g;
  let m; while((m=re.exec(html))){ const k=m[1]||m[2]; if(!out[k]) out[k]=m[3]; }
  return out;
}
module.exports={boundSprites,sha};
if(require.main===module){
  const file=path.join(root,'assets/protected-assets.json');
  const man=JSON.parse(fs.readFileSync(file,'utf8'));
  const skip=new Set([...man.protected,...man.candidates].map(e=>e.key));
  const prev=new Map((man.bound||[]).map(e=>[e.key,e]));
  const b=boundSprites(); const bound=[]; const seen=new Set();
  for(const k of Object.keys(b).sort()){
    if(skip.has(k)) continue;
    const p=b[k]; if(!fs.existsSync(path.join(root,p))) continue;
    const row={key:k,path:p,sha256:sha(p)};
    if(prev.get(k)&&prev.get(k).approvedBy) row.approvedBy=prev.get(k).approvedBy;
    bound.push(row); seen.add(k);
  }
  /* Derived walks and other cited rows are not literal SPRITE_FILES lines.
     Keep them when the file is still there, and refresh the hash. */
  for(const e of man.bound||[]){
    if(seen.has(e.key)||skip.has(e.key)) continue;
    if(!e.path||!fs.existsSync(path.join(root,e.path))) continue;
    const row=Object.assign({}, e, {sha256:sha(e.path)});
    bound.push(row);
  }
  bound.sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0);
  for(const e of man.candidates) if(fs.existsSync(path.join(root,e.path))) e.sha256=sha(e.path);
  for(const e of man.protected){ const h=fs.existsSync(path.join(root,e.path))?sha(e.path):'MISSING'; if(h!==e.sha256) console.log('DRIFT protected '+e.key+' '+e.path+' '+h); }
  man.bound=bound;
  if(process.argv.includes('--write')) fs.writeFileSync(file, JSON.stringify(man,null,2)+'\n');
  console.log('protected '+man.protected.length+' candidates '+man.candidates.length+' bound '+bound.length);
}
