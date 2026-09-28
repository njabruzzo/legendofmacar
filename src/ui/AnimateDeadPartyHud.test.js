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
['wearingBoneCrown','livingThrall','animateDeadPartyOn','portraitIdentity','partyRaisedAllies','partyPortraitList']
  .forEach(n=>vm.runInContext(extractFn(n)+';', ctx));

function keys(){
  return ctx.partyPortraitList().map(e=>{
    if(e.thrall) return 'thrall';
    if(e.name==='Skeletal Dwarf') return 'skeletal';
    return e.col&&e.col.key;
  });
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

thrall.hp=11;
assert(ctx.partyPortraitList().some(e=>e===thrall && e.hp===11),
  'the raised-dead card reads the creature\'s current hp');
const foeSkel={id:70, name:'Skeletal Dwarf', team:'foe', ally:0, dead:0, hp:16, maxhp:16};
ctx.G.ents.push(foeSkel);
assert(ctx.partyPortraitList().indexOf(foeSkel)<0,
  'a crown-raised skeletal dwarf is a foe and has no party card');
const allySkel={id:71, name:'Skeletal Dwarf', team:'party', ally:1, dead:0, hp:9, maxhp:16};
ctx.G.ents.push(allySkel);
const withAlly=ctx.partyPortraitList();
assert(withAlly.indexOf(allySkel)>4 && withAlly.indexOf(allySkel)<withAlly.indexOf(thrall),
  'an allied skeletal dwarf cards under the kin, ahead of the thrall');
allySkel.hp=4;
assert(ctx.partyPortraitList().some(e=>e===allySkel && e.hp===4),
  'the allied skeletal card reads current hp');
allySkel.dead=1;
assert(ctx.partyPortraitList().indexOf(allySkel)<0,
  'a dead allied skeletal dwarf leaves the column');
thrall.dead=1;
assert(ctx.partyPortraitList().indexOf(thrall)<0,
  'a dead thrall drops out of the column even if its id is still set');
ctx.G.thrallId=null;
mac.hero=0;
assert(ctx.animateDeadPartyOn()===false, 'no crown and no thrall leaves the flow off');
assert(keys().indexOf('macar')<0, 'Macar is not forced onto the strip outside animate dead');

const stack=extractFn('drawPortraitStack');
assert(/portraitIdentity\(e\)/.test(stack), 'every card, including the thrall, uses a portrait');
assert(/sheetHpNow\(e\)/.test(stack) && /hp/.test(stack), 'thrall cards use the kin health line');
assert(/e\.hero\)\{/.test(stack) && /GEAR/.test(stack), 'only Macar keeps the gear mark');
assert(/UI\.hudTop/.test(extractFn('partyPortraitFrame')),
  'phone party cards, including a raised dead, stop above the action bar');
const touch=extractFn('drawPortraitStackTouch');
assert(/party\.forEach/.test(touch) && /col\.name/.test(touch) && /e\.hp/.test(touch),
  'touch raised-dead cards use the kin face, name, and hp bar');
assert(/sheetHpNow\(e\)/.test(touch) && /effectiveAC\(e\)/.test(touch),
  'touch raised-dead cards also show hp numbers and AC');
assert(/!e\.col && PORT/.test(touch),
  'landscape touch thrall cards omit the hp line and keep the kin bar');

assert(/miniRect\(\)/.test(extractFn('partyPortraitFrame'))
  && /touchPanelRect\(160\)/.test(extractFn('partyPortraitFrame')),
  'phone landscape keeps the raised-dead column clear of the minimap and the log');

const H=require('./HudHarness');
H.ctx.wearingBoneCrown=function(){ return true; };
function rectGap(a, b){
  const dx=Math.max(b.x-(a.x+a.w), a.x-(b.x+b.w), 0);
  const dy=Math.max(b.y-(a.y+a.h), a.y-(b.y+b.h), 0);
  if(dx===0 && dy===0) return -1;
  return Math.hypot(dx, dy);
}
[
  ['phone L 844×390', 844, 390, {t:0,r:0,b:0,l:0}],
  ['phone L notch', 844, 390, {t:0,r:47,b:21,l:47}],
  ['SE L 667×375', 667, 375, {t:0,r:0,b:0,l:0}],
  ['Pro Max L 932×430', 932, 430, {t:0,r:59,b:21,l:59}]
].forEach(([name, vw, vh, inset])=>{
  const L=H.layout({vw:vw, vh:vh, inset:inset, touch:true, cards:6});
  const f=L.frame;
  assert(f.n===6 && f.cards.length===6, name+' lays out the raised-dead card under the kin');
  const mini={x:L.mini.x, y:L.mini.y, w:L.mini.sz, h:L.mini.sz};
  const T=L.tabs;
  const tabs={x:T.log.x, y:T.y, w:T.obj.x+T.obj.w-T.log.x, h:T.h};
  const panel=L.panel(160);
  let miniG=Infinity, tabG=Infinity, logG=Infinity;
  f.cards.forEach(c=>{
    miniG=Math.min(miniG, rectGap(c, mini));
    tabG=Math.min(tabG, rectGap(c, tabs));
    logG=Math.min(logG, rectGap(c, panel));
  });
  assert(miniG>=8 && tabG>=8 && logG>=8,
    name+' raised-dead column clears minimap '+miniG.toFixed(1)
    +'px, log tabs '+tabG.toFixed(1)+'px, open log '+logG.toFixed(1)+'px');
});

const kinLand=H.layout({vw:844, vh:390, touch:true, cards:6});
const raisedLand=H.layout({vw:844, vh:390, touch:true, cards:6, raised:true});
assert(raisedLand.frame.h===kinLand.frame.h && raisedLand.frame.cards.every(c=>c.h===kinLand.frame.h),
  'phone landscape thrall card matches the kin card height ('+raisedLand.frame.h+'px)');
const raisedPort=H.layout({vw:390, vh:844, touch:true, cards:6, raised:true});
assert(raisedPort.frame.h===40, 'phone portrait still gives the raised card room for the hp line');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nAnimate-dead party HUD checks passed');
