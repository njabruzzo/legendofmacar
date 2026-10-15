/**
 * Nick's rule: every campaign floor looks like its own level.
 * KNOWN_FAILS is an exact list of [subject, reason]. A subject is a level
 * id (L4) or a pair (L2-L3). A listed entry that no longer fails is stale.
 * Anything that fails and is not listed fails this test.
 * Run: node src/campaign/LevelDistinct.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Map = require('./LevelMap');
const Runtime = require('./CampaignRuntime');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

const root = path.join(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const loaded = Map.load(fs.readFileSync(path.join(__dirname, 'maps/campaign-levels.json'), 'utf8'));
assert(loaded.ok, loaded.ok ? 'campaign book loads with tilesets' : loaded.errors.join('; '));

/* Independent of the campaign json. look() and the map row are both
   compared to this table, so a subtitle edit cannot pass by agreeing
   with itself. */
const EXPECTED_TITLES = {
  L1: { title: 'The Rubble and the Ruby', sub: 'The Rubble and the Ruby' },
  L2: { title: 'Noz and the Goblin King', sub: 'The Goblin Warren' },
  L3: { title: 'The Webbed Deep and the Spider Queen', sub: 'Silk and the Spider Queen' },
  L4: { title: 'Orc Hold and the Ogre Cave', sub: 'The Ogre Cave' },
  L5: { title: 'The Drow Deep', sub: 'The Drow Deep' },
  L6: { title: 'The Burning Halls', sub: 'The Burning Halls' },
  L7: { title: 'The Deep Stone', sub: 'The Deep Stone' },
  L8: { title: 'The Eye Tyrant and the Holy Hammer', sub: 'The Eye Tyrant' },
  L9: { title: 'The Red Dragon and the Holy Anvil', sub: 'The Red Dragon' },
  L10: { title: 'The Undying King and the Ritual', sub: 'The Undying King' }
};

/* Exact open failures. Filled after measuring the real shell-plus-carve grid.
   Each row is [subject, reason]. Subject is L4 or L2-L3. */
