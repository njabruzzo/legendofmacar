/**
 * Chapter II spider-lord room: Type U hoard + silk-bound corpses.
 * House: lord purse never empty (U coins always). Magic stays Type U 55%.
 * Pack spiders stay Nil. Web corpses are a separate roll.
 */
(function (root) {
  'use strict';

  var SPOTS = [
    [11.5, 29.7], [8.7, 30.2], [12.6, 32.0], [9.1, 32.8],
    [11.9, 33.5], [8.3, 28.9], [13.1, 30.6]
  ];

  function rollTypeU(api) {
    api = api || {};
    var chanceOk = api.chanceOk || function () { return false; };
    var rngAmt = api.rngAmt || function (a) { return a; };
    return {
      coins: { cp: rngAmt(10, 80), sp: rngAmt(10, 60), gp: rngAmt(5, 30) },
      gems: chanceOk(90) ? rngAmt(2, 16) : 0,
      jew: chanceOk(80) ? rngAmt(1, 6) : 0,
      magN: chanceOk(55) ? 1 : 0,
      magKind: 'any'
    };
  }

  function forceLordHoard(h) {
    h = h || {};
    var coins = {};
    var src = h.coins || {};
    coins.cp = src.cp > 0 ? src.cp : 10;
    coins.sp = src.sp > 0 ? src.sp : 10;
    coins.gp = src.gp > 0 ? src.gp : 5;
    return {
      coins: coins,
      gems: h.gems || 0,
      jew: h.jew || 0,
      magN: h.magN || 0,
      magKind: h.magKind || 'any'
    };
  }

  function isSpiderLord(e) {
    if (!e) return false;
    if ((e.name || '') === 'Spider Lord') return true;
    return !!(e.boss && e.kind === 'spider');
  }

  function rollWebCorpse(api) {
    api = api || {};
    var chanceOk = api.chanceOk || function () { return false; };
    var ri = api.ri || function () { return 0; };
    var rollIndividual = api.rollIndividual || function () { return null; };
    if (!chanceOk(50)) return { stripped: true, letter: '', hoard: null };
    if (chanceOk(10)) return { stripped: false, letter: 'S', hoard: rollIndividual('S') };
    var letter = ['J', 'K', 'M', 'Q'][ri(0, 3)];
    if (letter === 'Q') {
      return { stripped: false, letter: 'Q', hoard: { coins: {}, gems: ri(1, 4), jew: 0, magN: 0 } };
    }
    return { stripped: false, letter: letter, hoard: rollIndividual(letter) };
  }

  function pickSpots(n, ri) {
    n = Math.max(4, Math.min(6, n | 0));
    var spots = SPOTS.slice();
    if (typeof ri === 'function') {
      var i, j, t;
      for (i = spots.length - 1; i > 0; i--) {
        j = ri(0, i);
        t = spots[i]; spots[i] = spots[j]; spots[j] = t;
      }
    }
    return spots.slice(0, n);
  }

  root.SpiderLair = {
    SPOTS: SPOTS,
    rollTypeU: rollTypeU,
    forceLordHoard: forceLordHoard,
    isSpiderLord: isSpiderLord,
    rollWebCorpse: rollWebCorpse,
    pickSpots: pickSpots
  };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
