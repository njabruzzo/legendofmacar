/**
 * Necklace of Missiles (G19a). One bead is one fireball, largest first.
 * Throw range 14 tiles, 4-tile radius, Nd6 × ADD_SCALE, save vs spell for half.
 * No foe in range leaves the bead on the cord.
 */
(function (root) {
  'use strict';

  function dieFor(it, i) {
    var seed = it && it._beadSeed != null ? (it._beadSeed + i) : (i * 3 + 2);
    var die = 3 + (Math.abs(seed) % 7);
    if (die < 3) die = 3;
    if (die > 9) die = 9;
    return die;
  }

  function ensureBeads(it) {
    if (!it) return [];
    if (it.beads && it.beads.length) return it.beads;
    var n = it.charges > 0 ? it.charges : 0;
    it.beads = [];
    var i;
    for (i = 0; i < n; i++) it.beads.push(dieFor(it, i));
    it.beads.sort(function (a, b) { return b - a; });
    return it.beads;
  }

  function distOf(host, a, b) {
    if (host && typeof host.dist === 'function') return host.dist(a, b);
    return Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0));
  }

  function fire(it, user, host) {
    host = host || {};
    var beads = ensureBeads(it);
    if (!beads.length) {
      return { ok: false, effect: 'spent', spent: true, say: 'The necklace is empty.' };
    }
    var dice = beads[0];
    var ents = host.ents || [];
    var nearest = null;
    if (typeof host.nearestFoe === 'function') nearest = host.nearestFoe(user, 14);
    if (!nearest) {
      var bd = 14, i, o, d;
      for (i = 0; i < ents.length; i++) {
        o = ents[i];
        if (!o || o.dead || o.team !== 'foe') continue;
        d = distOf(host, user, o);
        if (d <= bd) { bd = d; nearest = o; }
      }
    }
    if (!nearest) {
      return {
        ok: false,
        effect: 'no valid target',
        reason: 'no valid target',
        spent: false,
        say: 'No foe within throw range.'
      };
    }
    var cx = nearest.x, cy = nearest.y;
    var roll = host.rollDice || function (n, s) {
      var t = 0, k;
      for (k = 0; k < n; k++) t += 1 + (k % (s || 6));
      return t;
    };
    var scale = host.ADD_SCALE || 4;
    var raw = roll(dice, 6, 0) * scale;
    var saving = host.savingThrow || function () { return false; };
    var damage = host.damage || function () {};
    var hit = 0, j, e, amt;
    for (j = 0; j < ents.length; j++) {
      e = ents[j];
      if (!e || e.dead) continue;
      if (distOf(host, e, { x: cx, y: cy }) > 4 + (e.r || 0)) continue;
      amt = raw;
      if (saving(e, 'spell')) amt = Math.floor(amt / 2);
      damage(e, amt, '#ff8a3a', { magic: 1, kind: 'flame', n: it.n, bead: dice });
      hit++;
    }
    beads.shift();
    it.charges = beads.length;
    return {
      ok: true,
      effect: 'bead',
      spent: beads.length === 0,
      dice: dice,
      hits: hit,
      say: 'A ' + dice + 'd6 bead bursts.'
    };
  }

  var api = { ensureBeads: ensureBeads, fire: fire };
  root.NecklaceMissiles = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