const KNOWN_FAILS = [
  ['L10', 'unresolved-art'],
  ['L10', 'landmark-unplaced'],
  ['L10', 'prop-kinds'],
  ['L2', 'legacy-shell'],
  ['L2', 'tint-only-interim', '2026-12-31'],
  ['L3', 'legacy-shell'],
  ['L4', 'legacy-shell'],
  ['L4', 'landmark-unplaced'],
  ['L4', 'tint-only-interim', '2026-12-31'],
  ['L5', 'legacy-shell'],
  ['L5', 'unresolved-art'],
  ['L5', 'landmark-unplaced'],
  ['L6', 'unresolved-art'],
  ['L6', 'landmark-unplaced'],
  ['L6', 'prop-kinds'],
  ['L7', 'unresolved-art'],
  ['L7', 'landmark-unplaced'],
  ['L7', 'prop-kinds'],
  ['L8', 'unresolved-art'],
  ['L8', 'landmark-unplaced'],
  ['L8', 'prop-kinds'],
  ['L9', 'unresolved-art'],
  ['L9', 'landmark-unplaced'],
  ['L9', 'prop-kinds'],
  ['L2-L3', 'shell-shared'],
  ['L1-L2', 'walk-jaccard'],
  ['L1-L2', 'walk-excess'],
  ['L1-L3', 'walk-jaccard'],
  ['L1-L3', 'walk-excess'],
  ['L1-L4', 'walk-jaccard'],
  ['L1-L4', 'walk-excess'],
  ['L1-L5', 'walk-jaccard'],
  ['L1-L5', 'walk-excess'],
  ['L1-L6', 'walk-excess'],
  ['L1-L7', 'walk-excess'],
  ['L1-L8', 'walk-excess'],
  ['L1-L9', 'walk-excess'],
  ['L1-L10', 'walk-excess'],
  ['L2-L3', 'walk-jaccard'],
  ['L2-L3', 'walk-excess'],
  ['L2-L3', 'room-centres'],
  ['L2-L3', 'room-rect'],
  ['L2-L3', 'prop-overlap'],
  ['L2-L4', 'walk-jaccard'],
  ['L2-L4', 'walk-excess'],
  ['L2-L4', 'room-centres'],
  ['L2-L5', 'walk-jaccard'],
  ['L2-L5', 'walk-excess'],
  ['L2-L6', 'walk-excess'],
  ['L2-L7', 'walk-excess'],
  ['L2-L8', 'walk-excess'],
  ['L2-L9', 'walk-excess'],
  ['L2-L10', 'walk-excess'],
  ['L3-L4', 'walk-jaccard'],
  ['L3-L4', 'walk-excess'],
  ['L3-L5', 'walk-jaccard'],
  ['L3-L5', 'walk-excess'],
  ['L3-L6', 'walk-excess'],
  ['L3-L7', 'walk-excess'],
  ['L3-L8', 'walk-excess'],
  ['L3-L9', 'walk-excess'],
  ['L3-L10', 'walk-excess'],
  ['L4-L5', 'walk-jaccard'],
  ['L4-L5', 'walk-excess'],
  ['L4-L5', 'prop-overlap'],
  ['L4-L6', 'walk-excess'],
  ['L4-L7', 'walk-excess'],
  ['L4-L8', 'walk-excess'],
  ['L4-L8', 'room-rect'],
  ['L4-L9', 'walk-excess'],
  ['L4-L10', 'walk-excess'],
  ['L5-L6', 'walk-excess'],
  ['L5-L7', 'walk-excess'],
  ['L5-L7', 'room-centres'],
  ['L5-L7', 'room-rect'],
  ['L5-L8', 'walk-excess'],
  ['L5-L9', 'walk-excess'],
  ['L5-L9', 'room-rect'],
  ['L5-L10', 'walk-excess'],
  ['L6-L8', 'walk-excess'],
  ['L6-L10', 'walk-excess'],
  ['L6-L10', 'room-rect'],
  ['L7-L8', 'walk-excess'],
  ['L7-L9', 'walk-jaccard'],
  ['L7-L9', 'walk-excess'],
  ['L7-L9', 'room-centres'],
  ['L7-L9', 'room-rect'],
  ['L8-L9', 'walk-jaccard'],
  ['L8-L9', 'walk-excess'],
  ['L8-L10', 'walk-excess']
];

const UNIVERSAL_PROP = {
  demonface: 1, dwarfface: 1, rubydoor: 1, lift: 1, stairs: 1, floorlever: 1,
  lantern: 1, craftstation: 1, chest: 1, hidepile: 1
};
const UNIVERSAL_LANDMARK = {
  demonface: 1, rubydoor: 1, lift: 1, stairs: 1, floorlever: 1
};

function grab(name) {
  const start = html.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('missing ' + name);
  let i = html.indexOf('{', start);
  let depth = 0;
  for (; i < html.length; i++) {
    const ch = html[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return html.slice(start, i + 1);
    }
  }
  throw new Error('unclosed ' + name);
}

function grabConst(name) {
  const start = html.indexOf('const ' + name + '=');
  if (start < 0) throw new Error('missing const ' + name);
  let i = start;
  let depth = 0;
  let started = false;
  for (; i < html.length; i++) {
    const ch = html[i];
    if (ch === '{' || ch === '[') { depth++; started = true; }
    else if (ch === '}' || ch === ']') depth--;
    else if (started && depth === 0 && ch === ';') return html.slice(start, i + 1);
  }
  throw new Error('unclosed const ' + name);
}

function levelNum(row) {
  if (row && typeof row.level === 'number') return row.level | 0;
  const m = /^L(\d+)$/.exec(row && row.id || '');
  return m ? Number(m[1]) : 0;
}

function pairKey(a, b) {
  const na = Number(String(a).slice(1));
  const nb = Number(String(b).slice(1));
  return na < nb ? a + '-' + b : b + '-' + a;
}

