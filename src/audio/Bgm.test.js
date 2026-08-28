'use strict';
/**
 * BGM policy + manager: unlock, one voice, combat seek, resume, no autoplay.
 * Run: node src/audio/Bgm.test.js
 */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
require('./Bgm.js');
const Bgm = global.Bgm;

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

/* ---------- wantedMusic / scene map ---------- */
assert(Bgm.wanted({ scene: 'title' }) === 'title', 'title scene wants title');
assert(Bgm.wanted({ scene: 'credits' }) === 'title', 'credits keep the title theme');
assert(Bgm.wanted({ scene: 'chapters' }) === 'chapter', 'chapter select is a distinct theme');
assert(Bgm.wanted({ scene: 'intro', ch: 1 }) === 'chapter', 'intro splash uses the chapter theme');
assert(Bgm.wanted({ scene: 'play', ch: 1, fightOn: 0 }) === 'ch1', 'ch1 dungeon is The Cave');
assert(Bgm.wanted({ scene: 'play', ch: 2, fightOn: 0, lvl: { n: 2 } }) === 'ch2', 'ch2 dungeon is Dungeon_01');
assert(Bgm.wanted({ scene: 'play', ch: 1, fightOn: 1 }) === 'battle', 'combat wants Goliath, not the title');
assert(Bgm.wanted({ scene: 'pack', ch: 1, fightOn: 1 }) === 'battle', 'pack overlay during a fight stays on combat');
assert(Bgm.wanted({ scene: 'craft', ch: 2, fightOn: 0 }) === 'ch2', 'craft overlay keeps dungeon music');
assert(Bgm.wanted({ scene: 'camp', ch: 2 }) === 'chapter', 'camp uses the chapter theme');
assert(Bgm.roleOf('title') === 'title' && Bgm.roleOf('chapter') === 'menu' && Bgm.roleOf('ch1') === 'explore' && Bgm.roleOf('battle') === 'combat',
  'states are idle/title/menu/explore/combat');

/* ---------- HTML: no autoplay, relative mp3, credits ---------- */
assert(!/<audio[^>]*autoplay/i.test(html), 'no autoplay attribute on <audio>');
assert(!/<audio id="bgm"/i.test(html), 'no stacked looping <audio id=bgm> tag');
assert(/src\/audio\/Bgm\.js/.test(html), 'Bgm.js is loaded as a script');
assert(/battle:'assets\/music\/Goliath\.mp3'/.test(html), 'battle BGM is Goliath, not Song of the Forge');
assert(/chapter:'assets\/music\/TheDistantSun\.mp3'/.test(html), 'chapter screens use The Distant Sun');
assert(/title:'assets\/music\/SongOfTheForge\.mp3'/.test(html), 'title stays Song of the Forge');
assert(html.indexOf("battle:'assets/music/SongOfTheForge.mp3'") < 0, 'battle is no longer the title file');
assert(/function endFightIfClear/.test(html) && /dist\(e,p\)<11/.test(html),
  'combat ends when nearby foes are gone (win or flee), not only when the whole floor is empty');
assert(/visibilitychange/.test(fs.readFileSync(path.join(__dirname, 'Bgm.js'), 'utf8')), 'pauseOnBlur via visibilitychange');
assert(/linearRampToValueAtTime/.test(fs.readFileSync(path.join(__dirname, 'Bgm.js'), 'utf8')), 'crossfade on the audio clock via GainNodes');
assert(!/createMediaElementSource[\s\S]{0,200}decodeAudioData/.test(fs.readFileSync(path.join(__dirname, 'Bgm.js'), 'utf8')),
  'streams HTMLAudio; does not decode the OST into RAM');

const credits = html.match(/const MUSIC_CREDITS=\[[\s\S]*?\];/)[0];
assert(/Song of the Forge/.test(credits) && /Scott Buckley/.test(credits), 'title credit: Scott Buckley');
assert(/The Distant Sun/.test(credits) && /Chapter screens/.test(credits), 'chapter theme credited');
assert(/The Cave/.test(credits) && /HitCtrl/.test(credits), 'HitCtrl still credited');
assert(/Dungeon_01/.test(credits) && /Beau Buckley/.test(credits), 'Beau Buckley still credited');
assert(/Goliath/.test(credits) && /Combat/.test(credits), 'Goliath credited as combat');
assert(/CC BY 4\.0/.test(credits), 'Scott Buckley tracks marked CC BY 4.0');

const musicDir = path.join(__dirname, '../../assets/music');
['SongOfTheForge.mp3', 'TheCave.mp3', 'Dungeon_1.mp3', 'TheDistantSun.mp3', 'Goliath.mp3'].forEach(f => {
  const p = path.join(musicDir, f);
  assert(fs.existsSync(p) && fs.statSync(p).size > 1000, f + ' exists as mp3 (not LFS pointer)');
  const head = fs.readFileSync(p).subarray(0, 3).toString();
  assert(head === 'ID3' || head.charCodeAt(0) === 0xff, f + ' is a real mp3, not a git-lfs stub');
});
assert(!fs.existsSync(path.join(musicDir, 'Goliath.ogg')), 'no OGG-only battle track');
assert(!fs.existsSync(path.join(musicDir, 'Goliath.wav')), 'no WAV battle track');

