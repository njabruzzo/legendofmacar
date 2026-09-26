'use strict';
/**
 * Bone-crown animate dead: Macar leads the left party strip
 * with the same portrait / health card as the kin.
 * Run: node src/ui/AnimateDeadPartyHud.test.js
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

assert(/function partyPortraitList\(/.test(html), 'party strip has one membership list');
assert(/const party=partyPortraitList\(\)/.test(html), 'drawPortraitStack paints that list');
assert(/e\.hero \|\| e\.ghost \|\| e\.crushed/.test(html),
  'HUD portraits still include Macar plus fallen or ghost kin');
assert(/sheetHpNow\(e\)\+'\/'\+sheetHpMax\(e\)\+' hp/.test(html),
  'party cards share the kin health line');
assert(/ph\.key==='thrall'/.test(html), 'thrall card does not open a kin sheet');
const frame=extractFn('partyPortraitFrame');
assert(/partyPortraitList\(\)/.test(frame), 'the frame is sized from the same list');
assert(/partyPortraitFrame\(\)/.test(extractFn('drawPortraitStack')), 'cards are drawn in that frame');
assert(/drawPortraitStackTouch\(g, party, frame\)/.test(extractFn('drawPortraitStack')),
  'touch paints the same list as slim cards');

const ROSTER=[
  {key:'macar', name:'MACAR'},
  {key:'pordoom', name:'PORDUM'},
  {key:'fendur', name:'FENDUR'},
  {key:'orbo', name:'ORBO'},
  {key:'talpor', name:'TALPOR'}
];
function kin(key, extra){
  return Object.assign({
    id:key, team:'party', col:{key, name:key.toUpperCase()},
    name:key.toUpperCase(), hero:key==='macar', ghost:0, crushed:key!=='macar',
    dead:key!=='macar', hp:key==='macar'?168:0, maxhp:key==='macar'?168:120,
    cls:'f', lvl:3
  }, extra||{});
}
const ctx={
  G:{equipped:{}, ents:[], thrallId:null},
  ROSTER,
  Math, Object, String
};
vm.createContext(ctx);
['wearingBoneCrown','livingThrall','animateDeadPartyOn','portraitIdentity','partyPortraitList']
  .forEach(n=>vm.runInContext(extractFn(n)+';', ctx));

function keys(){
  return ctx.partyPortraitList().map(e=>e.thrall?'thrall':(e.col&&e.col.key));
}

ctx.G.ents=['macar','pordoom','fendur','orbo','talpor'].map(k=>kin(k));
ctx.G.equipped={};
ctx.G.thrallId=null;
assert(keys().join(',')==='macar,pordoom,fendur,orbo,talpor',
  'without the crown, Macar still leads the kin strip');

ctx.G.equipped={helmet:{n:'Bone Crown', boneCrown:1, animateDead:1}};
const mac=ctx.G.ents[0];
mac.hero=0; mac.ghost=0; mac.crushed=0; mac.dead=0;
assert(ctx.animateDeadPartyOn()===true, 'worn bone crown turns the party strip on');
assert(keys()[0]==='macar', 'crown flow puts Macar in the lead slot');
assert(keys().join(',')==='macar,pordoom,fendur,orbo,talpor',
  'crown flow keeps the kin cards after Macar');

const thrall={
  id:40, name:'Skeleton', kind:'undead', sprite:'undead', team:'party',
  thrall:1, dead:0, hp:64, maxhp:64, ally:1
};
ctx.G.thrallId=40;
ctx.G.ents.push(thrall);
const listed=ctx.partyPortraitList();
assert(listed[0]===mac, 'Macar is the first card while a thrall is up');
assert(listed[listed.length-1]===thrall, 'the raised dead is the last card on that strip');
assert(keys().join(',')==='macar,pordoom,fendur,orbo,talpor,thrall',
  'animate dead adds the thrall without dropping Macar or the kin');
const face=ctx.portraitIdentity(thrall);
assert(face.name==='SKELETON' && face.skin && face.beard, 'thrall card can paint a portrait');

ctx.G.equipped={};
assert(ctx.animateDeadPartyOn()===true, 'a living thrall keeps the strip on after the helm check');
assert(ctx.partyPortraitList()[0]===mac, 'thrall-only flow still leads with Macar');

ctx.G.thrallId=null;
thrall.dead=1;
mac.hero=0;
assert(ctx.animateDeadPartyOn()===false, 'no crown and no thrall leaves the flow off');
assert(keys().indexOf('macar')<0, 'Macar is not forced onto the strip outside animate dead');

const stack=extractFn('drawPortraitStack');
assert(/portraitIdentity\(e\)/.test(stack), 'every card, including the thrall, uses a portrait');
assert(/sheetHpNow\(e\)/.test(stack) && /hp/.test(stack), 'thrall cards use the kin health line');
assert(/e\.hero\)\{/.test(stack) && /GEAR/.test(stack), 'only Macar keeps the gear mark');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nAnimate-dead party HUD checks passed');