function todayStamp() {
  const d = new Date();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return d.getUTCFullYear() + '-' + m + '-' + day;
}

function tilePath(key) {
  return path.join(root, 'assets/tiles/tile_' + key + '.png');
}

function roomsOf(level) {
  return (level.layout && level.layout.rooms) || [];
}

function centre(room) {
  if (room.w != null && room.h != null && room.rw == null) {
    return { x: room.x + room.w / 2, y: room.y + room.h / 2 };
  }
  return { x: room.x, y: room.y };
}

function rectKey(room) {
  if (room.w != null && room.h != null && room.rw == null) {
    return 'rect:' + [room.x, room.y, room.w, room.h].join(',');
  }
  return 'disk:' + [room.x, room.y, room.rw, room.rh].join(',');
}

const ENGINE_FNS = [
  'h2', 'h3', 'newGrid', 'isWalkTile', 'rect', 'corridor', 'caveDisk', 'carvePath',
  'sealOuter', 'sealSecretCells', 'secretFaceOk', 'normalizeSecretFace', 'addSecretDoor',
  'openDescentLanding', 'sealNozDoorBeyond', 'nearCrush', 'timberOnDwarfMouthLane',
  'markSecretProps', 'makeChapter', 'propSpriteKey'
];

function bootEngine() {
  const provided = {};
  ENGINE_FNS.forEach(function (name) { provided[name] = 1; });
  ['PAL', 'G', 'Math', 'Uint8Array', 'Object', 'Array', 'JSON', 'console', 'CRUSH_SPOTS', 'WINDUP_TOY'].forEach(function (name) {
    provided[name] = 1;
  });
  const body = ENGINE_FNS.map(grab).join('\n') + '\n' + grabConst('CRUSH_SPOTS') + '\n' + grabConst('WINDUP_TOY');
  const calls = {};
  const re = /\b([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;
  let m;
  while ((m = re.exec(body))) calls[m[1]] = 1;
  const skipCall = { if: 1, for: 1, while: 1, switch: 1, catch: 1, function: 1, return: 1, typeof: 1, super: 1 };
  const stubs = Object.keys(calls).filter(function (name) {
    return !provided[name] && !skipCall[name];
  });
  const src = stubs.map(function (name) { return 'function ' + name + '(){return [];}'; }).join('\n')
    + '\nfunction h01(){return 0.4;}\n'
    + body;
  const ctx = {
    Math: Math, Uint8Array: Uint8Array, Object: Object, Array: Array, JSON: JSON, console: console,
    PAL: { mine: { key: 'mine' }, fungi: { key: 'fungi' }, ruin: { key: 'ruin' }, hall: { key: 'hall' } },
    SPR: new Proxy({}, { get: function () { return 1; } }),
    G: { props: [], ents: [], _forceSeeds: { warrenSeed: 1, dressSeed: 2 } }
  };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  ENGINE_FNS.forEach(function (name) { global[name] = ctx[name]; });
  return ctx;
}

const engine = bootEngine();
const shellCache = {};

function cloneGrid(grid) {
  return grid.map(function (row) { return new Uint8Array(row); });
}

function shellOf(n) {
  if (shellCache[n]) return shellCache[n];
  engine.G = { props: [], ents: [], _forceSeeds: { warrenSeed: 1, dressSeed: 2 } };
  const L = engine.makeChapter(n);
  const built = {
    n: n,
    w: L.w || 0,
    h: L.h || 0,
    grid: L.grid || null,
    props: (engine.G.props || []).map(function (p) { return Object.assign({}, p); }),
    secrets: (L.secrets || []).map(function (s) { return Object.assign({}, s); })
  };
  shellCache[n] = built;
  return built;
}

function levelModule(n) {
  try { return require('./L' + n); }
  catch (err) { return null; }
}

function buildLevel(row) {
  const n = levelNum(row);
  const shellN = Runtime.shellChapter(n);
  /* Same order as CampaignRuntime.install: the legacy shell grid already
     exists, then carveMap paints the campaign rooms onto it. */
  const shell = (shellN >= 1 && shellN <= 5) ? shellOf(shellN) : null;
  const size = (shell && shell.w) ? { w: shell.w, h: shell.h } : (row.size || { w: 48, h: 48 });
  const L = {
    n: shellN,
    w: size.w,
    h: size.h,
    flags: {},
    secrets: (row.secrets || []).map(function (s) { return Object.assign({}, s); }),
    spawn: row.spawn || { x: 0, y: 0 }
  };
  if (shell && shell.grid) L.grid = cloneGrid(shell.grid);
  else L.grid = engine.newGrid(L.w, L.h, 1);
  const props = shell ? shell.props.map(function (p) { return Object.assign({}, p); }) : [];
  Runtime.carveMap(L, row);
  const G = { props: props, ents: [], lvl: L, campaignLevel: n };
  Runtime.placeLevel(G, { map: row, data: levelModule(n) });
  return { L: L, props: G.props || [], shell: shellN };
}

function walkable(L) {
  const g = L.grid;
  const h = g.length;
  const w = g[0].length;
  const cells = new Set();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = g[y][x];
      if (t === 0 || t === 3 || t === 4) cells.add(x + ',' + y);
    }
  }
  return { cells: cells, w: w, h: h };
}

