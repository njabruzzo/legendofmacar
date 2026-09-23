'use strict';
/**
 * Party orders: Hold, Regroup, Focus for living kin.
 * Ghosts ignore orders. Run: node src/systems/PartyOrders.test.js
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
  return Object.assign({id:20, team:'foe', dead:0, npc:0, ghost:0, name:'Cave Rat', x:12, y:4, hp:10}, extra||{});
}
function hostFor(leader, ents, extra){
  return Object.assign({
    leader:leader,
    ents:ents,
    partyForm:function(i, p){ return {x:p.x-1.1, y:p.y+0.15*i}; },
    formIndex:function(){ return 1; }
  }, extra||{});
}
function apart(a, b){
  return Math.hypot(a.x-b.x, a.y-b.y);
}

/* ---- module ---- */
assert(!!PO && typeof PO.issue==='function' && typeof PO.decide==='function' && typeof PO.commands==='function',
  'PartyOrders exports issue / decide / commands');
assert(typeof PO.settle==='function' && typeof PO.noteMoraleFlee==='function' && typeof PO.validFocus==='function',
  'PartyOrders exports settle, noteMoraleFlee, and validFocus');
assert(PO.FLAG===true && PO.use()===true, 'FLAG default is ON (rollback: FLAG=false or ?orders=0)');
assert(PO.VERBS.hold && PO.VERBS.regroup && PO.VERBS.focus, 'the three verbs are Hold, Regroup, Focus');
assert(SR.has('PartyOrders') && SR.get('PartyOrders')===PO, 'PartyOrders declares on SystemsReady');
assert(!/\be\.x\s*=/.test(src) && !/\be\.y\s*=/.test(src), 'PartyOrders does not assign actor world x/y');
assert(!/\.ghost\s*=/.test(src), 'PartyOrders never writes e.ghost');
assert(/null order does not intercept/.test(src), 'a null order leaves ghost follow on the host path');
assert(/Ghosts ignore PartyOrders/.test(src), 'ghosts are documented as ignoring PartyOrders');

PO.clear();
const mac={id:0, team:'party', hero:1, x:10, y:10, aim:null, dest:null};
const living=kin({id:2, ghost:0, x:18, y:10});
const ghost=kin({id:3, ghost:1, col:{key:'fendur'}, name:'FENDUR', x:16, y:12});
const rat=foe({id:21, x:14, y:10, name:'Cave Rat'});
const bat=foe({id:22, x:11, y:10.2, name:'Cave Bat'});
const ents=[mac, living, ghost, rat, bat];
const host=hostFor(mac, ents);

assert(PO.commands(living) && !PO.commands(ghost), 'living kin are commanded; ghosts ignore PartyOrders');
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
assert(held.ok && held.order==='hold' && PO.order()==='hold', 'Hold sets the pack order');
const holdDec=PO.decide(living, mac, host);
assert(holdDec.handled && holdDec.verb==='hold' && holdDec.advance===false && holdDec.defensive===true,
  'Hold tells living kin to stand');
const holdGhost=PO.decide(ghost, mac, host);
assert(holdGhost.handled===false && ghost.x===16 && ghost.ghost===1,
  'Hold does not command a ghost');
assert(living.x===18, 'Hold decide does not write kin coordinates');
living.ghost=1;
assert(PO.commands(living)===false && PO.decide(living, mac, host).handled===false,
  'a living kin who becomes a ghost drops the order');
living.ghost=0;
assert(PO.commands(living) && PO.decide(living, mac, host).verb==='hold',
  'other living kin keep Hold after a ghost drops out');
const corpse=kin({id:8, dead:1, x:12, y:10});
assert(!PO.commands(corpse) && PO.decide(corpse, mac, host).handled===false,
  'a kin who dies mid-order is not orderable');
const again=PO.issue('hold', host);
assert(again.cleared && again.order===null && PO.order()===null, 'Hold again clears back to follow');
assert(PO.decide(ghost, mac, host).handled===false, 'after clear, ghost follow is not intercepted');

