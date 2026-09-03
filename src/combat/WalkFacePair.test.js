'use strict';
/**
 * Limner walk-face gate: w1 and w2 are the same camera / facing.
 * Only the planted boot swaps. Flip is engine-only, never a mirrored sheet.
 * Run: node src/combat/WalkFacePair.test.js
 */
const fs=require('fs');
const path=require('path');
const {spawnSync}=require('child_process');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

const root=path.join(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

assert(/w1 \/ w2 are the same painted facing/.test(html),
  'walkCycleKey documents same-face opposite-foot');
assert(/function wantsSpriteFlip\(e\)\{/.test(html) && /moveHeadingSX\(e\) < -0\.02/.test(html)
  && !/moveHeadingSX\(e\) > 0\.02/.test(html),
  'flip stays heading-only; title-law sheets flip only for screen-left');
assert(/const flip=wantsSpriteFlip\(e\)/.test(html) && /blitFacing\(g,img,dx,dy,W,H,flip/.test(html),
  'heading flip is applied once per pose on the blit');

const py=spawnSync('python3',[path.join(__dirname,'WalkFacePair_sheets.py')],{
  encoding:'utf8', cwd:root
});
if(py.status!==0){
  failed++;
  console.error(py.stdout||'');
  console.error(py.stderr||'');
  console.error('FAIL  sheet pair python gate');
}else{
  process.stdout.write(py.stdout||'');
}

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nwalk face-pair checks passed');
