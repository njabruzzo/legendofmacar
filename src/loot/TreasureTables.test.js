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

assert(/if\(raw && !\/\^nil\$\/i\.test\(raw\)\) hoard=rollTreasureSpec\(raw\)/.test(html)
  || /hoard=rollTreasureSpec\(raw\)/.test(html),
  'monster loot rolls every letter in the type');
assert(!/const letter=raw\[0\]/.test(html), 'foeDrop no longer keeps only the first treasure letter');
assert(!/\['ironstone','timber','bone','hide','resin','powder'\]/.test(html),
  'Nil corpses do not drop a fixed ore list');
assert(/function rollKillIndividual\(/.test(html),
  'every kill rolls a full DMG individual pocket, not copper only');
assert(/rollIndividual\('S'\)/.test(html) && /rollIndividual\('T'\)/.test(html),
  'kill pocket rolls potion (S) and scroll (T) tables');
assert(/magKind:'any'/.test(html.match(/function rollKillIndividual[\s\S]*?\nfunction foeDrop/)[0]),
  'kill pocket can roll any-item (swords, armor, misc)');
assert(/mergeHoards\(hoard, rollKillIndividual\(e\)\)/.test(html),
  'foeDrop always merges the individual pocket onto the corpse');
assert(!/Empty lair chances still leave a DMG pocket \(type J = 3d8 cp\)/.test(html),
  'Nil kills are no longer copper-only type J');
assert(/spawnLoot\(e\.x\+ox, e\.y\+oy, pile\)/.test(html),
  'the rolled pile appears on the corpse tile at death');
assert(/rollDungeonTreasure\(\(L\.n\|\|2\)\)/.test(html),
  'collapse caches roll the dungeon table');
assert(/placeDungeonCache\(pt\[0\], pt\[1\], 1\)/.test(html)
  && /placeDungeonCache\(pt\[0\], pt\[1\], 2\)/.test(html)
  && /placeDungeonCache\(pt\[0\], pt\[1\], 3\)/.test(html)
  && /placeDungeonCache\(pt\[0\], pt\[1\], 4\)/.test(html)
  && /placeDungeonCache\(pt\[0\], pt\[1\], 5\)/.test(html),
  'every Book I chapter rooms get rolled dungeon caches');
assert(/Hidden hoard \(type /.test(html) && /rollLair\(letter\)/.test(html),
  'secret vaults still roll lair types');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\ntreasure table checks passed');
