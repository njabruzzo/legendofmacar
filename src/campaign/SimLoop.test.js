/**
 * Same seed, two viewports, two frame cadences, through the real loop().
 * Run: node src/campaign/SimLoop.test.js
 *
 * State hashes every 60 sim steps must match. A phone frame and a laptop
 * frame may not change stick heading, particle count, or the combat roll.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');

function extractFn(name) {
  const re = new RegExp('function ' + name + '\\([\\s\\S]*?\\n\\}');
  const m = html.match(re);
  if (!m) throw new Error('missing ' + name);
  return m[0];
}

const updateSrc = extractFn('update');
const stick = updateSrc.slice(updateSrc.indexOf('IN.stick && IN.stick.moved'), updateSrc.indexOf('const K=IN.keys'));
assert(stick.indexOf('TH/2') < 0 && stick.indexOf('TW/2') < 0 && stick.indexOf('UIS') < 0, 'stick heading does not read the viewport');
assert(/wx=sy\+sx\/2/.test(stick) && /wy=sy-sx\/2/.test(stick), 'stick heading is the fixed 2:1 iso');
assert(updateSrc.indexOf('12*(UIS') < 0, 'talk dismiss uses a fixed pixel threshold');
assert(/const pcap=48;/.test(updateSrc) && updateSrc.indexOf('QUALITY?48:12') < 0, 'the sim particle cap does not follow QUALITY');

const sim = extractFn('advanceSim');
const loop = extractFn('loop');
assert(/guard<15/.test(sim) && /if\(guard>=15\) simAcc=0;/.test(sim), 'a long frame is capped at 15 steps and drops the leftover');
assert(/G\.t\+=SIM_STEP/.test(sim) && loop.indexOf('G.t+=dt') < 0, 'the sim clock advances once per step');
assert(/resolveTaps\(\)/.test(sim) && loop.indexOf('resolveTaps(') < 0, 'taps are sampled on the sim step');
assert(/paintFrame\(\)/.test(loop) && /paintFrame\(\);\nrequestAnimationFrame\(loop\);/.test(html), 'the first paint and every frame paint on the side stream');

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function boot(view) {
  const g = {
    t: 0,
    elapsed: 0,
    dayClock: 0,
    scene: 'play',
    paused: false,
    talk: null,
    sleepShow: null,
    ch: 4,
    hurt: 0,
    shake: 0,
    flash: null,
    hint: null,
    shots: [],
    parts: [],
    texts: [],
    log: [],
    loot: [],
    props: [],
    decals: [],
    thrown: [],
    bombs: [],
    ents: [{
      team: 'party', hero: 1, name: 'Macar', x: 10, y: 10, hp: 280, maxhp: 280, dead: 0,
      sp: 4, r: 0.36, range: 1, atkMax: 0.78, cd: 1, atk: 0, ct: 1, swung: 0, anim: 0,
      moving: 0, dest: null, fdx: 1, fdy: 0, ix: 0, iy: 0, col: { key: 'macar' }
    }],
    cam: { x: 10, y: 10 },
    lvl: {
      n: 4, w: 40, h: 40, secrets: [], flags: {}, objs: [],
      tick: function () {}
    }
  };
  const ctx = {
    G: g,
    SIM_STEP: 1 / 60,
    simAcc: 0,
    visualSeed: 0xC0FFEE,
    last: 0,
    IN: { keys: {}, taps: [], stick: { moved: true, x: 90, y: 30, ox: 20, oy: 10 } },
    ABIL: [],
    cds: {},
    PROMPT: null,
    QUALITY: 1,
    GFX_MODE: 'auto',
    GFX_SLOW: 0,
    GFX_FAST: 0,
    FRAME_MS: 0,
    TW: view.tw,
    TH: view.th,
    UIS: view.uis,
    ZOOM: view.zoom,
    VW: view.vw,
    VH: view.vh,
    PORT: view.port,
    WALK_CYCLES_PER_SECOND: 1.675,
    clamp: function (v, a, b) { return Math.max(a, Math.min(b, v)); },
    dist: function (a, b) { return Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0)); },
    canBe: function () { return true; },
    walk: function () { return true; },
    lerp: function (a, b, t) { return a + (b - a) * (t || 0); },
    wornMoveMul: function () { return 1; },
    moveSlowMul: function () { return 1; },
    player: function () { return g.ents.find(function (e) { return e.hero && !e.dead; }); },
    worldArtReady: function () { return true; },
    SystemsReady: { systemsHold: function () { return false; } },
    Navigation: { clearRoute: function () {}, use: function () { return false; }, tickRoute: function () { return null; } },
    PartyOrders: { use: function () { return false; }, settle: function () {}, noteTap: function () {}, noteMoraleFlee: function () {} },
    CampaignRuntime: {},
    TimedEffects: { useHaste: function () { return false; }, hasHaste: function () { return false; } },
    EnemyIntent: { tick: function () {} },
    skillSystem: { tickAttack: function () {}, reset: function () {} },
    render: function () {},
    tryEnterPlay: function () {},
    tickAutosave: function () {},
    syncMusic: function () {},
    resolveTaps: function () {},
    requestAnimationFrame: function () {},
    resize: function () {
      ctx.TW += 3;
      ctx.TH += 1;
      ctx.UIS *= 0.97;
      ctx._resized = (ctx._resized || 0) + 1;
    }
  };
  vm.createContext(ctx);
  vm.runInContext('Math.random = (' + mulberry32.toString() + ')(71601);', ctx);
  const src = [
    extractFn('moveStep'),
    extractFn('move'),
    extractFn('bestSlide'),
    extractFn('turnToward'),
    extractFn('gaitAdvance'),
    extractFn('steerWalk'),
    extractFn('tickGfx'),
    extractFn('update'),
    extractFn('visualRand'),
    extractFn('advanceSim'),
    extractFn('paintFrame'),
    extractFn('loop')
  ].join('\n');
  vm.runInContext(src + '\nthis.update=update; this.advanceSim=advanceSim; this.paintFrame=paintFrame; this.loop=loop; this.tickGfx=tickGfx;', ctx);
  vm.runInContext('G.lvl.tick=function(){ G._rolls=(G._rolls||0)+1; G._roll=Math.random(); G.parts.push({x:1,y:1,vx:0,vy:0,vz:0,z:1,life:30}); }; render=function(){ Math.random(); Math.random(); Math.random(); };', ctx);
  const skip = {
    if: 1, else: 1, for: 1, while: 1, do: 1, switch: 1, case: 1, break: 1, continue: 1,
    return: 1, function: 1, var: 1, let: 1, const: 1, typeof: 1, instanceof: 1, new: 1,
    try: 1, catch: 1, finally: 1, throw: 1, of: 1, in: 1, true: 1, false: 1, null: 1,
    undefined: 1, this: 1, class: 1, extends: 1, super: 1, yield: 1, await: 1,
    default: 1, delete: 1, void: 1, with: 1, update: 1, advanceSim: 1, paintFrame: 1, loop: 1, tickGfx: 1
  };
  const seen = {};
  (updateSrc.match(/\b[A-Za-z_$][\w$]*\b/g) || []).forEach(function (name) {
    if (skip[name] || seen[name]) return;
    seen[name] = 1;
    vm.runInContext('if (typeof ' + name + ' === "undefined") { ' + name + ' = function(){return 0;}; }', ctx);
  });
  return ctx;
}

function hash(ctx) {
  const p = ctx.G.ents[0];
  return [p.x, p.y, p.hp, ctx.G.elapsed, ctx.G.t, ctx.G.parts.length, ctx.G._rolls, ctx.G._roll].join('|');
}

function frames(ctx, frameMs, n) {
  for (let i = 0; i < n; i++) {
    ctx._now = (ctx._now || 0) + frameMs;
    let guard = 0;
    while (guard < 8) {
      try { ctx.loop(ctx._now); break; }
      catch (e) {
        const m = String(e && e.message || '').match(/^([A-Za-z_$][\w$]*) is not defined/);
        if (!m) throw e;
        vm.runInContext(m[1] + '=function(){return 0;};', ctx);
        guard++;
      }
    }
  }
}

(function cap() {
  const ctx = boot({ tw: 116, th: 58, uis: 1.14, zoom: 1.38, vw: 1280, vh: 800, port: false });
  let n = 0;
  ctx.update = function () { n++; };
  ctx.simAcc = 0;
  ctx.advanceSim(2);
  assert(n === 15 && ctx.simAcc === 0, 'a tab-return runs 15 steps and keeps no remainder');
  ctx.advanceSim(0.01);
  assert(n === 15 && ctx.simAcc > 0 && ctx.simAcc < 1 / 60, 'the next short frame does not spend the dropped remainder');
})();

const laptopView = { tw: 116, th: 58, uis: 1.142, zoom: 1.38, vw: 1280, vh: 800, port: false };
const phoneView = { tw: 66, th: 34, uis: 0.907, zoom: 0.78, vw: 390, vh: 844, port: true };
const laptop = boot(laptopView);
const phone = boot(phoneView);

const marks = [];
for (let block = 0; block < 3; block++) {
  frames(laptop, 50, 20);
  frames(phone, 1000 / 60, 60);
  marks.push([hash(laptop), hash(phone)]);
}
marks.forEach(function (pair, i) {
  assert(pair[0] === pair[1], 'step ' + ((i + 1) * 60) + ' matches across laptop 50 ms and phone 1/60');
});
assert(laptop.G.ents[0].x !== 10 && phone.G.ents[0].y !== 10, 'the held stick moved Macar on both viewports');
assert((laptop._resized || 0) > 0 && !(phone._resized > 0), 'the slow laptop frame changed quality and the phone frame did not');
assert(laptop.G.parts.length === phone.G.parts.length && laptop.G.parts.length > 40, 'both viewports keep the same particle cap');

if (failed) {
  console.error(failed + ' failed');
  if (marks.length) console.error(marks.map(function (p) { return p.join('\n'); }).join('\n---\n'));
  process.exit(1);
}
console.log('sim loop ok');
