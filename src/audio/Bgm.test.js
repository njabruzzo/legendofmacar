'use strict';
/**
 * BGM policy + manager: launch play, gesture fallback, one voice, combat seek.
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
assert(Bgm.wanted({ scene: 'play', ch: 1, fightOn: 1, ents: [{ team: 'foe', boss: 1, dead: 0 }] }) === 'boss',
  'a living boss wants Terminus, not Goliath');
assert(Bgm.wanted({ scene: 'play', ch: 1, fightOn: 1, ents: [{ team: 'foe', boss: 1, dead: 1 }] }) === 'battle',
  'a dead boss does not keep the boss theme');
assert(Bgm.wanted({ scene: 'pack', ch: 1, fightOn: 1 }) === 'battle', 'pack overlay during a fight stays on combat');
assert(Bgm.wanted({ scene: 'craft', ch: 2, fightOn: 0 }) === 'ch2', 'craft overlay keeps dungeon music');
assert(Bgm.wanted({ scene: 'camp', ch: 2 }) === 'chapter', 'camp uses the chapter theme');
assert(Bgm.roleOf('title') === 'title' && Bgm.roleOf('chapter') === 'menu' && Bgm.roleOf('ch1') === 'explore' && Bgm.roleOf('battle') === 'combat' && Bgm.roleOf('boss') === 'combat',
  'states are idle/title/menu/explore/combat');

/* ---------- HTML: no autoplay, relative mp3, credits ---------- */
assert(!/<audio[^>]*autoplay/i.test(html), 'no autoplay attribute on <audio>');
assert(!/<audio id="bgm"/i.test(html), 'no stacked looping <audio id=bgm> tag');
assert(/src\/audio\/Bgm\.js/.test(html), 'Bgm.js is loaded as a script');
assert(/battle:'assets\/music\/Goliath\.mp3'/.test(html), 'battle BGM is Goliath, not Song of the Forge');
assert(/boss:'assets\/music\/Terminus\.mp3'/.test(html), 'boss BGM is Terminus, not Goliath or the title');
assert(/packWin:'assets\/music\/PackVictory\.mp3'/.test(html), 'pack victory sting is registered');
assert(/bossWin:'assets\/music\/BossVictory\.mp3'/.test(html), 'boss victory sting is registered');
assert(/playSting\(sting\)/.test(html) && /bossWin/.test(html), 'combat-end plays a victory sting before explore resume');
assert(/chapter:'assets\/music\/TheDistantSun\.mp3'/.test(html), 'chapter screens use The Distant Sun');
assert(/title:'assets\/music\/SongOfTheForge\.mp3'/.test(html), 'title stays Song of the Forge');
assert(html.indexOf("battle:'assets/music/SongOfTheForge.mp3'") < 0, 'battle is no longer the title file');
assert(/function endFightIfClear/.test(html) && /dist\(e,p\)<11/.test(html),
  'combat ends when nearby foes are gone (win or flee), not only when the whole floor is empty');
const bgmSrc = fs.readFileSync(path.join(__dirname, 'Bgm.js'), 'utf8');
assert(/visibilitychange/.test(bgmSrc), 'pauseOnBlur via visibilitychange');
assert(/linearRampToValueAtTime/.test(bgmSrc), 'crossfade on the audio clock via GainNodes');
assert(!/createMediaElementSource[\s\S]{0,200}decodeAudioData/.test(bgmSrc),
  'streams HTMLAudio; does not decode the OST into RAM');
assert(/_tryLaunchPlay/.test(bgmSrc) && /fromLaunch/.test(bgmSrc),
  'on load, resume+play title without waiting for a custom press-any-key gate');
assert(/pointerdown/.test(bgmSrc) && /keydown/.test(bgmSrc) && /touchstart/.test(bgmSrc) && /click/.test(bgmSrc),
  'autoplay-block fallback is first pointerdown/keydown/touchstart/click');
assert(/_tryMutedThenUnmute/.test(bgmSrc), 'muted-autoplay-then-unmute is attempted when unmuted play is blocked');
assert(!/CLICK TO START/i.test(html), 'no blocking CLICK TO START overlay');
assert(/Click anywhere to hear the music/.test(html), 'title still hints if launch play is blocked');

const credits = html.match(/const MUSIC_CREDITS=\[[\s\S]*?\];/)[0];
assert(/Song of the Forge/.test(credits) && /Scott Buckley/.test(credits), 'title credit: Scott Buckley');
assert(/The Distant Sun/.test(credits) && /Chapter screens/.test(credits), 'chapter theme credited');
assert(/The Cave/.test(credits) && /HitCtrl/.test(credits), 'HitCtrl still credited');
assert(/Dungeon_01/.test(credits) && /Beau Buckley/.test(credits), 'Beau Buckley still credited');
assert(/Goliath/.test(credits) && /Combat/.test(credits), 'Goliath credited as combat');
assert(/Terminus/.test(credits) && /Boss fights/.test(credits), 'Terminus credited as boss music');
assert(/CC BY 4\.0/.test(credits), 'Scott Buckley tracks marked CC BY 4.0');

