'use strict';
/**
 * Party orders: Hold, Regroup, Focus for up roster kin.
 * Run: node src/systems/PartyOrders.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.join(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const src=fs.readFileSync(path.join(__dirname,'PartyOrders.js'),'utf8');

require('./SystemsReady.js');
require('./PartyOrders.js');
const PO=globalThis.PartyOrders;
const SR=globalThis.SystemsReady;

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}
function extractFn(name){
  const re=new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}');
  const m=html.match(re);
  if(!m) throw new Error('missing '+name);
  return m[0];
}

function kin(extra){
  return Object.assign({
    id:1, team:'party', hero:0, dead:0, ghost:0, crushed:0, sleeping:0, tied:0, hidden:0,
    col:{key:'pordoom'}, name:'PORDUM', x:4, y:4, range:1.15, sp:4, r:0.36,
    atk:0, atkMax:0.42, ct:0, cd:1, defending:0, ix:1, iy:1, moving:1, dest:{x:9,y:9}
  }, extra||{});
}
function foe(extra){
  return Object.assign({id:20, team:'foe', dead:0, npc:0, name:'Cave Rat', x:12, y:4, hp:10}, extra||{});
}
function hostFor(leader, ents){
  return {
    leader:leader,
    ents:ents,
    partyForm:function(i, p){ return {x:p.x-1.1, y:p.y+0.15*i}; },
    formIndex:function(){ return 1; }
  };
}

/* ---- module ---- */
assert(!!PO && typeof PO.issue==='function' && typeof PO.decide==='function' && typeof PO.commands==='function',
  'PartyOrders exports issue / decide / commands');
assert(PO.FLAG===true && PO.use()===true, 'FLAG default is ON (rollback: FLAG=false or ?orders=0)');
assert(PO.VERBS.hold && PO.VERBS.regroup && PO.VERBS.focus, 'the three verbs are Hold, Regroup, Focus');
assert(SR.has('PartyOrders') && SR.get('PartyOrders')===PO, 'PartyOrders declares on SystemsReady');
assert(!/\be\.x\s*=/.test(src) && !/\be\.y\s*=/.test(src), 'PartyOrders does not assign actor world x/y');
assert(!/\.ghost\s*=/.test(src), 'PartyOrders never writes e.ghost');
assert(/null order does not intercept/.test(src), 'a null order leaves ghost follow on the host path');

PO.clear();
const mac={id:0, team:'party', hero:1, x:10, y:10, aim:null, dest:null};
const living=kin({id:2, ghost:0, x:18, y:10});
const ghost=kin({id:3, ghost:1, col:{key:'fendur'}, name:'FENDUR', x:16, y:12});
const rat=foe({id:21, x:14, y:10, name:'Cave Rat'});
const bat=foe({id:22, x:11, y:10.2, name:'Cave Bat'});
const ents=[mac, living, ghost, rat, bat];
const host=hostFor(mac, ents);

assert(PO.commands(living) && PO.commands(ghost), 'up living kin and Book I ghosts are commanded');
assert(!PO.commands(mac), 'Macar is not an ordered kin');
assert(!PO.commands(kin({dead:1})) && !PO.commands(kin({crushed:1})) && !PO.commands(kin({sleeping:1}))
  && !PO.commands(kin({tied:1})) && !PO.commands(kin({hidden:1})),
  'dead / crushed / sleeping / tied / hidden kin are not commanded');
assert(!PO.commands({team:'party', kind:'gnome', col:{key:'x'}, name:'PIP'}), 'gnome allies are not commanded');
assert(!PO.commands({team:'neutral', npc:1, name:'Noz', col:{key:'noz'}}), 'Noz is not commanded');
assert(PO.decide(ghost, mac, host).handled===false && ghost.x===16 && ghost.ghost===1,
  'no order: decide does not handle a ghost and does not move or un-ghost them');
assert(PO.decide(living, mac, host).handled===false, 'no order: living kin stay on auto follow/fight');

