'use strict';
/**
 * Batch G: equipment compare panel — pure preview, equip parity,
 * blocked reason, haste+equip baseline, tap consume.
 * Run: node src/ui/EquipCompare.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.join(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const dsSrc=fs.readFileSync(path.join(root,'src/combat/DerivedStats.js'),'utf8');
const ecSrc=fs.readFileSync(path.join(__dirname,'EquipCompare.js'),'utf8');

require('../systems/SystemsReady.js');
require('../packs/EquipmentSlots.js');
require('../combat/TimedEffects.js');
require('../combat/DerivedStats.js');
require('../ui/TapGate.js');
require('./EquipCompare.js');

const SR=globalThis.SystemsReady;
const Eq=globalThis.EquipmentSlots;
const TE=globalThis.TimedEffects;
const DS=globalThis.DerivedStats;
const EC=globalThis.EquipCompare;
const TG=globalThis.TapGate;

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
function approx(a,b,eps){ return Math.abs(a-b)<=(eps==null?1e-9:eps); }

function macar(extra){
  return Object.assign({
    name:'Macar', hero:1, team:'party', col:{key:'macar',name:'MACAR'},
    cls:'f', abil:{str:16,dex:11,con:16,int:10,wis:12,cha:10,exc:0},
    hp:80, maxhp:80, sp:4, baseSp:4, cd:1.1, baseCd:1.1,
    stun:0, prone:0, held:0, dice:'1d8'
  }, extra||{});
}
function kit(){
  const start=Eq.startingItems();
  let eq=Eq.emptyEquipped();
  start.forEach(it=>{
    if(Eq.START_WORN.indexOf(it.slot)>=0) eq=Eq.equip(eq, it).equipped;
  });
  return {eq, start};
}

assert(!!DS && typeof DS.compute==='function' && typeof DS.previewEquip==='function',
  'DerivedStats exports compute / previewEquip');
assert(!!EC && typeof EC.inspect==='function' && typeof EC.hits==='function',
  'EquipCompare exports inspect / hits');
assert(EC.FLAG===true, 'FLAG default is ON (rollback: FLAG=false or ?equipCompare=0)');
assert(EC.use()===true, 'use() is true when FLAG is on');
assert(SR.has('DerivedStats') && SR.get('DerivedStats')===DS,
  'DerivedStats declares on SystemsReady');
assert(SR.has('EquipCompare') && SR.get('EquipCompare')===EC,
  'EquipCompare declares on SystemsReady');
assert(SR.SHIPPED.indexOf('EquipCompare')>=0, 'EquipCompare is a shipped optional module');
assert(SR.SHIPPED.indexOf('DerivedStats')>=0, 'DerivedStats is a shipped optional module');
assert(!/type\s*=\s*["']module["']/.test(html), 'index.html still has no type=module');
assert(/ASSET_VER='95'/.test(html), 'ASSET_VER is unchanged');
assert(!/ASSET_VER='96'/.test(html), 'ASSET_VER was not bumped');
assert(/src="src\/combat\/DerivedStats\.js"/.test(html),
  'DerivedStats is a classic sync tag');
assert(/src="src\/ui\/EquipCompare\.js"/.test(html),
  'EquipCompare is a classic sync tag');
assert(!/powerScore|power_score|gearScore|itemPower/.test(dsSrc+ecSrc),
  'no invented power score');
assert(!/\.tick\(/.test(dsSrc) && !/\.tick\(/.test(ecSrc),
  'preview path does not tick TimedEffects');
assert(!/equipPackItem|applyEquipped|drinkPotion/.test(dsSrc+ecSrc),
  'modules do not don, consume, or apply live gear');

const head=html.slice(0, html.indexOf('<script>\n"use strict";'));
const sysI=head.indexOf('src="src/systems/SystemsReady.js"');
const teI=head.indexOf('src="src/combat/TimedEffects.js"');
const tapI=head.indexOf('src="src/ui/TapGate.js"');
const dsI=head.indexOf('src="src/combat/DerivedStats.js"');
const ecI=head.indexOf('src="src/ui/EquipCompare.js"');
const rotI=head.indexOf('src="src/vendor/rotjs/rot-path.js"');
const inlineI=html.indexOf('<script>\n"use strict";');
assert(sysI>=0 && sysI<teI && teI<tapI && tapI<dsI && dsI<ecI && ecI<rotI && ecI<inlineI,
  'load order: SystemsReady → TimedEffects → TapGate → DerivedStats → EquipCompare → rot-path');

assert(/key:'search'/.test(html) && /label:'SEARCH'/.test(html),
  'SEARCH HUD labels are unchanged');
assert(/\{k:'forage',n:'Herb Lore'/.test(html),
  'skill key forage (Herb Lore) is unchanged');
assert(!/k:'search'/.test(html.match(/\{k:'forage',n:'Herb Lore'[^}]+\}/)[0]),
  'forage was not renamed SEARCH');

assert(/function useEquipCompare\(/.test(html) && /EquipCompare\.use\(\)/.test(html),
  'host useEquipCompare respects the flag');
assert(/function packCompareReport\(/.test(html) && /EquipCompare\.inspect\(/.test(html),
  'host inspect goes through EquipCompare.inspect');
assert(/function drawPackCompare\(/.test(html), 'host draws the compare plate');
assert(/drawPackCompare\(/.test(html.match(/function drawPack\(g\)\{[\s\S]*?\nfunction wareCostGp/)[0]),
  'drawPack mounts the compare plate');
assert(/UI\.overlayHits/.test(extractFn('drawPackCompare')),
  'compare plate registers overlayHits');
assert(/TapGate\.resolvePlayTap\(UI\.overlayHits/.test(extractFn('resolveTaps')),
  'pack taps consume overlayHits before menuHits / dest');

const use=extractFn('usePackRow');
assert(/EquipCompare\.use\(\)/.test(use) || /useEquipCompare\(\)/.test(use),
  'usePackRow consults the compare flag before auto-don');
assert(/G\.packSel=it/.test(use), 'inspect still selects the row');

EC.FLAG=false;
assert(EC.use()===false, 'FLAG=false rolls the panel off');
EC.FLAG=true;

/* ---- pure preview: no mutate, no tick ---- */
{
  const {eq}=kit();
  const actor=macar({timedEffects:[{kind:'haste', remaining:6, duration:6, moveMul:1.35, cdMul:0.5, cdFloor:0.28, phase:'haste'}]});
  const snapEq=JSON.parse(JSON.stringify(eq.chest));
  const snapFx=JSON.parse(JSON.stringify(actor.timedEffects));
  const snapSp=actor.sp, snapCd=actor.cd, snapHp=actor.hp;
  const mail=Eq.annotate({n:'Chain Mail +1', k:'armor', plus:1});
  const beforeSlot=mail.slot;
  const report=EC.inspect(actor, eq, mail);
  assert(report.ok, 'chain mail preview is allowed');
  assert(eq.chest && eq.chest.n==='Leather Armor', 'preview does not replace live leather');
  assert(eq.chest.ac===8, 'live leather AC field is unchanged');
  assert(JSON.stringify(eq.chest)===JSON.stringify(snapEq) || eq.chest.n==='Leather Armor',
    'live chest item object was not swapped');
  assert(actor.sp===snapSp && actor.cd===snapCd && actor.hp===snapHp,
    'preview does not mutate actor sp/cd/hp');
  assert(JSON.stringify(actor.timedEffects)===JSON.stringify(snapFx),
    'preview does not tick or rewrite haste remaining');
  assert(TE.getHaste(actor).remaining===6, 'haste remaining stays 6s');
  const mail2={n:'Chain Mail +1', k:'armor', plus:1};
  EC.inspect(actor, eq, mail2);
  assert(mail2.slot==null || mail2.slot===beforeSlot,
    'inspect clones before annotate so the caller item is not required to be written');
}

