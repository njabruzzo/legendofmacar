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
    /* Hung on the west wall cap, same anchors as the mock. Span A and
       corner B delete the sag as whole strands. Span B is the 58-row
       v3e sheet: pivot (2, 4), rise 0, upSub 0, no trim. The blit uses
       the image height, so the rows below the old 34 hang under the pivot. */
    ['web_sheet_corner_b', -0.02, 2.0, 0],
    ['web_sheet_span_a', -0.02, 2.59, 0],
    ['web_sheet_span_b', -0.02, 3.21, 0],
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
  /* Sag over the stand, and the strands that cross the raised maul,
     removed as whole strands in source pixels. Each run is [y, x0, x1).
     Gaps stay. Isolated leftovers of 6 px or fewer are deleted with
     them. Nothing is painted. Span B's 58-row sheet has no runs. */
  var TRIM = {
    web_sheet_span_a: { runs: [
      [7,9,12],[7,13,16],[8,9,18],[9,9,24],[9,44,46],[10,13,19],[10,23,30],[10,42,45],[11,18,23],[11,29,36],[11,37,38],[11,39,44],
      [12,20,28],[12,35,50],[12,106,110],[12,115,120],[13,23,33],[13,38,39],[13,42,52],[13,109,116],[13,117,120],[14,26,29],[14,32,38],[14,39,44],
      [14,48,56],[14,108,115],[14,116,118],[15,28,32],[15,35,43],[15,46,50],[15,52,54],[15,55,62],[15,105,112],[15,116,117],[16,30,35],[16,37,42],
      [16,43,49],[16,50,53],[16,56,57],[16,62,69],[16,107,111],[16,114,116],[16,118,119],[17,32,39],[17,41,44],[17,49,55],[17,56,58],[17,68,76],
      [17,107,114],[17,115,116],[17,117,119],[18,35,42],[18,49,50],[18,54,62],[18,76,84],[18,109,111],[18,115,118],[19,38,44],[19,49,50],[19,58,59],
      [19,61,69],[19,83,91],[19,110,111],[19,115,119],[20,43,47],[20,55,56],[20,58,60],[20,68,77],[20,91,99],[20,110,117],[20,118,120],[21,46,50],
      [21,55,57],[21,59,60],[21,76,85],[21,98,107],[21,109,111],[21,119,121],[22,49,54],[22,56,59],[22,60,61],[22,84,95],[22,106,116],[22,120,121],
      [23,53,57],[23,61,64],[23,94,108],[23,112,124],[24,56,61],[24,63,65],[24,103,106],[24,107,121],[24,124,129],[25,60,66],[25,99,100],[25,102,104],
      [25,113,116],[25,117,119],[26,64,68],[26,100,103],[26,108,109],[26,110,114],[26,118,119],[27,68,73],[27,101,102],[27,108,111],[27,113,115],[27,116,117],
      [27,118,121],[28,72,77],[28,101,103],[28,106,110],[28,111,118],[28,119,120],[29,76,81],[29,102,103],[29,106,113],[29,117,121],[30,80,86],[30,107,108],
      [30,109,111],[30,112,118],[30,119,121],[31,85,92],[31,107,109],[31,110,111],[31,116,117],[32,91,97],[32,105,110],[32,112,117],[33,96,104],[33,107,111],
      [34,103,112],[35,111,121],[36,115,119],[36,120,137],[37,118,120],[37,136,160],
      /* Raised-maul strands: the y9 filament, the knot under it, and the drop. */
      [9,71,96],[10,59,61],[11,59,66],[12,55,64],[12,99,102],[13,57,59],[13,61,63],[13,64,65],[13,101,102],[14,65,66],[14,101,102],[15,100,101],[16,100,101]
    ] },
    web_sheet_corner_b: { runs: [
      [11,33,37],[12,33,39],[12,43,44],[13,33,34],[13,37,39],[13,44,46],[13,48,49],[13,52,55],[14,33,41],[14,45,47],[14,48,49],[14,54,59],
      [14,61,62],[15,40,45],[15,48,50],[15,51,57],[15,58,60],[15,61,63],[16,33,41],[16,49,52],[16,61,66],[16,72,73],[17,38,41],[17,47,50],
      [17,52,55],[17,60,64],[17,72,73],[18,33,34],[18,35,39],[18,47,57],[18,58,61],[18,63,64],[18,72,73],[18,76,78],[18,83,84],[19,33,42],
      [19,45,49],[19,56,62],[19,63,65],[19,67,68],[19,71,76],[19,83,84],[20,33,37],[20,39,41],[20,46,48],[20,49,51],[20,56,66],[20,68,72],
      [20,73,74],[20,77,82],[20,83,84],[21,33,39],[21,44,47],[21,49,52],[21,55,61],[21,64,66],[21,69,71],[21,73,74],[21,76,82],[21,84,85],
      [22,33,37],[22,42,46],[22,49,50],[22,55,56],[22,60,62],[22,63,67],[22,68,69],[22,70,73],[22,80,85],[23,34,39],[23,41,43],[23,50,51],
      [23,54,56],[23,59,64],[23,66,68],[23,72,76],[23,80,85],[24,35,37],[24,38,42],[24,50,51],[24,53,57],[24,58,63],[24,64,67],[24,75,86],
      [25,36,37],[25,39,44],[25,49,52],[25,54,59],[25,60,64],[25,66,68],[25,84,89],[26,43,46],[26,50,53],[26,55,63],[26,67,68],[26,71,73],
      [26,74,76],[26,84,86],[26,88,91],[27,45,49],[27,51,56],[27,59,63],[27,67,77],[27,80,83],[27,85,86],[27,87,90],[28,48,53],[28,55,58],
      [28,62,65],[28,68,69],[28,72,74],[28,76,78],[28,81,88],[28,90,91],[29,50,54],[29,57,58],[29,64,66],[29,74,75],[29,78,79],[29,81,83],
      [29,84,87],[29,88,91],[30,53,57],[30,66,68],[30,74,75],[30,78,79],[30,80,83],[30,84,89],[31,56,60],[31,67,69],[31,73,74],[31,78,82],
      [31,84,88],[32,59,63],[32,68,74],[32,78,89],[33,62,66],[33,69,84],[33,86,89],[34,65,70],[34,75,90],[35,69,73],[35,75,76],[35,80,87],
      [35,89,90],[36,73,78],[36,81,89],[37,77,85],[37,88,90],[38,82,88],[38,89,91],[38,142,148],[39,84,85],[39,87,95],[39,135,143],[40,94,107],
      [40,123,136],[41,106,124]
    ] }
  };
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
    trim: function (key) { return TRIM[key] || null; },
    solveBridge: solveBridge,
    endScreen: endScreen,
    laneDist: laneDist,
    file: function (key) { return 'assets/props/l3/' + key + '.png'; }
  };

  root.L3Webs = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
