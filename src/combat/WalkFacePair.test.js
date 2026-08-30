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
assert(/function wantsSpriteFlip\(e\)\{/.test(html)
  && /e\.hero && !e\.ghost/.test(html.match(/function wantsSpriteFlip\(e\)\{[\s\S]*?\n\}/)[0])
  && /sx > 0\.02/.test(html.match(/function wantsSpriteFlip\(e\)\{[\s\S]*?\n\}/)[0])
  && /sx < -0\.02/.test(html.match(/function wantsSpriteFlip\(e\)\{[\s\S]*?\n\}/)[0]),
  'living Macar flip is inverted to match the front 3/4; kin stay heading-only');
assert(/blitFacing\(g,img,dx,dy,W,H,wantsSpriteFlip\(e\)\)/.test(html),
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
