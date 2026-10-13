/**
 * Hall wave through the real update() loop.
 * Run: node src/campaign/HallWave.test.js
 *
 * The back room opens 10 s after the first hall foe aggros, or when the
 * first foe drops. advanceSim feeds update a fixed 1/60 step at every
 * viewport and frame rate. Render rolls do not touch the combat stream.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
require('./CampaignTable');
require('./ExitRules');
require('../systems/EnemyIntent');
const R = require('./CampaignRuntime');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

const root = path.join(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function extractFn(name) {
  const re = new RegExp('function ' + name + '\\([\\s\\S]*?\\n\\}');
  const m = html.match(re);
  if (!m) throw new Error('missing ' + name);
  return m[0];
}

function foe(name, extra) {
  return function () {
    return Object.assign({ team: 'foe', name: name, hp: 10, maxhp: 10, boss: 0, kind: name, sprite: name, sa: '+1', strMul: 2 }, extra || {});
  };
}

function boot() {
  const g = {
    campaignLevel: 4,
    ch: 4,
    t: 0,
    scene: 'play',
    paused: false,
    talk: null,
    sleepShow: null,
    elapsed: 0,
    dayClock: 0,
    hurt: 0,
    shake: 0,
    flash: null,
    hint: null,
    shots: [],
    parts: [],
    texts: [],
    log: [],
    loot: [],
    ents: [{ team: 'party', hero: 1, x: 12, y: 34, hp: 280, maxhp: 280, dead: 0, col: { key: 'macar' }, name: 'Macar' }],
    props: [
      { k: 'boulder', campaign: 'ogre-seal', x: 1, y: 1 },
      { k: 'boulder', campaign: 'ogre-seal', x: 2, y: 2 },
      { k: 'boulder', campaign: 'ogre-seal', x: 3, y: 3 }
    ],
    cam: { x: 12, y: 34 },
    lvl: {
      n: 4, w: 132, h: 106, grid: null, secrets: [],
      flags: {},
      objs: [],
      tick: function () { g.lvl._shell = 1; }
    }
  };
  const opts = {
    scale: 4,
    fresh: true,
    foe: { orc: foe('Orc', { kind: 'orc', sprite: 'orc', hp: 42, maxhp: 42 }) },
    rng: function () { return 0; },
    rollExpr: function () { return 7; }
  };
  assert(R.install(g, opts) === true, 'a Level 4 boot installs for the live loop');
  return g;
}

function isHall(e) {
  if (!e || e.hero || e.room !== 'hall-of-names') return false;
  return e.campaignKey === 'orcChief' || e.campaignKey === 'orcShaman' || e.campaignKey === 'orcLeader' || e.campaignKey === 'orcGuard';
}

function prep(g) {
  g.scene = 'play';
  g.paused = false;
  g.talk = null;
  g.sleepShow = null;
  g.elapsed = 0;
  g.dayClock = 0;
  g.hurt = 0;
  g.shake = 0;
  g.flash = null;
  g.hint = null;
  g.shots = [];
  g.parts = [];
  g.texts = [];
  g.log = [];
  g.loot = g.loot || [];
  g.props = g.props || [];
  g.cam = g.cam || { x: 0, y: 0 };
  g.ents.forEach(function (e) {
    if (!e) return;
    if (e.hero) {
      e.sp = 4; e.range = 1; e.r = 0.36; e.atkMax = 0.78; e.cd = 1;
      e.atk = 0; e.ct = 0; e.swung = 0; e.anim = 0; e.hp = 9000; e.maxhp = 9000;
      e.dead = 0; e.moving = 0; e.dest = null; e.engaged = 0;
      e.fdx = 1; e.fdy = 0; e.ix = 0; e.iy = 0;
      return;
    }
    if (!isHall(e)) { e.dead = 1; e.hp = 0; return; }
    e.sp = 2.7; e.range = 1; e.r = 0.36; e.atkMax = 0.42;
    e.cd = e.cd || 1.05; e.atk = 0; e.ct = 0; e.swung = 0; e.anim = 0;
    e.hp = 9000; e.maxhp = 9000; e.dead = 0; e.npc = 0; e.sleeping = 0;
    e.hidden = 0; e.tied = 0; e.crushed = 0; e.fleeTo = null; e.webbed = 0;
    e.moving = 0; e.ix = 0; e.iy = 0; e.fdx = e.fdx || -1; e.fdy = e.fdy || 0;
    e.intent = null; e.intentAge = 0;
  });
}

function heroOf(g) { return g.ents.filter(function (e) { return e.hero; })[0]; }
function backs(g) { return g.ents.filter(function (e) { return e.hallReserve || e.hallWave === 'back'; }); }
function starters(g) {
  return g.ents.filter(function (e) { return isHall(e) && !e.hallReserve && e.hallWave !== 'back'; });
}

const SIM_STEP = 1 / 60;
const loopSrc = html.slice(html.indexOf('const SIM_STEP=1/60;'), html.indexOf('resize();', html.indexOf('const SIM_STEP=1/60;')));
assert(/function advanceSim\(frameDt\)/.test(loopSrc) && /function paintFrame\(/.test(loopSrc) && /function loop\(now\)/.test(loopSrc), 'the page loop quantizes time and paints on a side stream');
assert(/advanceSim\(dt\)/.test(loopSrc) && !/update\(dt\)/.test(html.slice(html.indexOf('function loop(now)'), html.indexOf('function loop(now)') + 700)), 'the frame loop does not pass wall-clock dt into update');
assert(/Math\.random=visualRand/.test(loopSrc) && /render\(\)/.test(loopSrc), 'render rolls stay off the combat random stream');

function makeWorld(see) {
  const g = boot();
  prep(g);
  const ctx = {
    G: g,
    EnemyIntent: global.EnemyIntent,
    CampaignRuntime: R,
    SIM_STEP: SIM_STEP,
    simAcc: 0,
    visualSeed: 0xC0FFEE,
    IN: { keys: {}, taps: [], stick: null },
    ABIL: [],
    cds: {},
    PROMPT: null,
    skillSystem: { tickAttack: function () {}, reset: function () {} },
    QUALITY: 0,
    WALK_CYCLES_PER_SECOND: 1.675,
    dist: function (a, b) { return Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0)); },
    canBe: function () { return true; },
    walk: function () { return true; },
    hasLOS: function () { return !!see; },
    tileVisible: function () { return true; },
    tileBlocksSight: function () { return false; },
    isWalkTile: function () { return true; },
    inDarkZone: function (e) {
      const zs = g.darkZones || [];
      for (let i = 0; i < zs.length; i++) {
        const z = zs[i];
        if ((z.t || 0) <= 0) continue;
        if (e && Math.hypot((e.x || 0) - z.x, (e.y || 0) - z.y) <= (z.r || 1)) return true;
      }
      return false;
    },
    wornMoveMul: function () { return 1; },
    moveSlowMul: function () { return 1; },
    heroFearStep: function () { return false; },
    bestSlide: function () { return null; },
    turnToward: function () { return 0; },
    gaitAdvance: function (e, dt) { e.gait = (e.gait || 0) + Math.max(0, dt); },
    rebuildVision: function () {},
    lerp: function (a, b, t) { return a + (b - a) * (t || 0); },
    meleeSwing: function () {},
    player: function () { return g.ents.find(function (e) { return e.hero && !e.dead; }); },
    nearestFoe: function (e, maxd) {
      let b = null, bd = maxd || 99;
      const party = e && e.team === 'party';
      g.ents.forEach(function (o) {
        if (!o || o.team !== 'foe' || o.dead) return;
        if (party && !ctx.tileVisible(o.x, o.y)) return;
        const d = ctx.dist(e, o);
        if (d < bd) { bd = d; b = o; }
      });
      return b;
    },
    nearestAlly: function (e, maxd) {
      let b = null, bd = maxd || 99;
      g.ents.forEach(function (o) {
        if (!o || o.team !== 'party' || o.dead) return;
        const d = ctx.dist(e, o);
        if (d < bd) { bd = d; b = o; }
      });
      return b;
    },
    worldArtReady: function () { return true; },
    SystemsReady: { systemsHold: function () { return false; } },
    render: function () {},
    tickGfx: function () {},
    tryEnterPlay: function () {},
    tickAutosave: function () {},
    syncMusic: function () {},
    resolveTaps: function () {},
    requestAnimationFrame: function () {}
  };
  vm.createContext(ctx);
  const src = [
    extractFn('faceToward'),
    extractFn('moveStep'),
    extractFn('move'),
    extractFn('steerWalk'),
    extractFn('intentHost'),
    extractFn('beginSpecialtySwing'),
    extractFn('armFoeSpecialty'),
    extractFn('applyEnemyIntent'),
    extractFn('update'),
    extractFn('visualRand'),
    extractFn('advanceSim'),
    extractFn('paintFrame')
  ].join('\n');
  vm.runInContext(src + '\nthis.update=update; this.advanceSim=advanceSim; this.paintFrame=paintFrame; this.visualRand=visualRand;', ctx);
  const skip = {
    if: 1, else: 1, for: 1, while: 1, do: 1, switch: 1, case: 1, break: 1, continue: 1,
    return: 1, function: 1, var: 1, let: 1, const: 1, typeof: 1, instanceof: 1, new: 1,
    try: 1, catch: 1, finally: 1, throw: 1, of: 1, in: 1, true: 1, false: 1, null: 1,
    undefined: 1, this: 1, class: 1, extends: 1, super: 1, yield: 1, await: 1,
    default: 1, delete: 1, void: 1, with: 1, update: 1, advanceSim: 1, paintFrame: 1
  };
  const updateSrc = extractFn('update');
  const idents = updateSrc.match(/\b[A-Za-z_$][\w$]*\b/g) || [];
  const seen = {};
  idents.forEach(function (name) {
    if (skip[name] || seen[name]) return;
    seen[name] = 1;
    vm.runInContext('if (typeof ' + name + ' === "undefined") { ' + name + ' = function(){return 0;}; }', ctx);
  });
  return ctx;
}

function step(ctx, dt) {
  for (let n = 0; n < 80; n++) {
    try {
      ctx.update(dt);
      return;
    } catch (e) {
      const m = String(e && e.message || '').match(/^([A-Za-z_$][\w$]*) is not defined/);
      if (!m || ctx[m[1]]) throw e;
      vm.runInContext(m[1] + '=function(){return 0;};', ctx);
    }
  }
  throw new Error('update needed too many stubs');
}

function runFrames(ctx, frameDt, seconds) {
  const n = Math.round(seconds / frameDt);
  for (let i = 0; i < n; i++) ctx.advanceSim(frameDt);
}

(function fixedStep() {
  const ctx = makeWorld(true);
  const seen = [];
  ctx.update = function (dt) { seen.push(dt); };
  ctx.simAcc = 0;
  ctx.G.scene = 'title';
  ctx.G.hitstop = 0;
  ctx.advanceSim(0.05);
  const laptop = seen.slice();
  seen.length = 0;
  ctx.simAcc = 0;
  ctx.advanceSim(SIM_STEP);
  ctx.advanceSim(SIM_STEP);
  ctx.advanceSim(SIM_STEP);
  assert(laptop.length === 3 && seen.length === 3 && laptop.every(function (dt, i) { return dt === SIM_STEP && seen[i] === SIM_STEP; }), 'a 50 ms laptop frame and three phone frames run the same 1/60 updates');
  ctx.simAcc = 0;
  ctx.G.hitstop = 0.04;
  const skipped = [];
  ctx.update = function () { skipped.push(1); };
  ctx.advanceSim(0.05);
  assert(skipped.length === 0 && ctx.G.hitstop === 0, 'hitstop consumes sim steps, so a slow frame does not stretch it');
  vm.runInContext('var _during=0; render=function(){ _during=(Math.random===visualRand); };', ctx);
  ctx.paintFrame();
  vm.runInContext('_restored=(Math.random!==visualRand);', ctx);
  assert(ctx._during === true && ctx._restored === true, 'paintFrame swaps the random stream around render and puts it back');
})();

(function liveWave() {
  const door = makeWorld(true);
  const mac = heroOf(door.G);
  mac.x = 40; mac.y = 20;
  const before = starters(door.G);
  assert(before.length >= 1 && before.every(function (e) { return !e.engaged; }) && backs(door.G).length === 1, 'the hall starts with the back room closed and nobody pre-engaged');
  step(door, SIM_STEP);
  assert(before.some(function (e) { return e.engaged === 1; }), 'the first hall foe aggros inside update, without a harness flag');
  assert(door.G.lvl.flags.hallWave === 1 && door.G.lvl.flags.hallWaveOn === 1 && backs(door.G).every(function (e) { return e.hallReserve === 1; }), 'that aggro starts the wave counter at 1');

  const laptop = makeWorld(true);
  const phone = makeWorld(true);
  heroOf(laptop.G).x = 40; heroOf(laptop.G).y = 20;
  heroOf(phone.G).x = 40; heroOf(phone.G).y = 20;
  const lapBack = backs(laptop.G).map(function (e) { return e.x; });
  const phoneBack = backs(phone.G).map(function (e) { return e.x; });
  runFrames(laptop, 0.05, 12);
  runFrames(phone, SIM_STEP, 12);
  function arrived(g, starts) {
    const now = backs(g);
    return g.lvl.flags.hallWave === 2 && now.length === 1 && now.every(function (e, i) {
      return !e.hallReserve && e.hallJoin === 1 && e.homeX === 46 && e.homeY === 20 && e.aggro === 11 && e.leash === 11 && e.x < starts[i] - 1;
    });
  }
  assert(arrived(laptop.G, lapBack), 'ten seconds of the live loop brings the back-room guard across the hall');
  assert(arrived(phone.G, phoneBack), 'the same ten seconds on phone frames brings that guard across');
  const lx = backs(laptop.G).map(function (e) { return e.x; });
  const px = backs(phone.G).map(function (e) { return e.x; });
  assert(lx.every(function (x, i) { return x === px[i]; }), 'laptop and phone leave the guards on the same tiles');

  const dark = makeWorld(false);
  const darkHero = heroOf(dark.G);
  darkHero.x = 40; darkHero.y = 20;
  dark.G.darkZones = [{ x: 40, y: 20, r: 30, t: 80 }];
  const darkStart = backs(dark.G).map(function (e) { return e.x; });
  runFrames(dark, SIM_STEP, 12);
  const darkNow = backs(dark.G);
  assert(dark.G.lvl.flags.hallWave === 2 && darkNow.every(function (e, i) { return e.hallJoin === 1 && e.x < darkStart[i] - 1; }), 'darkness does not stop the called guards from pathing in');

  const quiet = makeWorld(true);
  const far = heroOf(quiet.G);
  far.x = 1; far.y = 1;
  runFrames(quiet, SIM_STEP, 12);
  assert(quiet.G.lvl.flags.hallWave !== 2 && backs(quiet.G).every(function (e) { return e.hallReserve === 1; }), 'twelve quiet seconds do not open the back room');

  const dropped = makeWorld(true);
  const away = heroOf(dropped.G);
  away.x = 1; away.y = 1;
  const first = starters(dropped.G)[0];
  first.dead = 1; first.hp = 0;
  runFrames(dropped, SIM_STEP, SIM_STEP);
  assert(dropped.G.lvl.flags.hallWave === 2 && backs(dropped.G).every(function (e) { return !e.hallReserve && e.hallJoin === 1; }), 'the first foe to drop opens the back room on the next live step');
})();

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('hall wave live loop ok');
