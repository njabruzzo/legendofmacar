/**
 * MAC-03 — derived timed effects (haste only).
 *
 * Remaining is simulation seconds from update() dt (already paused during
 * non-play / dialogue / sleep). Actor speed and attack cd are derived from
 * base + equipment + the active modifier. Never multiply persistent stats
 * each frame (the old afterHaste `e.sp *= 0.985` path).
 *
 * Does not own room dark / mute / zone expiry (host keeps that).
 * Does not call the game update loop.
 *
 * Flag: TimedEffects.FLAG default ON (30/60/120 Hz tests lock decay).
 * Rollback: set FLAG to false, or load with ?timedHaste=0.
 */
(function (root) {
  'use strict';

  var KIND = 'haste';
  var POLICY_REPLACE = 'replace';
  var POLICY_REFRESH = 'refresh';
  var POLICY_EXTEND = 'extend';

  /* Default ON: isolated PR, merge gated on Meticulous PASS, tests lock
     30/60/120 equivalence. Flip false to restore the legacy mutation path. */
  var FLAG = true;

  function useHaste() {
    if (!FLAG) return false;
    try {
      if (typeof location !== 'undefined' && location.search &&
          /(?:^|[?&])timedHaste=0(?:&|$)/.test(location.search)) {
        return false;
      }
    } catch (err) { /* node / missing location */ }
    return true;
  }

  function listOf(e) {
    if (!e) return [];
    if (!e.timedEffects) e.timedEffects = [];
    return e.timedEffects;
  }

  function cloneFx(fx) {
    if (!fx) return null;
    return {
      id: fx.id || KIND,
      kind: fx.kind || KIND,
      remaining: +fx.remaining || 0,
      duration: +fx.duration || 0,
      policy: fx.policy || POLICY_REPLACE,
      moveMul: fx.moveMul != null ? +fx.moveMul : 1,
      cdMul: fx.cdMul != null ? +fx.cdMul : 1,
      cdFloor: fx.cdFloor != null ? +fx.cdFloor : 0.28,
      restRemaining: +fx.restRemaining || 0,
      restMul: fx.restMul != null ? +fx.restMul : 1,
      restFloor: fx.restFloor != null ? +fx.restFloor : 1.2,
      phase: fx.phase === 'rest' ? 'rest' : 'haste',
      source: fx.source || ''
    };
  }

  function getHaste(e) {
    var list = (e && e.timedEffects) || [];
    var i, fx;
    for (i = 0; i < list.length; i++) {
      fx = list[i];
      if (fx && (fx.kind || fx.id) === KIND) return fx;
    }
    return null;
  }

  function hasHaste(e) {
    return !!getHaste(e);
  }

  function ensureBase(e) {
    if (!e) return e;
    if (e.baseSp == null) e.baseSp = e.sp != null ? e.sp : 3;
    if (e.baseCd == null) e.baseCd = e.cd != null ? e.cd : 1;
    return e;
  }

  function strongerMul(a, b) {
    a = a == null ? 1 : +a;
    b = b == null ? 1 : +b;
    return a > b ? a : b;
  }

  function weakerCdMul(a, b) {
    a = a == null ? 1 : +a;
    b = b == null ? 1 : +b;
    return a < b ? a : b;
  }

  function applyHaste(e, spec) {
    if (!e || !spec) return null;
    ensureBase(e);
    var incoming = {
      id: KIND,
      kind: KIND,
      remaining: +spec.duration || 0,
      duration: +spec.duration || 0,
      policy: spec.policy || POLICY_REPLACE,
      moveMul: spec.moveMul != null ? +spec.moveMul : 1.35,
      cdMul: spec.cdMul != null ? +spec.cdMul : 0.5,
      cdFloor: spec.cdFloor != null ? +spec.cdFloor : 0.28,
      restRemaining: +spec.restRemaining || 0,
      restMul: spec.restMul != null ? +spec.restMul : 1,
      restFloor: spec.restFloor != null ? +spec.restFloor : 1.2,
      phase: 'haste',
      source: spec.source || ''
    };
    if (incoming.remaining < 0) incoming.remaining = 0;
    var list = listOf(e);
    var cur = getHaste(e);
    var policy = incoming.policy;
    if (!cur || cur.phase === 'rest' || policy === POLICY_REPLACE) {
      if (cur) list.splice(list.indexOf(cur), 1);
      list.push(incoming);
      return incoming;
    }
    if (policy === POLICY_EXTEND) {
      cur.remaining = (+cur.remaining || 0) + incoming.remaining;
      cur.duration = (+cur.duration || 0) + incoming.duration;
      cur.moveMul = strongerMul(cur.moveMul, incoming.moveMul);
      cur.cdMul = weakerCdMul(cur.cdMul, incoming.cdMul);
      if (incoming.cdFloor != null) {
        cur.cdFloor = cur.cdFloor == null ? incoming.cdFloor
          : Math.max(cur.cdFloor, incoming.cdFloor);
      }
      cur.restRemaining = Math.max(+cur.restRemaining || 0, incoming.restRemaining);
      if (incoming.source) cur.source = incoming.source;
      return cur;
    }
    /* refresh: keep the longer remaining; take the stronger muls */
    cur.remaining = Math.max(+cur.remaining || 0, incoming.remaining);
    cur.duration = Math.max(+cur.duration || 0, incoming.duration);
    cur.moveMul = strongerMul(cur.moveMul, incoming.moveMul);
    cur.cdMul = weakerCdMul(cur.cdMul, incoming.cdMul);
    if (incoming.cdFloor != null) {
      cur.cdFloor = cur.cdFloor == null ? incoming.cdFloor
        : Math.max(cur.cdFloor, incoming.cdFloor);
    }
    cur.restRemaining = Math.max(+cur.restRemaining || 0, incoming.restRemaining);
    if (incoming.restMul != null && incoming.restMul !== 1) cur.restMul = incoming.restMul;
    if (incoming.source) cur.source = incoming.source;
    return cur;
  }

  function removeHaste(e) {
    if (!e || !e.timedEffects) return;
    e.timedEffects = e.timedEffects.filter(function (fx) {
      return !fx || (fx.kind || fx.id) !== KIND;
    });
  }

  function tick(e, dt) {
    if (!e) return null;
    dt = +dt || 0;
    if (dt <= 0) return getHaste(e);
    var fx = getHaste(e);
    if (!fx) return null;
    if (fx.phase === 'rest') {
      fx.restRemaining = (+fx.restRemaining || 0) - dt;
      if (fx.restRemaining <= 1e-8) {
        removeHaste(e);
        return null;
      }
      return fx;
    }
    fx.remaining = (+fx.remaining || 0) - dt;
    if (fx.remaining > 1e-8) return fx;
    var leftover = -fx.remaining;
    fx.remaining = 0;
    if ((+fx.restRemaining || 0) > 0) {
      fx.phase = 'rest';
      if (leftover > 0) {
        fx.restRemaining = (+fx.restRemaining || 0) - leftover;
        if (fx.restRemaining <= 0) {
          removeHaste(e);
          return null;
        }
      }
      return fx;
    }
    removeHaste(e);
    return null;
  }

  function deriveSp(e) {
    var base = e && e.baseSp != null ? e.baseSp : (e && e.sp != null ? e.sp : 3);
    var fx = getHaste(e);
    if (!fx) return base;
    if (fx.phase === 'rest') {
      var rest = base * (fx.restMul != null ? fx.restMul : 1);
      var floor = fx.restFloor != null ? fx.restFloor : 1.2;
      return rest < floor ? floor : rest;
    }
    return base * (fx.moveMul != null ? fx.moveMul : 1);
  }

  function deriveCd(e, wornAttackCd) {
    var base = e && e.baseCd != null ? e.baseCd : (e && e.cd != null ? e.cd : 1);
    var worn = base;
    if (typeof wornAttackCd === 'function') {
      worn = wornAttackCd(e);
      if (worn == null || isNaN(worn)) worn = base;
    }
    var fx = getHaste(e);
    if (!fx || fx.phase === 'rest') return worn;
    var floor = fx.cdFloor != null ? fx.cdFloor : 0.28;
    var next = worn * (fx.cdMul != null ? fx.cdMul : 1);
    return next < floor ? floor : next;
  }

  function syncActor(e, opts) {
    if (!e) return e;
    opts = opts || {};
    ensureBase(e);
    e.sp = deriveSp(e);
    e.cd = deriveCd(e, opts.wornAttackCd);
    return e;
  }

  function serialize(e) {
    var list = (e && e.timedEffects) || [];
    var out = [];
    var i;
    for (i = 0; i < list.length; i++) {
      if (list[i] && (list[i].kind || list[i].id) === KIND) out.push(cloneFx(list[i]));
    }
    return out;
  }

  function restore(e, saved) {
    if (!e) return e;
    e.timedEffects = [];
    if (!saved || !saved.length) return e;
    var i, fx;
    for (i = 0; i < saved.length; i++) {
      fx = cloneFx(saved[i]);
      if (fx && fx.kind === KIND) e.timedEffects.push(fx);
    }
    return e;
  }

  root.TimedEffects = {
    KIND: KIND,
    POLICY_REPLACE: POLICY_REPLACE,
    POLICY_REFRESH: POLICY_REFRESH,
    POLICY_EXTEND: POLICY_EXTEND,
    get FLAG() { return FLAG; },
    set FLAG(v) { FLAG = !!v; },
    useHaste: useHaste,
    ensureBase: ensureBase,
    applyHaste: applyHaste,
    getHaste: getHaste,
    hasHaste: hasHaste,
    tick: tick,
    deriveSp: deriveSp,
    deriveCd: deriveCd,
    syncActor: syncActor,
    serialize: serialize,
    restore: restore,
    removeHaste: removeHaste
  };
  if (root.SystemsReady && typeof root.SystemsReady.declare === 'function') {
    root.SystemsReady.declare('TimedEffects', root.TimedEffects);
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