function shiftSet(cells, dx, dy) {
  const out = new Set();
  cells.forEach(function (k) {
    const p = k.split(',');
    out.add((Number(p[0]) + dx) + ',' + (Number(p[1]) + dy));
  });
  return out;
}

function overlap(a, b) {
  let inter = 0;
  a.forEach(function (k) { if (b.has(k)) inter++; });
  const union = a.size + b.size - inter;
  return { inter: inter, union: union, jaccard: union ? inter / union : 0 };
}

function bestAlign(A, B) {
  let best = null;
  for (let dy = -8; dy <= 8; dy++) {
    for (let dx = -8; dx <= 8; dx++) {
      const hit = overlap(A.cells, shiftSet(B.cells, dx, dy));
      if (!best || hit.jaccard > best.jaccard) best = { dx: dx, dy: dy, inter: hit.inter, jaccard: hit.jaccard };
    }
  }
  const W = Math.max(A.w, B.w), H = Math.max(A.h, B.h);
  const chance = (A.cells.size * B.cells.size) / (W * H);
  const denom = Math.min(A.cells.size, B.cells.size) || 1;
  best.excess = (best.inter - chance) / denom;
  return best;
}

function propCounts(props) {
  const counts = {};
  (props || []).forEach(function (p) {
    const k = p && p.k;
    if (!k || UNIVERSAL_PROP[k]) return;
    counts[k] = (counts[k] || 0) + 1;
  });
  return counts;
}

function countJaccard(a, b) {
  const keys = {};
  Object.keys(a).forEach(function (k) { keys[k] = 1; });
  Object.keys(b).forEach(function (k) { keys[k] = 1; });
  let inter = 0, onlyA = 0, onlyB = 0, n = 0;
  Object.keys(keys).forEach(function (k) {
    n++;
    const ca = a[k] || 0, cb = b[k] || 0;
    inter += Math.min(ca, cb);
    onlyA += Math.max(0, ca - cb);
    onlyB += Math.max(0, cb - ca);
  });
  if (!n) return 0;
  const union = inter + onlyA + onlyB;
  return union ? inter / union : 0;
}

function tilesetParts(row) {
  const t = (row && row.tileset) || {};
  return {
    floor: t.floor || '',
    wall: t.wall || '',
    pal: t.pal || '',
    tint: String(t.tint || '').toLowerCase()
  };
}

function landmarkArt(row) {
  const mark = (row && row.landmark) || {};
  const kind = mark.kind || '';
  let sprite = kind;
  if (kind && engine.propSpriteKey) {
    try { sprite = engine.propSpriteKey({ k: kind }) || kind; }
    catch (err) { sprite = kind; }
  }
  if (mark.sprite) sprite = mark.sprite;
  else if (mark.art && typeof mark.art === 'string') sprite = mark.art;
  else if (mark.art && mark.art.key) sprite = mark.art.key;
  return { id: (row && row.landmarkId) || mark.id || '', kind: kind, sprite: sprite || kind };
}

