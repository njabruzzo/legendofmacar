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
    /* Hung on the west wall cap, same anchors as the mock. The sag over
       the stand is deleted as whole strands (trim.runs), not lifted off the cap. */
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
  /* Sag over the stand, removed as whole strands in source pixels.
     Each run is [y, x0, x1). Gaps and the cap cable stay. Nothing is painted. */
  var TRIM = {
    web_sheet_span_a: { runs: [
      [7,9,12],[7,13,16],[8,9,18],[9,9,24],[9,44,46],[10,13,19],[10,23,30],[10,42,45],[11,18,23],[11,29,36],[11,37,38],[11,39,44],
      [12,20,28],[12,35,50],[12,106,110],[12,115,120],[13,23,33],[13,38,39],[13,42,52],[13,109,116],[13,117,120],[14,26,29],[14,32,38],[14,39,44],
      [14,48,56],[14,108,115],[14,116,118],[15,28,32],[15,35,43],[15,46,50],[15,52,54],[15,55,62],[15,105,112],[15,116,117],[16,30,35],[16,37,42],
      [16,43,49],[16,50,53],[16,56,57],[16,62,69],[16,107,111],[16,114,116],[16,118,119],[17,32,39],[17,41,44],[17,49,55],[17,56,58],[17,68,76],
      [17,107,114],[17,115,116],[17,117,119],[18,35,42],[18,49,50],[18,54,62],[18,76,84],[18,109,111],[18,115,118],[19,38,44],[19,49,50],[19,58,59],
      [19,61,69],[19,83,91],[19,110,111],[19,115,119],[20,43,47],[20,55,56],[20,58,60],[20,68,77],[20,91,99],[20,110,117],[20,118,120],[21,46,50],
      [21,55,57],[21,59,60],[21,76,85],[21,98,107],[21,109,111],[21,119,121],[22,49,54],[22,56,59],[22,60,61],[22,84,95],[22,106,116],[22,120,121],
      [23,53,57],[23,61,64],[23,94,108],[23,112,124],[24,56,61],[24,63,65],[24,103,106],[24,107,121],[25,60,66],[25,99,100],[25,102,104],[25,113,116],
      [25,117,119],[26,64,68],[26,100,103],[26,108,109],[26,110,114],[26,118,119],[27,68,73],[27,101,102],[27,108,111],[27,113,115],[27,116,117],[27,118,121],
      [28,72,77],[28,101,103],[28,106,110],[28,111,118],[28,119,120],[29,76,81],[29,102,103],[29,106,113],[29,117,121],[30,80,86],[30,107,108],[30,109,111],
      [30,112,118],[30,119,121],[31,85,92],[31,107,109],[31,110,111],[31,116,117],[32,91,97],[32,105,110],[32,112,117],[33,96,104],[33,107,111],[34,103,112],
      [35,111,121],[36,115,119],[36,120,137],[37,118,120],[37,136,160]
    ] },
    web_sheet_span_b: { runs: [
      [6,2,3],[7,2,5],[7,13,16],[8,4,7],[8,13,19],[8,23,27],[8,34,38],[8,72,88],[9,6,9],[9,13,15],[9,16,23],[9,24,27],
      [9,34,38],[9,52,57],[9,87,119],[10,8,11],[10,15,19],[10,20,27],[10,30,32],[10,34,38],[10,52,54],[10,55,58],[10,61,62],[10,68,69],
      [10,118,155],[11,10,15],[11,18,22],[11,24,35],[11,47,48],[11,51,53],[11,54,58],[11,61,64],[11,68,69],[11,90,91],[11,97,98],[11,117,120],
      [11,128,131],[11,148,149],[12,14,27],[12,28,36],[12,45,64],[12,67,69],[12,82,83],[12,84,85],[12,89,90],[12,97,99],[12,106,109],[12,119,122],
      [12,129,131],[12,141,142],[12,149,150],[12,152,153],[12,219,220],[12,236,241],[12,244,248],[13,25,31],[13,32,40],[13,46,56],[13,58,60],[13,62,63],
      [13,67,68],[13,80,81],[13,83,86],[13,89,90],[13,93,99],[13,103,107],[13,121,123],[13,128,132],[13,141,142],[13,149,151],[13,152,153],[13,219,220],
      [13,238,239],[13,241,245],[14,30,45],[14,48,50],[14,55,58],[14,59,62],[14,63,64],[14,65,69],[14,77,81],[14,83,85],[14,88,89],[14,90,100],
      [14,102,104],[14,115,118],[14,119,124],[14,128,129],[14,131,132],[14,140,141],[14,150,152],[14,219,221],[14,236,237],[14,238,242],[14,243,246],[15,41,49],
      [15,57,62],[15,63,64],[15,68,71],[15,74,78],[15,80,84],[15,85,86],[15,88,89],[15,94,100],[15,108,126],[15,127,128],[15,131,132],[15,139,148],
      [15,150,152],[15,218,222],[15,227,228],[15,236,241],[16,46,53],[16,60,62],[16,63,64],[16,68,77],[16,82,89],[16,93,94],[16,95,105],[16,106,108],
      [16,109,115],[16,121,126],[16,133,134],[16,149,152],[16,220,228],[16,232,238],[16,239,240],[17,51,58],[17,59,61],[17,63,65],[17,72,78],[17,80,81],
      [17,82,84],[17,85,92],[17,93,94],[17,99,102],[17,103,106],[17,107,109],[17,112,115],[17,120,126],[17,132,138],[17,142,151],[17,220,228],[17,230,232],
      [17,236,237],[17,239,244],[18,56,63],[18,64,65],[18,74,79],[18,80,83],[18,87,88],[18,93,95],[18,98,105],[18,111,113],[18,114,121],[18,124,128],
      [18,134,138],[18,140,143],[18,144,150],[18,219,238],[18,240,241],[18,243,246],[19,62,69],[19,76,77],[19,78,84],[19,94,95],[19,96,109],[19,110,112],
      [19,117,119],[19,122,131],[19,135,136],[19,137,139],[19,146,149],[19,221,233],[19,236,238],[19,240,241],[19,245,247],[19,249,251],[20,67,80],[20,81,82],
      [20,95,97],[20,102,106],[20,108,109],[20,110,111],[20,120,123],[20,135,137],[20,138,139],[20,146,147],[20,150,152],[20,221,222],[20,224,234],[20,235,236],
      [20,237,241],[20,245,250],[21,70,83],[21,104,105],[21,108,110],[21,113,121],[21,122,124],[21,132,134],[21,136,138],[21,139,140],[21,146,147],[21,151,158],
      [21,221,222],[21,224,231],[21,234,238],[21,239,242],[21,243,246],[22,78,92],[22,104,105],[22,107,109],[22,123,124],[22,128,129],[22,132,135],[22,136,140],
      [22,142,154],[22,218,224],[22,228,230],[22,231,236],[22,239,240],[22,241,244],[22,245,247],[23,84,103],[23,104,106],[23,107,108],[23,123,125],[23,127,133],
      [23,134,135],[23,137,138],[23,139,142],[23,143,146],[23,147,149],[23,221,223],[23,228,232],[23,235,236],[23,238,240],[23,242,246],[24,91,98],[24,102,112],
      [24,121,124],[24,126,128],[24,130,132],[24,134,136],[24,137,138],[24,141,143],[24,144,151],[24,221,227],[24,229,237],[24,238,239],[25,97,107],[25,120,126],
      [25,131,132],[25,137,139],[25,142,143],[25,144,153],[25,222,224],[25,226,231],[25,236,237],[25,238,239],[26,105,113],[26,120,124],[26,138,139],[26,142,145],
      [26,147,149],[26,152,154],[26,219,221],[26,222,224],[26,227,230],[26,236,237],[26,242,244],[27,113,122],[27,138,139],[27,146,149],[27,220,223],[27,225,226],
      [27,229,231],[27,241,243],[28,122,133],[28,147,150],[28,151,153],[28,222,226],[28,231,233],[28,235,246],[29,132,146],[29,149,158],[29,221,236],[29,240,241],
      [30,145,168],[30,199,222],[31,152,154],[31,167,200]
    ] },
    web_sheet_corner_b: { runs: [
      [11,33,37],[12,33,39],[13,33,34],[13,37,39],[13,48,49],[13,52,55],[14,33,41],[14,48,49],[14,54,59],[14,61,62],[15,40,45],[15,48,50],
      [15,51,57],[15,58,60],[15,61,63],[16,33,41],[16,49,52],[16,61,66],[16,72,73],[17,38,41],[17,47,50],[17,52,55],[17,60,64],[17,72,73],
      [18,33,34],[18,35,39],[18,47,57],[18,58,61],[18,63,64],[18,72,73],[19,33,42],[19,45,49],[19,56,62],[19,63,65],[19,71,76],[20,33,37],
      [20,39,41],[20,46,48],[20,56,66],[20,68,72],[20,73,74],[20,77,82],[21,33,39],[21,44,47],[21,55,61],[21,64,66],[21,69,71],[21,73,74],
      [21,76,82],[21,84,85],[22,33,37],[22,42,46],[22,55,56],[22,60,62],[22,63,67],[22,70,73],[22,80,85],[23,34,39],[23,41,43],[23,50,51],
      [23,54,56],[23,59,64],[23,66,68],[23,72,76],[23,80,85],[24,35,37],[24,38,42],[24,50,51],[24,53,57],[24,58,63],[24,64,67],[24,75,86],
      [25,36,37],[25,39,44],[25,49,52],[25,54,59],[25,60,64],[25,66,68],[25,84,89],[26,43,46],[26,50,53],[26,55,63],[26,67,68],[26,71,73],
      [26,74,76],[26,84,86],[26,88,91],[27,45,49],[27,51,56],[27,59,63],[27,67,77],[27,80,83],[27,85,86],[27,87,90],[28,48,53],[28,55,58],
      [28,62,65],[28,68,69],[28,72,74],[28,76,78],[28,81,88],[28,90,91],[29,50,54],[29,57,58],[29,64,66],[29,78,79],[29,81,83],[29,84,87],
      [29,88,91],[30,53,57],[30,66,68],[30,78,79],[30,80,83],[30,84,89],[31,56,60],[31,67,69],[31,73,74],[31,78,82],[31,84,88],[32,59,63],
      [32,68,74],[32,78,89],[33,62,66],[33,69,84],[33,86,89],[34,65,70],[34,75,90],[35,69,73],[35,75,76],[35,80,87],[35,89,90],[36,73,78],
      [36,81,89],[37,77,85],[37,88,90],[38,82,88],[38,89,91],[38,142,148],[39,84,85],[39,87,95],[39,135,143],[40,94,107],[40,123,136],[41,106,124]
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