const musicDir = path.join(__dirname, '../../assets/music');
['SongOfTheForge.mp3', 'TheCave.mp3', 'Dungeon_1.mp3', 'TheDistantSun.mp3', 'Goliath.mp3', 'Terminus.mp3', 'PackVictory.mp3', 'BossVictory.mp3'].forEach(f => {
  const p = path.join(musicDir, f);
  assert(fs.existsSync(p) && fs.statSync(p).size > 1000, f + ' exists as mp3 (not LFS pointer)');
  const head = fs.readFileSync(p).subarray(0, 3).toString();
  assert(head === 'ID3' || head.charCodeAt(0) === 0xff, f + ' is a real mp3, not a git-lfs stub');
});
assert(!fs.existsSync(path.join(musicDir, 'Goliath.ogg')), 'no OGG-only battle track');
assert(!fs.existsSync(path.join(musicDir, 'Goliath.wav')), 'no WAV battle track');

const credTxt = fs.readFileSync(path.join(musicDir, 'CREDITS.txt'), 'utf8');
assert(/Goliath/.test(credTxt) && /The Distant Sun/.test(credTxt) && /Terminus/.test(credTxt), 'CREDITS.txt lists the new tracks');
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
  this.muted = false;
  this._listeners = {};
  this.play = () => { this.paused = false; return Promise.resolve(); };
  this.pause = () => { this.paused = true; };
  this.load = () => {};
  this.setAttribute = () => {};
  this.addEventListener = (ev, fn) => { (this._listeners[ev] = this._listeners[ev] || []).push(fn); };
}
function deny() {
  const err = new Error('autoplay');
  err.name = 'NotAllowedError';
  return Promise.reject(err);
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
function BlockedResumeAC() {
  FakeAC.call(this);
  this.resume = () => Promise.reject((() => { const e = new Error('resume'); e.name = 'NotAllowedError'; return e; })());
}

const tracks = {
  title: 'assets/music/SongOfTheForge.mp3',
  chapter: 'assets/music/TheDistantSun.mp3',
  ch1: 'assets/music/TheCave.mp3',
  ch2: 'assets/music/Dungeon_1.mp3',
  battle: 'assets/music/Goliath.mp3',
  boss: 'assets/music/Terminus.mp3',
  packWin: 'assets/music/PackVictory.mp3',
  bossWin: 'assets/music/BossVictory.mp3'
};

function flush(n) {
  let p = Promise.resolve();
  for (let i = 0; i < (n == null ? 8 : n); i++) p = p.then(() => Promise.resolve());
  return p;
}

function makeBgm(extra) {
  extra = extra || {};
  const winEvents = [];
  const win = extra.window || {
    addEventListener(ev, fn) { winEvents.push(ev); this._fns = this._fns || {}; this._fns[ev] = this._fns[ev] || []; this._fns[ev].push(fn); }
  };
  const bgm = Bgm.create(Object.assign({
    tracks,
    Audio: extra.Audio || FakeAudio,
    AudioContext: extra.AudioContext || FakeAC,
    document: extra.document || { hidden: false, addEventListener() {} },
    window: win,
    assetUrl: s => s
  }, extra.opts || {}));
  bgm._winEvents = winEvents;
  bgm._win = win;
  return bgm;
}

function fire(win, ev) {
  const list = (win._fns && win._fns[ev]) || [];
  list.forEach(fn => fn());
}

(async function runManager() {
  const bgm = makeBgm();
  assert(bgm.ctx && bgm.ctx.state === 'suspended', 'AudioContext is created early and starts suspended');
  assert(bgm.unlocked === false, 'does not unlock on construct');
  bgm.installUnlock();
  assert(['pointerdown', 'keydown', 'touchstart', 'click'].every(e => bgm._winEvents.includes(e)),
    'unlock listens on pointerdown/keydown/touchstart/click (including canvas via capture)');
  bgm.want('title');
  assert(bgm.slots.every(s => !s.el || s.el.autoplay === false), 'elements are not autoplay');
  await flush();
  assert(bgm.unlocked && bgm.ctx.state === 'running', 'launch resume() runs the context without a tap');
  assert(bgm.currentId === 'title' && bgm.state === 'title' && bgm.isPlaying(),
    'title (Song of the Forge) starts on load when autoplay is allowed');
  assert(!bgm.slots.some(s => s.el && s.el.muted), 'launch play is not left muted');

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

  /* resume() blocked: queue title, first gesture starts it */
  const blocked = makeBgm({ AudioContext: BlockedResumeAC });
  blocked.installUnlock();
  blocked.want('title');
  await flush();
  assert(!blocked.unlocked && blocked.queued === 'title' && !blocked.isPlaying(),
    'if resume() rejects, title stays queued and does not play');
  fire(blocked._win, 'pointerdown');
  await flush();
  assert(blocked.unlocked && blocked.currentId === 'title' && blocked.isPlaying(),
    'first pointerdown starts queued title when autoplay was blocked');

  /* play() blocked, muted-then-unmute works */
  function MuteThenUnmuteAudio() {
    FakeAudio.call(this);
    this.play = () => {
      if (!this.muted && !this._unmutedOk) return deny();
      this.paused = false;
      return Promise.resolve();
    };
  }
  const mutedOk = makeBgm({ Audio: MuteThenUnmuteAudio });
  mutedOk.want('title');
  await flush();
  const mutedSlot = mutedOk.slots.find(s => s.id === 'title');
  assert(mutedOk.unlocked && mutedOk.isPlaying(), 'muted autoplay then unmute can start title on load');
  assert(mutedSlot && mutedSlot.el.muted === false, 'muted-then-unmute does not leave the track muted');

  /* muted play works but unmute does not: rewind, do not blast later */
  function StickyMuteAudio() {
    FakeAudio.call(this);
    this.play = () => {
      if (!this.muted) return deny();
      this.paused = false;
      Object.defineProperty(this, 'muted', { get() { return true; }, set() {}, configurable: true });
      return Promise.resolve();
    };
  }
  const sticky = makeBgm({ Audio: StickyMuteAudio });
  sticky.want('title');
  await flush();
  const stickySlot = sticky.slots.find(s => s.id === 'title');
  assert(!sticky.unlocked && sticky.queued === 'title' && !sticky.isPlaying(),
    'if unmute is ignored, abort so the track does not run silent then blast');
  assert(stickySlot && stickySlot.el.paused, 'silent muted play is paused');
  assert(stickySlot && stickySlot.el.currentTime === 0, 'silent muted play is rewound to the start');

  /* play() rejects until a gesture; keydown unlocks */
  let allowPlay = false;
  function GatedAudio() {
    FakeAudio.call(this);
    this.play = () => {
      if (!allowPlay) return deny();
      this.paused = false;
      return Promise.resolve();
    };
  }
  const gated = makeBgm({ Audio: GatedAudio });
  gated.installUnlock();
  gated.want('title');
  await flush();
  assert(!gated.unlocked && gated.queued === 'title' && !gated.isPlaying(),
    'if play() rejects, title stays queued');
  allowPlay = true;
  fire(gated._win, 'keydown');
  await flush();
  assert(gated.unlocked && gated.isPlaying() && gated.currentId === 'title',
    'first keydown starts Forge after a blocked launch');

  const stingBgm = makeBgm();
  stingBgm.unlocked = true;
  stingBgm.ctx.state = 'running';
  stingBgm.play('ch1');
  await flush();
  stingBgm.play('battle');
  await flush();
  assert(stingBgm.currentId === 'battle', 'combat captured explore before the sting');
  stingBgm.sync({ scene: 'play', ch: 1, fightOn: 0 });
  await flush();
  const held = makeBgm();
  held.unlocked = true;
  held.ctx.state = 'running';
  held.play('battle');
  await flush();
  const started = held.playSting('packWin', { ms: 30, onEnd() { held.sync({ scene: 'play', ch: 1, fightOn: 0 }); } });
  assert(started && held._stinging, 'pack victory sting holds explore resume');
  held.sync({ scene: 'play', ch: 1, fightOn: 0 });
  assert(held._stinging && held.currentId === 'battle', 'sync is a no-op during a victory sting');
  const ended = (held._sting && held._sting._listeners && held._sting._listeners.ended) || [];
  ended.forEach(fn => fn());
  await flush();
  assert(!held._stinging && held.currentId === 'ch1', 'sting end returns to dungeon BGM');

  const bossSting = makeBgm();
  bossSting.unlocked = true;
  bossSting.ctx.state = 'running';
  bossSting.play('boss');
  await flush();
  assert(bossSting.currentId === 'boss', 'boss fights play Terminus');
  const bossEnded = [];
  bossSting.playSting('bossWin', { ms: 40, onEnd() { bossEnded.push(1); bossSting.sync({ scene: 'play', ch: 1, fightOn: 0 }); } });
  assert(bossSting._stinging && bossSting.currentId === 'boss', 'boss victory sting holds Terminus until it ends');
  bossSting.cancelSting();
  bossSting.sync({ scene: 'play', ch: 1, fightOn: 1, ents: [{ team: 'foe', boss: 1, dead: 0 }] });
  await flush();
  assert(!bossSting._stinging && bossSting.currentId === 'boss' && bossEnded.length === 0,
    'a new boss fight cancels a leftover sting without firing its explore resume');

  if (failed) { console.error('\n' + failed + ' failed'); process.exit(1); }
  console.log('\nBGM checks passed');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