function evaluate(book) {
  const levels = book.levels.filter(function (row) { return /^L(\d+)$/.test(row.id) && levelNum(row) >= 1 && levelNum(row) <= 10; });
  const levelFails = {};
  const pairFails = [];
  function note(id, reason, msg) {
    levelFails[id] = levelFails[id] || [];
    levelFails[id].push({ reason: reason, msg: msg });
  }
  function notePair(a, b, reason, msg) {
    pairFails.push({ a: a, b: b, reason: reason, msg: msg });
  }

  global.CampaignBook = book;
  const built = {};
  const grids = {};
  const counts = {};
  levels.forEach(function (row) {
    const id = row.id;
    const n = levelNum(row);
    const world = buildLevel(row);
    built[id] = world;
    grids[id] = walkable(world.L);
    counts[id] = propCounts(world.props);

    const expected = EXPECTED_TITLES[id];
    if (!expected || row.name !== expected.title) note(id, 'title', 'title is not the expected line');
    if (!expected || row.sub !== expected.sub) note(id, 'subtitle', 'subtitle is not the expected line');
    if (n >= 2) {
      const look = Runtime.look({ campaignLevel: n, lvl: { n: Runtime.shellChapter(n) } });
      if (!look || look.title !== (expected && expected.title)) note(id, 'title', 'runtime title is not the expected line');
      if (!look || look.sub !== (expected && expected.sub)) note(id, 'subtitle', 'runtime subtitle is not the expected line');
    }
    if (n >= 2 && !roomsOf(row).length) note(id, 'no-rooms', 'own map has no rooms');

    const shell = world.shell;
    /* Every legacy chapter shell, 1 through 5. A level whose shell number
       is its own number still fails, including a guest on shell 3. */
    if (legacyHost(n, shell)) {
      note(id, 'legacy-shell', 'level ' + n + ' is on legacy shell ' + shell);
    }

    const t = row.tileset || {};
    if (t.interim === true) {
      const due = t.interimDue || '';
      console.warn('INTERIM ' + id + ' look is due ' + (due || '(missing)'));
      if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) note(id, 'interim-due', 'interim look has no due date');
      else if (due < todayStamp()) note(id, 'interim-overdue', 'interim look is past ' + due);
    }
    if (t.tint && t.interim === true) {
      const due = t.interimDue || '';
      note(id, 'tint-only-interim', 'tint-only interim due ' + (due || '(missing)'));
    }
    ['floor', 'wall'].forEach(function (part) {
      const key = t[part];
      if (!key || !fs.existsSync(tilePath(key))) note(id, 'unresolved-art', 'tile key ' + (key || part) + ' does not resolve to a file');
    });
    if (!t.pal || (html.indexOf(t.pal + ':') < 0 && html.indexOf(t.pal + ' :') < 0)) {
      note(id, 'palette', 'palette ' + (t.pal || '') + ' is not in PAL');
    }

    const mark = row.landmark || {};
    const kind = mark.kind || '';
    if (UNIVERSAL_LANDMARK[kind] || UNIVERSAL_LANDMARK[row.landmarkId]) {
      note(id, 'landmark-universal', 'landmark ' + (row.landmarkId || kind) + ' is a universal prop');
    }
    const placed = (world.props || []).some(function (p) { return p && p.k === kind && kind; });
    if (!placed) note(id, 'landmark-unplaced', 'landmark ' + (row.landmarkId || kind) + ' is not in the built props');
    const kinds = Object.keys(counts[id]);
    if (kinds.length < 4) note(id, 'prop-kinds', 'only ' + kinds.length + ' unique prop kinds');
  });

  const shells = {};
  levels.forEach(function (row) {
    const shell = built[row.id].shell;
    shells[shell] = shells[shell] || [];
    shells[shell].push(row.id);
  });
  Object.keys(shells).forEach(function (shell) {
    const ids = shells[shell];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        notePair(ids[i], ids[j], 'shell-shared', ids[i] + ' and ' + ids[j] + ' share shell ' + shell);
      }
    }
  });

  for (let i = 0; i < levels.length; i++) {
    for (let j = i + 1; j < levels.length; j++) {
      const a = levels[i], b = levels[j];
      const A = tilesetParts(a), B = tilesetParts(b);
      const sameFloor = A.floor && A.floor === B.floor;
      const sameWall = A.wall === B.wall;
      const samePal = A.pal && A.pal === B.pal;
      if (sameFloor && sameWall && samePal) {
        if (A.tint !== B.tint) {
          const due = (a.tileset && a.tileset.interimDue) || (b.tileset && b.tileset.interimDue) || '';
          notePair(a.id, b.id, 'tint-only-interim', 'tileset ' + [A.floor, A.wall, A.pal].join('|') + ' differs only by tint' + (due ? ' due ' + due : ''));
        } else {
          notePair(a.id, b.id, 'tileset', 'tileset ' + [A.floor, A.wall, A.pal].join('|') + ' is shared');
        }
      } else if (samePal) {
        notePair(a.id, b.id, 'palette', 'palette ' + A.pal + ' is shared');
      }
      const artA = landmarkArt(a), artB = landmarkArt(b);
      if (artA.id && artA.id === artB.id) {
        notePair(a.id, b.id, 'landmark', 'landmark ' + artA.id + ' is shared');
      }
      const artKeyA = artA.sprite || artA.kind;
      const artKeyB = artB.sprite || artB.kind;
      if (artKeyA && artKeyA === artKeyB && artA.id !== artB.id) {
        notePair(a.id, b.id, 'landmark-art', 'landmark art ' + artKeyA + ' is shared');
      }
      const align = bestAlign(grids[a.id], grids[b.id]);
      if (align.jaccard > 0.25) {
        notePair(a.id, b.id, 'walk-jaccard', 'walkable Jaccard ' + align.jaccard.toFixed(3) + ' after shift ' + align.dx + ',' + align.dy);
      }
      if (align.excess > 0.15) {
        notePair(a.id, b.id, 'walk-excess', 'above-chance overlap ' + align.excess.toFixed(3));
      }
      const ca = roomsOf(a).map(centre), cb = roomsOf(b).map(centre);
      let shared = 0;
      ca.forEach(function (p) {
        if (cb.some(function (q) { return Math.hypot(p.x - q.x, p.y - q.y) <= 2; })) shared++;
      });
      if (shared > 2) notePair(a.id, b.id, 'room-centres', shared + ' room centres within 2 tiles');
      const ra = new Set(roomsOf(a).map(rectKey));
      const seenRect = {};
      roomsOf(b).forEach(function (room) {
        const key = rectKey(room);
        if (ra.has(key) && !seenRect[key]) {
          seenRect[key] = 1;
          notePair(a.id, b.id, 'room-rect', 'identical room rect ' + key);
        }
      });
      const prop = countJaccard(counts[a.id], counts[b.id]);
      if (prop > 0.40) notePair(a.id, b.id, 'prop-overlap', 'prop overlap ' + prop.toFixed(3));
    }
  }

  return { levels: levels, levelFails: levelFails, pairFails: pairFails };
}

