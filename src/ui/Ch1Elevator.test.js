'use strict';
/**
 * Chapter I elevator: center pillar ruby on door touch, lever after guardians.
 * Run: node src/ui/Ch1Elevator.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

const ch1=html.match(/if\(n===1\)\{[\s\S]*?if\(n===2\)\{/)[0];
assert(/\{x:36\.5,y:21\.5,k:'lift'\}/.test(ch1), 'Ch1 still places the lift at the chamber center');
assert(/\{x:36\.5,y:21\.5,k:'pillar'\}/.test(ch1), 'Ch1 places a center-room pillar on the lift from the start');
assert(!/G\.props\.push\(\{x:36\.5,y:21\.5,k:'rubypillar'\}\)/.test(ch1),
  'cleared no longer late-spawns a stacked rubypillar on the lift');
assert(!/A pillar has appeared in the middle of this chamber/.test(html),
  'copy no longer claims the pillar appears only after the guardians fall');

assert(/function ch1CenterPillar\(p\)\{/.test(html) && /function ch1PillarHasRuby\(p\)\{/.test(html),
  'center-pillar helpers exist');
assert(/function ensureCh1CenterPillar\(\)\{/.test(html), 'old saves can grow the missing center pillar');
assert(/function rubyGuardiansLeft\(\)\{/.test(html), 'cleared counts ruby guardians, not optional lair packs');
assert(/e\.rubyDrop \|\| e\.kind==='statue'/.test(html.match(/function rubyGuardiansLeft\(\)\{[\s\S]*?\n\}/)[0]),
  'rubyGuardiansLeft keys off the six door statues');
assert(/!L\.flags\.cleared && !rubyGuardiansLeft\(\)/.test(ch1),
  'Ch1 cleared no longer uses map-wide foesLeft');
assert(/L\.flags\.boss&&!L\.flags\.done&&!foesLeft\(\)/.test(html),
  'later chapters still use foesLeft for their own bosses');

const wake=html.match(/function wakeRubyDoor\(\)\{[\s\S]*?\n\}/)[0];
assert(/L\.flags\.touched=1/.test(wake) && /FOE\.statue\(\)/.test(wake),
  'door touch still sets touched and wakes the six guardians');
assert(/ensureCh1CenterPillar\(\)/.test(wake), 'door touch keeps a center pillar to hang the ruby on');
assert(/QUILL_CH1_SAY\.rubypillar_appears/.test(wake),
  'door touch tells the player the center pillar gained a ruby');
assert(/Stone rises in the middle of the chamber\. A ruby waits on it, dark and waiting\. An iron lever stands ready beside it\./.test(html),
  'rubypillar_appears names the lever beside the pillar');
assert(!/A red ruby seats itself on the pillar/.test(html),
  'stock ruby-seats say is replaced by rubypillar_appears');
assert(/then pull the elevator lever/.test(wake), 'wake hint still sends the player to the lever after the fight');
assert(/then:\(\)=>wakeRubyDoor\(\)/.test(html), 'ruby_door talk still wakes only on Lay a hand');

assert(/if\(ch1PillarHasRuby\(p\)\) drawCh1PillarRuby/.test(html),
  'the center pillar draws a red ruby only after flags.touched');
assert(/function drawCutRuby\(g,x,y,w,h,on,z\)\{/.test(html),
  'the pedestal ruby is a cut-stone draw, not a single blob');
assert(/function drawCh1PillarRuby\(g,s,z,p\)\{/.test(html.match(/function drawCh1PillarRuby\(g,s,z,p\)\{[\s\S]*?\nfunction drawCh1LiftLever/)[0]) &&
  /drawCutRuby\(g,0,gy-11\*z,26\*z,32\*z,1,z\)/.test(html),
  'the seated ruby uses drawCutRuby in an iron bezel');
assert(/rear=\[\[-10\.2,-2\.0\]/.test(html) && /front=\[\[-8\.4,1\.8\]/.test(html),
  'the pedestal ruby sits in claw prongs on the cap');
assert(/function drawCh1LiftLever\(g,z,ready\)\{/.test(html),
  'the Ch1 lift always paints a readable lever');
assert(/function paintCh1LiftLever\(g,z\)\{/.test(html) && /G\.lvl\.n===1\) drawCh1LiftLever/.test(html),
  'the lever overlay is Chapter I only');
assert(/if\(ch1CenterPillar\(p\)\) paintCh1LiftLever/.test(html),
  'the lever also paints on the center pillar so the shaft does not bury it');
assert(/function ch1LiftLeverSheet\(ready\)\{/.test(html),
  'painted lever sheets are chosen before the procedural fallback');
assert(/SPRITE_FILES\.ch1_lift_lever='assets\/props\/prop_ch1_lift_lever\.png'/.test(html),
  'rest lever is registered in SPRITE_FILES');
assert(/SPRITE_FILES\.ch1_lift_lever_thrown='assets\/props\/prop_ch1_lift_lever_thrown\.png'/.test(html),
  'thrown lever is a separate painted sheet');
assert(fs.existsSync(path.join(__dirname,'../../assets/props/prop_ch1_lift_lever.png')),
  'rest lever png is on disk');
assert(fs.existsSync(path.join(__dirname,'../../assets/props/prop_ch1_lift_lever_thrown.png')),
  'thrown lever png is on disk');
assert(/Disney SIGNED rest \/ thrown/.test(html),
  'lever sheets are the Disney SIGNED bind, with a procedural fallback');
assert(/SPRITE_FILES\.ch1_pillar_ruby='assets\/props\/prop_ch1_pillar_ruby\.png'/.test(html),
  'pillar ruby is registered in SPRITE_FILES');
assert(fs.existsSync(path.join(__dirname,'../../assets/props/prop_ch1_pillar_ruby.png')),
  'signed pillar ruby png is on disk');
assert(/SPR\.ch1_pillar_ruby/.test(html) && /signedRuby&&signedRuby\.width/.test(html),
  'pillar ruby blits the Disney SIGNED sheet and keeps the cut gem if it misses');
const lever=html.match(/function drawCh1LiftLever\(g,z,ready\)\{[\s\S]*?\nfunction drawFacetGem/)[0];
assert(/g\.translate\(26\*z,10\*z\)/.test(lever) && /g\.scale\(1\.35,1\.35\)/.test(lever),
  'the lever sits on the SE rim beside the pillar at a readable scale');
assert(/g\.drawImage\(img,-W\*0\.47,-H,W,H\)/.test(lever),
  'a loaded sheet is blitted at the plate, not drawn as a UI knob');
assert(/rivets=\[\[-6\.2,-3\.2\]/.test(lever), 'the fallback lever mounts on a riveted iron plate');
assert(/g\.rotate\(thrown\?-1\.08:0\.58\)/.test(lever), 'the procedural lever still throws when elevReady');
assert(/moveTo\(-2\.6\*z,3\*z\).*lineTo\(-1\.45\*z,-26\*z\)/.test(lever),
  'the fallback arm is a tapered forged shaft');
assert(/g\.fill\('evenodd'\)/.test(lever),
  'the fallback grip is an open iron ring');
assert(!/#c9a070/.test(lever) && !/#d01828/.test(lever),
  'the fallback grip is not a tan or ruby UI ball');
assert(/function drawFacetGem\(g,x,y,w,h,on,z\)\{/.test(html),
  'door and loot gems keep the shared drawFacetGem fallback');

assert(/interact\('Pull the lever',\(\)=>startTalk\('ch1_lift_pull'\)/.test(ch1),
  'Pull the lever opens the lever talk and does not descend inline');
assert(/interact\('Touch the ruby pillar',\(\)=>startTalk\('rubypillar_touch'\)/.test(ch1),
  'Touch the ruby pillar after the lever opens the descent talk');
assert(/interact\('Touch the ruby pillar',\(\)=>startTalk\('rubypillar_touch_locked'\)/.test(ch1),
  'Touch the ruby pillar before the lever opens the locked talk');
assert(/startTalk\('ch1_lift_pull_spent'\)/.test(ch1),
  'a thrown lever opens the spent talk');
assert(/!L\.flags\.cleared\) return null/.test(html.match(/function ch1ElevatorPrompt\(p\)\{[\s\S]*?\n\}/)[0]),
  'Pull the lever is gated on guardians cleared, not door touch');
const throwFn=html.match(/function throwCh1LiftLever\(\)\{[\s\S]*?\n\}/)[0];
assert(/L\.flags\.leverThrown=1/.test(throwFn) && !/elevReady\s*=/.test(throwFn),
  'Throw it sets leverThrown and does not set elevReady');
const descentFn=html.match(/function beginCh1ElevatorDescent\(\)\{[\s\S]*?\n\}/)[0];
assert(/if\(!L\.flags\.leverThrown\) return false/.test(descentFn) && /L\.flags\.elevReady=1/.test(descentFn)
  && /L\.flags\.elevatorGone=1/.test(descentFn),
  'descent sets the house ride flag and elevatorGone only after the lever is thrown');
assert(/QUILL_CH1_SAY\.elevator_descent/.test(descentFn),
  'successful descent says elevator_descent');
assert(/QUILL_CH1_SAY\.rubydoor_cleared/.test(ch1),
  'the last guardian says rubydoor_cleared');
assert(!/The elevator lever is free/.test(html), 'stock lever-is-free say is gone');
assert(!/begins its descent into the depths/.test(html), 'stock descent say is replaced');
assert(/The ruby flares\. Far below, iron groans\. The elevator begins its descent into the dark\./.test(html),
  'elevator_descent is Quill\'s line');
assert(/interact\('Ride the elevator down',\(\)=>\{L\.objs\[3\]\.d=1; endChapter\(\);\}/.test(ch1),
  'ride still ends the chapter after elevReady');
assert(/ch1LeverShownThrown\(\)/.test(html.match(/function paintCh1LiftLever\(g,z\)\{[\s\S]*?\n\}/)[0]),
  'the thrown sheet follows the lever flag, and elevReady still counts as thrown');
assert(/flags: clone\(L\.flags \|\| \{\}\)/.test(fs.readFileSync(path.join(__dirname,'../saves/GameSave.js'),'utf8')),
  'leverThrown on L.flags persists with the level');
assert(/function endChapter\(\)\{ G\.cleared\[G\.ch\]=1/.test(html), 'endChapter is unchanged');

assert(/ensureCh1CenterPillar\(\)/.test(html.match(/function applyPlaySave\(play\)\{[\s\S]*?\n\}/)[0]),
  'reload grows a missing center pillar so old books keep the lever');

/* ---- helpers: ruby is a door-touch graphic, not a cleared spawn ---- */
const helperSrc=html.match(/function ch1CenterPillar\(p\)\{[\s\S]*?function wakeRubyDoor\(\)\{/)[0]
  .replace(/function wakeRubyDoor\(\)\{/,'');
const ctx={G:{lvl:{n:1,flags:{}},props:[]}};
vm.createContext(ctx);
vm.runInContext(helperSrc+'; this.ch1CenterPillar=ch1CenterPillar; this.ch1PillarHasRuby=ch1PillarHasRuby; this.ensureCh1CenterPillar=ensureCh1CenterPillar; this.rubyGuardiansLeft=rubyGuardiansLeft;', ctx);

const center={x:36.5,y:21.5,k:'pillar'};
const hall={x:26.5,y:12.5,k:'pillar'};
assert(ctx.ch1CenterPillar(center)===true && ctx.ch1CenterPillar(hall)===false,
  'only the lift-tile pillar is the ruby socket');
assert(ctx.ch1PillarHasRuby(center)===false, 'plain pillar has no ruby before the door is touched');
ctx.G.lvl.flags.touched=1;
assert(ctx.ch1PillarHasRuby(center)===true && ctx.ch1PillarHasRuby(hall)===false,
  'door touch lights the center pillar ruby only');
ctx.G.lvl.n=2;
assert(ctx.ch1PillarHasRuby(center)===false, 'later chapters do not inherit the Ch1 ruby socket');
ctx.G.lvl.n=1;

ctx.G.props=[{x:36.5,y:21.5,k:'lift'}];
const grown=ctx.ensureCh1CenterPillar();
assert(grown && grown.k==='pillar' && ctx.G.props.filter(ctx.ch1CenterPillar).length===1,
  'ensure plants exactly one center pillar when a save is missing it');
assert(ctx.ensureCh1CenterPillar()===grown, 'ensure is idempotent');

ctx.G.ents=[
  {team:'foe',kind:'statue',rubyDrop:1,dead:0},
  {team:'foe',kind:'rat',dead:0,npc:0}
];
assert(ctx.rubyGuardiansLeft()===true, 'a living statue still blocks cleared');
ctx.G.ents[0].dead=1;
assert(ctx.rubyGuardiansLeft()===false, 'optional rats do not keep the elevator locked');

/* ---- Nick lock: lever, then pillar. Either one alone does not descend. ---- */
function extractFn(name){
  const start=html.indexOf('function '+name+'(');
  if(start<0) throw new Error('missing '+name);
  let i=html.indexOf('{', start), depth=0;
  for(;i<html.length;i++){
    if(html[i]==='{') depth++;
    else if(html[i]==='}'){ depth--; if(depth===0) return html.slice(start, i+1); }
  }
  throw new Error('unclosed '+name);
}
const DESCENT='The ruby flares. Far below, iron groans. The elevator begins its descent into the dark.';
const BITE='The lever bites home. Far below, something wakes — but the cage does not move. The ruby on the pillar burns a shade brighter.';
const LOCKED='Cold. Dead weight. Something iron nearby still holds the dark shut.';
const seq={
  G:{lvl:{n:1,flags:{cleared:1,touched:1},lights:[],objs:[{},{},{},{d:0}]}},
  said:[], hints:[],
  say(t){ seq.said.push(t); },
  hint(t){ seq.hints.push(t); },
  shake(){},
  QUILL_CH1_SAY:{elevator_descent:DESCENT, leverThrown:BITE, rubypillar_touch_locked:LOCKED},
  dist(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }
};
vm.createContext(seq);
['ch1HubAnchor','ch1LeverAnchor','throwCh1LiftLever','beginCh1ElevatorDescent','touchCh1RubyPillar','ch1ElevatorPrompt'].forEach(n=>{
  vm.runInContext(extractFn(n)+'\nthis.'+n+'='+n+';', seq);
});
const atPillar={x:36.5,y:21.5};
const atLever={x:37.15,y:22.05};
assert(seq.ch1ElevatorPrompt(atPillar).action==='pillar_locked', 'standing on the pillar offers the locked touch before the lever');
assert(seq.touchCh1RubyPillar()===false && !seq.G.lvl.flags.elevReady && !seq.G.lvl.flags.leverThrown,
  'pillar-first does not descend');
assert(seq.said.indexOf(LOCKED)>=0 && seq.said.indexOf(DESCENT)<0,
  'pillar-first says the locked line and not elevator_descent');
assert(seq.ch1ElevatorPrompt(atLever).action==='lever', 'standing on the lever offers Pull');
assert(seq.throwCh1LiftLever()===true && seq.G.lvl.flags.leverThrown===1 && !seq.G.lvl.flags.elevReady && !seq.G.lvl.flags.elevatorGone,
  'lever-only sets leverThrown and does not descend');
assert(seq.said.indexOf(BITE)>=0 && seq.said.indexOf(DESCENT)<0,
  'lever-only says the bite-home line and not elevator_descent');
assert(seq.ch1ElevatorPrompt(atLever).action==='lever_spent', 'a thrown lever offers the spent talk');
assert(seq.throwCh1LiftLever()===false, 'the lever cannot be thrown twice');
assert(seq.ch1ElevatorPrompt(atPillar).action==='pillar', 'after the throw the pillar is the armed touch');
assert(seq.touchCh1RubyPillar()===true && seq.G.lvl.flags.elevReady===1 && seq.G.lvl.flags.elevatorGone===1,
  'lever then pillar descends');
assert(seq.said[seq.said.length-1]===DESCENT, 'successful descent says elevator_descent');
assert(seq.touchCh1RubyPillar()===false, 'a second touch does not descend again');
seq.G.lvl.flags={touched:1,leverThrown:0,cleared:0};
seq.G.lvl.lights=[];
assert(seq.ch1ElevatorPrompt(atPillar)===null && seq.throwCh1LiftLever()===false,
  'before the guardians fall, neither the prompt nor the throw descends');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nChapter I elevator checks passed');
