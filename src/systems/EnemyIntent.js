/**
 * Batch E — one readable enemy behavior: melee pursuer.
 *
 * Returns intent to the host movement / attack machinery. Does not own
 * update(), does not call beginFight, and does not use Navigation (foes
 * steer toward the player with existing steerWalk / canBe).
 *
 * States (elapsed-time, not a turn scheduler):
 *   idle → investigate / pursue → attack → recover → return
 *
 * Predicates are separate: visibility ≠ missile clearance ≠ melee reach ≠
 * walking. Nav / canBe is not line-of-sight.
 *
 * Attack cadence stays on the host: default atkMax 0.42s, impact when
 * atk < atkMax * 0.55 (~0.189s), one swung impact. Recover is stand-still
 * while the committed swing is live — it does not change e.cd / e.atkMax.
 *
 * Flag: EnemyIntent.FLAG default ON.
 * Rollback: EnemyIntent.FLAG=false or load with ?intent=0 (legacy chase).
 *
 * Balance: leash 11 (boss 18) replaces infinite chase. Investigate 2.6s
 * at last-seen. Lost-LOS 1.15s. Dark uses existing inDarkZone (close
 * sense 1.55). Silence is passed through and not reinterpreted.
 */
(function (root) {
  'use strict';

  var FLAG = true;

  var STATE_IDLE = 'idle';
  var STATE_INVESTIGATE = 'investigate';
  var STATE_PURSUE = 'pursue';
  var STATE_ATTACK = 'attack';
  var STATE_RECOVER = 'recover';
  var STATE_RETURN = 'return';

  var LOST_T = 1.15;
  var INVESTIGATE_T = 2.6;
  var HEAR_R = 1.55;
  var LEASH = 11;
  var LEASH_BOSS = 18;
  var HOME_R = 0.42;
  var LAST_SEEN_R = 0.38;
  var IMPACT_FRAC = 0.55;
  var DEFAULT_ATK_MAX = 0.42;

  function use() {
    if (!FLAG) return false;
    try {
      if (typeof location !== 'undefined' && location.search &&
          /(?:^|[?&])intent=0(?:&|$)/.test(location.search)) {
        return false;
      }
    } catch (err) { /* node / missing location */ }
    return true;
  }

  function distOf(host, a, b) {
    if (!a || !b) return 1e9;
    if (host && typeof host.dist === 'function') return host.dist(a, b);
    return Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0));
  }

  function hasLine(host, x0, y0, x1, y1) {
    if (!host || typeof host.hasLOS !== 'function') return false;
    return !!host.hasLOS(x0, y0, x1, y1);
  }

  function inDark(host, e) {
    return !!(host && typeof host.inDarkZone === 'function' && host.inDarkZone(e));
  }

  function inSilence(host, e) {
    if (!host) return false;
    if (typeof host.inSilence === 'function') return !!host.inSilence(e);
    if (typeof host.inSilenceZone === 'function') return !!host.inSilenceZone(e);
    return false;
  }

  /**
   * Visibility: LOS, then darkness. Nav / canBe is not consulted.
   * A target in a dark zone is only sensed inside HEAR_R.
   */
  function canSee(from, to, host) {
    if (!from || !to) return false;
    if (!hasLine(host, from.x, from.y, to.x, to.y)) return false;
    if (inDark(host, to) && distOf(host, from, to) > HEAR_R) return false;
    return true;
  }

  /**
   * Missile clearance: walkable cells along the segment.
   * Distinct from hasLOS (tile 2 blocks sight; walk allows 0/3).
   */
  function missileClear(from, to, host) {
    if (!from || !to || !host || typeof host.walk !== 'function') return false;
    var x0 = from.x, y0 = from.y, x1 = to.x, y1 = to.y;
    var d = Math.hypot(x1 - x0, y1 - y0);
    if (!(d > 0)) return true;
    var steps = Math.max(2, Math.ceil(d / 0.25));
    var i, t, x, y;
    for (i = 1; i < steps; i++) {
      t = i / steps;
      x = x0 + (x1 - x0) * t;
      y = y0 + (y1 - y0) * t;
      if (!host.walk(x, y)) return false;
    }
    return true;
  }

  /**
   * Geometry reach: LOS between bodies. Does not change swing arc / damage.
   * Walking clearance (canBe / wall-face) is intentionally not used here.
   */
  function meleeClear(from, to, host) {
    if (!from || !to) return false;
    return hasLine(host, from.x, from.y, to.x, to.y);
  }

  function inMeleeWant(from, to, host) {
    if (!from || !to) return false;
    var want = from.range != null ? from.range : 0.95;
    return distOf(host, from, to) <= want;
  }

  function canWalkAt(x, y, actor, host) {
    if (!host || typeof host.canBe !== 'function' || !actor) return false;
    var r = actor.r;
    if (r == null) r = 0.36;
    return !!host.canBe(x, y, r, actor);
  }

  function isMeleePursuer(e) {
    if (!e || e.team !== 'foe' || e.dead || e.npc) return false;
    if (e.ranged || e.web) return false;
    if (e.hero || e.hidden || e.sleeping || e.crushed || e.tied) return false;
    if (e.fleeTo || (e.fleePath && e.fleePath.length)) return false;
    return true;
  }

  function leashOf(e) {
    return e && e.boss ? LEASH_BOSS : LEASH;
  }

  function aggroOf(e) {
    var a = e && e.aggro;
    if (a == null) a = 7.5;
    return a;
  }

  function ensureHome(e) {
    if (!e) return;
    if (e.homeX == null) e.homeX = e.x;
    if (e.homeY == null) e.homeY = e.y;
  }

  function setState(e, state) {
    if (!e) return;
    if (e.intent !== state) {
      e.intent = state;
      e.intentAge = 0;
    }
  }

  function pickTarget(e, host) {
    var ents = (host && host.ents) || [];
    var best = null, bd = 1e9, i, o, d;
    if (host && typeof host.nearestAlly === 'function') {
      best = host.nearestAlly(e, 999);
    }
    if (best) return best;
    for (i = 0; i < ents.length; i++) {
      o = ents[i];
      if (!o || o.team !== 'party' || o.dead) continue;
      d = distOf(host, e, o);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }

  function remember(e, tgt) {
    if (!e || !tgt) return;
    e.lastSeenX = tgt.x;
    e.lastSeenY = tgt.y;
  }

  function moveToward(x, y) {
    return { dx: x, dy: y };
  }

  function result(e, act, extra) {
    var out = {
      handled: true,
      state: e && e.intent || act,
      act: act,
      move: null,
      attack: null,
      face: null,
      engaged: !!(e && (e.intent === STATE_PURSUE || e.intent === STATE_ATTACK ||
        e.intent === STATE_RECOVER || e.intent === STATE_INVESTIGATE)),
      beginFight: false
    };
    var k;
    if (extra) {
      for (k in extra) {
        if (Object.prototype.hasOwnProperty.call(extra, k)) out[k] = extra[k];
      }
    }
    return out;
  }

  /**
   * Decide one frame of melee-pursuer intent.
   * Host applies move via steerWalk and attack via atk/ct/swung.
   */
  function decide(e, dt, host) {
    host = host || {};
    if (!use() || !isMeleePursuer(e)) return { handled: false };
    ensureHome(e);
    if (e.intent == null) e.intent = STATE_IDLE;
    if (e.intentAge == null) e.intentAge = 0;
    e.intentAge += dt || 0;

    var tgt = pickTarget(e, host);
    var seen = !!(tgt && canSee(e, tgt, host));
    var dTgt = tgt ? distOf(host, e, tgt) : 1e9;
    var dHome = distOf(host, e, { x: e.homeX, y: e.homeY });
    var leash = leashOf(e);
    var aggro = aggroOf(e);
    var swinging = (e.atk || 0) > 0;
    var closeSense = !!(tgt && dTgt <= HEAR_R && meleeClear(e, tgt, host));
    var hop, ready;

    if (seen) remember(e, tgt);

    /* Commitment: a live swing finishes in place. Facing stays _attack. */
    if (swinging) {
      setState(e, STATE_RECOVER);
      return result(e, STATE_RECOVER, {
        engaged: true,
        holdFacing: true
      });
    }

    if (e.intent === STATE_RECOVER && !swinging) {
      setState(e, seen ? STATE_PURSUE : STATE_INVESTIGATE);
    }

    if (dHome >= leash && e.intent !== STATE_RETURN) {
      if (!(e.boss && seen && dTgt <= aggro)) setState(e, STATE_RETURN);
    }

    for (hop = 0; hop < 4; hop++) {
      if (e.intent === STATE_IDLE) {
        if (seen && (dTgt <= aggro || e.boss || e.engaged)) {
          setState(e, STATE_PURSUE);
          continue;
        }
        if (closeSense && (dTgt <= aggro || e.engaged)) {
          if (tgt) remember(e, tgt);
          setState(e, STATE_INVESTIGATE);
          continue;
        }
        return result(e, STATE_IDLE, { engaged: !!e.engaged });
      }

      if (e.intent === STATE_INVESTIGATE) {
        if (seen) {
          setState(e, STATE_PURSUE);
          continue;
        }
        if ((e.intentAge || 0) >= INVESTIGATE_T ||
            (e.lastSeenX == null) ||
            distOf(host, e, { x: e.lastSeenX, y: e.lastSeenY }) <= LAST_SEEN_R) {
          setState(e, STATE_RETURN);
          continue;
        }
        return result(e, STATE_INVESTIGATE, {
          move: moveToward(e.lastSeenX, e.lastSeenY),
          face: { x: e.lastSeenX, y: e.lastSeenY },
          engaged: true
        });
      }

      if (e.intent === STATE_PURSUE) {
        if (seen) e.intentAge = 0;
        else if ((e.intentAge || 0) >= LOST_T) {
          setState(e, e.lastSeenX != null ? STATE_INVESTIGATE : STATE_RETURN);
          continue;
        }
        if (!tgt) {
          setState(e, STATE_RETURN);
          continue;
        }
        ready = inMeleeWant(e, tgt, host) && meleeClear(e, tgt, host) &&
          (e.ct || 0) <= 0 && (e.atk || 0) <= 0 && !e.defending;
        if (ready) {
          setState(e, STATE_ATTACK);
          return result(e, STATE_ATTACK, {
            attack: tgt,
            face: { x: tgt.x, y: tgt.y },
            engaged: true
          });
        }
        return result(e, STATE_PURSUE, {
          move: moveToward(tgt.x, tgt.y),
          face: { x: tgt.x, y: tgt.y },
          engaged: true
        });
      }

      if (e.intent === STATE_ATTACK) {
        ready = tgt && inMeleeWant(e, tgt, host) && meleeClear(e, tgt, host) &&
          (e.ct || 0) <= 0 && (e.atk || 0) <= 0 && !e.defending;
        if (ready) {
          return result(e, STATE_ATTACK, {
            attack: tgt,
            face: { x: tgt.x, y: tgt.y },
            engaged: true
          });
        }
        setState(e, seen ? STATE_PURSUE : STATE_RETURN);
        continue;
      }

      if (e.intent === STATE_RETURN) {
        if (seen && dHome < leash && (dTgt <= aggro || e.boss || e.engaged)) {
          setState(e, STATE_PURSUE);
          continue;
        }
        if (dHome <= HOME_R) {
          setState(e, STATE_IDLE);
          e.engaged = 0;
          return result(e, STATE_IDLE, { engaged: false });
        }
        return result(e, STATE_RETURN, {
          move: moveToward(e.homeX, e.homeY),
          face: { x: e.homeX, y: e.homeY },
          engaged: false
        });
      }

      return result(e, e.intent || STATE_IDLE);
    }

    return result(e, e.intent || STATE_IDLE);
  }

  var api = {
    STATE_IDLE: STATE_IDLE,
    STATE_INVESTIGATE: STATE_INVESTIGATE,
    STATE_PURSUE: STATE_PURSUE,
    STATE_ATTACK: STATE_ATTACK,
    STATE_RECOVER: STATE_RECOVER,
    STATE_RETURN: STATE_RETURN,
    LOST_T: LOST_T,
    INVESTIGATE_T: INVESTIGATE_T,
    HEAR_R: HEAR_R,
    LEASH: LEASH,
    LEASH_BOSS: LEASH_BOSS,
    IMPACT_FRAC: IMPACT_FRAC,
    DEFAULT_ATK_MAX: DEFAULT_ATK_MAX,
    get FLAG() { return FLAG; },
    set FLAG(v) { FLAG = !!v; },
    use: use,
    canSee: canSee,
    missileClear: missileClear,
    meleeClear: meleeClear,
    inMeleeWant: inMeleeWant,
    canWalkAt: canWalkAt,
    inSilence: inSilence,
    isMeleePursuer: isMeleePursuer,
    decide: decide
  };

  root.EnemyIntent = api;
  if (root.SystemsReady && typeof root.SystemsReady.declare === 'function') {
    root.SystemsReady.declare('EnemyIntent', api);
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
