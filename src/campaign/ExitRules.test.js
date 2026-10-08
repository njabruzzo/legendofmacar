/**
 * Exit rules as data. Live chapter stairs stay as they are.
 * Run: node src/campaign/ExitRules.test.js
 */
'use strict';
const E = require('./ExitRules');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

assert(E.wired === false, 'exit rules are not applied to play');
assert(E.NICK_STAIR.opensOn === 'bossKill' && E.NICK_STAIR.wired === false, 'Nick stair hook is boss kill and unwired');
assert(E.NICK_STAIR.ownsLiveChapters === false, 'this hook does not own the live chapters');
assert(E.CAMPAIGN_GATE.decision === 'D3-B' && E.CAMPAIGN_GATE.bossRequiredForLever === false, 'the lever needs the guardian, not the boss');
assert(E.CAMPAIGN_GATE.leverRequires[0] === 'rubyGuardianDead', 'ruby guardian gates the lever');
assert(E.CAMPAIGN_GATE.elevatorRequires[0] === 'leverPulled' && E.CAMPAIGN_GATE.elevatorAuto === true, 'the lever gates an automatic elevator');

for (let n = 1; n <= 10; n++) {
  const row = E.forLevel(n);
  assert(row.appliedToPlay === false && row.authoritativeLeverGate === 'rubyGuardian', 'L' + n + ' lever gate is data only');
  assert(row.questRequiresBoss === (n >= 8), 'L' + n + ' quest-behind-boss flag');
}
assert(E.forLevel(1).bossKillVacuous === true, 'L1 has no separate boss for the boss-kill hook');
assert(E.forLevel(4).bossKillVacuous === false, 'L4 has a boss, so the Nick hook is not vacuous');

assert(E.liveChapter(1).flag === 'elevReady' && E.liveChapter(1).replace === false, 'chapter I still rides the elevator after the lever');
assert(E.liveChapter(2).bossRequired === false && E.liveChapter(2).stair.y === 51.6, 'chapter II king stays optional and the stair stays put');
assert(E.liveChapter(3).allFoesRequired === true && E.liveChapter(4).allFoesRequired === true, 'chapters III and IV still wait for the whole floor');
assert(E.liveChapter(5).stair == null && E.liveChapter(5).replace === false, 'chapter V still has no stair');
[1, 2, 3, 4, 5].forEach(function (n) {
  assert(E.liveChapter(n).replace === false, 'chapter ' + n + ' stair record is not a replacement');
});

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('exit rules ok');
