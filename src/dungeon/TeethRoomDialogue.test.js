'use strict';
/**
 * Teeth chapel: destroy leads the crown talk, electrum tooth
 * enters the pack, and the floor still paints readable fangs.
 * Run: node src/dungeon/TeethRoomDialogue.test.js
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

assert(/ASSET_VER='130'/.test(html) && !/ASSET_VER='115'/.test(html) && !/ASSET_VER='116'/.test(html),
  'ASSET_VER is 117');
assert(!/G\.scene='intro'/.test(html), 'new descent does not open the chapter intro');
assert(/function drawIntro\(g\)\{/.test(html), 'drawIntro remains in source but is not the player gate');
assert(/G\.scene='play'; G\.introT=99; G\._wantPlay=1/.test(html),
  'startChapter enters play and waits on world art');
assert(/\[-1\.85,1\.70\],\[-1\.85,-1\.70\],\[-3\.35,1\.85\],\[-3\.35,-1\.85\]/.test(html),
  'followers stand in a wide two-rank formation');
assert(/const need=2\.6\*\(i\+1\)/.test(html), 'trail slots keep followers apart while walking');
assert(/assets\/creatures\/dwarf_talpor_ghost\.png/.test(html),
  'Talpor drop-in slot is assets/creatures/dwarf_talpor_ghost.png');
assert(/assets\/tiles\/teeth_floor_hq\.png/.test(html)
  && !/SPRITE_FILES\.teeth_floor_hq/.test(html),
  'HQ teeth floor is a named slot and is not fetched until the file exists');
{
  const tile=extractFn('drawTeethTile');
  const field=tile.indexOf('teethCarpetStamp');
  const fang=tile.indexOf('drawProceduralFang');
  assert(field>0 && fang>field && !/\breturn\b/.test(tile.slice(field, fang)),
    'the fang field does not return before the readable tooth stamps');
}
assert(!fs.existsSync(path.join(__dirname,'../../assets/creatures/dwarf_macar_crown.png'))
  && !/macar_crown_w/.test(html)
  && !/SPRITE_FILES\.dwarf_macar_crowned=/.test(html)
  && !fs.existsSync(path.join(__dirname,'../../assets/creatures/dwarf_macar_crowned.png'))
  && /function drawWornBoneCrown\(/.test(html),
  'anchor lock: no crowned sheet; the bone crown is the worn prop drawn over the anchor Macar');

const labels=cs=>cs.map(c=>c.t);
const ctx={
  G:{
    equipped:{}, packs:{macar:{magic:[]}}, props:[], ents:[],
    lvl:{n:1, flags:{}}, talk:null
  },
  lines:[],
  player(){ return ctx.G.ents[0]||null; },
  dist(a,b){ return Math.hypot((a.x||0)-(b.x||0),(a.y||0)-(b.y||0)); },
  say(t){ ctx.lines.push(t); },
  hint(){}, burst(){}, shake(){},
  stowPackItem(it){ ctx.G.packs.macar.magic.push(it); return it; },
  convertCoinsToElectrum(){ ctx.converted=1; },
  NPC_TALK:{
    teeth_chapel_crown:{who:'BONE CROWN', line:'crown', choices:[{t:'Leave it.'}]},
    teeth_chapel_face:{who:'DEMON FACE', line:'face', choices:[{t:'Leave it.'}]}
  }
};
vm.createContext(ctx);
[
  'wearingBoneCrown','nearestBoneCrown','nearestDemonFace','chapelFaceToothTaken',
  'makeGrondTooth','crownWasDropped','teethCrownChoices','teethFaceChoices',
  'teethAltarLipHalf','teethAltarFootTiles','crownAltarTileDist','crownDropAtAltar',
  'dropBoneCrown','pryGrondTooth','livingThrall','isAnimateDeadEligible',
  'nearestAnimatableCorpse','primaryCrownPrompt'
].forEach(n=>vm.runInContext(extractFn(n)+';', ctx));

ctx.G.props=[{x:10,y:10,k:'bonecrown',gone:0}];
ctx.G.ents=[{hero:1,x:10,y:10.4}];
let choices=labels(ctx.teethCrownChoices());
assert(choices[0]==='Destroy the crown.' && choices[1]==='Take the bone crown.' && choices[2]==='Leave it.',
  'the first crown talk is destroy, then take, then leave');

ctx.G.lvl.flags.crownDropped=1;
choices=labels(ctx.teethCrownChoices());
assert(choices[0]==='Destroy the crown.' && choices[1]==='Take the bone crown.' && choices[2]==='Leave it.',
  'after a drop the crown talk is destroy, then take, then leave');
assert(/riseSkeletalDwarves\(where\)/.test(extractFn('destroyBoneCrown')),
  'destroy still raises the skeletal dwarves once');

ctx.G.equipped.helmet={id:'bone_crown', n:'Bone Crown', boneCrown:1};
ctx.G.lvl.flags.crownDropped=0;
choices=labels(ctx.teethCrownChoices());
assert(choices.indexOf('Drop the crown.')<0 && choices.indexOf('Leave it.')>=0
  && choices.indexOf('Destroy the crown.')<0,
  'while the crown is worn the talk does not offer drop or destroy');
assert(ctx.dropBoneCrown().ok===1 && ctx.G.equipped.helmet==null && ctx.G.lvl.flags.crownDropped===1,
  'inventory drop clears the helm and marks the crown dropped');

ctx.G.equipped.helmet={id:'bone_crown', n:'Bone Crown', boneCrown:1};
ctx.G.thrallId=41;
ctx.G.ents=[
  {hero:1, x:10, y:10},
  {id:40, name:'Goblin', kind:'goblin', team:'foe', dead:1, corpse:1, x:10.4, y:10.2, hp:0, maxhp:22},
  {id:41, name:'Orc', kind:'orc', team:'party', thrall:1, dead:0, thrallStay:0, x:11, y:10, hp:10, maxhp:10}
];
assert(ctx.nearestAnimatableCorpse(ctx.G.ents[0], 1.95)!=null, 'a corpse is in animate range');
assert(ctx.livingThrall() && ctx.dist(ctx.G.ents[0], ctx.livingThrall())<3.2, 'a living thrall is in stay range');
assert(ctx.primaryCrownPrompt(ctx.G.ents[0])==null,
  'a nearby corpse and thrall do not float a plate on the play field');
assert(!/return 'Animate the dead'/.test(html)
  && !/return 'Thrall: stay'/.test(html)
  && !/crownLab==='Animate the dead'/.test(html),
  'the floating Animate the dead prompt is gone');
assert(!/return 'Drop the bone crown'/.test(html) && !/crownLab==='Drop the bone crown'/.test(html),
  'the on-screen Drop the bone crown prompt is gone');
assert(/crownIt\.boneCrown/.test(html.match(/function dropPackRow[\s\S]*?\nfunction removePackRow/)[0])
  && /dropBoneCrown\(\)/.test(html.match(/function dropPackRow[\s\S]*?\nfunction removePackRow/)[0]),
  'inventory Drop of the worn crown calls dropBoneCrown');
assert(ctx.G.props.some(p=>p.k==='bonecrown' && !p.gone), 'drop puts the crown back in the room');

const face={x:12,y:4,k:'demonface',toothKind:'electrum',emptySocket:0,gone:0};
ctx.G.props.push(face);
ctx.G.ents[0].x=12; ctx.G.ents[0].y=5;
choices=labels(ctx.teethFaceChoices());
assert(choices.indexOf('Take the electrum tooth.')>=0 && choices.indexOf('Leave it.')>=0,
  'the demon face offers taking the electrum tooth');
const pry=ctx.pryGrondTooth(face, 'electrum');
assert(pry.ok===1 && pry.item.id==='grond_tooth_electrum', 'pry returns the electrum tooth');
assert(ctx.G.packs.macar.magic.some(it=>it&&it.id==='grond_tooth_electrum'),
  'the electrum tooth is in Macar\'s pack');
assert(ctx.G.lvl.flags.electrumTooth===1 && face.emptySocket===1, 'the socket is emptied once');
assert(/const quest=r\.it && \(r\.it\.quest \|\| r\.it\.grondTooth \|\| r\.it\.cat==='Quest'\)/.test(html)
  && /if\(quest && !G\.packSlotFilter\) return true/.test(html),
  'the electrum tooth stays on the default Gear inventory list');

const ALTAR_LINE='A bone crown rests on the bloody altar. It is yellowed, fitted for a dwarf brow, sticky where the blood has climbed.';
const FLOOR_LINE='A bone crown lies on the floor. It is yellowed, fitted for a dwarf brow, sticky where the blood has climbed.';
const WORN_LINE='The bone crown sits on Macar\'s brow. It is yellowed and cold, and it does not want to come off.';
assert(html.indexOf("line:'"+ALTAR_LINE+"'")>=0, 'the talk pack keeps the altar line');
ctx.Object=Object;
ctx.NPC_TALK.teeth_chapel_crown.line=ALTAR_LINE;
['isToyTalkKey','startTalkObj','startTalk','teethCrownOnAltarSeat','teethCrownLookLine','openTeethChapelLook']
  .forEach(n=>vm.runInContext(extractFn(n)+';', ctx));
const altar={x:102.25,y:4.35,k:'altar',teethAltar:1,gone:0};
const crownProp={x:altar.x,y:altar.y,k:'bonecrown',gone:0,taken:0,destroyed:0};
ctx.G.props=[altar, crownProp];
ctx.G.equipped.helmet=null;
ctx.G.lvl.flags={};
ctx.G.talk=null;
assert(ctx.openTeethChapelLook('teeth_chapel_crown')===true && ctx.G.talk.line===ALTAR_LINE,
  'a crown seated on the altar keeps the altar line');
ctx.G.talk=null;
ctx.G.lvl.flags.crownDropped=1;
crownProp.x=108; crownProp.y=10.55;
assert(!ctx.teethCrownOnAltarSeat(), 'a floor crown is not on the altar seat');
assert(ctx.openTeethChapelLook('teeth_chapel_crown')===true && ctx.G.talk.line===FLOOR_LINE,
  'a dropped crown on the floor reads the floor line');
ctx.G.talk=null;
ctx.G.equipped.helmet={id:'bone_crown', n:'Bone Crown', boneCrown:1};
ctx.G.ents=[{hero:1,x:altar.x,y:altar.y+0.8}];
ctx.G.lvl.flags={crownTaken:1, crownTouched:1, crownDropped:0};
crownProp.gone=1; crownProp.taken=1; crownProp.x=altar.x; crownProp.y=altar.y;
assert(ctx.dropBoneCrown().ok===1 && ctx.G.lvl.flags.crownDropped===0
  && crownProp.x===altar.x && crownProp.y===altar.y,
  'a near drop re-seats the crown on the altar');
ctx.G.talk=null;
assert(ctx.openTeethChapelLook('teeth_chapel_crown')===true && ctx.G.talk.line===ALTAR_LINE,
  'a re-seated crown reads the altar line');
ctx.G.talk=null;
ctx.G.equipped.helmet={id:'bone_crown', n:'Bone Crown', boneCrown:1};
ctx.G.lvl.flags.crownDropped=1;
crownProp.x=108; crownProp.y=10.55; crownProp.gone=0; crownProp.taken=0;
assert(ctx.openTeethChapelLook('teeth_chapel_crown')===true && ctx.G.talk.line===WORN_LINE,
  'a worn crown reads the brow line');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nteeth room dialogue checks passed');