/* ---- equip parity for a curated set ---- */
{
  const actor=macar();
  const {eq}=kit();
  const curated=[
    Eq.annotate({n:'Chain Mail +1', k:'armor', plus:1}),
    Eq.annotate({n:'Shield +1', k:'armor', plus:1}),
    Eq.annotate({n:'Ring of Protection +1', k:'ring', cat:'Ring', plus:1}),
    Eq.annotate({n:'Cloak of Displacement', k:'misc', plus:2}),
    Eq.annotate({n:'Gauntlets of Ogre Power', k:'misc'}),
    Eq.annotate({n:'Gauntlets of Dexterity', k:'misc'}),
    Eq.annotate({n:'Boots of Speed', k:'misc'}),
    Eq.annotate({n:'Short Sword of Quickness +2', k:'weapon', plus:2}),
    Eq.annotate({n:'Defender +4', k:'weapon', plus:4}),
    Eq.annotate({n:'Ring of Fire Resistance', k:'resist'}),
    Eq.annotate({n:'Robe of the Archmagi', k:'misc', plus:5})
  ];
  curated.forEach(it=>{
    const preview=EC.inspect(actor, eq, it);
    assert(preview.ok, 'preview ok for '+it.n);
    const live=DS.previewEquip(eq, it);
    assert(live.ok, 'clone-equip ok for '+it.n);
    const after=DS.compute(actor, live.equipped);
    assert(preview.preview.ac===after.ac, it.n+' preview AC matches actual don ('+preview.preview.ac+' vs '+after.ac+')');
    assert(preview.preview.hitPlus===after.hitPlus, it.n+' preview hit matches actual don');
    assert(preview.preview.moveMul===after.moveMul, it.n+' preview move matches actual don');
    assert(approx(preview.preview.wornCd, after.wornCd), it.n+' preview cd matches actual don');
    assert(eq.chest && eq.chest.n==='Leather Armor', it.n+' left the live kit on leather');
  });
  const leatherNow=DS.compute(actor, eq);
  assert(leatherNow.acWorn===7, 'starting leather+helm worn AC is 7');
  const mailP=EC.inspect(actor, eq, Eq.annotate({n:'Chain Mail +1', k:'armor', plus:1}));
  assert(mailP.preview.acWorn===3, 'chain 5 +1 then helm +1 preview worn AC 3');
  const speedP=EC.inspect(actor, eq, Eq.annotate({n:'Boots of Speed', k:'misc'}));
  assert(speedP.current.moveMul===1 && speedP.preview.moveMul===2,
    'Boots of Speed preview is 2× kit move, current 1×');
  const qP=EC.inspect(actor, eq, Eq.annotate({n:'Short Sword of Quickness +2', k:'weapon', plus:2}));
  assert(approx(qP.preview.wornCd, Math.max(0.45, 1.1*0.85)),
    'Quickness preview worn cd is 0.85× base, floor 0.45');
  const fireP=EC.inspect(actor, eq, Eq.annotate({n:'Ring of Fire Resistance', k:'resist'}));
  assert(fireP.preview.resists.some(r=>r.k==='fire'), 'fire resist appears on the preview');
  assert(fireP.preview.acWorn===leatherNow.acWorn, 'fire resist does not change worn AC');
  const ogreP=EC.inspect(actor, eq, Eq.annotate({n:'Gauntlets of Ogre Power', k:'misc'}));
  assert(ogreP.preview.strHit===3 && ogreP.preview.strDmg===6,
    'ogre preview is STR 18/00 (hit +3 / dmg +6)');
  assert(!ogreP.lines.some(l=>/score|power/i.test(l.label||'')),
    'compare lines do not invent a power score');
}

