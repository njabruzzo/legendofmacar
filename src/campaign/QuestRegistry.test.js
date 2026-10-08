/**
 * Ingredient timing and Macar usability.
 * Run: node src/campaign/QuestRegistry.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const Q = require('./QuestRegistry');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

const live = JSON.parse(fs.readFileSync(path.join(__dirname, '../crafting/recipes.json'), 'utf8'));
const liveIds = live.recipes.map(function (r) { return r.id; });

assert(Q.wired === false, 'quest registry is not wired');
assert(Q.ATTRIBUTION.indexOf('System Reference Document 5.2.1') >= 0 && Q.ATTRIBUTION.indexOf('creativecommons.org/licenses/by/4.0/legalcode') >= 0, 'SRD attribution is on the campaign book');
assert(liveIds.indexOf('rune_hammer') < 0 && liveIds.indexOf('antitoxin') < 0, 'new recipes are not in the live craft book');

liveIds.forEach(function (id) {
  assert(Q.LIVE_PLAN[id], 'live recipe ' + id + ' has a campaign plan');
});
Object.keys(Q.LIVE_PLAN).forEach(function (id) {
  assert(liveIds.indexOf(id) >= 0, 'plan id ' + id + ' is a live recipe');
});
assert(Q.LIVE_PLAN.longsword.status === 'cut' && Q.LIVE_PLAN.deepsilver_pick.status === 'cut', 'longsword and deepsilver pick stay cut');
assert(live.recipes.length === 14, 'live recipe count is unchanged');

const errors = Q.audit(live);
assert(errors.length === 0, errors.length ? errors.join('; ') : 'every kept recipe ingredient is on time and every item is usable');

Q.FORGE_RECIPES.forEach(function (recipe) {
  const when = Q.earliest(recipe, Q.SOURCES);
  assert(when != null && when <= recipe.availableFrom && recipe.availableFrom <= recipe.neededBy, recipe.id + ' can be crafted by the level it matters');
  Q.setsOf(recipe).forEach(function (set) {
    Object.keys(set).forEach(function (id) {
      assert(Q.SOURCES[id] && Q.SOURCES[id].level <= recipe.neededBy, recipe.id + ' ' + id + ' arrives by L' + recipe.neededBy);
    });
  });
});

const teeth = Q.QUEST_ITEMS.filter(function (it) { return it.id.indexOf('grond_tooth_electrum') === 0; });
assert(teeth.length === 7, 'seven electrum teeth in the registry');
assert(Q.QUEST_ITEMS.some(function (it) { return it.id === 'grond_tooth_bronze'; }), 'bronze tooth is registered and is not a ritual tooth id');

const late = [{
  id: 'late_hammer',
  status: 'spec',
  neededBy: 6,
  ingredients: { drow_adamantite: 1 },
  output: { id: 'x', name: 'Late Hammer', usableByMacar: 'Y' }
}];
Q.SOURCES.drow_adamantite_late = { level: 8, how: 'drop', where: 'nowhere' };
late[0].ingredients = { drow_adamantite_late: 1 };
const lateErrors = Q.validateRecipes(late, Q.SOURCES);
assert(lateErrors.some(function (e) { return e.indexOf('after') >= 0; }), 'a late ingredient fails the validator');
delete Q.SOURCES.drow_adamantite_late;

const missing = Q.validateRecipes([{
  id: 'missing_ore',
  status: 'spec',
  neededBy: 3,
  ingredients: { unobtainium: 1 },
  output: { id: 'x', name: 'Missing', usableByMacar: 'Y' }
}], Q.SOURCES);
assert(missing.some(function (e) { return e.indexOf('no source') >= 0; }), 'an unsourced ingredient fails');

const restricted = Q.validateItems([
  { id: 'womm', name: 'Wand of Magic Missiles', usableByMacar: 'Y' },
  { id: 'scroll', name: 'Scroll of 1-7 Spells', usableByMacar: 'N' },
  { id: 'wizardry', name: 'Ring of Wizardry', usableByMacar: 'Y' }
]);
assert(restricted.some(function (e) { return e.indexOf('Wand of Magic Missiles') >= 0; }), 'Wand of Magic Missiles fails even when flagged usable');
assert(restricted.some(function (e) { return e.indexOf('Scroll of 1-7 Spells') >= 0; }), 'spell scrolls fail the usability check');
assert(restricted.some(function (e) { return e.indexOf('Ring of Wizardry') >= 0; }), 'Ring of Wizardry fails the usability check');

const unusable = Q.validateRecipes([{
  id: 'bad_wand',
  status: 'spec',
  neededBy: 1,
  ingredients: { resin: 1 },
  output: { id: 'womm', name: 'Wand of Magic Missiles', usableByMacar: 'N' }
}], Q.SOURCES);
assert(unusable.length >= 1, 'an unusable recipe output fails');

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('quest registry ok');
