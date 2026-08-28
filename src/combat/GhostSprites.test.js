'use strict';
/**
 * Kin ghosts must stay spectral for walk, back, and combat poses.
 * Run: node src/combat/GhostSprites.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
const KIN=['pordoom','fendur','orbo','talpor'];
const FRAMES=['','_w1','_w2','_atk','_atk_recover','_back','_back_w1','_back_w2'];

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

KIN.forEach(k=>{
  FRAMES.forEach(suf=>{
    const file='dwarf_'+k+'_ghost'+(suf||'')+'.png';
    assert(fs.existsSync(path.join(__dirname,'../../assets/creatures/'+file)), file+' on disk');
    assert(html.indexOf(file)>=0 || html.indexOf(k+'_ghost'+suf)>=0, file+' registered');
  });
});

assert(/macarKey=\(k==='macar'\|\|k==='macar_axe'\)/.test(html), 'living Macar back-walk is not used for ghost kin');
assert(/wantsMeleeRecover\(e\)\) && SPR\[k\+'_atk'\]/.test(html) || /\(wantsMeleePose\(e\)\|\|wantsMeleeRecover\(e\)\)/.test(html),
  'ghost combat holds a ghost attack pose through follow-through');
assert(/pordoom_ghost_back_w1/.test(html) && /talpor_ghost_atk_recover/.test(html), 'ghost angled walk and recover keys preload');
assert(/DWARF_FACE_SX/.test(html) && /wantsSpriteFlip/.test(html), 'ghost kin use the same facing table as Macar');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nghost sprite checks passed');
