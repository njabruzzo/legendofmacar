/**
 * Node checks: one crafting station per chapter, sprite registered.
 * Run: node src/props/CraftStation.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
require('./CraftStation.js');
const CS = globalThis.CraftStation;

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed++;
    console.error('FAIL  ' + msg);
  } else {
    console.log('ok    ' + msg);
  }
}

assert(!!CS, 'CraftStation module loads');
assert(CS.countForLevel(1) === 1, 'chapter 1 has one station');
assert(CS.countForLevel(2) === 1, 'chapter 2 has one station');
assert(CS.countForLevel(3) === 1, 'chapter 3 has one station');
assert(CS.countForLevel(4) === 1, 'chapter 4 has one station');
assert(CS.countForLevel(5) === 1, 'chapter 5 has one station');

[1, 2, 3, 4, 5].forEach(n => {
  const a = CS.planPlacement(n, []);
  const b = CS.planPlacement(n, []);
  assert(a && b && a.x === b.x && a.y === b.y, 'level ' + n + ' always plans the same single spot');
  assert(!CS.planPlacement(n, [{ k: 'craftstation', x: 1, y: 1 }]), 'level ' + n + ' skips if a station already exists');
});

const two = CS.planPlacement(2, []);
assert(two && two.x === 38.55 && two.y === 10.35, 'chapter 2 keeps the north hall station only');

assert(CS.SPRITE.indexOf('prop_craftstation.png') >= 0, 'idle sprite path');
assert(CS.SPRITE_ATK.indexOf('prop_craftstation_atk.png') >= 0, 'stoked sprite path');

const idle = path.join(__dirname, '../../assets/props/prop_craftstation.png');
const atk = path.join(__dirname, '../../assets/props/prop_craftstation_atk.png');
assert(fs.existsSync(idle), 'idle PNG is on disk');
assert(fs.existsSync(atk), 'stoked PNG is on disk');
assert(fs.statSync(idle).size > 20000, 'idle PNG is a real painting');
assert(fs.statSync(atk).size > 20000, 'stoked PNG is a real painting');

const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
assert(/src\/props\/CraftStation\.js/.test(html), 'CraftStation script is included');
assert(/prop_craftstation\.png/.test(html), 'station sprite registered in index');
assert(/k:'craftstation'/.test(html), 'prop kind craftstation');

assert(/CS\.planPlacement/.test(html), 'index uses CraftStation.planPlacement');
assert(!/43\.15\s*,\s*30\.55/.test(html), 'chapter 2 no longer has a second station');
assert(/some\(p=>p&&p\.k==='craftstation'\)/.test(html), 'addCraftStation refuses a second forge');

const ensure=html.match(/function ensureStationRecipes\(pr\)\{[\s\S]*?\n\}/)[0];
assert(!!ensure, 'ensureStationRecipes is in index');
assert(!/pr\.recipes=\[\]/.test(ensure), 'in-flight or missing engine does not persist an empty recipe list');
assert(/stationPool/.test(ensure) && /if\(!picked\.length\) return/.test(ensure),
  'station rolls from the engine pool and skips if the book is empty');

const bench=html.match(/function drawCraft\(g\)\{[\s\S]*?\nfunction drawPause/)[0];
assert(/menuHits\.unshift\.apply\(menuHits, plateHits\)/.test(bench),
  'FORGE and Back are tested before overlapping recipe rows');

if (failed) {
  console.error('\n' + failed + ' failed');
  process.exit(1);
}
console.log('\nall checks passed');