/* ---- Regroup ---- */
PO.clear();
living.x=18; living.y=10; living.atk=0; living.ct=0; living.aim=null;
const reg=PO.issue('regroup', host);
assert(reg.ok && reg.order==='regroup', 'Regroup sets the pack order');
const regDec=PO.decide(living, mac, host);
assert(regDec.handled && regDec.verb==='regroup' && regDec.advance===true && regDec.form===false && regDec.goal,
  'Regroup paths toward Macar and is not a sticky formation');
assert(apart(regDec.goal, mac)<1.05 && apart(regDec.goal, mac)>0.4,
  'Regroup goal is an adjacent tile by Macar');
assert(apart(regDec.goal, living)>2, 'Regroup goal is not the far kin tile');
assert(PO.decide(ghost, mac, host).handled===false && ghost.ghost===1,
  'Regroup does not command a ghost');
assert(PO.settle(host)==='regroup', 'Regroup stays while a living kin is still out');
living.x=mac.x+0.4; living.y=mac.y;
const arrived=PO.decide(living, mac, host);
assert(arrived.arrived===true && arrived.advance===false, 'within ~1 tile, Regroup stops that kin');
assert(PO.settle(host)===null && PO.order()===null,
  'when every living kin is in, Regroup clears and follow resumes');
ghost.x=40; ghost.y=40;
PO.issue('regroup', host);
living.x=mac.x+0.2; living.y=mac.y;
assert(PO.settle(host)===null, 'a far ghost does not keep Regroup open');
living.x=18; living.y=10;
const other=kin({id:5, x:6, y:6, col:{key:'talpor'}});
ents.push(other);
PO.issue('regroup', host);
living.x=mac.x+0.3; living.y=mac.y;
assert(PO.settle(host)==='regroup' && PO.decide(other, mac, host).advance===true,
  'Regroup waits until the whole living pack is in');
PO.issue('hold', host);
living.atk=0.4; living.ct=0.2; living.aim=rat; living.x=rat.x-0.8; living.y=rat.y;
rat.x=living.x+0.8; rat.y=living.y;
PO.issue('regroup', host);
const fin=PO.decide(living, mac, host);
assert(fin.finishMelee===true && fin.advance===false && fin.foe && fin.foe.id===rat.id,
  'Regroup finishes a swing already in progress');
living.atk=0; living.ct=0;
const broken=PO.decide(living, mac, host);
assert(!broken.finishMelee && broken.advance===true && broken.goal,
  'after that swing, Regroup breaks toward Macar');
ents.pop();
assert(PO.issue('regroup', host).cleared===true && PO.order()===null, 'Regroup again clears to follow');

/* ---- Focus ---- */
PO.clear();
living.x=18; living.y=10; rat.dead=0; rat.ghost=0; rat.fleeTo=null; rat.hidden=0;
mac.aim=rat; mac.dest=null;
PO.noteTap(bat);
const foc=PO.issue('focus', host);
assert(foc.ok && foc.order==='focus' && foc.foe && foc.foe.id===bat.id && !foc.noop,
  'Focus prefers the tapped living foe over Macar\'s current aim');
const focDec=PO.decide(living, mac, host);
assert(focDec.handled && focDec.verb==='focus' && focDec.foe && focDec.foe.id===bat.id && focDec.advance===true,
  'Focus sends living kin at that foe');
assert(Math.abs(focDec.want-living.range)<1e-6, 'melee Focus closes to weapon reach');
assert(PO.decide(ghost, mac, host).handled===false, 'Focus does not command a ghost');
const bolt=kin({id:4, ranged:1, range:6.5, col:{key:'talpor'}, x:18, y:11});
const boltDec=PO.decide(bolt, mac, host);
assert(boltDec.handled && Math.abs(boltDec.want-6.5*0.7)<1e-6, 'ranged Focus holds off at 0.7 reach');
const blocker=foe({id:23, x:bolt.x+0.9, y:bolt.y, name:'Goblin'});
ents.push(blocker);
const blocked=PO.decide(bolt, mac, host);
assert(blocked.foe && blocked.foe.id===bat.id && blocked.blocker && blocked.blocker.id===blocker.id,
  'Focus keeps its foe and names a melee blocker without changing the target');
