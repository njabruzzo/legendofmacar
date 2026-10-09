/**
 * The setup modules stay off the live page.
 * Run: node src/campaign/PlayFootprint.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

const root = path.join(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const recipes = fs.readFileSync(path.join(root, 'src/crafting/recipes.json'), 'utf8');

assert(/ASSET_VER='130'/.test(html), 'ASSET_VER stays 130');
[
  'src/campaign/',
  'BattleBuffs',
  'SpiderPoison',
  'OgreCave',
  'QuestRegistry',
  'LevelMap',
  'ExitRules',
  'CampaignTable',
  'L2.js',
  'maps/l2.json',
  'L3.js',
  'maps/l3.json',
  'L4.js',
  'maps/l4.json',
  'L5.js',
  'maps/l5.json',
  'L6.js',
  'maps/l6.json',
  'L7.js',
  'maps/l7.json',
  'L8.js',
  'maps/l8.json',
  'L9.js',
  'maps/l9.json'
].forEach(function (needle) {
  assert(html.indexOf(needle) < 0, 'index.html does not mention ' + needle);
});
assert(recipes.indexOf('rune_hammer') < 0 && recipes.indexOf('antitoxin') < 0, 'live recipes.json has no campaign recipes');
assert(html.indexOf('electrumMoveMul') >= 0, 'the live curse function is still the page that owns movement');

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('play footprint ok');
