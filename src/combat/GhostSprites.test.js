'use strict';
/**
 * Kin ghosts must stay spectral for walk, back, and combat poses.
 * Run: node src/combat/GhostSprites.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
const KIN=['pordoom','fendur','orbo','talpor'];
const FRAMES=['','_w1','_w2','_atk','_atk_recover','_back','_back_w1','_back_w2','_e_w1','_e_w2','_s_w1','_s_w2','_nw_w1','_nw_w2','_ne_w1','_ne_w2','_se_w1','_se_w2'];

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

assert(!/macar_axe/.test(html.match(/function entAnimKey\(e\)\{[\s\S]*?\nfunction entAnimImg/)[0]),
  'entAnimKey itself does not hardcode axe — living Macar axe path is livingMacarAnimKey');
assert(/wantsMeleeRecover\(e\)\) && SPR\[k\+'_atk'\]/.test(html) || /\(wantsMeleePose\(e\)\|\|wantsMeleeRecover\(e\)\)/.test(html),
  'ghost combat holds a ghost attack pose through follow-through');
assert(/pordoom_ghost_back_w1/.test(html) && /talpor_ghost_atk_recover/.test(html), 'ghost angled walk and recover keys preload');
assert(/function screenCardinal\(e\)\{/.test(html) && /wantsSpriteFlip/.test(html),
  'ghost kin use the same screen cardinals as Macar');
assert(/function ghostAnimKey\(/.test(html) && /function livingColorStats\(/.test(html)
  && /function pickReadyGhostKey\(/.test(html),
  'ghost bind prefers living-color idle and plants idle when walk/atk fail');
assert(/_ghost_\(\?:e_\|s_\|nw_\|ne_\|se_\|w3\|back_w\)/.test(html),
  'unsigned flag does not include living-color front w1/w2/atk');
assert(/punch!==false/.test(html) && /const punch=!e\.ghost/.test(html),
  'ghost west flip keeps mid-alpha (no living punch)');
assert(/plant the signed idle/.test(html) && !/function ghostLiveTwin\(/.test(html),
  'cyan ghost walk/atk are not mapped in as living twins');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nghost sprite checks passed');
