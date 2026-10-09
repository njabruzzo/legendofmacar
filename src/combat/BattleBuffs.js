/**
 * One-battle buff queue (rules 1.15). Pure module.
 * Not loaded by index.html. beginFight / endFightIfClear here are the
 * queue's own functions. They do not replace the ones in the play loop.
 *
 * A buff used outside a fight is armed and becomes active at the next
 * beginFight. While it is armed it has no timer. It ends on Macar's
 * death, on a floor change, or, once the fight has started, when
 * now - t0 exceeds the 300 second cap. The cap starts when the buff's
 * fight begins. A buff used outside a fight is armed and has no timer
 * until beginFight. A buff used during a fight is already in its fight,
 * so its timer starts at that use. The item leaves the
 * pack on a successful use. Only one golden egg may be armed or active.
 */
(function (root) {
  'use strict';

  var CAP = 300;
  var KINDS = {
    haste: { moveMul: 2, cdMul: 0.5, ageing: 0 },
    egg: { acDelta: -4 },
    antitoxin: { poisonSavePlus: 4, endsPoisonSlow: true },
    fireres: { fireResist: true }
  };

  function create(now) {
    return { battleBuffs: [], fightOn: 0, floor: 1, dead: 0, now: now || 0 };
  }

  function expire(state, now) {
    if (now != null) state.now = now;
    var t = state.now;
    state.battleBuffs = state.battleBuffs.filter(function (b) {
      if (b.t0 == null) return true;
      return (t - b.t0) <= b.cap;
    });
    return state;
  }

  function eggPending(state) {
    return state.battleBuffs.some(function (b) { return b.k === 'egg'; });
  }

  function use(state, pack, item, now) {
    expire(state, now == null ? state.now : now);
    if (!item || !KINDS[item.k]) return { ok: false, reason: 'not-a-buff', endsPoisonSlow: false };
    var idx = pack.indexOf(item);
    if (idx < 0) {
      idx = -1;
      for (var i = 0; i < pack.length; i++) if (pack[i] && pack[i].id === item.id) { idx = i; break; }
    }
    if (idx < 0) return { ok: false, reason: 'missing', endsPoisonSlow: false };
    if (item.k === 'egg' && eggPending(state)) {
      return { ok: false, reason: 'egg-blocked', endsPoisonSlow: false };
    }
    var removed = pack.splice(idx, 1)[0];
    var fighting = !!state.fightOn;
    var buff = {
      k: item.k,
      state: fighting ? 'active' : 'armed',
      /* Armed outside a fight: no timer. Used in a fight: the 300 s cap starts at this use. */
      t0: fighting ? state.now : null,
      cap: CAP
    };
    state.battleBuffs.push(buff);
    return {
      ok: true,
      buff: buff,
      removed: removed,
      endsPoisonSlow: item.k === 'antitoxin'
    };
  }

  function beginFight(state, foe, now) {
    if (now != null) state.now = now;
    state.fightOn = 1;
    state.foe = foe || null;
    for (var i = 0; i < state.battleBuffs.length; i++) {
      var buff = state.battleBuffs[i];
      if (buff.state === 'armed') {
        buff.state = 'active';
        buff.t0 = state.now;
      }
    }
    return state;
  }

  function endFightIfClear(state) {
    state.fightOn = 0;
    state.foe = null;
    state.battleBuffs = state.battleBuffs.filter(function (b) { return b.state !== 'active'; });
    return state;
  }

  function onDeath(state) {
    state.dead = 1;
    state.fightOn = 0;
    state.battleBuffs = [];
    return state;
  }

  function onFloorChange(state, floor) {
    state.floor = floor;
    state.fightOn = 0;
    state.battleBuffs = [];
    return state;
  }

  function active(state, kind) {
    return state.battleBuffs.filter(function (b) {
      return b.state === 'active' && (kind == null || b.k === kind);
    });
  }

  /* Haste does not stack with Speed. Take the highest move multiplier. */
  function moveMul(state, speedMoveMul) {
    var other = speedMoveMul == null ? 1 : speedMoveMul;
    if (!active(state, 'haste').length) return other;
    return Math.max(KINDS.haste.moveMul, other);
  }

  /* Haste halves the attack cooldown. Do not multiply that by Speed's factor. */
  function cdMul(state, speedCdMul) {
    var other = speedCdMul == null ? 1 : speedCdMul;
    if (!active(state, 'haste').length) return other;
    return Math.min(KINDS.haste.cdMul, other);
  }

  function acDelta(state) {
    return active(state, 'egg').length ? KINDS.egg.acDelta : 0;
  }

  function effects(state) {
    return {
      moveMul: moveMul(state, 1),
      cdMul: cdMul(state, 1),
      acDelta: acDelta(state),
      ageing: active(state, 'haste').length ? 0 : 0,
      poisonSavePlus: active(state, 'antitoxin').length ? 4 : 0,
      fireResist: active(state, 'fireres').length > 0
    };
  }

  var api = {
    CAP: CAP,
    KINDS: KINDS,
    create: create,
    expire: expire,
    use: use,
    beginFight: beginFight,
    endFightIfClear: endFightIfClear,
    onDeath: onDeath,
    onFloorChange: onFloorChange,
    active: active,
    moveMul: moveMul,
    cdMul: cdMul,
    acDelta: acDelta,
    effects: effects,
    wired: false
  };

  root.BattleBuffs = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
