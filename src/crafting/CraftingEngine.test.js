/**
 * Node checks for CraftingEngine station rolls and Borga's Burp.
 * Run: node src/crafting/CraftingEngine.test.js
 */
'use strict';
require('./CraftingEngine.js');
const Engine = globalThis.CraftingEngine;
const fs = require('fs');
const path = require('path');

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed++;
    console.error('FAIL  ' + msg);
  } else {
    console.log('ok    ' + msg);
  }
}

const book = JSON.parse(fs.readFileSync(path.join(__dirname, 'recipes.json'), 'utf8'));
Engine.setRecipes(book.recipes);

assert(!!Engine.get('borgas_burp'), 'Borga\'s Burp is in the book');
assert(Engine.get('borgas_burp').sapper === true, 'Borga\'s Burp is marked sapper-only');
assert(Engine.get('borgas_burp').output.field === 'burps', 'Borga\'s Burp outputs burps');

const pool = Engine.stationPool();
assert(pool.length >= 4, 'station pool has at least 4 recipes for a d4 roll');
assert(pool.every(r => !r.sapper), 'station pool never includes sapper recipes');
assert(!pool.some(r => r.id === 'borgas_burp'), 'Borga\'s Burp is not in the random pool');

for (let n = 1; n <= 4; n++) {
  const picked = Engine.pickRandom(n, () => 0.1);
  assert(picked.length === n, 'pickRandom(' + n + ') returns ' + n + ' recipes');
  const ids = picked.map(r => r.id);
  assert(new Set(ids).size === ids.length, 'pickRandom(' + n + ') returns unique recipes');
  assert(!ids.includes('borgas_burp'), 'pickRandom(' + n + ') never rolls Borga\'s Burp');
}

const over = Engine.pickRandom(99, () => 0.5);
assert(over.length === pool.length, 'pickRandom cannot exceed the station pool');

function stubBridge(res) {
  const stock = Object.assign({ powder: 2, barley: 2, resin: 2, ironstone: 4, timber: 2, hide: 2, silk: 1 }, res || {});
  const granted = [];
  return {
    stock,
    granted,
    getResource(id) { return stock[id] || 0; },
    spendResources(cost) {
      for (const k in cost) if ((stock[k] || 0) < cost[k]) return false;
      for (const k in cost) stock[k] -= cost[k];
      return true;
    },
    applyOutput(recipe) { granted.push(recipe.id); },
    skillLevel() { return 1; },
    learnSkill() {}
  };
}

const ready = stubBridge();
const check = Engine.canCraft('borgas_burp', ready);
assert(check.ok, 'can craft Borga\'s Burp with powder, barley, and resin');
const made = Engine.craftItem('borgas_burp', ready);
assert(made.ok, 'craftItem succeeds for Borga\'s Burp');
assert(ready.granted[0] === 'borgas_burp', 'applyOutput received Borga\'s Burp');
assert(ready.stock.powder === 1 && ready.stock.barley === 1 && ready.stock.resin === 1, 'Borga\'s Burp spends 1 of each ingredient');

const poor = stubBridge({ powder: 0, barley: 0, resin: 0 });
assert(!Engine.canCraft('borgas_burp', poor).ok, 'cannot craft Borga\'s Burp without ingredients');

if (failed) {
  console.error('\n' + failed + ' failed');
  process.exit(1);
}
console.log('\nall checks passed');
