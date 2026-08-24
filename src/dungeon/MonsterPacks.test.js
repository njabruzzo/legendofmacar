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

const ch2=html.slice(html.indexOf('if(n===2){'), html.indexOf('if(n===3){'));
assert(/spawnLairGroup\(40\.1, 32\.1, \{leader:'goblinBoss'/.test(ch2), 'camp goblins stand as one warband');
assert(/spawnLairGroup\(10\.1, 31\.0, \{leader:'spiderLord'/.test(ch2), 'west cave is a spider nest');

const wander=html.slice(html.indexOf('function spawnWanderers'), html.indexOf('function endSleepShow'));
assert(/const k=kinds\[ri\(0,kinds\.length-1\)\]\|\|'rat'/.test(wander), 'wanderers pick one kind');
assert(/const n=Math\.min\(ri\(2,4\)/.test(wander), 'wanderers arrive as a small pack');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nmonster pack checks passed');
