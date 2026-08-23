/**
 * Field crafting stations: one landmark forge per chapter.
 */
(function (global) {
  'use strict';

  var SPRITE = 'assets/props/prop_craftstation.png';
  var SPRITE_ATK = 'assets/props/prop_craftstation_atk.png';

  var SPOTS = {
    1: { x: 22.35, y: 17.55, seed: 401 },
    2: { x: 38.55, y: 10.35, seed: 402 },
    3: { x: 10.4, y: 26.2, seed: 404 },
    4: { x: 10.4, y: 26.2, seed: 405 },
    5: { x: 12.6, y: 42.4, seed: 406 }
  };

  function spotForLevel(n) {
    return SPOTS[n] || SPOTS[1];
  }

  function alreadyPlaced(props) {
    return (props || []).some(function (p) {
      return p && p.k === 'craftstation';
    });
  }

  function planPlacement(levelN, props) {
    if (alreadyPlaced(props)) return null;
    var spot = spotForLevel(levelN);
    return { x: spot.x, y: spot.y, seed: spot.seed };
  }

  function countForLevel(levelN) {
    return spotForLevel(levelN) ? 1 : 0;
  }

  global.CraftStation = {
    SPRITE: SPRITE,
    SPRITE_ATK: SPRITE_ATK,
    SPOTS: SPOTS,
    spotForLevel: spotForLevel,
    alreadyPlaced: alreadyPlaced,
    planPlacement: planPlacement,
    countForLevel: countForLevel
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
