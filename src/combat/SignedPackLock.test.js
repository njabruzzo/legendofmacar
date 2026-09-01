'use strict';
/**
 * Limner signed-pack locks (rat scale, bolt/flame, hex KILL, glowcap).
 * Run: node src/combat/SignedPackLock.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

const spriteH=html.match(/function entSpriteH\(e,z\)\{[\s\S]*?\nfunction /)[0];
assert(/e\.kind==='goblin'[\s\S]*\|\|e\.kind==='rat'/.test(spriteH)
  || /e\.kind==='rat'[\s\S]*return 68\*z/.test(spriteH),
  'rat blits at goblin height (68*z)');
assert(!/e\.kind==='rat'\|\|e\.kind==='bat'/.test(spriteH),
  'rat is no longer in the 48*z vermin bucket');

assert(/kind:'rat'[\s\S]{0,120}scale:\.82/.test(html) && /kind:'goblin'[\s\S]{0,120}scale:\.82/.test(html),
  'FOE rat scale matches goblin .82');
assert(/rat:\{n:'Cave Rat'[\s\S]*?sc:\.82/.test(html),
  'BESTIARY rat sc matches goblin-scale idle');

const dead=html.match(/function drawDeadBillboard\(g,e,img,z\)\{[\s\S]*?\nfunction /)[0];
assert(/const liveH=entSpriteH\(e,z\)/.test(dead),
  'dead sheet uses that creature\'s living height, not a dwarf box');
assert(!/entSpriteH\(\{kind:'dwarf'\},z\)/.test(dead),
  'rat dead is not stretched to dwarf size');

assert(/SPRITE_FILES\.bolt='assets\/fx\/fx_bolt\.png'/.test(html)
  && /SPRITE_FILES\.flame='assets\/fx\/fx_flame\.png'/.test(html)
  && /SPRITE_FILES\.hex='assets\/fx\/fx_hex\.png'/.test(html),
  'bolt, flame, and iron-shard hex register as existing missile FX, not orbs');
assert(!/SPRITE_FILES\.fx_hex/.test(html),
  'KILL: hardware-nut fx_hex key is not used');
assert(/function shotSprite\(s\)\{/.test(html)
  && /s\.kind==='hex' && sprReady\('hex'\)/.test(html),
  'hex shots blit the iron shard when that sheet decodes');
assert(/s\.kind==='flame' && sprReady\('flame'\)/.test(html)
  && /sprReady\('bolt'\)/.test(html),
  'flame pairs with signed bolt when those sheets decode');
assert(/if\(!shotSprite\(s\)\) emit\(/.test(html),
  'painted bolt/flame do not keep the orb emit halo');

assert(/glowcap:'assets\/props\/prop_glowcap\.png'/.test(html),
  'glowcap still overwrites the existing prop key');
const glowEmit=/k==='glowcap'[\s\S]{0,200}emit\(/;
assert(!glowEmit.test(html),
  'glowcap does not spawn floating spore/light orbs');

assert(/SPRITE_FILES\.secret_wall_n='assets\/tiles\/secret_wall_n\.png'/.test(html)
  && /SPRITE_FILES\.secret_wall_e=/.test(html)
  && /SPRITE_FILES\.secret_wall_w=/.test(html),
  'secret faces are wall tiles, not a door sprite');
assert(!/SPRITE_FILES\.secret_wall_s/.test(html),
  'NEVER a south secret-wall sheet');
assert(/function markSecretProps\(L\)\{\s*\/\* Closed secret/.test(html)
  || /not a door billboard/.test(html),
  'do not introduce a secret-door prop');

assert(/drow_mage:'assets\/creatures\/mon_drow_mage\.png'/.test(html),
  'mage idle SIGN binds as mon_drow_mage, not a new mage key');
assert(!/:'assets\/creatures\/mon_mage\.png'/.test(html)
  && !/SPRITE_FILES\.mage=/.test(html),
  'filename lock: no mon_mage.png dest');
assert(/sprite:'drow_mage'/.test(html) && /spr:'drow_mage'/.test(html),
  'FOE/BESTIARY mage keep the drow_mage sprite');
assert(/'drow_matron'/.test(html) && /spr:'drow_matron'/.test(html),
  'female matron SIGN binds as existing drow_matron SPR');
assert(!/24ca7b46/.test(html),
  'KILL: male matron sheet is not wired');
assert(!/function drawMatronPlinth/.test(html) && !/k:'matron_base'/.test(html),
  'no in-game matron plinth/base prop');

assert(/intro_ch1:'assets\/ui\/intro_ch1\.jpg'/.test(html)
  && /intro_cavein:'assets\/ui\/intro_cavein\.jpg'/.test(html),
  'signed intros dest to intro_ch1 and intro_cavein only');
assert(/Do not touch ch2/.test(html),
  'ch2–ch5 chapter stills stay out of this signed pack');
const ui=path.join(__dirname,'../../assets/ui');
const stills={
  'intro_ch2.jpg':242510,
  'intro_ch3.jpg':366936,
  'intro_ch4.jpg':406627,
  'intro_ch5.jpg':305718
};
Object.keys(stills).forEach(n=>{
  const sz=fs.statSync(path.join(ui,n)).size;
  assert(sz===stills[n], n+' left untouched (size '+sz+')');
});

assert(/LIVING_MACAR_KEYS=\{/.test(html) && /macar_w1:1/.test(html),
  'walk sheets stay parked — living Macar still uses the front pair only');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nsigned pack locks passed');