/* ---- Hold ---- */
const held=PO.issue('hold', host);
assert(held.ok && held.order==='hold' && PO.order()==='hold', 'Hold sets the party order');
const holdDec=PO.decide(living, mac, host);
assert(holdDec.handled && holdDec.verb==='hold' && holdDec.advance===false && holdDec.defensive===true,
  'Hold tells kin not to advance');
const holdGhost=PO.decide(ghost, mac, host);
assert(holdGhost.handled && holdGhost.verb==='hold' && ghost.x===16 && ghost.ghost===1,
  'Hold commands a ghost without moving them or clearing ghost');
assert(living.x===18, 'Hold decide does not write kin coordinates');
const again=PO.issue('hold', host);
assert(again.cleared && again.order===null && PO.order()===null, 'Hold again clears back to follow');
assert(PO.decide(ghost, mac, host).handled===false, 'after clear, ghost follow is not intercepted');

/* ---- Regroup ---- */
PO.clear();
const reg=PO.issue('regroup', host);
assert(reg.ok && reg.order==='regroup', 'Regroup sets the party order');
const regDec=PO.decide(living, mac, host);
assert(regDec.handled && regDec.verb==='regroup' && regDec.form===true && regDec.goal,
  'Regroup returns a formation goal');
assert(Math.hypot(regDec.goal.x-mac.x, regDec.goal.y-mac.y)<3,
  'Regroup goal is on Macar, not the kin\'s far tile');
assert(Math.hypot(regDec.goal.x-living.x, regDec.goal.y-living.y)>2,
  'Regroup goal is not the kin\'s current tile when they are away');
const regGhost=PO.decide(ghost, mac, host);
assert(regGhost.handled && regGhost.verb==='regroup' && regGhost.goal && ghost.ghost===1,
  'Regroup forms a ghost kin without clearing ghost');
assert(PO.issue('regroup', host).cleared===true && PO.order()===null, 'Regroup again clears to follow');

/* ---- Focus ---- */
PO.clear();
mac.aim=rat;
PO.noteTap(bat);
const foc=PO.issue('focus', host);
assert(foc.ok && foc.order==='focus' && foc.foe && foc.foe.id===bat.id,
  'Focus prefers the tapped foe over Macar\'s current aim');
const focDec=PO.decide(living, mac, host);
assert(focDec.handled && focDec.verb==='focus' && focDec.foe && focDec.foe.id===bat.id && focDec.advance===true,
  'Focus sends kin at the tapped foe');
assert(Math.abs(focDec.want-living.range)<1e-6, 'melee Focus closes to weapon reach');
const bolt=kin({id:4, ranged:1, range:6.5, col:{key:'talpor'}});
const boltDec=PO.decide(bolt, mac, host);
assert(boltDec.handled && Math.abs(boltDec.want-6.5*0.7)<1e-6, 'ranged Focus holds off at 0.7 reach');
PO.clear();
mac.aim=rat;
const focAim=PO.issue('focus', host);
assert(focAim.foe && focAim.foe.id===rat.id && !focAim.missing,
  'Focus with no tap uses Macar\'s current foe');
assert(PO.decide(living, mac, host).foe.id===rat.id, 'kin prioritize that current foe');
PO.clear();
mac.aim=null;
mac.dest=null;
const focNone=PO.issue('focus', host);
assert(focNone.ok && focNone.missing && !focNone.foe, 'Focus with no foe stays armed and names none');
const wait=PO.decide(living, mac, host);
assert(wait.handled && wait.verb==='focus' && wait.advance===false && wait.wait && !wait.foe,
  'Focus with no foe does not send kin at their own nearest');
assert(PO.issue('focus', host).order===null, 'Focus again clears to follow');
assert(PO.issue('charge', host).ok===false, 'unknown verbs are refused');

/* ---- flag off ---- */
PO.clear();
PO.FLAG=false;
assert(PO.use()===false && PO.commands(living)===false, 'FLAG off stops commanding kin');
assert(PO.issue('hold', host).ok===false && PO.decide(living, mac, host).handled===false,
  'FLAG off issues nothing and does not handle');
