/**
 * Level 3 web kit v3c. Placements are the mock's local anchors
 * (work/mock.py): one 5x5 with walls on the north and west.
 * The cage paint v2c is not bound. The bridge's lower end is solved
 * so source pixel (3, 86) sits on the chain ring above the cage spot.
 */
(function (root) {
  'use strict';

  var PIVOT = {
    web_corner_a_R: [48.4, 1.5],
    web_corner_a_L: [55.6, 1.5],
    web_corner_b_R: [34.4, 1.5],
    web_corner_b_L: [51.6, 1.5],
    web_drape_a_N: [2, 2],
    web_drape_a_W: [134, 2],
    web_drape_b_N: [2, 2],
    web_drape_b_W: [102, 2],
    web_over_a_N: [2, 4],
    web_over_a_W: [197, 4],
    web_over_b_N: [2, 4],
    web_over_b_W: [147, 4],
    web_bridge_a_N: [167, 4],
    web_bridge_a_W: [2, 4],
    web_sheet_corner: [2, 4],
    web_sheet_corner_b: [2, 4],
    web_sheet_high_N: [2, 4],
    web_sheet_high_W: [117, 4],
    l3_queen_web: [0, 0],
    web_sheet_span_a: [2, 4],
    web_sheet_span_b: [2, 4],
    web_tangle_a: [23, 2],
    web_tangle_b: [18, 2],
    web_tangle_c: [27, 2],
    web_tangle_d: [20, 2],
    web_floor_corner_back: [90.0, 3.0],
    web_floor_base_a_N: [58.1, 3.0],
    web_floor_base_a_W: [118.9, 3.0],
    web_floor_base_b_N: [58.1, 3.0],
    web_floor_base_b_W: [118.9, 3.0],
    web_floor_corner_S: [78.4, 78.4],
    web_floor_corner_E: [148.0, 40.7],
    web_floor_corner_W: [3.0, 40.7],
    web_cage_base_tangle: [62, 33],
    web_cocoon_hang: [13, 0],
    web_cocoon_lying: [22, 34],
    web_cocoon_lying_b: [19, 30],
    web_cocoon_hang_b: [11, 0]
  };

  var KEYS = Object.keys(PIVOT);

  /* mock.py FLOOR / wall / overhead. Local (0,0) is the N/W wall-base corner. */
  var FLOOR = [
    ['web_floor_corner_back', 0, 0],
    ['web_floor_base_a_N', 2.2, 0],
    ['web_floor_base_b_W', 0, 2.4],
    ['web_floor_corner_S', 4.5, 4.5],
    ['web_floor_corner_E', 4.5, 0],
    ['web_floor_corner_W', 0, 4.5],
    ['web_cage_base_tangle', 3.9, 3.4]
  ];
  var WALL = [
    ['l3_queen_web', 1.6, 0, 0],
    ['web_corner_a_R', 0, 0, 0],
    ['web_drape_a_N', 3.15, 0, 0],
    ['web_drape_b_W', 0, 1.2, 0],
    ['web_drape_a_W', 0, 3.6, 0]
  ];
  var LIE = [
    ['web_cocoon_lying', 0.25, 2.0],
    ['web_cocoon_lying_b', 3.7, 0.25]
  ];
  var OVER = [
    ['web_over_a_N', 2.0, -0.05, 0],
    ['web_over_b_W', -0.05, 1.9, 0],
    ['web_cocoon_hang', -0.05, 4.2, 0],
    ['web_cocoon_hang_b', 3.0, -0.05, 0],
    ['web_bridge_a_N', 3.3, -0.05, 0],
    ['web_sheet_corner', -0.02, 1.29, 0],
    /* These three cross the west wall over the mock stand. rise is extra
       screen pixels at TW 116, scaled by TW/116, so the sheet clears Macar. */
    ['web_sheet_corner_b', -0.02, 2.0, 0, 48],
    ['web_sheet_span_a', -0.02, 2.59, 0, 48],
    ['web_sheet_span_b', -0.02, 3.21, 0, 48],
    ['web_tangle_c', 2.7, -0.05, 8],
    ['web_tangle_d', -0.05, 1.0, 10],
    ['web_sheet_high_N', 3.6, -0.05, 0],
    ['web_tangle_a', -0.05, 2.9, 6],
    ['web_tangle_b', 1.2, -0.05, 4]
  ];

  /* Door → cage → Macar, 0.6 tile wide in the mock. Half-width is 0.30. */
  var LANE = [
    [[2.3, 4.5], [2.0, 3.2]],
    [[2.0, 3.2], [1.3, 2.6]],
    [[2.0, 3.2], [3.3, 3.2]]
  ];
  var MACAR = [1.3, 2.6];
  var CAGE = [3.9, 3.4];
  var BRIDGE_PIVOT = [3.3, -0.05];

  var ROOMS = ['north-web', 'east-web', 'high-web', 'far-silk', 'deep-huge', 'queen-hall', 'phase-den', 'giant-den'];

  function walk(g, x, y) {
    var i = Math.floor(x), j = Math.floor(y);
    if (!g[j] || g[j][i] === undefined) return false;
    var t = g[j][i];
    return t === 0 || t === 3 || t === 4;
  }

  function bestOrigin(g, room) {
    var x0, y0, x1, y1;
    if (room.kind === 'rect') {
      x0 = room.origin.x; y0 = room.origin.y;
      x1 = x0 + room.w - 1; y1 = y0 + room.h - 1;
    } else {
      x0 = Math.floor(room.x - room.rw); y0 = Math.floor(room.y - room.rh);
      x1 = Math.ceil(room.x + room.rw); y1 = Math.ceil(room.y + room.rh);
    }
    var best = null;
    var y, x, j, i, n;
    for (y = y0; y <= y1 - 4; y++) {
      for (x = x0; x <= x1 - 4; x++) {
        n = 0;
        for (j = 0; j < 5; j++) for (i = 0; i < 5; i++) if (walk(g, x + i, y + j)) n++;
        if (!best || n > best.n) best = { x: x, y: y, n: n };
      }
    }
    return best;
  }

  function pushLocal(out, rows, origin, layer, roomId) {
    var i, row, piece;
    for (i = 0; i < rows.length; i++) {
      row = rows[i];
      piece = {
        key: row[0],
        layer: layer,
        x: origin.x + row[1],
        y: origin.y + row[2],
        lx: row[1],
        ly: row[2],
        upSub: row[3] || 0,
        rise: row[4] || 0,
        room: roomId
      };
      out.push(piece);
    }
  }

  function piecesFor(origin, roomId, withBridge) {
    var out = [];
    var over = OVER.filter(function (row) {
      return withBridge || row[0] !== 'web_bridge_a_N';
    });
    pushLocal(out, FLOOR, origin, 'floor', roomId);
    pushLocal(out, WALL, origin, 'wall', roomId);
    pushLocal(out, LIE, origin, 'floor-prop', roomId);
    pushLocal(out, over, origin, 'overhead', roomId);
    return out;
  }

  /**
   * Chain ring above the cage spot, in world tiles.
   * Reference viewport TW 116 / TH 58: source pixel (3, 86) of the bridge
   * at local pivot (3.3, -0.05) lands here when the cage feet are local
   * (3.9, 3.4). That is the ring the sheet was painted to meet.
   */
  function ringFromFeet() {
    var TW = 116, TH = 58, k = 1;
    var FH = 298 * TH / 96 * 0.70;
    var pv = PIVOT.web_bridge_a_N;
    function w2(x, y) { return [(x - y) * TW / 2, (x + y) * TH / 2]; }
    var feet = w2(CAGE[0], CAGE[1]);
    var piv = w2(BRIDGE_PIVOT[0], BRIDGE_PIVOT[1]);
    var endX = piv[0] - pv[0] * k + 3 * k;
    var endY = piv[1] - FH - pv[1] * k + 86 * k;
    var sx = endX - feet[0], sy = endY - feet[1];
    var a = sx / (TW / 2), b = sy / (TH / 2);
    return { x: (a + b) / 2, y: (b - a) / 2 };
  }

  var RING = ringFromFeet();

  function solveBridge(TW, TH, FH, feet) {
    var k = TW / 116;
    var pv = PIVOT.web_bridge_a_N;
    var ring = { x: feet.x + RING.x, y: feet.y + RING.y };
    var dsx = pv[0] * k - 3 * k;
    var dsy = FH + pv[1] * k - 86 * k;
    var a = (ring.x - ring.y) + dsx / (TW / 2);
    var b = (ring.x + ring.y) + dsy / (TH / 2);
    return { x: (a + b) / 2, y: (b - a) / 2, ring: ring };
  }

  function endScreen(TW, TH, FH, wx, wy, cam) {
    var k = TW / 116;
    var pv = PIVOT.web_bridge_a_N;
    var sx = (wx - wy) * TW / 2 + (cam ? cam.x : 0);
    var sy = (wx + wy) * TH / 2 + (cam ? cam.y : 0);
    return { x: sx - pv[0] * k + 3 * k, y: sy - FH - pv[1] * k + 86 * k };
  }

  function build(grid, pixie, rooms) {
    var out = [];
    var byId = {};
    var i, room, origin, feet, list;
    rooms = rooms || [];
    for (i = 0; i < rooms.length; i++) byId[rooms[i].id] = rooms[i];
    if (!pixie) return out;
    feet = { x: pixie.x, y: pixie.y };
    origin = { x: feet.x - CAGE[0], y: feet.y - CAGE[1] };
    list = piecesFor(origin, 'north-web', true);
    for (i = 0; i < list.length; i++) {
      if (list[i].key === 'web_bridge_a_N') {
        list[i].bridge = 1;
        list[i].cageX = feet.x;
        list[i].cageY = feet.y;
      }
      out.push(list[i]);
    }
    for (i = 0; i < ROOMS.length; i++) {
      if (ROOMS[i] === 'north-web') continue;
      room = byId[ROOMS[i]];
      if (!room) continue;
      origin = bestOrigin(grid, room);
      if (!origin || origin.n < 20) continue;
      out.push.apply(out, piecesFor(origin, room.id, false));
    }
    return out;
  }

  function laneDist(lx, ly) {
    var best = 1e9, s, a, b, vx, vy, l2, t, dx, dy, i;
    for (i = 0; i < LANE.length; i++) {
      s = LANE[i]; a = s[0]; b = s[1];
      vx = b[0] - a[0]; vy = b[1] - a[1];
      l2 = vx * vx + vy * vy;
      t = ((lx - a[0]) * vx + (ly - a[1]) * vy) / l2;
      if (t < 0) t = 0; else if (t > 1) t = 1;
      dx = lx - (a[0] + t * vx); dy = ly - (a[1] + t * vy);
      best = Math.min(best, Math.hypot(dx, dy));
    }
    return best;
  }

  var api = {
    keys: KEYS,
    pivot: function (key) { return PIVOT[key]; },
    floor: FLOOR,
    wall: WALL,
    lie: LIE,
    over: OVER,
    lane: LANE,
    macar: MACAR,
    cage: CAGE,
    bridgePivot: BRIDGE_PIVOT,
    ring: RING,
    rooms: ROOMS,
    walk: walk,
    bestOrigin: bestOrigin,
    build: build,
    solveBridge: solveBridge,
    endScreen: endScreen,
    laneDist: laneDist,
    file: function (key) { return 'assets/props/l3/' + key + '.png'; }
  };

  root.L3Webs = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
