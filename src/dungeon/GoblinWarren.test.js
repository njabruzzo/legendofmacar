'use strict';
/**
 * Goblin lair is a wide warren; stairs drop to the Goblin King and wargs.
 * Run: node src/dungeon/GoblinWarren.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

assert(/function buildGoblinWarrens\(/.test(html), 'warrens builder');
assert(/const n=8\+\(rnd\(\)\*4\)\|0/.test(html), 'lair carves at least eight dens');
assert(/function buildGoblinKingLevel\(/.test(html), 'king level builder');
assert(/function enterGoblinKingLevel\(/.test(html), 'stairs enter the king hall');
assert(/FOE\.goblinKing\(\)/.test(html), 'Goblin King is spawned');
assert(/pack:\['\['warg',3\]\]/.test(html) || /pack:\[\['warg',3\]\]/.test(html), 'warg pack on the throne floor');
assert(/warg:\{n:'Warg'/.test(html), 'warg is in the bestiary');
assert(/'warg'/.test(html) && /SPRITE_FILES\[k\]='assets\/creatures\/mon_'\+k\+'\.png'/.test(html),
  'warg sprite is registered through UNDERDARK');
assert(fs.existsSync(path.join(__dirname,'../../assets/creatures/mon_warg.png')), 'warg PNG on disk');
assert(/Descend to the Goblin King/.test(html), 'player can descend from the lair stairs');
assert(/L\.climbs/.test(html) && /enterGoblinKingLevel\(L\)/.test(html), 'climb hook opens the king hall');
assert(/placeSecretHoard\([^,]+,[^,]+,\s*'H'\)/.test(html), 'king hoard uses DMG type H');
assert(/goblinWarlord/.test(html) && /goblinChieftain/.test(html), 'powerful goblin officers stand with the king');
assert(/goblinShaman/.test(html) && /leader:'goblinShaman'/.test(html), 'warren pack is led by the shaman');
assert(/shamanSkipKing/.test(html), 'paid tribute skips shaman in the king fight');
assert(/FOE\.goblinKing\(\)/.test(html.match(/function buildGoblinKingLevel[\s\S]*?function foesVisible/)[0]),
  'king is still spawned when shaman skips');
assert(/L\.w=120; L\.h=100/.test(html), 'first floor is a wide warren with side caverns');
assert(/caveDisk\(g,40,70/.test(html) && /caveDisk\(g,82,28/.test(html),
  'chapter II adds south and east caverns beyond the four-way');
assert(/L\.stair=\{x:40\.1,y:54\.15\}/.test(html), 'south stair stays on the old descent tile');
assert(/L\.w=96; L\.h=76/.test(html) && /L\.w=110; L\.h=88/.test(html) && /L\.w=88; L\.h=80/.test(html),
  'chapters I, IV, and V are also larger halls');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\ngoblin warren checks passed');