function knownHas(subject, reason) {
  return KNOWN_FAILS.some(function (row) { return row[0] === subject && row[1] === reason; });
}

function unexempted(report) {
  const out = [];
  Object.keys(report.levelFails).forEach(function (id) {
    report.levelFails[id].forEach(function (item) {
      if (!knownHas(id, item.reason)) out.push(id + ' ' + item.msg);
    });
  });
  report.pairFails.forEach(function (item) {
    const key = pairKey(item.a, item.b);
    if (!knownHas(key, item.reason)) out.push(key + ' ' + item.msg);
  });
  return out;
}

function gotReasons(report, subject) {
  const got = {};
  if (subject.indexOf('-') < 0) {
    (report.levelFails[subject] || []).forEach(function (item) { got[item.reason] = item.msg; });
    return got;
  }
  report.pairFails.forEach(function (item) {
    if (pairKey(item.a, item.b) === subject) got[item.reason] = item.msg;
  });
  return got;
}

function checkStale(report) {
  const seen = {};
  KNOWN_FAILS.forEach(function (row) {
    const subject = row[0], reason = row[1];
    const stamp = subject + ' ' + reason;
    if (seen[stamp]) assert(false, stamp + ' is listed twice');
    seen[stamp] = 1;
    const got = gotReasons(report, subject);
    if (!got[reason]) assert(false, subject + ' no longer fails ' + reason + ' — remove the stale entry');
    if (row[2] && String(got[reason]).indexOf(row[2]) < 0) {
      assert(false, subject + ' ' + reason + ' does not carry due date ' + row[2]);
    }
  });
}

