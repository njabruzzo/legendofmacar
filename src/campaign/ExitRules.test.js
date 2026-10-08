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
assert(E.CAMPAIGN_GATE.elevator === 'guardian' && E.CAMPAIGN_GATE.stairs === 'bossKill', 'elevator is the guardian and stairs are the boss kill');
assert(E.CAMPAIGN_GATE.livingBossBlocksElevator === false, 'a living boss never blocks the elevator');
assert(E.CAMPAIGN_GATE.leverRequires[0] === 'rubyGuardianDead', 'ruby guardian gates the lever');
assert(E.CAMPAIGN_GATE.elevatorRequires[0] === 'leverPulled' && E.CAMPAIGN_GATE.elevatorAuto === true, 'the lever gates an automatic elevator');

for (let n = 1; n <= 10; n++) {
  const row = E.forLevel(n);
  assert(row.appliedToPlay === false, 'L' + n + ' exit row is data only');
  assert(row.separateEncounters === (n !== 1), 'L' + n + ' encounter split');
  assert(row.elevator === 'guardian' && row.stairs === 'bossKill', 'L' + n + ' elevator is the guardian and stairs open on the boss kill');
  assert(row.questItemBehindBoss === (n >= 8), 'L' + n + ' quest item behind the boss');
  assert(row.bossOptionalForElevator === true && row.livingBossBlocksElevator === false, 'L' + n + ' boss does not gate the elevator');
  assert(row.authoritativeLeverGate === 'rubyGuardian', 'L' + n + ' lever gate is the ruby guardian');
  assert(row.boss.bossFlagOnIndividual === false, 'L' + n + ' gives no creature a boss flag');
}
const l1 = E.forLevel(1);
assert(l1.boss.status === 'group' && l1.boss.key === 'thinOne' && l1.boss.count === 6, 'L1 boss is the six Thin Ones together');
assert(l1.boss.sameAsGuardian === true && l1.boss.firesWhen === 'lastDies', 'the L1 boss-kill hook fires when the last Thin One dies');
assert(l1.boss.bossFlagOnIndividual === false, 'no single Thin One wears a boss flag');
assert(E.forLevel(8).questItemBehindBoss === true && E.forLevel(8).elevator === 'guardian', 'L8 quest sits behind the boss and the elevator does not');
assert(E.validate().length === 0, 'the ten exit rows pass, including the L1 group boss');

const merged = E.LEVELS.map(function (row) { return Object.assign({}, row); });
merged[3] = Object.assign({}, merged[3], { elevator: 'boss' });
assert(E.validate(merged).some(function (err) { return err.indexOf('L4') >= 0; }), 'a boss-gated elevator fails validation');
const flagged = E.LEVELS.map(function (row) { return Object.assign({}, row, { boss: Object.assign({}, row.boss) }); });
flagged[0] = Object.assign({}, flagged[0], { boss: { status: 'group', key: 'thinOne', count: 1, sameAsGuardian: false, bossFlagOnIndividual: true, firesWhen: 'lastDies' } });
assert(E.validate(flagged).some(function (err) { return err.indexOf('L1') >= 0; }), 'a single Thin One with a boss flag fails');
const tbd = E.LEVELS.map(function (row) { return Object.assign({}, row, { boss: Object.assign({}, row.boss) }); });
tbd[0] = Object.assign({}, tbd[0], { boss: { status: 'tbd', pending: 'Sage', count: 6, sameAsGuardian: true, bossFlagOnIndividual: false, firesWhen: 'lastDies' } });
assert(E.validate(tbd).some(function (err) { return err.indexOf('TBD') >= 0; }), 'L1 TBD is no longer a valid boss');

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
