'use strict';
/**
 * Grond tooth hunt: Ch1 Electrum Tooth + curse, Ch2 bronze + 10s hourglass.
 * Smash-on-Anvil stays dialogue-only. Tooth 03…10 are not invented.
 * Run: node src/dungeon/Ch1GrondTooth.test.js
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

const ch1=html.match(/if\(n===1\)\{[\s\S]*?if\(n===2\)\{/)[0];
const ch2=html.match(/if\(n===2\)\{[\s\S]*?if\(n===3\)\{/)[0];
assert(/kind:'teeth'/.test(ch1) && /k:'demonface'/.test(html),
  'Ch1 teeth chapel still plants the demonic face');
assert(/Pry the tooth/.test(html), 'face pry prompt exists');
assert(/grond_tooth_electrum/.test(html) && /Grond's Electrum Tooth/.test(html),
  'Ch1 tooth is Grond\'s Electrum Tooth');
assert(/toothKind:'electrum'/.test(html) && /flags\.electrumTooth/.test(html),
  'Ch1 face plants electrum and one-shots via electrumTooth');
assert(!/id:'grond_tooth_copper'/.test(html), 'copper item id is gone');
assert(/looks like silver/.test(html), 'Electrum Tooth still looks silver');
assert(/grond_tooth_bronze/.test(html) && /Grond's Bronze Tooth/.test(html),
  'Ch2 tooth is Grond\'s Bronze Tooth');
const laterTeeth=['grond_tooth_03','grond_tooth_04','grond_tooth_05','grond_tooth_06',
  'grond_tooth_07','grond_tooth_08','grond_tooth_09','grond_tooth_10'];
assert(laterTeeth.every(id=>html.indexOf("id:'"+id+"'")<0),
  'tooth 03…10 are stub-only later — not invented');
assert(/Smash-on-Anvil is dialogue-only/.test(html),
  'Smash-on-Anvil stays dialogue-only');
assert(!/function smashOnAnvil/.test(html) && !/function smashGrond/.test(html),
  'no Smash-on-Anvil system is wired');
assert(!/hourglassRaid\s*=\s*1/.test(extractFn('pryGrondTooth')),
  'pry does not start the hourglass raid');
assert(/Works whether or not the crown fight is done/.test(html),
  'Ch1 pry is independent of the crown fight');
assert(/kind:'hourglass'/.test(ch2) && /face:'w'/.test(ch2),
  'Ch2 hourglass secret is an east-wall west face');
assert(/x:126\.85,y:30\.05/.test(ch2) && /i:127,j:28,w:1,h:3/.test(ch2),
  'hourglass secret sits on the far-east den wall');
assert(!/kind:'hourglass'[\s\S]{0,180}face:'s'/.test(ch2),
  'hourglass secret is not a south face');
assert(/kind:'warrens'/.test(ch2) && /kind:'treasure'/.test(ch2),
  'warrens and bronze-door treasure stay');
assert(/HOURGLASS_RAID_S=10/.test(html), 'raid is Nick\'s 10.0s');
assert(/HOUSE: Electrum Tooth curse/.test(html), 'HOUSE comment records 1e convert law');
assert(/Drop electrum/.test(html) && /Drop All/.test(html),
  'pack can drop electrum 10 / 100 / All');
const saveSrc=fs.readFileSync(path.join(__dirname,'../saves/GameSave.js'),'utf8');
assert(/emptySocket/.test(saveSrc) && /toothKind/.test(saveSrc),
  'SAVE copies emptySocket + toothKind on the face');
assert(/flags: clone\(L\.flags/.test(saveSrc) && /packs: clone\(G\.packs/.test(saveSrc),
  'SAVE keeps electrumTooth / bronzeTooth flags and the pack item');
assert(/G\.scene='dead'/.test(extractFn('killMacarHourglass')),
  'hourglass burst kills Macar via the dead scene');
assert(/e\.hero \|\| inHourglassRoom/.test(extractFn('killMacarHourglass')),
  'kin inside die with Macar; kin outside live');

let eid=1;
const ctx={
  G:{
    equipped:{}, ents:[], props:[], packs:{macar:{magic:[]}},
    coin:{cp:0,sp:0,ep:0,gp:0,pp:0},
    curseStrain:0, curseGrowT:0, curseDecayT:0, hourglassT:10,
    lvl:{n:2,flags:{},w:144,h:118,grid:null}, scene:'play'
  },
  HOURGLASS_RAID_S:10,
  lines:[], hints:[], loot:[],
  Math, Object,
  dist(a,b){ return Math.hypot((a.x||0)-(b.x||0),(a.y||0)-(b.y||0)); },
  say(t){ ctx.lines.push(t); },
  hint(t){ ctx.hints.push(t); },
  burst(){}, shake(){}, ftext(){},
  stowPackItem(it){ ctx.G.packs.macar.magic.push(it); return it; },
  spawnLoot(x,y,pile){ ctx.loot.push({x,y,pile}); return pile; },
  player(){ return ctx.G.ents[0]; },
  startTalkObj(p){ ctx.talk=p; },
  clamp(v,a,b){ return Math.max(a, Math.min(b,v)); },
  corridor(){}, carvePath(){}, rect(){}
};
vm.createContext(ctx);
[
  'makeGrondTooth','nearestDemonFace','pryGrondTooth','hourglassBounds','inHourglassRoom',
  'hasBronzeToothInPack','revertUnsecuredBronzeTooth','resetUnsecuredHourglass',
  'burstHourglass','killMacarHourglass','cancelHourglassRaid',
  'tickHourglassRaid','buildHourglassRoom','hasElectrumToothInPack','convertCoinsToElectrum',
  'electrumEnc','electrumMoveMul','tickElectrumCurse','dropElectrum','askDropElectrum'
].forEach(n=>vm.runInContext(extractFn(n)+';', ctx));

const el=ctx.makeGrondTooth('electrum');
assert(el.id==='grond_tooth_electrum' && /Electrum/.test(el.n), 'electrum item id and name');
assert(el.noSell===1 && el.quest===1, 'electrum tooth is quest-unique, not sold');
assert(/electrum/i.test(el.d), 'electrum tooth describes the coin curse');
assert(ctx.makeGrondTooth('copper').id==='grond_tooth_electrum', 'copper kind aliases to electrum');
const br=ctx.makeGrondTooth('bronze');
assert(br.id==='grond_tooth_bronze' && /Bronze/.test(br.n), 'bronze item id and name');

ctx.G.ents=[{id:1, hero:1, name:'Macar', team:'party', col:{key:'macar'}, x:127.2, y:21.4, hp:80, maxhp:80}];
ctx.G.lvl={n:1, flags:{crownTouched:1, teethRisen:1, crownDestroyed:1}, w:132, h:90};
const face={x:127.4,y:21.4,k:'demonface',toothKind:'electrum',emptySocket:0};
ctx.G.props=[face];
const pry=ctx.pryGrondTooth(face, 'electrum');
assert(pry.ok===1 && face.emptySocket===1, 'Ch1 pry loots the Electrum Tooth once');
assert(ctx.G.lvl.flags.electrumTooth===1, 'electrumTooth flag is one-shot');
assert(ctx.G.packs.macar.magic[0].id==='grond_tooth_electrum', 'Electrum Tooth is in Macar\'s pack');
assert(ctx.pryGrondTooth(face, 'electrum').reason==='taken', 'second pry is refused');
assert(!ctx.xpAwards, 'tooth pry awards no XP');
assert(ctx.G.lvl.flags.crownDestroyed===1, 'crown fight flags do not block the Electrum pry');

ctx.G.coin={cp:120, sp:12, ep:0, gp:3, pp:1};
ctx.convertCoinsToElectrum();
assert(ctx.G.coin.pp===0 && ctx.G.coin.gp===0, 'pp and gp zero out into EP');
assert(ctx.G.coin.ep===10+6+2+2, '1e rates: 50cp=1, 5sp=1, 1gp=2, 1pp=10');
assert(ctx.G.coin.cp===20 && ctx.G.coin.sp===2, 'sub-ep dust stays in cp/sp');

ctx.G.curseStrain=0;
assert(ctx.electrumEnc()===20, 'enc is ep + strain*10');
assert(ctx.electrumMoveMul()===1, 'enc < 50 is full speed');
ctx.G.coin.ep=80;
assert(ctx.electrumMoveMul()===0.75, 'enc 50–149 is ×0.75');
ctx.G.coin.ep=160;
assert(ctx.electrumMoveMul()===0.5, 'enc 150–299 is ×0.5');
ctx.G.coin.ep=310;
assert(ctx.electrumMoveMul()===0.25, 'enc 300+ is ×0.25');

ctx.G.coin.ep=40;
ctx.G.curseStrain=0;
ctx.tickElectrumCurse(15);
assert(ctx.G.curseStrain===1, 'strain +1 every 15s while cursed and ep>0');
ctx.tickElectrumCurse(15);
assert(ctx.G.curseStrain===2, 'strain keeps climbing');
const dropped=ctx.dropElectrum(10);
assert(dropped===10 && ctx.G.coin.ep===30, 'drop 10 clamps to held');
assert(ctx.loot[0].pile.coins.ep===10, 'dropped EP is a floor pile');
ctx.G.coin.ep=0;
ctx.tickElectrumCurse(30);
assert(ctx.G.curseStrain===1, 'strain −1 / 30s when ep is 0');
ctx.G.packs.macar.magic=[];
ctx.tickElectrumCurse(30);
assert(ctx.G.curseStrain===0, 'strain decays when the tooth leaves the pack');
assert(ctx.convertCoinsToElectrum()===0, 'curse suspends without the tooth');
ctx.G.packs.macar.magic=[{id:'grond_tooth_copper', n:"Grond's Copper Tooth", grondTooth:'copper'}];
assert(ctx.hasElectrumToothInPack()===true, 'old copper tooth migrates into the curse');
assert(ctx.G.packs.macar.magic[0].id==='grond_tooth_electrum', 'migrated id is electrum');
ctx.G.packs.macar.magic=[{id:'grond_tooth_bronze', n:"Grond's Bronze Tooth", grondTooth:'bronze'}];
ctx.G.coin={cp:50,sp:0,ep:0,gp:0,pp:0};
assert(ctx.convertCoinsToElectrum()===0, 'bronze tooth does not convert coin');

ctx.G.lvl={n:2, flags:{hourglassRoom:1, hourglassBounds:{x0:130,y0:24,x1:142,y1:36}}, w:144, h:118};
ctx.G.ents=[{id:1, hero:1, name:'Macar', team:'party', col:{key:'macar'}, x:136, y:30, hp:80, maxhp:80, dead:0},
  {id:2, col:{key:'orbo'}, name:'ORBO', team:'party', x:136.4, y:30.2, hp:40, maxhp:40, dead:0},
  {id:3, col:{key:'fendur'}, name:'FENDUR', team:'party', x:40, y:16, hp:40, maxhp:40, dead:0}];
ctx.G.props=[{x:138,y:30,k:'hourglass'}];
ctx.G.hourglassT=10;
ctx.G.scene='play';
ctx.tickHourglassRaid(0);
assert(ctx.G.lvl.flags.hourglassRaid===1 && ctx.G.hourglassT===10, 'enter starts the 10s raid');
ctx.G.lvl.flags.bronzeTooth=1;
ctx.G.packs.macar.magic=[{id:'grond_tooth_bronze', n:"Grond's Bronze Tooth"}];
ctx.G.ents[0].x=120; ctx.G.ents[0].y=30;
ctx.tickHourglassRaid(0.05);
assert(ctx.G.lvl.flags.hourglassInert===1 && ctx.G.lvl.flags.bronzeSecured===1,
  'exit with the bronze tooth secures it and stills the glass');
assert(ctx.G.scene==='play', 'successful exit does not kill Macar');

ctx.G.lvl.flags={hourglassRoom:1, hourglassBounds:{x0:130,y0:24,x1:142,y1:36}};
ctx.G.ents[0].x=136; ctx.G.ents[0].y=30; ctx.G.ents[0].dead=0; ctx.G.ents[0].hp=80;
ctx.G.ents[1].dead=0; ctx.G.ents[1].hp=40;
ctx.G.ents[2].dead=0;
ctx.G.scene='play';
ctx.G.hourglassT=10;
ctx.G.packs.macar.magic=[];
ctx.tickHourglassRaid(0);
ctx.tickHourglassRaid(10.05);
assert(ctx.G.scene==='dead', 'linger to 0 kills Macar');
assert(ctx.G.ents[0].dead===1 && ctx.G.ents[1].dead===1, 'Macar and kin inside die');
assert(ctx.G.ents[2].dead===0, 'kin outside live');
assert(ctx.G.lvl.flags.bronzeTooth!==1, 'failed raid leaves the tooth in the face');

ctx.G.lvl.flags={hourglassRoom:1, hourglassBounds:{x0:130,y0:24,x1:142,y1:36}};
ctx.G.ents[0].x=136; ctx.G.ents[0].y=30; ctx.G.ents[0].dead=0; ctx.G.scene='play';
ctx.G.hourglassT=10;
ctx.tickHourglassRaid(0);
ctx.G.ents[0].x=118;
ctx.tickHourglassRaid(0.05);
assert(!ctx.G.lvl.flags.hourglassRaid && !ctx.G.lvl.flags.hourglassInert,
  'leave without the tooth cancels and resets the glass');

const bronzeFace={x:141,y:30,k:'demonface',toothKind:'bronze',emptySocket:0};
ctx.G.lvl.flags={hourglassRoom:1, hourglassBounds:{x0:130,y0:24,x1:142,y1:36}};
ctx.G.props=[bronzeFace];
ctx.G.packs.macar.magic=[];
ctx.G.hourglassT=10;
const pryB=ctx.pryGrondTooth(bronzeFace, 'bronze');
assert(pryB.ok===1 && ctx.G.lvl.flags.bronzeTooth===1, 'Ch2 face pries the bronze tooth once');
assert(ctx.G.packs.macar.magic[0].id==='grond_tooth_bronze', 'bronze tooth is in Macar\'s pack');
assert(!ctx.G.lvl.flags.hourglassRaid, 'pry alone does not start the 10s raid');

ctx.G.lvl.flags={hourglassRoom:1, hourglassBounds:{x0:130,y0:24,x1:142,y1:36},
  bronzeTooth:1, hourglassRaid:1, hourglassT:3.2};
ctx.G.hourglassT=3.2;
ctx.G.packs.macar.magic=[{id:'grond_tooth_bronze', n:"Grond's Bronze Tooth"}];
bronzeFace.emptySocket=1;
ctx.G.props=[bronzeFace, {x:138,y:30,k:'hourglass',burst:1}];
ctx.resetUnsecuredHourglass();
assert(ctx.G.lvl.flags.bronzeTooth!==1 && bronzeFace.emptySocket===0,
  'reload without bronzeSecured puts the tooth back in the face');
assert(!ctx.hasBronzeToothInPack(), 'unsecured bronze is stripped from the pack');
assert(!ctx.G.lvl.flags.hourglassRaid && ctx.G.hourglassT===10,
  'reload without bronzeSecured resets the 10s glass');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nSage tooth-hunt / hourglass checks passed');
