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
assert(/rngAmt\(10,80\)/.test(html) && /rngAmt\(10,60\)/.test(html) && /rngAmt\(5,30\)/.test(html),
  'Type U pays DMG coins (10–80 cp, 10–60 sp, 5–30 gp), not coins:{}');
assert(/if\(!\(u\.coins\.cp>0\)\) u\.coins\.cp=rngAmt\(10,80\)/.test(html),
  'Type U fills an empty helper purse');
assert(!/letter==='U'\)\{\s*return \{coins:\{\}/.test(html),
  'Type U no longer returns an empty purse');

assert(/function rollTreasureSpec\(/.test(html),
  'multi-letter specs still exist for caches and vaults');
assert(!/rollTreasureSpec\(raw\)/.test(html.match(/function foeDrop\([\s\S]*?\nfunction newGear/)[0]),
  'foeDrop does not roll lair A–I per corpse');
assert(!/rollLair\('H'\)/.test(html.match(/function foeDrop\([\s\S]*?\nfunction newGear/)[0]),
  'boss corpses do not fall back to lair H/C');
assert(!/const letter=raw\[0\]/.test(html), 'foeDrop no longer keeps only the first treasure letter');
assert(!/\['ironstone','timber','bone','hide','resin','powder'\]/.test(html),
  'Nil corpses do not drop a fixed ore list');
assert(/function rollKillIndividual\(/.test(html) && /function killLootBand\(/.test(html),
  'every kill rolls the house individual pocket by HD band');
assert(!/rollIndividual\('S'\)/.test(html.match(/function rollKillIndividual[\s\S]*?\nfunction foeDrop/)[0])
  && !/rollIndividual\('T'\)/.test(html.match(/function rollKillIndividual[\s\S]*?\nfunction foeDrop/)[0]),
  'kill pocket does not stack S+T on every corpse');
assert(/letter==='O'\)\{ coins\.cp=rngAmt\(10,40\); coins\.sp=rngAmt\(10,30\); \}/.test(html),
  'Type O is copper and silver, not gold');
assert(/rollKillIndividual\(e\)/.test(html.match(/function foeDrop\([\s\S]*?\nfunction newGear/)[0]),
  'foeDrop always rolls the house individual pocket onto the corpse');
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