ents.pop();
PO.clear();
mac.aim=rat;
const focAim=PO.issue('focus', host);
assert(focAim.foe && focAim.foe.id===rat.id && !focAim.missing,
  'Focus with no tap uses Macar\'s current foe');
assert(PO.decide(living, mac, host).foe.id===rat.id, 'kin prioritize that current foe');
PO.issue('hold', host);
assert(PO.order()==='hold', 'a new verb replaces the prior pack order');
mac.aim=null; mac.dest=null;
PO.noteTap({id:9, team:'party', ghost:1, name:'FENDUR'});
PO.noteTap(mac);
PO.noteTap({id:3, kind:'door'});
PO.noteTap(foe({id:30, dead:1}));
PO.noteTap(foe({id:31, ghost:1, team:'foe'}));
const focNone=PO.issue('focus', host);
assert(focNone.ok && focNone.noop && focNone.missing && !focNone.foe && PO.order()==='hold',
  'Focus with no living foe no-ops and keeps the prior order');
assert(PO.decide(living, mac, host).verb==='hold', 'kin stay on Hold when Focus fails');
mac.dest={foe:rat.id};
const focMark=PO.issue('focus', host);
assert(focMark.order==='focus' && focMark.foe && focMark.foe.id===rat.id,
  'Focus uses the foe Macar has marked');
rat.dead=1;
assert(PO.settle(host)===null && PO.order()===null, 'Focus clears when the foe dies, and follow resumes');
rat.dead=0;
PO.noteTap(rat);
PO.issue('focus', host);
rat.fleeTo={x:1,y:1};
assert(PO.settle(host)===null, 'Focus clears when the foe flees');
rat.fleeTo=null;
PO.noteTap(rat);
PO.issue('focus', host);
rat.hidden=1;
assert(PO.settle(host)===null, 'Focus clears when the foe is gone');
rat.hidden=0;
const blind=hostFor(mac, ents, {known:function(){ return false; }});
PO.noteTap(rat);
const unseen=PO.issue('focus', blind);
assert(unseen.noop && PO.order()===null, 'an unknown foe is not a valid Focus designation');
PO.noteTap(rat);
PO.issue('focus', host);
assert(PO.settle(blind)===null, 'Focus clears when the foe leaves known combat');
assert(!PO.validFocus(mac) && !PO.validFocus({kind:'door'}) && !PO.validFocus(ghost)
  && !PO.validFocus(foe({dead:1})) && PO.validFocus(rat),
  'Focus target is one living foe, not Macar, a door, a ghost, or a corpse');
PO.noteTap(rat);
assert(PO.issue('focus', host).order==='focus', 'Focus can be issued again after it cleared');
assert(PO.issue('focus', host).order===null, 'Focus again clears to follow');
assert(PO.issue('charge', host).ok===false, 'unknown verbs are refused');

/* ---- morale ---- */
PO.clear();
PO.issue('hold', host);
assert(PO.noteMoraleFlee(ghost)===false && PO.order()==='hold',
  'a fleeing ghost does not clear the living pack order');
assert(PO.noteMoraleFlee(living)===true && PO.order()===null,
  'morale flee on a living kin clears the order so follow resumes');
PO.issue('focus', host);
assert(PO.order()==='focus', 'Focus can replace follow after morale cleared the pack');
assert(PO.noteMoraleFlee({team:'foe', fleeTo:{x:1,y:1}, col:{key:'rat'}})===false && PO.order()==='focus',
  'foe morale does not clear a party order');

/* ---- flag off ---- */
PO.clear();
PO.FLAG=false;
assert(PO.use()===false && PO.commands(living)===false, 'FLAG off stops commanding kin');
assert(PO.issue('hold', host).ok===false && PO.decide(living, mac, host).handled===false,
  'FLAG off issues nothing and does not handle');
assert(PO.noteMoraleFlee(living)===false && PO.settle(host)===null, 'FLAG off ignores morale and settle');
PO.FLAG=true;
PO.clear();

