'use strict';
/**
 * Foes spawn as lair groups, not mixed kitchen-sink waves.
 * Run: node src/dungeon/MonsterPacks.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

assert(/function wavePack\(/.test(html), 'wavePack clusters a list around a point');
assert(/function spawnLairGroup\(/.test(html), 'spawnLairGroup takes a leader and a pack');
assert(/spec\.leader/.test(html) && /spec\.pack/.test(html), 'lair groups keep a leader with the pack');

const ch3=html.slice(html.indexOf('if(n===3){'), html.indexOf('if(n===4){'));
assert(/spawnLairGroup\(26,28,\{leader:'duergarX'/.test(ch3), 'barracks is a duergar shift');
assert(/spawnLairGroup\(46,16,\{leader:'drowMage'/.test(ch3), 'Hall of Names is a drow house');
assert(/spawnLairGroup\(43,44,\{pack:\[\['undead',3\]\]/.test(ch3), 'warden vault keeps the dead together');
assert(!/\['duergar',22,23\],\['hookedhorror',28,24\]/.test(ch3), 'old mixed barracks wave is gone');
assert(!/spawnLairGroup\(22,23,\{pack:\[\['pech',2\]/.test(ch3),
  'pech no longer share the duergar barracks');
assert(/spawnLairGroup\(26,8,\{pack:\[\['pech',2\]/.test(ch3), 'pech keep the north workshop');
assert(/spawnLairGroup\(32,50,\{leader:'bugbear'/.test(ch3), 'orcs hold the south annex');

const ch2=html.slice(html.indexOf('if(n===2){'), html.indexOf('if(n===3){'));
assert(/spawnLairGroup\(40\.1, 32\.1, \{leader:'goblinBoss'/.test(ch2), 'camp goblins stand as one warband');
assert(/pack:\[\['goblin',5\]\]/.test(ch2), 'goblin camp is goblins only');
assert(/e\.nozCamp=1/.test(ch2), 'camp four-way is tagged so east goblins do not block Untie');
assert(/spawnLairGroup\(10\.1, 31\.0, \{leader:'spiderLord'/.test(ch2), 'west cave is a spider nest');
assert(/pack:\[\['spider',3\]\]/.test(ch2), 'spider lord nest is spiders only');
assert(/placeSpiderWebCorpses\(\)/.test(ch2), 'silk room scatters lootable web corpses');
assert(!/\['spider',2\],\['beetle',2\]/.test(ch2) && !/\['orc',2\],\['kobold',2\]/.test(ch2),
  'chapter II side caves are not mixed kitchens');

const ch1=html.slice(html.indexOf('if(n===1){'), html.indexOf('if(n===2){'));
assert(/pack:\[\['rat',4\]\]/.test(ch1), 'chapter I south store is a rat nest');
assert(/pack:\[\['beetle',3\]\]/.test(ch1), 'chapter I east shop is a beetle brood');
assert(/pack:\[\['spider',3\]\]/.test(ch1), 'chapter I silk den is spiders only');

const ch5=html.slice(html.indexOf('if(n===5){'), html.indexOf('sealOuter(L.grid);'));
assert(!/\['hookedhorror',20,32\]/.test(ch5) && !/\['gnomeBomber',38,32\]/.test(ch5),
  'chapter V no longer dumps a kitchen-sink wave on the dais');
assert(/pack:\[\['golemGold',1\],\['golemSilver',1\]\]/.test(ch5), 'gold colonnade is golems');
assert(/leader:'drowMage',pack:\[\['drow',2\]\]/.test(ch5), 'drow house stays drow');
assert(/leader:'firegiant',pack:\[\['magmaelem',1\]\]/.test(ch5), 'fire pair stays together');

const wander=html.slice(html.indexOf('function spawnWanderers'), html.indexOf('function endSleepShow'));
assert(/const k=kinds\[ri\(0,kinds\.length-1\)\]\|\|'rat'/.test(wander), 'wanderers pick one kind');
assert(/const n=Math\.min\(ri\(2,4\)/.test(wander), 'wanderers arrive as a small pack');
assert(/function dungeonEntryLevel\(\)\{ return 5; \}/.test(html), 'dungeon entry is level 5');
assert(/if\(ch<=1\) return \[1,7\]/.test(html), 'Ch I/cave HD band 1-7');
assert(/return \[5,9\]/.test(html), 'ruins HD band 5-9');
assert(/if\(ch===2 && gob && hd>7\) return false/.test(html), 'goblin level goblins <=7 HD');
assert(/hd:7/.test(html.match(/goblinShaman:\{[^}]+\}/)[0]), 'shaman is 7 HD');
assert(/if\(roll===1\)\{/.test(html.match(/function campRest[\s\S]*?function /)[0]) || /if\(roll===1\)\{/.test(html),
  'camp rest wandering odds are 1 in 6');
assert(/if\(ri\(1,6\)===1\)/.test(html), 'ruin wandering odds are 1 in 6');
assert(/wanderKindAllowed\(k\)/.test(html), 'wanderers filter by HD band');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nmonster pack checks passed');
