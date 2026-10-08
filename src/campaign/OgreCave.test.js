/**
 * L4 ogre cave. Data only.
 * Run: node src/campaign/OgreCave.test.js
 */
'use strict';
const Cave = require('./OgreCave');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

const c = Cave.OGRE_CAVE;
assert(c.wired === false, 'ogre cave is not wired');
assert(c.level === 4 && c.holders === 'orcs', 'orcs hold the cave on L4');
assert(c.boulders.count === 3 && c.boulders.secondsEach === 10, 'three boulders, ten seconds each');
assert(c.prisoner.fights === false && c.prisoner.hostile === false && c.prisoner.targetable === false, 'the ogress never fights and cannot be targeted');
assert(c.prisoner.onBouldersCleared === 'flee', 'clearing the boulders makes her flee');
assert(c.loot.ogreCorpses === false && c.loot.ogreLoot === false, 'the cave has no ogre corpse and no ogre loot');
assert(c.goldenEggs.count === 3 && c.goldenEggs.acDelta === -4 && c.goldenEggs.sellGp === 50, 'three golden eggs, AC -4, 50 gp');

const script = Cave.fleeScript();
assert(script.flees && script.afterBoulders === 3 && script.fights === false && script.xp === 185 && script.eggs === 3, 'flee script pays 185 XP and does not start a fight');
assert(Cave.fleeScript({ prisoner: { fights: true, onBouldersCleared: 'flee' } }).flees === false, 'a fighting prisoner does not use the flee script');

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('ogre cave ok');
