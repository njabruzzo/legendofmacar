/**
 * Command stun stops Macar. A shaman flee point is what monster movement walks.
 * Run: node src/combat/StunHold.test.js
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
const src = [
  html.match(/function stunnedHold\(p\)\{[\s\S]*?\n\}/)[0],
  html.match(/function foeMoveAim\(e, chase\)\{[\s\S]*?\n\}/)[0]
].join('\n');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(src + '\nthis.stunnedHold=stunnedHold; this.foeMoveAim=foeMoveAim;', ctx);

const held = { stun: 1, dest: { x: 8, y: 4 }, moving: 1, ix: 1.2, iy: 0.4, x: 0, y: 0 };
assert(ctx.stunnedHold(held) === true, 'a stun holds Macar');
assert(held.dest === null && held.moving === 0 && held.ix === 0 && held.iy === 0, 'tap-to-move and the step are cleared');
const free = { stun: 0, dest: { x: 3, y: 1 }, moving: 1, ix: 1, iy: 0 };
assert(ctx.stunnedHold(free) === false && free.dest && free.dest.x === 3, 'an unstunned step keeps its destination');

const update = html.slice(html.indexOf('function update(dt){'), html.indexOf('function w2s('));
const stick = update.indexOf('IN.stick');
const dest = update.indexOf('p.dest');
const gate = update.indexOf('stunnedHold(p)');
const route = update.indexOf('tickRoute');
const steer = update.indexOf('steerWalk(p,');
assert(stick >= 0 && dest > stick && gate > dest && route > gate && steer > gate, 'stick, tap, and auto-path are gated before the step');
assert(update.indexOf('dx=0; dy=0; analog=0; routeDest=false;') > gate, 'a stun zeroes the stick and the path');

const flee = { x: 10, y: 10, fleeTo: { x: 16, y: 10 } };
const chase = { x: 4, y: 4 };
assert(ctx.foeMoveAim(flee, chase) === flee.fleeTo, 'monster movement reads the flee target');
assert(ctx.foeMoveAim({ x: 1, y: 1 }, chase) === chase, 'with no flee point the chase target stands');

const loop = html.slice(html.indexOf('for(const e of G.ents){'), html.indexOf('function render('));
const fleeAt = loop.indexOf('if(!e.hero && e.fleeTo)');
const stunAt = loop.indexOf('if(e.stun>0){ e.stun-=dt; continue; }');
const intentAt = loop.indexOf('EnemyIntent.decide');
assert(fleeAt >= 0 && stunAt > fleeAt && intentAt > fleeAt, 'flee is stepped before stun-skip and before the chase');
assert(/foeMoveAim\(e, null\)/.test(html.slice(html.indexOf('function applyEnemyIntent'), html.indexOf('function moveStep'))), 'intent movement also reads the flee target');

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('stun hold ok');