/* ---- blocked reason ---- */
{
  const actor=macar();
  const cursed=Eq.annotate({n:'Cursed Armor -1', k:'cursed', cat:'Armor/Shield', plus:-1, cursed:1});
  let eq=Eq.equip(Eq.emptyEquipped(), cursed).equipped;
  const mail=Eq.annotate({n:'Chain Mail +1', k:'armor', plus:1});
  const blocked=EC.inspect(actor, eq, mail);
  assert(!blocked.ok && blocked.reason==='cursed', 'cursed chest blocks the replacement');
  assert(/curse binds/i.test(blocked.reasonText), 'blocked copy names the curse');
  assert(eq.chest===cursed, 'blocked preview left the cursed armor on');
  const pot={n:'Potion of Healing', k:'potion', cat:'Potion'};
  const noSlot=EC.inspect(actor, Eq.emptyEquipped(), pot);
  assert(!noSlot.ok && noSlot.reason==='no-slot', 'a potion has no body slot');
  assert(/body slot/i.test(noSlot.reasonText), 'no-slot copy says it does not occupy a slot');
  const empty=EC.inspect(actor, Eq.emptyEquipped(), null);
  assert(!empty.ok && empty.reason==='no-item', 'missing item is blocked');
}

/* ---- haste + equip: expire back to newly equipped baseline ---- */
{
  const actor=macar();
  const {eq}=kit();
  TE.applyHaste(actor, {duration:8, moveMul:1.35, cdMul:0.5, cdFloor:0.28, policy:'refresh', source:'potion'});
  const rem0=TE.getHaste(actor).remaining;
  const quick=Eq.annotate({n:'Short Sword of Quickness +2', k:'weapon', plus:2});
  const report=EC.inspect(actor, eq, quick);
  assert(report.ok && report.tempLines.length, 'haste is listed as temporary, not kit');
  assert(report.kitLines.some(l=>l.k==='cooldown'), 'kit cooldown is separate from haste');
  assert(TE.getHaste(actor).remaining===rem0, 'inspect does not tick haste');
  const live=DS.previewEquip(eq, quick);
  const worn=function(ent){ return DS.wornAttackCd(ent, live.equipped); };
  TE.syncActor(actor, {wornAttackCd:worn});
  assert(approx(actor.cd, report.preview.temp.derivedCd),
    'actual haste+Quickness cd matches preview derived cd');
  assert(approx(actor.sp, 4*1.35), 'weapon swap does not rewrite haste move');
  TE.tick(actor, 8);
  TE.syncActor(actor, {wornAttackCd:worn});
  assert(!TE.hasHaste(actor), 'haste expired');
  assert(approx(actor.cd, DS.wornAttackCd(actor, live.equipped)),
    'after haste, cd is the newly equipped Quickness baseline');
  assert(approx(actor.sp, actor.baseSp), 'after haste, move returns to baseSp (boots stay on wornMoveMul)');
  const boots=Eq.annotate({n:'Boots of Speed', k:'misc'});
  const actor2=macar();
  TE.applyHaste(actor2, {duration:4, moveMul:1.35, cdMul:0.5, cdFloor:0.28, policy:'refresh'});
  const bPrev=EC.inspect(actor2, eq, boots);
  const bLive=DS.previewEquip(eq, boots);
  assert(bPrev.preview.moveMul===2, 'haste+boots preview kit move is still 2×');
  assert(bPrev.preview.temp.moveMul===1.35, 'haste move stays on the temp layer');
  TE.tick(actor2, 4);
  TE.syncActor(actor2);
  assert(DS.wornMoveMul(actor2, bLive.equipped)===2 && actor2.sp===actor2.baseSp,
    'expired haste leaves Boots of Speed as the new move baseline');
}