function legacyHost(n, shell) {
  return n >= 2 && shell >= 1 && shell <= 5;
}

for (let n = 2; n <= 10; n++) levelModule(n);
const report = evaluate(loaded.book);

if (process.env.DUMP_FAILS) {
  const rows = [];
  Object.keys(report.levelFails).sort().forEach(function (id) {
    const seen = {};
    report.levelFails[id].forEach(function (item) {
      if (seen[item.reason]) return;
      seen[item.reason] = 1;
      rows.push([id, item.reason, item.msg]);
    });
  });
  const pairSeen = {};
  report.pairFails.forEach(function (item) {
    const key = pairKey(item.a, item.b) + ' ' + item.reason;
    if (pairSeen[key]) return;
    pairSeen[key] = 1;
    rows.push([pairKey(item.a, item.b), item.reason, item.msg]);
  });
  rows.forEach(function (row) { console.log(row[0] + '\t' + row[1] + '\t' + row[2]); });
  console.log('COUNT ' + rows.length);
  process.exit(0);
}

checkStale(report);

KNOWN_FAILS.forEach(function (row) {
  const msg = gotReasons(report, row[0])[row[1]];
  console.log('KNOWN_FAIL ' + row[0] + ' ' + row[1] + (msg ? ': ' + msg : ''));
});
console.log('KNOWN_FAIL count ' + KNOWN_FAILS.length);

unexempted(report).forEach(function (msg) { assert(false, msg); });
if (!unexempted(report).length) assert(true, 'finished levels pass the distinct gate');

