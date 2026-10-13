/**
 * Level 3 floor geometry. The Webbed Deep, not the Chapter II room set.
 * makeChapter(30) carves this grid and returns before Chapter II dressing.
 * CampaignBoot loads this file. index.html does not name L3.js.
 */
(function (root) {
  'use strict';

  var W = 144;
  var H = 118;

  var rooms = [
    { id: 'arrival', kind: 'disk', x: 128, y: 74, rw: 4.6, rh: 3.6, tile: 3 },
    { id: 'ruby-chamber', kind: 'rect', x: 123, y: 87, origin: { x: 112, y: 80 }, w: 22, h: 14 },
    { id: 'far-silk', kind: 'disk', x: 136, y: 92, rw: 4.4, rh: 3.4 },
    { id: 'deep-huge', kind: 'disk', x: 100, y: 90, rw: 4.4, rh: 3.4 },
    { id: 'north-web', kind: 'disk', x: 118, y: 98, rw: 5.0, rh: 3.8 },
    { id: 'queen-hall', kind: 'rect', x: 85, y: 107, origin: { x: 70, y: 100 }, w: 30, h: 14 },
    { id: 'phase-den', kind: 'disk', x: 56, y: 106, rw: 4.4, rh: 3.4 },
    { id: 'giant-den', kind: 'disk', x: 108, y: 112, rw: 4.6, rh: 3.2 },
    { id: 'east-web', kind: 'disk', x: 132, y: 108, rw: 4.6, rh: 3.4 },
    { id: 'high-web', kind: 'disk', x: 84, y: 90, rw: 4.2, rh: 3.2 },
    { id: 'stair-chamber', kind: 'disk', x: 138, y: 112, rw: 4.0, rh: 3.0, tile: 3 }
  ];

  /* Paths end inside the room they open, never across the queen hall's north wall. */
  var paths = [
    [[128, 76.2], [128, 81]],
    [[132, 90], [136, 92]],
    [[112, 88], [106, 90], [100, 90]],
    [[122, 93], [118, 98]],
    [[118, 102], [108, 105], [96, 106]],
    [[74, 106], [64, 106], [56, 106]],
    [[96, 110], [108, 112]],
    [[118, 102], [126, 106], [132, 108]],
    [[100, 90], [92, 90], [84, 90]],
    [[134, 110], [138, 112]]
  ];

  var points = {
    spawn: { x: 128.2, y: 73.4 },
    rubyDoor: { x: 123, y: 79.15 },
    guardian: { x: 123, y: 87 },
    lever: { x: 116, y: 89 },
    elevator: { x: 130, y: 89 },
    queen: { x: 85, y: 107 },
    queenChest: { x: 90, y: 109 },
    pixie: { x: 118, y: 98 },
    phase: { x: 56, y: 106 },
    giant: { x: 108, y: 112 },
    stair: { x: 138.1, y: 111.2 },
    tooth: { x: 85, y: 99.15, wall: 'n' },
    brood: [{ x: 64, y: 106 }, { x: 104, y: 106 }]
  };

  var webSpots = [
    [78, 104], [82, 108], [88, 103], [92, 110],
    [76, 110], [90, 106], [84, 111]
  ];

  /* Own lattice. Not the Chapter II cache list. */
  var caches = [
    [126, 75], [120, 84], [130, 86], [136, 93],
    [101, 91], [117, 99], [78, 105], [90, 111],
    [57, 107], [109, 113], [133, 109], [85, 91],
    [137, 113], [114, 88], [125, 91], [96, 104]
  ];

  var lights = [
    { x: 128, y: 74, c: '#ffb45c', r: 6.2, f: 1.0 },
    { x: 123, y: 86, c: '#ff2f3a', r: 8.4, f: 1.35 },
    { x: 136, y: 92, c: '#c9b8a0', r: 4.6, f: 0.7 },
    { x: 100, y: 90, c: '#d4c4a8', r: 4.8, f: 0.72 },
    { x: 118, y: 98, c: '#e8dcc8', r: 5.2, f: 0.8 },
    { x: 85, y: 107, c: '#ffb45c', r: 7.2, f: 1.05 },
    { x: 56, y: 106, c: '#9ec4ff', r: 4.8, f: 0.7 },
    { x: 108, y: 112, c: '#c9a070', r: 5.0, f: 0.75 },
    { x: 132, y: 108, c: '#d8c8b0', r: 4.8, f: 0.7 },
    { x: 84, y: 90, c: '#e0d4c0', r: 4.6, f: 0.68 },
    { x: 138, y: 112, c: '#ffb45c', r: 5.0, f: 0.8 }
  ];

  var dressing = [
    { x: 126.2, y: 73.4, k: 'lantern', seed: 301 },
    { x: 130.4, y: 74.8, k: 'lantern', seed: 302 },
    { x: 114.6, y: 82.2, k: 'lantern', seed: 303 },
    { x: 118.2, y: 84.4, k: 'web', silk: 1, seed: 304 },
    { x: 128.4, y: 91.2, k: 'eggs', seed: 305 },
    { x: 132.2, y: 90.6, k: 'bones', cocoon: 1, seed: 306 },
    { x: 135.2, y: 91.2, k: 'web', silk: 1, seed: 307 },
    { x: 137.4, y: 93.2, k: 'eggs', seed: 308 },
    { x: 99.2, y: 89.2, k: 'web', silk: 1, seed: 309 },
    { x: 101.6, y: 91.2, k: 'bones', cocoon: 1, seed: 310 },
    { x: 116.4, y: 97.2, k: 'web', silk: 1, seed: 311 },
    { x: 120.2, y: 99.2, k: 'eggs', seed: 312 },
    { x: 117.2, y: 96.6, k: 'lantern', seed: 313 },
    { x: 78.2, y: 102.4, k: 'web', silk: 1, seed: 314 },
    { x: 92.2, y: 104.2, k: 'eggs', seed: 315 },
    { x: 88.4, y: 112.2, k: 'bones', cocoon: 1, seed: 316 },
    { x: 72.4, y: 102.2, k: 'lantern', seed: 317 },
    { x: 96.2, y: 108.4, k: 'lantern', seed: 318 },
    { x: 55.2, y: 105.2, k: 'web', silk: 1, seed: 319 },
    { x: 57.6, y: 107.2, k: 'lantern', seed: 320 },
    { x: 107.2, y: 111.2, k: 'web', silk: 1, seed: 321 },
    { x: 109.4, y: 112.6, k: 'eggs', seed: 322 },
    { x: 131.2, y: 107.2, k: 'web', silk: 1, seed: 323 },
    { x: 133.6, y: 109.2, k: 'eggs', seed: 324 },
    { x: 83.2, y: 89.2, k: 'web', silk: 1, seed: 325 },
    { x: 85.4, y: 91.2, k: 'bones', cocoon: 1, seed: 326 },
    { x: 137.2, y: 111.4, k: 'lantern', seed: 327 }
  ];

  function carve(g, helpers) {
    var caveDisk = helpers.caveDisk;
    var rect = helpers.rect;
    var carvePath = helpers.carvePath;
    var i;
    for (i = 0; i < rooms.length; i++) {
      var room = rooms[i];
      if (room.kind === 'rect') rect(g, room.origin.x, room.origin.y, room.w, room.h, 0);
      else caveDisk(g, room.x, room.y, room.rw, room.rh, room.tile || 0);
    }
    for (i = 0; i < paths.length; i++) carvePath(g, paths[i], 2.2, 0);
  }

  function art(key, file, standIn, standInFor) {
    return { key: key, file: file, standIn: !!standIn, standInFor: standInFor || null, newArt: false };
  }

  function level() {
    return {
      id: 'L3',
      name: 'The Webbed Deep and the Spider Queen',
      level: 3,
      wired: false,
      stairsOpenOn: 'bossKill',
      size: { w: W, h: H },
      builtFrom: 'Level 3 shell. Own rooms in the Webbed Deep, not the Chapter II set.',
      spawn: { x: points.spawn.x, y: points.spawn.y, role: 'arrival-from-L2' },
      arrival: { x: points.spawn.x, y: points.spawn.y, role: 'from-L2' },
      layout: {
        source: 'The Webbed Deep, carved for Level 3. Not the Chapter II room set.',
        rooms: rooms
      },
      rubyDoor: {
        placement: 'fixed',
        x: points.rubyDoor.x,
        y: points.rubyDoor.y,
        prop: 'rubydoor',
        touchWakes: 'rubyGuardian',
        room: 'ruby-chamber'
      },
      guardian: {
        placement: 'fixed',
        key: 'rubyGuardian',
        name: 'Ruby Guardian III',
        tier: 3,
        count: 1,
        x: points.guardian.x,
        y: points.guardian.y,
        hp: 36,
        ac: 4,
        room: 'ruby-chamber',
        wakesOn: 'rubyDoor',
        leash: 'ruby-room',
        leashTiles: 7.5,
        bossFlagOnIndividual: false,
        art: art('thinone', 'assets/creatures/mon_thinone.png', true, 'Ruby Guardian III')
      },
      lever: {
        placement: 'fixed',
        x: points.lever.x,
        y: points.lever.y,
        prop: 'floorlever',
        room: 'ruby-chamber',
        enablesWhen: 'rubyGuardianDead',
        needsBoss: false,
        opensStairs: false,
        decision: 'D3-B'
      },
      elevator: {
        placement: 'fixed',
        x: points.elevator.x,
        y: points.elevator.y,
        prop: 'lift',
        room: 'ruby-chamber',
        auto: true,
        standIn: true,
        newArt: false,
        showsTransitionCard: true,
        transitionCard: 'assets/creatures/mon_spider_giant.png',
        standInFor: 'Giant spider art stands in for the Queen',
        requires: ['leverPulled'],
        gate: 'guardian'
      },
      boss: {
        placement: 'fixed',
        key: 'spiderQueen',
        name: 'Spider Queen',
        x: points.queen.x,
        y: points.queen.y,
        hp: 44,
        ac: 3,
        room: 'queen-hall',
        decision: 'D4-A',
        bossFlagOnIndividual: false,
        separateFromGuardian: true,
        requiredForStairs: true,
        requiredForElevator: false,
        art: art('spider_giant', 'assets/creatures/mon_spider_giant.png', true, 'Spider Queen')
      },
      stairs: {
        id: 'south-stair',
        placement: 'fixed',
        x: points.stair.x,
        y: points.stair.y,
        prop: 'stairs',
        room: 'stair-chamber',
        opensOn: 'bossKill',
        stairsOpenOn: 'bossKill'
      },
      tooth: {
        id: 'grond_tooth_electrum_3',
        n: 3,
        x: points.tooth.x,
        y: points.tooth.y,
        wall: points.tooth.wall,
        prop: 'demonface',
        room: 'queen-hall',
        cursed: true,
        curse: 'coin',
        bind: false,
        countsForRitual: true,
        countsForTeethCarried: true
      },
      setPieces: [
        {
          id: 'trapped-pixie',
          kind: 'rescue',
          placed: true,
          x: points.pixie.x,
          y: points.pixie.y,
          room: 'north-web',
          fights: false,
          freeRounds: 1,
          adjacentTo: 'web',
          gives: 'pixie_dust',
          count: 1,
          vanishes: true
        }
      ],
      spawns: [
        {
          id: 'north-web',
          room: 'north-web',
          anchor: { x: 118, y: 98 },
          members: [{ key: 'spider', count: 3, x: 118, y: 98 }]
        },
        {
          id: 'queen-hall',
          room: 'queen-hall',
          anchor: { x: points.queen.x, y: points.queen.y },
          members: [
            { key: 'spiderQueen', count: 1, x: points.queen.x, y: points.queen.y, role: 'boss' },
            { key: 'spider', count: 3, x: 87.2, y: 108.2 }
          ]
        },
        {
          id: 'east-web',
          room: 'east-web',
          anchor: { x: 132, y: 108 },
          members: [{ key: 'spider', count: 3, x: 132, y: 108 }]
        },
        {
          id: 'high-web',
          room: 'high-web',
          anchor: { x: 84, y: 90 },
          members: [
            { key: 'spiderHuge', count: 1, x: 84, y: 89.4 },
            { key: 'spider', count: 2, x: 84, y: 90.8 }
          ]
        },
        {
          id: 'far-silk',
          room: 'far-silk',
          anchor: { x: 136, y: 92 },
          members: [{ key: 'spider', count: 3, x: 136, y: 92 }]
        },
        {
          id: 'deep-huge',
          room: 'deep-huge',
          anchor: { x: 100, y: 90 },
          members: [
            { key: 'spiderHuge', count: 1, x: 100, y: 89.4 },
            { key: 'spider', count: 2, x: 100, y: 90.8 }
          ]
        },
        {
          id: 'giant-den',
          room: 'giant-den',
          anchor: { x: points.giant.x, y: points.giant.y },
          members: [{ key: 'spiderGiant', count: 1, x: points.giant.x, y: points.giant.y }]
        },
        {
          id: 'phase-den',
          room: 'phase-den',
          anchor: { x: points.phase.x, y: points.phase.y },
          members: [{ key: 'phasespider', count: 1, x: points.phase.x, y: points.phase.y }]
        }
      ],
      retired: ['spiderLord', 'forceLordHoard'],
      webCorpses: {
        keep: 'rollWebCorpse',
        count: '4-6',
        room: 'queen-hall',
        spots: webSpots
      },
      brood: {
        once: true,
        belowHpFraction: 0.5,
        huge: '1d4',
        giant: 1,
        tunnels: [
          { x: points.brood[0].x, y: points.brood[0].y },
          { x: points.brood[1].x, y: points.brood[1].y }
        ]
      },
      wander: {
        check: { chance: '1 in 6', every: '3 turns' },
        source: 'RULES section 5',
        slots: [
          { slot: 1, key: 'spider', count: '1d4' },
          { slot: 2, key: 'spider', count: '1d4' },
          { slot: 3, key: 'spiderHuge', count: '1d2' },
          { slot: 4, key: 'spiderHuge', count: '1d2' },
          { slot: 5, key: 'spiderGiant', count: '1' },
          { slot: 6, key: 'phasespider', count: '1' }
        ]
      },
      loot: {
        caches: {
          count: 16,
          level: 3,
          table: 'DMG Appendix A Table V',
          source: 'DUNGEON_TREASURE level 3',
          places: caches
        },
        queenCorpse: { letter: 'U', decision: 'D1-A', on: 'spiderQueen' },
        queenChest: { letter: 'C', decision: 'D2-A', x: points.queenChest.x, y: points.queenChest.y, onCorpse: false },
        guardianRuby: { gp: 750, x: points.guardian.x, y: points.guardian.y },
        tooth: { id: 'grond_tooth_electrum_3' },
        pixieDust: { id: 'pixie_dust', count: 1 },
        venom: { perSpider: 0.5, queen: 1 },
        silk: { how: 'web harvest' },
        magicFilter: '2.2 usable by a dwarf fighter',
        retired: 'forceLordHoard'
      },
      exit: {
        ref: 'campaign',
        level: 3,
        elevator: 'guardian',
        stairs: 'bossKill',
        stairsOpenOn: 'bossKill',
        livingBossBlocksElevator: false,
        leverRequires: ['rubyGuardianDead']
      }
    };
  }

  var api = {
    SHELL: 30,
    W: W,
    H: H,
    rooms: rooms,
    paths: paths,
    points: points,
    webSpots: webSpots,
    caches: caches,
    lights: lights,
    dressing: dressing,
    carve: carve,
    level: level
  };

  root.L3Shell = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
