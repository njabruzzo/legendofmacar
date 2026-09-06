'use strict';
/**
 * Discover and run every src/**/*.test.js.
 * CI / `npm test` must not silently skip half the suite.
 * Run: node src/qa/run-tests.js
 */
const fs=require('fs');
const path=require('path');
const {spawnSync}=require('child_process');

const root=path.join(__dirname,'../..');

function walk(dir, acc){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir, ent.name);
    if(ent.isDirectory()) walk(p, acc);
    else if(ent.name.endsWith('.test.js')) acc.push(p);
  }
  return acc;
}

const files=walk(path.join(root,'src'), []).sort();
if(!files.length){
  console.error('no src/**/*.test.js files found');
  process.exit(2);
}

console.log('discovered '+files.length+' test files under src/');
console.log('invoke: npm test  →  node src/qa/run-tests.js');
console.log('');

let passed=0, failed=0;
const failList=[];
for(const file of files){
  const rel=path.relative(root, file).replace(/\\/g,'/');
  const r=spawnSync(process.execPath, [file], {
    cwd:root, encoding:'utf8', env:process.env
  });
  const out=((r.stdout||'')+(r.stderr||'')).trimEnd();
  if(r.status===0){
    passed++;
    console.log('PASS  '+rel);
  }else{
    failed++;
    failList.push(rel);
    console.log('FAIL  '+rel+' (exit '+(r.status==null?'signal '+r.signal:r.status)+')');
    if(out){
      out.split('\n').forEach(ln=>console.log('      '+ln));
    }
  }
}

console.log('');
console.log('baseline: '+passed+' pass / '+failed+' fail / 0 skip / '+files.length+' total');
if(failList.length){
  console.error('failed files:');
  failList.forEach(f=>console.error('  '+f));
  process.exit(1);
}
console.log('full suite passed');
