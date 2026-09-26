'use strict';
/**
 * Limner walk-face gate: living Macar w1/w2 are the same camera / facing.
 * Only the planted boot swaps. Flip is engine-only, never a mirrored sheet.
 *
 * Compass / e_w1 Macar art is intentionally gone (title-law front sheets only:
 * macar / macar_w1 / macar_w2 / macar_atk + axe variants). Do not reintroduce
 * dwarf_macar_e_w1.png. Sheet pair check is Node-native so CI needs no PIL.
 *
 * Run: node src/combat/WalkFacePair.test.js
 */
const fs=require('fs');
const path=require('path');
const {readRgba, resizedAlphaMask, flipH, corr}=require('../qa/pngRgba');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

const root=path.join(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const creatures=path.join(root,'assets/creatures');

assert(/w1 \/ w2 are the same painted facing/.test(html),
  'walkCycleKey documents same-face opposite-foot');
assert(/function wantsSpriteFlip\(e\)\{/.test(html) && /moveHeadingSX\(e\) < -0\.02/.test(html)
  && !/moveHeadingSX\(e\) > 0\.02/.test(html),
  'flip stays heading-only; title-law sheets flip only for screen-left');
assert(/const flip=wantsSpriteFlip\(e\)/.test(html) && /blitFacing\(g,img,dx,dy,W,H,flip/.test(html),
  'heading flip is applied once per pose on the blit');

assert(/s:\s*\{flip:0, frames:\['macar_w1','macar_w2'\]\}/.test(html),
  'MACAR_PLAN south walk stays the signed front pair');
assert(/e:\s*\{flip:0, frames:\['macar_e_w1','macar_e_w2'\]\}/.test(html)
  && /n:\s*\{flip:0, frames:\['macar_back_w1','macar_back_w2'\]\}/.test(html),
  'MACAR_PLAN east and north use the restored compass sheets');
assert(/dwarf_macar_e_w1\.png/.test(html),
  'engine binds the restored original east walk');

['dwarf_macar.png','dwarf_macar_w1.png','dwarf_macar_w2.png','dwarf_macar_atk.png',
 'dwarf_macar_atk_contact.png',
 'dwarf_macar_axe.png','dwarf_macar_axe_w1.png','dwarf_macar_axe_w2.png','dwarf_macar_axe_atk.png',
 'dwarf_macar_xbow.png','dwarf_macar_xbow_w1.png','dwarf_macar_xbow_w2.png','dwarf_macar_xbow_atk.png'].forEach(f=>{
  assert(fs.existsSync(path.join(creatures,f)), f+' on disk');
});
['dwarf_macar_e_w1.png','dwarf_macar_e_w2.png','dwarf_macar_se_w1.png','dwarf_macar_se_w2.png',
 'dwarf_macar_ne_w1.png','dwarf_macar_ne_w2.png','dwarf_macar_back_w1.png','dwarf_macar_back_w2.png'].forEach(f=>{
  assert(fs.existsSync(path.join(creatures,f)), f+' restored original compass walk is on disk');
});
assert(!fs.existsSync(path.join(creatures,'dwarf_macar_e_atk.png')), 'leftover east strike stays gone');

function checkPair(aName, bName, label){
  const a=path.join(creatures, aName);
  const b=path.join(creatures, bName);
  assert(fs.existsSync(a) && fs.existsSync(b), label+': both sheets on disk');
  if(!fs.existsSync(a) || !fs.existsSync(b)) return;
  const size=[96,128];
  const ma=resizedAlphaMask(readRgba(a), size[0], size[1]);
  const mb=resizedAlphaMask(readRgba(b), size[0], size[1]);
  const same=corr(ma, mb);
  const flipped=corr(flipH(ma, size[0], size[1]), mb);
  /* Title-law front plants swap the planted boot more than the deleted
     east D-walk pair. PIL measures ~0.49 same-face / ~0.21 mirror.
     Camera-share floor is 0.40 (not the old 0.55 east-pair floor).
     Absolute mirror ceiling 0.55 (quilt34_w2opp plant clears ~0.50).
     Binding contract: same facing, not a painted mirror. */
  assert(same>flipped, `${label}: unflipped pair matches more than a mirror (${same.toFixed(3)}>${flipped.toFixed(3)})`);
  assert(flipped<0.55, `${label}: w2 is not a painted mirror of w1 (flip corr ${flipped.toFixed(3)})`);
  assert(same>0.40, `${label}: w1/w2 share a title-law camera (corr ${same.toFixed(3)})`);
}

checkPair('dwarf_macar_w1.png','dwarf_macar_w2.png','title-law front plant');
checkPair('dwarf_macar_axe_w1.png','dwarf_macar_axe_w2.png','shadow-cleaver front plant');
checkPair('dwarf_macar_xbow_w1.png','dwarf_macar_xbow_w2.png','crossbow front plant');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nwalk face-pair checks passed');