PO.FLAG=true;
PO.clear();

/* ---- host hold plants, does not step ---- */
const holdSrc=extractFn('holdKin');
assert(!/\be\.x\s*=/.test(holdSrc) && !/\be\.y\s*=/.test(holdSrc), 'holdKin does not assign world x/y');
assert(!/e\.defending\s*=/.test(holdSrc) && !/e\.guard\s*=/.test(holdSrc),
  'Hold does not raise the shield or the guard flag');
const hctx={
  nearestFoe(){ return null; },
  faceToward(){},
  wornAttackCd(e){ return e.cd||1; }
};
vm.createContext(hctx);
vm.runInContext(holdSrc, hctx);
const planted=kin({x:3, y:4, moving:1, ix:2, iy:2, dest:{x:8,y:8}});
hctx.holdKin(planted);
assert(planted.x===3 && planted.y===4 && planted.moving===0 && planted.ix===0 && planted.iy===0 && planted.dest===null,
  'Hold plants the kin on their tile');
hctx.nearestFoe=function(){ return {team:'foe', x:3.2, y:4.1, dead:0, hp:8, name:'Cave Rat'}; };
const braced=kin({x:3, y:4, moving:1, atk:0, ct:0, atkMax:0.5, cd:1.1});
hctx.holdKin(braced);
assert(braced.x===3 && braced.y===4 && braced.moving===0 && braced.atk===0.5 && braced.aim && braced.aim.name==='Cave Rat',
  'Hold strikes a foe already in reach without stepping');

/* ---- host wiring ---- */
assert(/src="src\/systems\/PartyOrders\.js"/.test(html), 'index includes PartyOrders.js');
assert(/ASSET_VER='109'/.test(html) && !/ASSET_VER='110'/.test(html), 'ASSET_VER stays 109');
assert(/\{key:'hold', ico:'hold', label:'Hold'\}/.test(html)
  && /\{key:'regroup', ico:'regroup', label:'Regroup'\}/.test(html)
  && /\{key:'focus', ico:'focus', label:'Focus'\}/.test(html),
  'HUD plates read Hold, Regroup, and Focus');
assert(/function layoutPartyOrders\(/.test(html), 'order plates are laid out for desktop and mobile');
assert(/mobile\?HUD_TAP/.test(extractFn('layoutPartyOrders')), 'touch order plates use the 44px HUD_TAP floor');
assert(/if\(k==='h'\) fire\('hold'\)/.test(html) && /if\(k==='y'\) fire\('regroup'\)/.test(html)
  && /if\(k==='z'\) fire\('focus'\)/.test(html),
  'H Hold, Y Regroup, Z Focus');
assert(/H Hold  ·  Y Regroup  ·  Z Focus/.test(html), 'pause key list names the three orders');
assert(/key==='hold'\|\|key==='regroup'\|\|key==='focus'/.test(html), 'fire() issues the three orders');
assert(/PartyOrders\.noteTap/.test(html), 'a tapped foe is remembered for Focus');
assert(/kinCanAutoFight\(e\)&&foeInTheFight\(\)/.test(html),
  'auto-fight gate remains when no order handles the kin');
assert(/One-follower Follow default/.test(html), 'follow default remains when no order is set');
assert(/po\.verb==='hold'/.test(html) && /po\.verb==='regroup'/.test(html) && /po\.verb==='focus'/.test(html),
  'host branches Hold, Regroup, and Focus before auto-chase');
const holdAt=html.indexOf("po.verb==='hold'");
const followAt=html.indexOf('One-follower Follow default');
assert(holdAt>=0 && followAt>holdAt, 'follow default still runs after the order branches');
assert(/PartyOrders\.clear\(\)/.test(html), 'a new chapter clears the order');
assert(!/key:'rally'/.test(html.match(/const HUDSKILLS=\[[\s\S]*?\];/)[0]),
  'order plates are not stuffed into HUDSKILLS and Rally stays off the bar');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nparty order checks passed');
