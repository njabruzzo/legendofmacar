/**
 * A routed hall guard walks a clear path. He does not teleport, and he
 * stays out once he is out of sight.
 * Run: node src/campaign/HallRout.test.js
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

const root = path.join(__dirname, '../..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'src/vendor/rotjs/rot-path.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(root, 'src/systems/Navigation.js'), 'utf8'));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function extractFn(name) {
  const re = new RegExp('function ' + name + '\\([\\s\\S]*?\\n\\}');
  const m = html.match(re);
  if (!m) throw new Error('missing ' + name);
  return m[0];
}

function blocked(x, y) {
  const i = Math.floor(x), j = Math.floor(y);
  if (i < 0 || j < 0 || i >= 24 || j >= 18) return true;
  return i === 8 && j <= 10;
}

const hero = { hero: 1, dead: 0, x: 3.5, y: 6.5, hp: 280 };
const world = { mode: 'wall' };

function canBe(x, y, r) {
  r = r || 0;
  if (world.mode === 'open') return x > 0 && y > 0 && x < 40 && y < 40;
  const pts = [[x, y], [x + r, y], [x - r, y], [x, y + r], [x, y - r]];
  for (let i = 0; i < pts.length; i++) if (blocked(pts[i][0], pts[i][1])) return false;
  return true;
}

const ctx = {
  Navigation: globalThis.Navigation,
  SIGHT_R: 12,
  TAU: Math.PI * 2,
  WALK_CYCLES_PER_SECOND: 1.675,
  hero: hero,
  G: { ents: [hero], lvl: { vis: null } },
  dist: function (a, b) { return Math.hypot(a.x - b.x, a.y - b.y); },
  canBe: canBe,
  walk: function (x, y) { return canBe(x, y, 0); },
  hasLOS: function () { return true; },
  tileVisible: function () { return true; },
  player: function () { return hero; },
  wornMoveMul: function () { return 1; },
  ang: function (dx, dy) { return Math.atan2(dy, dx); }
};
vm.createContext(ctx);
vm.runInContext([
  extractFn('gaitAdvance'),
  extractFn('turnToward'),
  extractFn('bestSlide'),
  extractFn('moveStep'),
  extractFn('move'),
  extractFn('steerWalk'),
  extractFn('foeMoveAim'),
  extractFn('fleeSightR'),
  extractFn('foeOutOfSight'),
  extractFn('fleeCanStand'),
  extractFn('fleeSegmentClear'),
  extractFn('planFleePath'),
  extractFn('parkFledFoe'),
  extractFn('arriveFleePoint'),
  extractFn('stepFoeFlee')
].join('\n') + '\nthis.stepFoeFlee=stepFoeFlee;', ctx);

function stepGuard(e, n) {
  const trace = [];
  let maxStep = 0;
  for (let i = 0; i < n; i++) {
    const x = e.x, y = e.y;
    ctx.stepFoeFlee(e, 1 / 60);
    const moved = Math.hypot(e.x - x, e.y - y);
    if (moved > maxStep) maxStep = moved;
    trace.push({ x: e.x, y: e.y, hidden: e.hidden, fleeTo: e.fleeTo });
    if (e.hidden) break;
  }
  return { trace: trace, maxStep: maxStep };
}

(function aroundTheWall() {
  world.mode = 'wall';
  hero.x = 3.5;
  hero.y = 6.5;
  const guard = {
    team: 'foe', name: 'Hall guard', x: 3.5, y: 6.5, r: 0.36, sp: 4,
    fleeTo: { x: 16.5, y: 6.5 }, hidden: 0, dead: 0, stun: 0,
    aggro: 11, engaged: 1, fdx: 1, fdy: 0, moving: 0
  };
  const run = stepGuard(guard, 600);
  const crossed = run.trace.some(function (p) { return p.x > 9 && p.y > 10.5; });
  const snapped = run.trace.some(function (p, i) {
    if (!i) return false;
    return Math.hypot(p.x - run.trace[i - 1].x, p.y - run.trace[i - 1].y) > 1.25;
  });
  assert(run.maxStep <= 1.25 && !snapped, 'no flee step teleports across the hall');
  assert(crossed, 'the guard walks the corridor around the wall');
  assert(guard.hidden === 1 && guard.fledOut === 1 && guard.fleeTo, 'out of sight he stays fled and keeps the exit');
  const parked = { x: guard.x, y: guard.y };
  for (let i = 0; i < 60; i++) ctx.stepFoeFlee(guard, 1 / 60);
  assert(guard.x === parked.x && guard.y === parked.y && guard.hidden === 1 && guard.fleeTo, 'once out, he does not walk back into the fight');
  assert(Math.hypot(guard.x - 16.5, guard.y - 6.5) > 0.5, 'he does not snap onto the cave point');
})();

(function openFieldDoesNotSnap() {
  world.mode = 'open';
  hero.x = 2;
  hero.y = 2;
  ctx.SIGHT_R = 80;
  const guard = {
    team: 'foe', x: 2, y: 2, r: 0.36, sp: 4,
    fleeTo: { x: 28, y: 2 }, hidden: 0, dead: 0, stun: 0, fdx: 1, fdy: 0
  };
  let maxStep = 0;
  for (let i = 0; i < 192; i++) {
    const x = guard.x, y = guard.y;
    ctx.stepFoeFlee(guard, 1 / 60);
    maxStep = Math.max(maxStep, Math.hypot(guard.x - x, guard.y - y));
  }
  assert(maxStep <= 1.25, 'three seconds of open flight never jumps a tile');
  assert(guard.x > 16 && guard.x < 24 && !guard.hidden, 'he is still on the way to a far exit, not standing on it');
  ctx.SIGHT_R = 12;
})();

(function authoredArrival() {
  world.mode = 'open';
  hero.x = 2;
  hero.y = 2;
  let xp = 0;
  const og = {
    team: 'foe', name: 'Ogress', x: 2, y: 2, r: 0.36, sp: 4,
    fleePath: [{ x: 4.2, y: 2 }, { x: 6.4, y: 2 }],
    glanceBack: 0.9, hidden: 0, dead: 0, stun: 0, fdx: 1, fdy: 0,
    onArrive: function () { xp += 185; }
  };
  og.fleeTo = og.fleePath.shift();
  let maxStep = 0;
  for (let i = 0; i < 240 && xp === 0; i++) {
    const x = og.x, y = og.y;
    ctx.stepFoeFlee(og, 1 / 60);
    maxStep = Math.max(maxStep, Math.hypot(og.x - x, og.y - y));
  }
  assert(xp === 185 && maxStep <= 1.25, 'an authored flee still arrives and pays its XP without a teleport');
})();

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('hall rout ok');
