'use strict';
/**
 * Combat SFX: weapon-matched hits, clash bed, victory horn sting, BGM handoff.
 * Run: node src/audio/CombatSfx.test.js
 */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
require('./CombatSfx.js');
require('./Bgm.js');
const CombatSfx = global.CombatSfx;
const Bgm = global.Bgm;

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

assert(/src\/audio\/CombatSfx\.js/.test(html), 'CombatSfx.js is loaded');
assert(/function beginFight\(/.test(html) && /sfx\.startBed\(\)/.test(html),
  'combat start plays the clash bed');
assert(/function damage\(/.test(html) && /sfx\.hit\(src\)/.test(html),
  'landed hits play a strike SFX');
assert(/function endFightIfClear\(/.test(html) && /sfx\.stopBed\(\)/.test(html),
  'combat end stops the clash bed');
assert(/bossHorn/.test(html) && /packHorn/.test(html),
  'victory uses war-horn stings, not only Terminus excerpts');
assert(/playSting\(sting\)/.test(html.match(/function endFightIfClear[\s\S]*?\n\}/)[0]),
  'horn still goes through Bgm.playSting so explore resumes after');
assert(/wantedMusic\(\)\{ return Bgm\.wanted\(G\); \}/.test(html),
  'wantedMusic is still the Bgm policy');
assert(/packWin:'assets\/music\/PackVictory\.mp3'/.test(html) &&
  /bossWin:'assets\/music\/BossVictory\.mp3'/.test(html),
  'old Terminus music stings stay registered');
assert(/packHorn:'assets\/sfx\/horn_pack\.mp3'/.test(html) &&
  /bossHorn:'assets\/sfx\/horn_boss\.mp3'/.test(html),
  'horn files are BGM sting tracks');
assert(/id\s*===\s*'packHorn'\s*\|\|\s*id\s*===\s*'bossHorn'/.test(fs.readFileSync(path.join(__dirname, 'Bgm.js'), 'utf8')),
  'Bgm treats pack/boss horns as stings');

assert(CombatSfx.hitKind({ hero: 1 }) === 'heavy', 'Macar uses the hammer/axe hit');
assert(CombatSfx.hitKind({ role: 'pick' }) === 'heavy', 'Pordum pick is heavy');
assert(CombatSfx.hitKind({ role: 'bolt', ranged: 1 }) === 'light', 'Fendur bolt is lighter');
assert(CombatSfx.hitKind({ atkKind: 'bow', ranged: 1 }) === 'light', 'bow shots are lighter');
assert(CombatSfx.hitKind({ kind: 'rat', dmg: 4 }) === 'light', 'trash claws are lighter');
assert(CombatSfx.hitKind({ boss: 1, kind: 'warden', dmg: 20 }) === 'heavy', 'boss swings are heavy');

function FakeAudio() {
  this.paused = true;
  this.ended = false;
  this.currentTime = 0;
  this.src = '';
  this.loop = false;
  this.volume = 1;
  this.play = () => { this.paused = false; return Promise.resolve(); };
  this.pause = () => { this.paused = true; };
  this.addEventListener = () => {};
}

const files = {
  hitHeavy1: 'assets/sfx/hit_heavy_1.mp3',
  hitHeavy2: 'assets/sfx/hit_heavy_2.mp3',
  hitLight1: 'assets/sfx/hit_light_1.mp3',
  hitLight2: 'assets/sfx/hit_light_2.mp3',
  clashBed: 'assets/sfx/clash_bed.mp3'
};
let t = 1000;
const sfx = CombatSfx.create({ files, Audio: FakeAudio, now: () => t, assetUrl: s => s });
assert(sfx.hit({ hero: 1 }) === true, 'first Macar hit plays');
t += 20;
assert(sfx.hit({ hero: 1 }) === false, 'identical hits inside the gap are dropped');
t += 200;
assert(sfx.hit({ ranged: 1, role: 'bolt' }) === true, 'a later lighter hit still plays');
assert(sfx.startBed() === true && sfx.bedPlaying(), 'clash bed starts');
sfx.stopBed();
assert(!sfx.bedPlaying(), 'clash bed stops');

const sfxDir = path.join(__dirname, '../../assets/sfx');
['hit_heavy_1.mp3', 'hit_heavy_2.mp3', 'hit_light_1.mp3', 'hit_light_2.mp3',
  'clash_bed.mp3', 'horn_pack.mp3', 'horn_boss.mp3', 'CREDITS.txt'].forEach(f => {
  const p = path.join(sfxDir, f);
  assert(fs.existsSync(p) && fs.statSync(p).size > 400, f + ' is in-repo');
  if (/\.mp3$/.test(f)) {
    const head = fs.readFileSync(p).subarray(0, 3).toString();
    assert(head === 'ID3' || head.charCodeAt(0) === 0xff, f + ' is a real mp3');
  }
});
const cred = fs.readFileSync(path.join(sfxDir, 'CREDITS.txt'), 'utf8');
assert(/CC0/.test(cred) && /Jan Schupke/.test(cred) && /Eldritch Grim/.test(cred),
  'SFX credits name the CC0 owners');
assert(/War Horns/.test(cred) && !/Terminus \(sting\)/.test(cred.split('Victory horns')[1] || ''),
  'horn credit is the war-horn track, not the Terminus excerpt');

const musicCred = fs.readFileSync(path.join(__dirname, '../../assets/music/CREDITS.txt'), 'utf8');
assert(/war-horn/.test(musicCred) || /Victory horn/.test(musicCred),
  'music CREDITS.txt points at the horn sting');

if (failed) { console.error('\n' + failed + ' failed'); process.exit(1); }
console.log('\ncombat SFX checks passed');
