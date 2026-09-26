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

assert(/ASSET_VER='122'/.test(html) && !/ASSET_VER='115'/.test(html) && !/ASSET_VER='116'/.test(html),
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
  && !/dwarf_macar_crown/.test(html) && !/macar_crown_w/.test(html),
  'no crowned-walk sheet exists; worn crown stays an overlay');

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
  'dropBoneCrown','pryGrondTooth'
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
assert(choices[0]==='Drop the crown.' && choices.indexOf('Destroy the crown.')<0,
  'while the crown is worn the talk offers drop, not destroy');
assert(ctx.dropBoneCrown().ok===1 && ctx.G.equipped.helmet==null && ctx.G.lvl.flags.crownDropped===1,
  'drop clears the helm and marks the crown dropped');
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

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nteeth room dialogue checks passed');