const credTxt = fs.readFileSync(path.join(musicDir, 'CREDITS.txt'), 'utf8');
assert(/Goliath/.test(credTxt) && /The Distant Sun/.test(credTxt), 'CREDITS.txt lists the new tracks');
assert(/CC BY 4\.0/.test(credTxt), 'CREDITS.txt names CC BY 4.0');

/* ---------- manager behaviour with mocks ---------- */
function FakeAudio() {
  this.paused = true;
  this.ended = false;
  this.currentTime = 0;
  this.src = '';
  this.currentSrc = '';
  this.loop = true;
  this.volume = 1;
  this.preload = 'auto';
  this.crossOrigin = '';
  this.autoplay = false;
  this._listeners = {};
  this.play = () => { this.paused = false; return Promise.resolve(); };
  this.pause = () => { this.paused = true; };
  this.load = () => {};
  this.setAttribute = () => {};
  this.addEventListener = (ev, fn) => { (this._listeners[ev] = this._listeners[ev] || []).push(fn); };
}
function FakeGain() {
  const node = {
    value: 0,
    cancelScheduledValues() {},
    setValueAtTime(v) { node.value = v; },
    linearRampToValueAtTime(v) { node.value = v; }
  };
  return { gain: node, connect() {} };
}
function FakeAC() {
  this.state = 'suspended';
  this.currentTime = 1.2;
  this.destination = {};
  this.createGain = () => FakeGain();
  this.createMediaElementSource = () => ({ connect() {} });
  this.resume = () => { this.state = 'running'; return Promise.resolve(); };
  this.suspend = () => { this.state = 'suspended'; return Promise.resolve(); };
}

const tracks = {
  title: 'assets/music/SongOfTheForge.mp3',
  chapter: 'assets/music/TheDistantSun.mp3',
  ch1: 'assets/music/TheCave.mp3',
  ch2: 'assets/music/Dungeon_1.mp3',
  battle: 'assets/music/Goliath.mp3'
};
const bgm = Bgm.create({
  tracks,
  Audio: FakeAudio,
  AudioContext: FakeAC,
  document: { hidden: false, addEventListener() {} },
  window: { addEventListener() {} },
  assetUrl: s => s
});

assert(bgm.ctx && bgm.ctx.state === 'suspended', 'AudioContext is created early and starts suspended');
assert(bgm.unlocked === false, 'does not unlock on construct');
bgm.want('title');
assert(bgm.queued === 'title' && !bgm.isPlaying(), 'queues title until the first tap; never play() on load');
assert(bgm.slots.every(s => !s.el || s.el.autoplay === false), 'elements are not autoplay');

bgm.unlock();
assert(bgm.unlocked && bgm.ctx.state === 'running', 'first tap resumes the context');
assert(bgm.currentId === 'title' && bgm.state === 'title' && bgm.isPlaying(), 'title starts after unlock');

const titleSrc = bgm.slots.find(s => s.id === 'title').el.src;
bgm.play('title');
assert(bgm.slots.find(s => s.id === 'title').el.src === titleSrc, 'same-key play is a no-op');

bgm.play('chapter');
assert(bgm.currentId === 'chapter' && bgm.state === 'menu', 'chapter screens swap to The Distant Sun');

bgm.play('ch1');
const explore = bgm.slots.find(s => s.id === 'ch1');
explore.el.currentTime = 12.5;
assert(bgm.state === 'explore' && bgm.exploreId === 'ch1', 'dungeon sets exploreId');

bgm.play('ch1');
assert(explore.el.currentTime === 12.5, 'same dungeon key does not restart (rooms are a no-op)');

bgm.play('battle');
assert(bgm.state === 'combat' && bgm.currentId === 'battle', 'combat plays Goliath');
assert(bgm.exploreId === 'ch1' && Math.abs(bgm.exploreSeek - 12.5) < 0.01, 'combat saves explore seek');
assert(bgm.slots.filter(s => s.el && !s.el.paused).length <= 2, 'never stacks more than a crossfade pair');

bgm.play('ch1');
const resumed = bgm.slots.find(s => s.id === 'ch1');
assert(bgm.state === 'explore', 'combat end returns to dungeon music');
assert(Math.abs(resumed.el.currentTime - 12.5) < 0.01, 'dungeon resumes from saved seek');

bgm.play('ch2');
assert(bgm.exploreId === 'ch2', 'a later floor uses its own dungeon loop');

const playingSlot = bgm.slots.find(s => s.id === bgm.currentId);
assert(playingSlot && playingSlot.gain && typeof playingSlot.gain.gain.linearRampToValueAtTime === 'function',
  'slot volume is a GainNode (iOS HTMLAudio.volume is a no-op)');

bgm.pauseForBlur();
assert(bgm.pausedByBlur && !bgm.isPlaying(), 'visibility hide pauses BGM');
bgm.resumeFromBlur();
assert(!bgm.pausedByBlur && bgm.isPlaying(), 'visibility show resumes BGM');

if (failed) { console.error('\n' + failed + ' failed'); process.exit(1); }
console.log('\nBGM checks passed');