assert(html.indexOf('The First Floor') >= 0, 'chapter II shell still owns its own subtitle');
const byId = {};
loaded.book.levels.forEach(function (row) { byId[row.id] = row; });
assert(byId.L3.sub !== 'The First Floor' && byId.L3.name.indexOf('The First Floor') < 0, 'L3 does not say The First Floor');
assert(byId.L4.sub !== 'The Dead City' && byId.L4.name.indexOf('The Dead City') < 0, 'L4 does not say The Dead City');
assert(/function bindCampaignLook\(/.test(html) && /L\.tileset=look\.tileset/.test(html) && /PAL\[palKey\]/.test(html), 'the renderer binds per-level tileset and palette');
assert(/if\(look\.sub\) L\.sub=look\.sub/.test(html), 'campaign subtitle replaces the shell line');
const look3 = Runtime.look({ campaignLevel: 3, lvl: { n: 2 } });
assert(look3 && look3.title === EXPECTED_TITLES.L3.title && look3.sub === EXPECTED_TITLES.L3.sub, 'Level 3 look is the webbed deep, not the first floor');
const look4 = Runtime.look({ campaignLevel: 4, lvl: { n: 4 } });
assert(look4 && look4.title === EXPECTED_TITLES.L4.title && look4.sub === EXPECTED_TITLES.L4.sub, 'Level 4 look is the ogre cave, not the dead city');
assert(Runtime.look({ campaignLevel: 1, lvl: { n: 1 } }) == null, 'Level 1 does not take a campaign tileset');

function cloneBook(book) {
  return JSON.parse(JSON.stringify(book));
}

function expectGateFail(book, label, match) {
  const baseline = {};
  unexempted(report).forEach(function (msg) { baseline[msg] = 1; });
  const fresh = unexempted(evaluate(book)).filter(function (msg) { return !baseline[msg]; });
  assert(fresh.length > 0, label);
  if (match) assert(fresh.some(function (msg) { return match.test(msg); }), label);
  fresh.slice(0, 6).forEach(function (msg) { console.log('  mutation ' + msg); });
}

const copiedL4 = cloneBook(loaded.book);
const rowL2 = copiedL4.levels.filter(function (row) { return row.id === 'L2'; })[0];
const rowL4 = copiedL4.levels.filter(function (row) { return row.id === 'L4'; })[0];
rowL4.layout = JSON.parse(JSON.stringify(rowL2.layout));
expectGateFail(copiedL4, 'copying L2 rooms into L4 fails the gate');

const copiedL2 = cloneBook(loaded.book);
const srcL5 = copiedL2.levels.filter(function (row) { return row.id === 'L5'; })[0];
const dstL2 = copiedL2.levels.filter(function (row) { return row.id === 'L2'; })[0];
dstL2.layout = JSON.parse(JSON.stringify(srcL5.layout));
expectGateFail(copiedL2, 'copying L5 rooms into L2 fails the gate');

const wrongSub = cloneBook(loaded.book);
wrongSub.levels.filter(function (row) { return row.id === 'L2'; })[0].sub = 'The First Floor';
expectGateFail(wrongSub, 'a wrong L2 subtitle fails the gate');

const copiedTileset = cloneBook(loaded.book);
const tileSrc = copiedTileset.levels.filter(function (row) { return row.id === 'L5'; })[0];
const tileDst = copiedTileset.levels.filter(function (row) { return row.id === 'L6'; })[0];
tileDst.tileset = JSON.parse(JSON.stringify(tileSrc.tileset));
expectGateFail(copiedTileset, 'copying another level tileset fails the gate');

const copiedPal = cloneBook(loaded.book);
const palSrc = copiedPal.levels.filter(function (row) { return row.id === 'L3'; })[0];
const palDst = copiedPal.levels.filter(function (row) { return row.id === 'L4'; })[0];
palDst.tileset.pal = palSrc.tileset.pal;
expectGateFail(copiedPal, 'copying another level palette fails the gate');

const tintCopy = cloneBook(loaded.book);
const tintSrc = tintCopy.levels.filter(function (row) { return row.id === 'L5'; })[0];
const tintDst = tintCopy.levels.filter(function (row) { return row.id === 'L6'; })[0];
tintDst.tileset = JSON.parse(JSON.stringify(tintSrc.tileset));
tintDst.tileset.tint = '#d5dee8';
expectGateFail(tintCopy, 'an L6 copy of L5\'s tileset with a different tint fails', /differs only by tint/);

assert(legacyHost(3, 3), 'L3 on legacy shell 3 fails the shell rule');
assert(legacyHost(2, 1) && legacyHost(4, 4) && legacyHost(5, 5), 'legacy shells 1 through 5 all fail');
assert(!legacyHost(1, 1), 'chapter I on its own shell is not a campaign guest');
assert(!legacyHost(8, 8), 'a shell past chapter V is not legacy');

const copiedArt = cloneBook(loaded.book);
const artSrc = copiedArt.levels.filter(function (row) { return row.id === 'L2'; })[0];
const artDst = copiedArt.levels.filter(function (row) { return row.id === 'L4'; })[0];
artDst.landmark = JSON.parse(JSON.stringify(artSrc.landmark));
artDst.landmark.id = 'copied_throne';
artDst.landmarkId = 'copied_throne';
expectGateFail(copiedArt, 'copying another level landmark art fails the gate');

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('level distinct gate ok');
