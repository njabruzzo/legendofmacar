'use strict';
/**
 * New rooms get 1e lairs (logical MM groups, house HD bands, den piles).
 * Scripted beats stay. Treasure type / coins-always / spider house hold.
 * Run: node src/dungeon/LairFill.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

function chapterBlock(n){
  const start=html.indexOf('if(n==='+n+'){');
  const end=n<5?html.indexOf('if(n==='+(n+1)+'){', start+1):html.indexOf('sealOuter(L.grid);', start);
  return html.slice(start,end);
}

const BESTIARY=(function(){
  const start=html.indexOf('const BESTIARY={');
  const end=html.indexOf('\nfunction applyBestiary', start);
  const src=html.slice(start,end);
  return Function(src+'; return BESTIARY;')();
})();

function hdOf(k){
  const b=BESTIARY[k];
  if(!b) return null;
  let hd=b.hd!=null?b.hd:Math.max(0.5, (b.hp||8)/8);
  if(hd>=0.5 && hd<1) hd=1;
  return hd;
}

function parseLairs(block){
  const re=/spawnLairGroup\(([^,]+),\s*([^,]+),\s*\{([^}]+)\}\)/g;
  const out=[];
  let m;
  while((m=re.exec(block))){
    const spec=m[3];
    const leader=(spec.match(/leader:'([^']+)'/)||[])[1]||'';
    const pack=[];
    const packM=spec.match(/pack:\[([\s\S]*)\]/);
    if(packM){
      const rowRe=/\['([^']+)',(\d+)\]/g;
      let r;
      while((r=rowRe.exec(packM[1]))) pack.push([r[1], +r[2]]);
    }
    out.push({x:+m[1], y:+m[2], leader, pack, raw:m[0]});
  }
  return out;
}

function kindsOf(lair){
  const ks=[];
  if(lair.leader) ks.push(lair.leader);
  lair.pack.forEach(row=>ks.push(row[0]));
  return ks;
}

assert(/function placeLairDen\(/.test(html) && /lairDen:1/.test(html),
  'lairs plant a walkable den');
assert(/if\(!spec\.noDen\) placeLairDen\(cx, cy, spec\)/.test(html),
  'spawnLairGroup dresses the den');
assert(/function dungeonEntryLevel\(\)\{ return 5; \}/.test(html),
  'dungeon entry is still 5 HD');
assert(/if\(ch<=1\) return \[1,7\]/.test(html), 'Ch I HD band 1–7');
assert(/if\(ch===3\) return \[5,9\]/.test(html), 'ruins HD band 5–9');
assert(/if\(ch===4\) return \[6,12\]/.test(html), 'Ch IV HOUSE band 6–12 (1e lvl VII–IX)');
assert(/return \[7,16\]/.test(html), 'Ch V HOUSE band 7–16 (1e lvl VIII–X+)');

const ch1=chapterBlock(1);
const ch2=chapterBlock(2);
const ch3=chapterBlock(3);
const ch4=chapterBlock(4);
const ch5=chapterBlock(5);

const NEW1=[
  {x:30,y:80,lo:1,hi:7},
  {x:106,y:21,lo:1,hi:7},
  {x:10,y:64,lo:1,hi:7},
  {x:82,y:66,lo:1,hi:7},
  {x:104,y:48,lo:1,hi:7}
];
const NEW3=[
  {x:128,y:48,lo:5,hi:9},
  {x:50,y:104,lo:5,hi:9},
  {x:126,y:10,lo:5,hi:9},
  {x:120,y:80,lo:5,hi:9},
  {x:12,y:102,lo:5,hi:9},
  {x:88,y:102,lo:5,hi:9}
];
const NEW4=[
  {x:122,y:48,lo:6,hi:12},
  {x:50,y:96,lo:6,hi:12},
  {x:122,y:14,lo:6,hi:12},
  {x:10,y:84,lo:6,hi:12},
  {x:28,y:92,lo:6,hi:12},
  {x:80,y:72,lo:6,hi:12}
];
const NEW5=[
  {x:96,y:22,lo:7,hi:16},
  {x:29,y:86,lo:7,hi:16},
  {x:10,y:88,lo:7,hi:16},
  {x:84,y:10,lo:7,hi:16},
  {x:64,y:42,lo:7,hi:16},
  {x:8,y:74,lo:7,hi:16}
];

function checkBand(block, spots, label){
  const lairs=parseLairs(block);
  spots.forEach(s=>{
    const hit=lairs.find(L=>Math.abs(L.x-s.x)<0.2 && Math.abs(L.y-s.y)<0.2);
    assert(!!hit, label+' lair at '+s.x+','+s.y);
    if(!hit) return;
    kindsOf(hit).forEach(k=>{
      const hd=hdOf(k);
      assert(hd!=null, label+' '+k+' is in the bestiary');
      if(hd==null) return;
      assert(hd>=s.lo && hd<=s.hi,
        label+' '+k+' HD '+hd+' sits in '+s.lo+'–'+s.hi+' at '+s.x+','+s.y);
    });
  });
}

checkBand(ch1, NEW1, 'Ch I');
checkBand(ch3, NEW3, 'Ch III');
checkBand(ch4, NEW4, 'Ch IV');
checkBand(ch5, NEW5, 'Ch V');

const GOBLIN_ECO=/^(goblin|goblinBoss|goblinChieftain|goblinWarlord|goblinKing|goblinShaman|kobold|koboldChief|warg|spider|spiderHuge|spiderGiant|spiderLord|rat|beetle|beetleBoring|centipede|orc|gibberling|bugbear)$/;
parseLairs(ch2).forEach(L=>{
  kindsOf(L).forEach(k=>{
    assert(GOBLIN_ECO.test(k), 'Ch II '+k+' is goblin-ecology, not a drow matron');
    const hd=hdOf(k);
    if(hd!=null) assert(hd<=7 || /King|Warlord|Chieftain/.test(k),
      'Ch II '+k+' stays on the goblin-level HD house');
  });
});
assert(!/drowMatron/.test(ch2), 'no drow matron on the goblin floor');
assert(/leader:'spiderLord'/.test(ch2) && /pack:\[\['spider',3\]\]/.test(ch2),
  'west silk room is still the Spider Lord nest');
assert(/placeSpiderWebCorpses\(\)/.test(ch2), 'web corpses still spawn in the silk room');

const ALLOWED_MAJORS={
  spiderLord:1, goblinBoss:1, goblinChieftain:1, goblinWarlord:1,
  goblinKing:1, koboldChief:1, goblinShaman:1
};
[ch1,ch2,ch3,ch4,ch5].forEach((block,i)=>{
  parseLairs(block).forEach(L=>{
    kindsOf(L).forEach(k=>{
      if(/King|Warlord|Chieftain|Lord|Matron|Warden|Emperor|Avatar|Thane/.test(k)
        && !ALLOWED_MAJORS[k] && k!=='drowMatron' && k!=='duergarThane'
        && k!=='troglodyteChief' && k!=='grimlockChief' && k!=='drowCaptain'
        && k!=='drowMage' && k!=='duergarX' && k!=='firegiant' && k!=='stonegiant'){
        assert(false, 'Ch '+(i+1)+' spawned unexpected major '+k);
      }
    });
  });
});
assert(!/FOE\.warden\(\)/.test(ch1) && !/FOE\.warden\(\)/.test(ch2) && !/leader:'warden'/.test(ch1+ch2),
  'Ruby Warden is not added as a Book I side pack');
assert(!/FOE\.statue\(\)/.test(ch1.match(/spawnLairGroup[\s\S]*/)||['']) && !/pack:\[\['statue'/.test(ch1),
  'Thin Ones stay mute statues — not a new lair pack');

assert(/x:WINDUP_TOY\.x,y:WINDUP_TOY\.y,k:'winduptoy'/.test(ch1), 'Froren toy room stays');
assert(/startTalk\('ruby_door'\)/.test(ch1) && /L\.rubyDoor=\{x:36\.5,y:7\.28\}/.test(ch1),
  'ruby door talk stays on the north wall');
assert(/nearDwarfFace\(p,2\.3\)/.test(ch1), 'dwarf mouth beat stays');
assert(/e\.nozCamp=1/.test(ch2) && /interact\('Untie Noz'/.test(ch2),
  'Noz untie stays on the four-way');
assert(/startTalk\(L\.flags\.bellSaid\?'noz_trade_again':'noz_bell'\)/.test(ch2),
  'bronze bell talk stays');
assert(/startTalk\('web_skeleton'\)/.test(ch2), 'web skeleton talk stays');
assert(/startTalk\('goblin_mercy'\)/.test(html), 'false-surrender goblin stays');
['shaman_hail','shaman_bargain','shaman_chant','shaman_blood','goblin_yield'].forEach(k=>{
  assert(new RegExp(k+':\\{').test(html), k+' Quill tree stays');
});
assert(/function campRest\(/.test(html) && /Does not use Save/.test(html),
  'camp Save stays');
assert(/function placeCraftStations\(/.test(html), 'craft stations stay');
assert(/forageHerbs\(/.test(html) && /interact\('Search for herbs'/.test(html),
  'SEARCH herbs stays');
assert(!/emit\(s\.x,s\.y-28\*z, \(k==='lichen'\?18:36\)\*z\*b/.test(html),
  'glowcap still has no spore orbs');

assert(/tt:'Nil'/.test(html.match(/spider:\{[^}]+\}/)[0]), 'pack cave spiders stay Nil');
assert(/tt:'C'/.test(html.match(/spiderLord:\{[^}]+\}/)[0]), 'MM still lists the lord as Type C');
assert(/tt:'J'/.test(html.match(/goblin:\{[^}]+\}/)[0]), 'goblin Type J stays printed');
assert(/function ensureKillCoins\(/.test(html), 'coins-always house floor stays');
assert(/function rollPotion\(\)\{ return rollDmgPotion\(\); \}/.test(html),
  'treasure potions stay DMG Table III.A');
assert(/src\/loot\/DmgPotions\.js/.test(html), 'DmgPotions stays loaded');
assert(/src\/loot\/LoreClues\.js/.test(html) && /src\/ui\/MajorTalk\.js/.test(html),
  'MajorTalk and LoreClues stay wired');

const intro=html.match(/const CH_INTRO=\{[\s\S]*?\n\};/)[0];
assert(!/north|south|east|west|spider_lord|goblin_king/i.test(intro),
  'CH_INTRO stays mood-only, no compass spoilers');
assert(!/addSecretDoor\(L,\{[^}]*face:'s'/.test(html),
  'no Book I secret is placed on a south face');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nlair fill checks passed');
