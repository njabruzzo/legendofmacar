/**
 * Level 3 shell: own grid, ruby gating, tooth wall, asset files.
 * Run: node src/campaign/L3Shell.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Shell = require('./L3Shell');
const R = require('./CampaignRuntime');
const L2 = require('./L2');
const L3 = require('./L3');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

const root = path.join(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function grab(name) {
  const start = html.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('missing ' + name);
  let i = html.indexOf('{', start);
  let depth = 0;
  for (let j = i; j < html.length; j++) {
    if (html[j] === '{') depth++;
    else if (html[j] === '}') {
      depth--;
      if (depth === 0) return html.slice(start, j + 1);
    }
  }
  throw new Error('unclosed ' + name);
}

const ctx = vm.createContext({});
vm.runInContext(
  [grab('h2'), grab('h3'), grab('newGrid'), grab('rect'), grab('isWalkTile'), grab('caveDisk'), grab('carvePath'), grab('sealOuter')].join('\n') +
  '\nthis.newGrid=newGrid; this.rect=rect; this.isWalkTile=isWalkTile; this.caveDisk=caveDisk; this.carvePath=carvePath; this.sealOuter=sealOuter;',
  ctx
);

function blank() { return ctx.newGrid(144, 118, 1); }
function carveL2() {
  const g = blank();
  const start = html.indexOf('caveDisk(g,40,8,5.0,4.0,3);');
  const end = html.indexOf('L.spawn={x:40.15,y:8.55};');
  const extra = 'caveDisk(g,62,16,6.4,5.2,0); for(let y=15;y<=17;y++)g[y][67]=4; for(let x=60;x<=65;x++){g[10][x]=1;for(let y=11;y<=13;y++)g[y][x]=0;} for(let ii=39;ii<=41;ii++){ if(g[40]) g[40][ii]=1; if(g[39]) g[39][ii]=1; }';
  vm.runInContext(html.slice(start, end) + extra, vm.createContext({ g: g, caveDisk: ctx.caveDisk, carvePath: ctx.carvePath, rect: ctx.rect }));
  ctx.sealOuter(g);
  return g;
}
function carveL3() {
  const g = blank();
  Shell.carve(g, ctx);
  ctx.sealOuter(g);
  return g;
}

const l2 = carveL2();
const l3 = carveL3();
let inter = 0;
let walk3 = 0;
for (let y = 0; y < 118; y++) for (let x = 0; x < 144; x++) {
  const a = ctx.isWalkTile(l3[y][x]);
  const b = ctx.isWalkTile(l2[y][x]);
  if (a) walk3++;
  if (a && b) inter++;
}
assert(walk3 > 0 && inter / walk3 < 0.40, 'L3 shares under 40% of its walkable tiles with Level 2 (' + (inter / walk3).toFixed(3) + ')');

let holes = 0;
for (let x = 74; x <= 96; x++) if (l3[99][x] !== 1) holes++;
assert(holes === 0, 'the queen hall north wall stays rock');
assert(l3[99][85] === 1 && ctx.isWalkTile(l3[100][85]), 'the demon face sits on a wall tile with floor to the south');
assert(l3[79][123] === 1 && ctx.isWalkTile(l3[80][123]), 'the ruby door sits on the chamber north wall');

function flood(g, x, y) {
  const seen = new Set();
  const q = [[x | 0, y | 0]];
  while (q.length) {
    const cur = q.pop();
    const key = cur[0] + ',' + cur[1];
    if (seen.has(key)) continue;
    if (!g[cur[1]] || !ctx.isWalkTile(g[cur[1]][cur[0]])) continue;
    seen.add(key);
    q.push([cur[0] + 1, cur[1]], [cur[0] - 1, cur[1]], [cur[0], cur[1] + 1], [cur[0], cur[1] - 1]);
  }
  return seen;
}
const reach = flood(l3, 128, 74);
function reached(x, y) { return reach.has((x | 0) + ',' + (y | 0)); }
[[123, 81], [116, 89], [130, 89], [85, 107], [118, 98], [56, 106], [108, 112], [138, 111], [85, 100]].forEach(function (pt) {
  assert(reached(pt[0], pt[1]), 'tile ' + pt.join(',') + ' is reachable from arrival');
});

const banned = { bronzedoor: 1, bell: 1, cavein: 1, craftstation: 1, hourglass: 1, sack: 1, crate: 1 };
Shell.dressing.forEach(function (p) {
  assert(!banned[p.k], 'Level 3 dressing does not place ' + p.k);
  const x = Math.floor(p.x), y = Math.floor(p.y);
  assert(ctx.isWalkTile(l3[y][x]), p.k + ' at ' + p.x + ',' + p.y + ' stands on a floor tile');
});
assert(Shell.dressing.some(function (p) { return p.k === 'web' && p.silk === 1; }), 'webs carry silk');
assert(Shell.dressing.some(function (p) { return p.k === 'bones' && p.cocoon === 1; }), 'bones are cocooned');
assert(Shell.dressing.some(function (p) { return p.k === 'eggs'; }), 'egg sacs are placed');

const book = JSON.parse(fs.readFileSync(path.join(__dirname, 'maps/l3.json'), 'utf8'));
assert(JSON.stringify(book.levels[0].layout.rooms) === JSON.stringify(Shell.rooms), 'l3.json rooms match the shell');
assert(JSON.stringify(book.levels[0].loot.caches.places) === JSON.stringify(Shell.caches), 'l3.json caches match the shell');
assert(book.levels[0].tooth.x === Shell.points.tooth.x && book.levels[0].tooth.wall === 'n', 'l3.json tooth matches the shell');
const l2caches = [[82, 28], [96, 32], [90, 50], [12, 44], [18, 64], [40, 70], [66, 76], [64, 46], [122, 30], [40, 98], [100, 88], [8, 92], [118, 10], [120, 62], [48, 106], [90, 6]];
assert(!Shell.caches.some(function (pt) {
  return l2caches.some(function (old) { return old[0] === pt[0] && old[1] === pt[1]; });
}), 'Level 3 caches are not the Chapter II lattice');

assert(R.shellChapter(3) === 30 && R.shellChapter(2) === 2 && R.shellChapter(1) === 1, 'Level 3 uses shell 30');
assert(html.indexOf('if(n===30) return makeCampaignL3();') >= 0, 'chapter 30 builds the Level 3 floor');
const shellFn = html.slice(html.indexOf('function makeCampaignL3'), html.indexOf('function makeChapter'));
assert(shellFn.indexOf('hourglass') < 0 && shellFn.indexOf('L.n===2') < 0 && shellFn.indexOf('dressDungeon') < 0, 'the Level 3 builder does not dress Chapter II');
assert(html.indexOf("SPRITE_FILES.hourglass='assets/props/prop_hourglass.png'") >= 0, 'the hourglass stand-in is bound');
const boot = fs.readFileSync(path.join(__dirname, 'CampaignBoot.js'), 'utf8');
assert(boot.indexOf('src/campaign/L3Shell.js') > boot.indexOf('src/campaign/L3.js'), 'the boot loads the shell after the Level 3 data');

const files = [
  'assets/props/prop_hourglass.png',
  'assets/props/prop_demon_dwarfface.png',
  'assets/props/prop_throne.png',
  'assets/props/prop_rubydoor.png',
  'assets/props/prop_lift.png',
  'assets/props/prop_eggs.png',
  'assets/props/prop_bones.png',
  'assets/props/prop_lantern.png',
  'assets/props/prop_ch1_lift_lever.png',
  'assets/props/prop_bronzedoor.png',
  'assets/props/prop_bell.png',
  'assets/props/prop_cavein.png',
  'assets/props/prop_craftstation.png',
  'assets/creatures/mon_thinone.png',
  'assets/creatures/mon_thinone_w1.png',
  'assets/creatures/mon_thinone_w2.png',
  'assets/creatures/mon_goblin.png',
  'assets/creatures/mon_goblin_w1.png',
  'assets/creatures/mon_goblin_w2.png',
  'assets/creatures/mon_rat.png',
  'assets/creatures/mon_rat_w1.png',
  'assets/creatures/mon_rat_w2.png',
  'assets/creatures/mon_goblin_king.png',
  'assets/creatures/mon_goblin_king_w1.png',
  'assets/creatures/mon_goblin_king_w2.png',
  'assets/creatures/mon_spider.png',
  'assets/creatures/mon_spider_huge.png',
  'assets/creatures/mon_spider_giant.png',
  'assets/creatures/mon_phasespider.png'
];
[L2, L3].forEach(function (mod) {
  Object.keys(mod.MONSTERS).forEach(function (key) {
    const file = mod.MONSTERS[key].art && mod.MONSTERS[key].art.file;
    if (file) files.push(file);
  });
});
files.forEach(function (file) {
  assert(fs.existsSync(path.join(root, file)), file + ' is on disk');
});
assert(L3.TOOTH && L3.TOOTH.asset === 'demon_dwarfface' && L3.TOOTH.wall === 'n' && L3.TOOTH.prop.y === 99.15, 'Level 3 tooth data names the demon face on the north wall');

function foe(name, extra) {
  return function () {
    return Object.assign({ team: 'foe', name: name, hp: 20, maxhp: 20, boss: 0, kind: name, sprite: name }, extra || {});
  };
}
const l3spec = R.load(3);
const gate = {
  campaignLevel: 3,
  ch: 30,
  ents: [{ hero: 1, team: 'party', x: l3spec.map.rubyDoor.x, y: l3spec.map.rubyDoor.y + 1.2, dead: 0, hp: 40 }],
  props: [],
  lvl: { n: 30, w: 144, h: 118, grid: null, secrets: [], flags: { ownShell: 1 }, spawn: { x: 128.2, y: 73.4 }, tick: function () {} }
};
assert(R.install(gate, {
  scale: 4, fresh: true,
  foe: { thinone: foe('Thin One', { sprite: 'thinone', kind: 'statue' }), spider: foe('Cave Spider', { sprite: 'spider', kind: 'spider' }) },
  rng: function () { return 0; },
  rollExpr: function () { return 4; }
}) === true, 'a fresh Level 3 installs on shell 30');
const guard = gate.ents.filter(function (e) { return e.campaignRole === 'guardian'; })[0];
assert(guard && guard.sleeping === 1 && guard.rubyTint === 1 && guard.name === 'Ruby Guardian III' && guard.leash === 7.5, 'the ruby guardian is tinted, named, and leashed');
assert(!gate.props.some(function (p) { return p.k === 'hourglass' || p.k === 'bronzedoor' || p.k === 'bell' || p.k === 'cavein' || p.k === 'craftstation'; }), 'install does not place Chapter II-only props');
global.interact = function (label, fn) { global._gate = { label: label, fn: fn }; };
global.say = function () {};
R.tick(gate, 0.1);
assert(global._gate && global._gate.label === 'Touch the ruby door', 'touching the ruby door is the wake');
global._gate.fn();
assert(gate.lvl.flags.rubyWoke === 1 && guard.sleeping === 0, 'the door wakes the guardian');
const hero = gate.ents.filter(function (e) { return e.hero; })[0];
hero.x = l3spec.map.lever.x;
hero.y = l3spec.map.lever.y;
R.tick(gate, 0.1);
assert(global._gate.label === 'The guardian still holds the lever', 'the lever is refused while the guardian lives');
guard.dead = 1;
R.tick(gate, 0.1);
assert(global._gate.label === 'Pull the lever', 'a dead guardian frees the lever');
global._gate.fn();
assert(gate.scene === 'campaign-card', 'the lever calls the elevator card');

const stair = {
  campaignLevel: 3,
  ch: 30,
  ents: [{ hero: 1, team: 'party', x: l3spec.map.stairs.x, y: l3spec.map.stairs.y, dead: 0, hp: 40 }],
  props: [],
  lvl: { n: 30, w: 144, h: 118, grid: null, secrets: [], flags: { ownShell: 1 }, spawn: { x: 128.2, y: 73.4 }, tick: function () {} }
};
R.install(stair, { scale: 4, fresh: true, foe: { thinone: foe('Thin One'), spider: foe('Cave Spider', { kind: 'spider' }) }, rng: function () { return 0; }, rollExpr: function () { return 4; } });
heroStand(stair);
R.tick(stair, 0.1);
assert(global._gate.label === 'The floor boss still holds the stair', 'the stair stays shut while the Queen lives');
stair.ents.forEach(function (e) { if (e.campaignRole === 'boss') e.dead = 1; });
R.tick(stair, 0.1);
assert(global._gate.label === 'Climb the stair', 'the Queen\'s death opens the stair');

function heroStand(G) {
  const p = G.ents.filter(function (e) { return e.hero; })[0];
  p.x = l3spec.map.stairs.x;
  p.y = l3spec.map.stairs.y;
}

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('L3 shell ok');
