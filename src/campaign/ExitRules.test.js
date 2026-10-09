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
assert(E.CAMPAIGN_GATE.elevator === 'guardian' && E.CAMPAIGN_GATE.stairs === 'bossKill', 'elevator is the guardian and the stair rule is the boss kill');
assert(E.CAMPAIGN_GATE.stairsException.level === 1 && E.CAMPAIGN_GATE.stairsException.stairsOpenOn === 'lever', 'L1 is the lever exception to the boss-kill stair');
assert(E.CAMPAIGN_GATE.livingBossBlocksElevator === false, 'a living boss never blocks the elevator');
assert(E.CAMPAIGN_GATE.leverRequires[0] === 'rubyGuardianDead', 'ruby guardian gates the lever');
assert(E.CAMPAIGN_GATE.elevatorRequires[0] === 'leverPulled' && E.CAMPAIGN_GATE.elevatorAuto === true, 'the lever gates an automatic elevator');

for (let n = 1; n <= 10; n++) {
  const row = E.forLevel(n);
  assert(row.appliedToPlay === false, 'L' + n + ' exit row is data only');
  assert(row.elevator === 'guardian', 'L' + n + ' elevator is the guardian');
  assert(row.questItemBehindBoss === (n >= 8), 'L' + n + ' quest item behind the boss');
  assert(row.bossOptionalForElevator === true && row.livingBossBlocksElevator === false, 'L' + n + ' boss does not gate the elevator');
  assert(row.authoritativeLeverGate === 'rubyGuardian', 'L' + n + ' lever gate is the ruby guardian');
  if (n === 1) {
    assert(row.separateEncounters === false, 'L1 has no separate boss encounter');
    assert(row.stairs === 'lever' && row.stairsOpenOn === 'lever', 'L1 stairs open on the lever');
    assert(row.boss == null, 'L1 has no boss');
    assert(row.guardian.key === 'thinOne' && row.guardian.count === 6 && row.guardian.bossFlagOnIndividual === false, 'L1 guardian is the six Thin Ones and none wears a boss flag');
  } else {
    assert(row.separateEncounters === true, 'L' + n + ' guardian and boss stay separate encounters');
    assert(row.stairs === 'bossKill' && row.stairsOpenOn === 'bossKill', 'L' + n + ' stairs open on the boss kill');
    assert(row.boss && row.boss.bossFlagOnIndividual === false && row.boss.separateFromGuardian === true, 'L' + n + ' has a boss and gives no creature a boss flag');
  }
}
assert(E.forLevel(8).questItemBehindBoss === true && E.forLevel(8).elevator === 'guardian', 'L8 quest sits behind the boss and the elevator does not');
assert(E.validate().length === 0, 'the ten exit rows pass, with L1 boss-less on the lever');

const merged = E.LEVELS.map(function (row) { return Object.assign({}, row); });
merged[3] = Object.assign({}, merged[3], { elevator: 'boss' });
assert(E.validate(merged).some(function (err) { return err.indexOf('L4') >= 0; }), 'a boss-gated elevator fails validation');
const flagged = E.LEVELS.map(function (row) {
  return Object.assign({}, row, {
    guardian: row.guardian ? Object.assign({}, row.guardian) : null,
    boss: row.boss ? Object.assign({}, row.boss) : null
  });
});
flagged[0].guardian.bossFlagOnIndividual = true;
assert(E.validate(flagged).some(function (err) { return err.indexOf('L1') >= 0; }), 'a Thin One with a boss flag fails');
const bare = E.LEVELS.map(function (row) { return Object.assign({}, row); });
bare[1] = Object.assign({}, bare[1], { boss: null });
assert(E.validate(bare).some(function (err) { return err.indexOf('L2') >= 0 && err.indexOf('boss') >= 0; }), 'L2 stairs still require a boss');
const leverOn3 = E.LEVELS.map(function (row) { return Object.assign({}, row); });
leverOn3[2] = Object.assign({}, leverOn3[2], { boss: null, stairs: 'lever', stairsOpenOn: 'lever', separateEncounters: false });
assert(E.validate(leverOn3).some(function (err) { return err.indexOf('L3') >= 0; }), 'only L1 may open the stairs on the lever');
const noException = E.LEVELS.map(function (row) { return Object.assign({}, row); });
noException[0] = Object.assign({}, noException[0], { stairs: 'bossKill', stairsOpenOn: 'bossKill' });
assert(E.validate(noException).some(function (err) { return err.indexOf('L1') >= 0; }), 'L1 without the lever exception fails');
const restoredBoss = E.LEVELS.map(function (row) { return Object.assign({}, row); });
restoredBoss[0] = Object.assign({}, restoredBoss[0], { boss: { status: 'group', key: 'thinOne', count: 6, sameAsGuardian: true, firesWhen: 'lastDies', bossFlagOnIndividual: false } });
assert(E.validate(restoredBoss).some(function (err) { return err.indexOf('L1') >= 0; }), 'L1 rejects the Thin Ones as a boss');

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
