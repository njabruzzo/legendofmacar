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

Engine.setRecipes([]);
assert(Engine.stationPool().length === 0, 'empty book has no station pool');
Engine.setRecipes(book.recipes);
assert(Engine.get('healing_potion').station === 'field', 'Healing Potion is field-scoped');
assert(Engine.get('longsword').station === 'field', 'Long Sword is field-scoped');
assert(Engine.list('camp').length === 0, 'list(camp) is empty once the book is field-scoped');
assert(Engine.stationPool().some(r => r.id === 'healing_potion'), 'Healing Potion is in the station pool');
assert(Engine.stationPool().some(r => r.id === 'longsword'), 'Long Sword is in the station pool');
assert(Engine.get('longsword').skillLevel === 2, 'Long Sword still needs Weapon Smithing 2');

const NEW_FIELD=['bone_scale','deepsilver_pick','star_hammer','silk_jack','iron_case_bombs','marrow_draught'];
const REJECTED=['bone_haft','iron_helm','hide_bracers','silk_padding','deepsilver_mail','star_rune'];
NEW_FIELD.forEach(id=>{
  const r=Engine.get(id);
  assert(!!r && r.station==='field', id+' is a field recipe');
  assert(Engine.stationPool().some(x=>x.id===id), id+' is in the station pool');
});
REJECTED.forEach(id=>assert(!Engine.get(id), id+' was not shipped'));
assert(Engine.get('bone_scale').skill==='armour' && Engine.get('bone_scale').skillLevel===2,
  'Bone-Scale Shirt is FORGE armour 2');
assert(Engine.get('star_hammer').output.item.plus===1, 'Star-Peen Hammer is +1');
assert(Engine.get('iron_case_bombs').output.field==='bombs' && Engine.get('iron_case_bombs').output.count===3,
  'Iron-Case Bombs grant three pack bombs');
assert(Engine.get('marrow_draught').output.item.k==='heal20', 'Marrow Draught is heal20');
assert(Engine.get('hide_cloak') && Engine.get('longsword') && Engine.get('healing_potion'),
  'old seven stay in the book');

const js=fs.readFileSync(path.join(__dirname,'CraftingEngine.js'),'utf8');
NEW_FIELD.forEach(id=>assert(js.indexOf("id: '"+id+"'")>=0, id+' is in DEFAULT_RECIPES'));
REJECTED.forEach(id=>assert(js.indexOf("id: '"+id+"'")<0, id+' is not in DEFAULT_RECIPES'));

function stubRank(res, lvl){
  const b=stubBridge(res);
  b.skillLevel=()=>lvl;
  return b;
}
const shirt=stubRank({bone:3, hide:1, ironstone:1}, 2);
assert(Engine.canCraft('bone_scale', shirt).ok, 'Bone-Scale Shirt crafts at armour 2 with stock');
assert(Engine.craftItem('bone_scale', shirt).ok && shirt.granted[0]==='bone_scale',
  'Bone-Scale Shirt applyOutput fires');
assert(!Engine.canCraft('bone_scale', stubRank({bone:3, hide:1, ironstone:1}, 1)).ok,
  'Bone-Scale Shirt fails under armour 1');
assert(!Engine.canCraft('star_hammer', stubRank({starmetal:0, ironstone:2, timber:1}, 3)).ok,
  'Star-Peen Hammer fails without starmetal stock');

if (failed) {
  console.error('\n' + failed + ' failed');
  process.exit(1);
}
console.log('\nall checks passed');
