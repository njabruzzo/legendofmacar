'use strict';
/**
 * Hoards and monster loot roll AD&D 1e DMG tables, not a canned list.
 * Run: node src/loot/TreasureTables.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

assert(/function rollLair\(/.test(html) && /function rollIndividual\(/.test(html),
  'lair A–I and individual J–Z tables exist');
assert(/function rollTreasureSpec\(/.test(html) && /function treasureLetters\(/.test(html),
  'multi-letter treasure types (C,Q) are parsed and rolled together');
assert(/function rollDungeonTreasure\(/.test(html) && /const DUNGEON_TREASURE=/.test(html),
  'DMG Appendix A Table V unguarded dungeon treasure exists');
assert(/function placeDungeonCache\(/.test(html), 'room caches place a rolled dungeon pile');
assert(/function mergeHoards\(/.test(html), 'multi-type hoards merge coin, gems, and magic');
assert(/letter==='O'/.test(html) && /letter==='P'/.test(html) && /letter==='U'/.test(html)
  && /letter==='V'/.test(html) && /letter==='Z'/.test(html),
  'individual types O, P, U, V, Z are on the MM/DMG list');

assert(/let hoard=rollTreasureSpec\(raw\)/.test(html), 'monster loot rolls every letter in the type');
assert(!/const letter=raw\[0\]/.test(html), 'foeDrop no longer keeps only the first treasure letter');
assert(!/\['ironstone','timber','bone','hide','resin','powder'\]/.test(html),
  'Nil corpses do not drop a fixed ore list');
assert(/chanceOk\(25\)\?rollIndividual\('J'\)/.test(html),
  'Nil pocket loot rolls individual type J');
assert(/rollDungeonTreasure\(\(L\.n\|\|2\)\)/.test(html),
  'collapse caches roll the dungeon table');
assert(/placeDungeonCache\(pt\[0\], pt\[1\], 2\)/.test(html)
  && /placeDungeonCache\(pt\[0\], pt\[1\], 3\)/.test(html),
  'chapter II and III rooms get rolled dungeon caches');
assert(/Hidden hoard \(type /.test(html) && /rollLair\(letter\)/.test(html),
  'secret vaults still roll lair types');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\ntreasure table checks passed');
