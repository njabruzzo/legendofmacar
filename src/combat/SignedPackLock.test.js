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
  && /SPRITE_FILES\.hex='assets\/fx\/fx_hex\.png'/.test(html)
  && /SPRITE_FILES\.spit='assets\/fx\/fx_spit\.png'/.test(html),
  'bolt, flame, hex, and bile spit register as existing missile FX, not orbs');
assert(!/SPRITE_FILES\.spore=/.test(html) && !/assets\/fx\/fx_spore\.png/.test(html),
  'KILL: fx_spore flying mushroom rock is not bound');
assert(/s\.kind==='spit' && sprReady\('spit'\)/.test(html),
  'spit shots blit the bile glob when that sheet decodes');
assert(/SPRITE_FILES\.wisp='assets\/fx\/fx_wisp\.png'/.test(html)
  && /s\.kind==='wisp' && sprReady\('wisp'\)/.test(html),
  'wisp is the wraith/bat/ghost shot, not an orb');
assert(/e\.kind==='wraith'\|\|e\.kind==='bat'\|\|e\.kind==='ghost'/.test(html),
  'wraith, bat, and ghost already fire the wisp kind');
assert(/SPRITE_FILES\.heal='assets\/fx\/fx_heal\.png'/.test(html)
  && /function pulseHealFx\(/.test(html) && /function drawHealPulse\(/.test(html),
  'heal SIGN is Heal / Talpor pulse / Rally VFX, not a HUD icon');
assert(/pulseHealFx\(e\.x,e\.y\)/.test(html) && /pulseHealFx\(hu\.x,hu\.y\)/.test(html)
  && /key==='rally'[\s\S]{0,220}pulseHealFx/.test(html),
  'applyHeal, Talpor pulse, and Rally use the shard burst');
assert(!/icon_specialty/.test(html.match(/function pulseHealFx\([\s\S]*?\n\}/)[0]||''),
  'heal burst is not a Specialty HUD icon');
assert(!/tile_floor_heal/.test(html) && !/SPRITE_FILES\.heal_floor/.test(html),
  'floor tiles HOLD — no heal floor-tile bind');
const under=html.match(/const UNDERDARK=\[[\s\S]*?\];/)[0];
assert(/'goblin'/.test(under) && /SPRITE_FILES\[k\+'_dead'\]=src\.replace/.test(html),
  'Goblin A dead SIGN dest is mon_goblin_dead from the idle stem');
assert(!/24c41b43/.test(html),
  'HOLD: dagger-dead is not wired');
assert(/'goblin_king'/.test(under) && /spr:'goblin_king'/.test(html)
  && !/mon_goblin_b\.png/.test(html),
  'Goblin B dead SIGN dest is mon_goblin_king_dead, not mon_goblin_b');
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