/* ---- host hold plants, melee only ---- */
const holdSrc=extractFn('holdKin');
assert(!/\be\.x\s*=/.test(holdSrc) && !/\be\.y\s*=/.test(holdSrc), 'holdKin does not assign world x/y');
assert(!/e\.defending\s*=/.test(holdSrc) && !/e\.guard\s*=/.test(holdSrc),
  'Hold does not raise the shield or the guard flag');
assert(/const reach=1\.5/.test(holdSrc) && !/e\.range/.test(holdSrc),
  'Hold reach is melee 1.5 and does not use ranged range');
const hctx={
  G:{ents:[]},
  dist:function(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); },
  faceToward(){},
  wornAttackCd(e){ return e.cd||1; }
};
vm.createContext(hctx);
vm.runInContext(holdSrc, hctx);
const planted=kin({x:3, y:4, moving:1, ix:2, iy:2, dest:{x:8,y:8}});
hctx.holdKin(planted);
assert(planted.x===3 && planted.y===4 && planted.moving===0 && planted.ix===0 && planted.iy===0 && planted.dest===null,
  'Hold plants the kin on their tile');
const near=foe({x:3.9, y:4.1, name:'Cave Rat'});
hctx.G.ents=[near];
const braced=kin({x:3, y:4, moving:1, atk:0, ct:0, atkMax:0.5, cd:1.1, range:6.5, ranged:1});
hctx.holdKin(braced);
assert(braced.x===3 && braced.y===4 && braced.moving===0 && braced.atk===0.5 && braced.aim && braced.aim.name==='Cave Rat',
  'Hold strikes a foe already in melee reach without stepping');
const far=foe({id:40, x:8, y:4, name:'Far Rat', aim:braced});
hctx.G.ents=[far];
const rooted=kin({x:3, y:4, moving:1, atk:0, ct:0, atkMax:0.5, range:6.5, ranged:1});
hctx.holdKin(rooted);
assert(rooted.moving===0 && rooted.atk===0 && rooted.x===3 && !rooted.aim,
  'Hold does not chase or shoot a foe outside melee');

/* ---- host wiring ---- */
assert(/src="src\/systems\/PartyOrders\.js"/.test(html), 'index includes PartyOrders.js');
assert(/ASSET_VER='114'/.test(html) && !/ASSET_VER='115'/.test(html), 'ASSET_VER is 114 — remat Talpor idle bw=344 (Nick CALL)');
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
assert(/PartyOrders\.settle\(/.test(html), 'the host settles Regroup and Focus each update');
assert(/PartyOrders\.noteMoraleFlee/.test(html), 'morale flee notifies PartyOrders');
assert(/partyHoldMelee\(e\)/.test(html), 'Hold does not loose a ranged shot');
assert(!/Focus armed/.test(html), 'a failed Focus does not arm an empty order');
assert(/kinCanAutoFight\(e\)&&foeInTheFight\(\)/.test(html),
  'auto-fight gate remains when no order handles the kin');
assert(/One-follower Follow default/.test(html), 'follow default remains when no order is set');
assert(/po\.verb==='hold'/.test(html) && /po\.verb==='regroup'/.test(html) && /po\.verb==='focus'/.test(html),
  'host branches Hold, Regroup, and Focus before auto-chase');
const holdAt=html.indexOf("po.verb==='hold'");
const followAt=html.indexOf('One-follower Follow default');
assert(holdAt>=0 && followAt>holdAt, 'follow default still runs after the order branches');
const regAt=html.indexOf("po.verb==='regroup'");
const fightAt=html.indexOf('else if(fight&&foe)');
assert(regAt>=0 && fightAt>regAt && !/tickFollower/.test(html.slice(regAt, fightAt)),
  'Regroup uses the order goal rather than the follow pilot');
assert(/PartyOrders\.clear\(\)/.test(html), 'a new chapter clears the order');
assert(!/key:'rally'/.test(html.match(/const HUDSKILLS=\[[\s\S]*?\];/)[0]),
  'order plates are not stuffed into HUDSKILLS and Rally stays off the bar');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nparty order checks passed');