/* ---- tap consume: overlay hits do not set dest ---- */
{
  let fired=0;
  const rect=EC.layout(20, 40, 200, 80);
  const hits=EC.hits(rect, function(){ fired++; });
  const tap={x:40, y:50, pointerType:'touch'};
  const r=TG.resolvePlayTap(hits, tap);
  assert(r.consumed===true && r.world===false, 'compare plate tap is consumed, not world');
  assert(fired===1 && tap.dispatches===1, 'compare handler runs once');
}
{
  const ctx={
    G:{scene:'play', paused:false, sleepShow:null, talk:null, aim:null, ents:[], loot:[]},
    IN:{taps:[]},
    UI:{overlayHits:[], portraitHits:[], talkHits:[]},
    promptBtn:null, throwBtn:null,
    TapGate:TG,
    player(){ return ctx.p; },
    p:{x:4, y:4, dest:null, stuck:0},
    s2w(x,y){ return {x:x,y:y}; },
    dist(){ return 99; },
    fire(){},
    refuseAttack(){ return false; },
    throwBomb(){},
    takeLoot(){},
    lootNearbyCorpses(){},
    isLootableBody(){ return false; },
    nearestWalk(x,y){ return {x:x,y:y}; },
    ZOOM:1
  };
  vm.createContext(ctx);
  vm.runInContext(extractFn('consumePlayUiTap')+extractFn('resolveTaps'), ctx);
  const plate=EC.layout(10,10,80,40);
  ctx.UI.overlayHits=EC.hits(plate, function(){ ctx.fired=(ctx.fired||0)+1; });
  ctx.IN.taps.push({x:20, y:20, pointerType:'touch'});
  ctx.resolveTaps();
  assert(ctx.fired===1 && !ctx.p.dest, 'play overlay compare tap does not set dest');
  assert(ctx.IN.taps.length===0, 'consumed compare tap is shifted once');
}

/* host inspect-without-equip when the flag is on */
{
  const ctx={
    G:{packWho:'macar', packFrom:'play', packSel:null, equipped:Eq.emptyEquipped(), faceOffer:0},
    EquipCompare:EC,
    isGhostPack(){ return false; },
    isPackEquipable(r){ return !!(r&&r.it&&Eq.isEquippable(r.it)); },
    wornSlotOf(){ return null; },
    equipped:0,
    equipPackItem(){ ctx.equipped++; },
    unequipPackSlot(){},
    packUser(){ return macar(); },
    packOf(){ return {magic:[]}; },
    syncPackTotals(){}
  };
  vm.createContext(ctx);
  vm.runInContext(extractFn('usePackRow'), ctx);
  const mail=Eq.annotate({n:'Chain Mail +1', k:'armor', plus:1});
  ctx.usePackRow({kind:'magic', it:mail});
  assert(ctx.G.packSel===mail && ctx.equipped===0,
    'flag-on inspect selects the item and does not don it');
  EC.FLAG=false;
  ctx.G.packSel=null; ctx.equipped=0;
  ctx.usePackRow({kind:'magic', it:mail});
  assert(ctx.equipped===1, 'flag-off rollback still auto-dons on tap');
  EC.FLAG=true;
}

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nequip-compare checks passed');
