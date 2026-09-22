/**
 * Party orders for living kin — Hold, Regroup, Focus.
 *
 * House brief 2026-09-22. RAW 1e treats hirelings and henchmen as
 * commanded NPCs with general orders, not second PCs. Nick/house
 * override wins.
 *
 * Pack-wide: one order for every living kin. A new verb replaces the
 * prior order. Issuing the active verb again is the soft clear back
 * to follow. Orders do not stack. A null order does not intercept
 * them: decide() returns handled:false and ghost follow stays on the
 * host path.
 *
 * Living kin only: party roster, not the hero, not dead / crushed /
 * sleeping / tied / hidden, not a ghost, has a roster key, not
 * story-locked. Ghosts ignore PartyOrders and keep auto-follow.
 * Dead kin are not orderable. A kin who dies or becomes a ghost
 * drops out; any other living kin keep the pack order.
 *
 * Hold: stand. Strike only a foe already in melee reach. No chase.
 * Regroup: path to an adjacent tile by Macar. Finish a swing that
 * is already in progress, then break. Do not pick a new fight.
 * Within ~1 tile the kin wait; when every living kin is in (or none
 * remain), the order clears and follow resumes.
 * Focus: one living foe Macar designates (tap, else his aim, else
 * his marked dest). Not a tile, door, ghost, or Macar. A failed
 * designation no-ops and keeps the prior order. Focus ends when
 * that foe is dead, fled, hidden, or unknown — resume follow.
 *
 * Morale flee overrides the pack order. When flee ends, kin resume
 * follow, not the old Hold or Focus.
 *
 * This module never assigns e.x / e.y and never writes e.ghost.
 * Kin do not get Specialty from PartyOrders.
 *
 * Flag: PartyOrders.FLAG default ON.
 * Rollback: PartyOrders.FLAG=false or load with ?orders=0.
 */
(function (root) {
  'use strict';

  var FLAG = true;
  var VERBS = { hold: 1, regroup: 1, focus: 1 };
  var ARRIVE = 1;
  var MELEE = 1.5;
  var BESIDE = 0.85;
  var orderName = null;
  var focusId = null;
  var tappedId = null;
  var regroupLatch = {};

  function use() {
    if (!FLAG) return false;
    try {
      if (typeof location !== 'undefined' && location.search &&
          /(?:^|[?&])orders=0(?:&|$)/.test(location.search)) {
        return false;
      }
    } catch (err) { /* node / missing location */ }
    return true;
  }

  function order() {
    return orderName;
  }

  function isStoryLocked(e) {
    if (!e) return true;
    if (e.fleeTo || (e.fleePath && e.fleePath.length)) return true;
    if (e.noz || e.nozCamp) return true;
    if (e.kind === 'gnome') return true;
    if (e.name && /^noz$/i.test(String(e.name))) return true;
    if (e.npc && e.team !== 'party') return true;
    return false;
  }

  function commands(e) {
    if (!use() || !e) return false;
    if (e.hero || e.dead || e.crushed || e.sleeping || e.tied || e.hidden) return false;
    if (e.ghost) return false;
    if (e.team !== 'party') return false;
    if (!e.col || !e.col.key) return false;
    if (isStoryLocked(e)) return false;
    return true;
  }

  function validFocus(e) {
    return !!(e && e.team === 'foe' && !e.dead && !e.npc && !e.ghost && !e.hero && e.id != null);
  }

  function findById(ents, id) {
    var i;
    if (id == null || !ents) return null;
    for (i = 0; i < ents.length; i++) {
      if (ents[i] && ents[i].id === id) return ents[i];
    }
    return null;
  }

  function distOf(a, b, host) {
    if (!a || !b || a.x == null || b.x == null) return 99;
    if (host && typeof host.dist === 'function') {
      try { return host.dist(a, b); } catch (err) { /* fall through */ }
    }
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function knownFoe(foe, host) {
    if (!validFocus(foe)) return false;
    if (foe.fleeTo || (foe.fleePath && foe.fleePath.length) || foe.hidden) return false;
    if (host && typeof host.known === 'function') {
      try { return !!host.known(foe); } catch (err2) { return false; }
    }
    return true;
  }

  function noteTap(foe) {
    if (validFocus(foe)) tappedId = foe.id;
    return tappedId;
  }

  function pickFocus(host) {
    host = host || {};
    var ents = host.ents || [];
    var tapped = findById(ents, tappedId);
    var leader, marked;
    if (knownFoe(tapped, host)) return tapped;
    leader = host.leader;
    if (leader && knownFoe(leader.aim, host)) return leader.aim;
    if (leader && leader.dest && leader.dest.foe != null) {
      marked = findById(ents, leader.dest.foe);
      if (knownFoe(marked, host)) return marked;
    }
    return null;
  }

  function meleeFoe(e, host) {
    var ents = (host && host.ents) || [];
    var best = null;
    var bd = MELEE;
    var i, o, d;
    for (i = 0; i < ents.length; i++) {
      o = ents[i];
      if (!validFocus(o)) continue;
      d = distOf(e, o, host);
      if (d <= bd) { bd = d; best = o; }
    }
    return best;
  }

  function meleeBlocker(e, focus, host) {
    var ents = (host && host.ents) || [];
    var best = null;
    var bd = MELEE;
    var i, o, d;
    for (i = 0; i < ents.length; i++) {
      o = ents[i];
      if (!validFocus(o) || o === focus) continue;
      d = distOf(e, o, host);
      if (d <= bd) { bd = d; best = o; }
    }
    return best;
  }

  function regroupGoal(e, leader) {
    var dx, dy, m, step;
    if (!leader) return null;
    dx = (e && e.x != null ? e.x : leader.x) - leader.x;
    dy = (e && e.y != null ? e.y : leader.y) - leader.y;
    m = Math.hypot(dx, dy);
    if (m < 0.05) { dx = -1; dy = 0; m = 1; }
    step = BESIDE;
    return { x: leader.x + (dx / m) * step, y: leader.y + (dy / m) * step };
  }

  function latchRegroup(host) {
    var ents = (host && host.ents) || [];
    var i, e, foe;
    regroupLatch = {};
    for (i = 0; i < ents.length; i++) {
      e = ents[i];
      if (!commands(e)) continue;
      if (!((e.atk > 0) || (e.ct > 0))) continue;
      foe = meleeFoe(e, host);
      if (!foe && e.aim && validFocus(e.aim) && distOf(e, e.aim, host) <= MELEE) foe = e.aim;
      if (foe) regroupLatch[e.id] = foe.id;
    }
  }

  function dropOrder() {
    orderName = null;
    focusId = null;
    regroupLatch = {};
    return null;
  }

  function issue(verb, host) {
    var foe = null;
    verb = String(verb || '').toLowerCase();
    if (!use()) return { ok: false, reason: 'off', order: null };
    if (!VERBS[verb]) return { ok: false, reason: 'bad-verb', order: orderName };
    if (orderName === verb) {
      dropOrder();
      return { ok: true, order: null, cleared: true, verb: verb };
    }
    if (verb === 'focus') {
      foe = pickFocus(host);
      if (!knownFoe(foe, host)) {
        return { ok: true, order: orderName, noop: true, verb: 'focus', foe: null, missing: true };
      }
      orderName = 'focus';
      focusId = foe.id;
      regroupLatch = {};
      tappedId = null;
      return { ok: true, order: 'focus', foe: foe, missing: false };
    }
    orderName = verb;
    focusId = null;
    if (verb === 'regroup') latchRegroup(host);
    else regroupLatch = {};
    return { ok: true, order: verb, foe: null, missing: false };
  }

  function decide(e, leader, host) {
    var foe, want, block, latchedId, latched, swinging, d;
    host = host || {};
    if (!use() || !orderName || !commands(e)) return { handled: false, order: orderName };
    if (orderName === 'hold') {
      return { handled: true, verb: 'hold', advance: false, defensive: true, order: 'hold' };
    }
    if (orderName === 'regroup') {
      latchedId = regroupLatch[e.id];
      if (latchedId != null) {
        latched = findById(host.ents, latchedId);
        swinging = (e.atk > 0) || ((e.ct || 0) > 0);
        if (validFocus(latched) && distOf(e, latched, host) <= MELEE && swinging) {
          return {
            handled: true, verb: 'regroup', advance: false, finishMelee: true,
            foe: latched, order: 'regroup'
          };
        }
        delete regroupLatch[e.id];
      }
      d = distOf(e, leader, host);
      if (leader && d <= ARRIVE) {
        return { handled: true, verb: 'regroup', advance: false, arrived: true, order: 'regroup' };
      }
      return {
        handled: true, verb: 'regroup', advance: true, form: false,
        goal: regroupGoal(e, leader), order: 'regroup'
      };
    }
    foe = findById(host.ents, focusId);
    if (!knownFoe(foe, host)) {
      dropOrder();
      return { handled: false, order: null };
    }
    block = meleeBlocker(e, foe, host);
    want = e && e.ranged ? (e.range || 1) * 0.7 : ((e && e.range) || 1);
    return {
      handled: true, verb: 'focus', advance: true, foe: foe, blocker: block,
      want: want, order: 'focus'
    };
  }

  function settle(host) {
    var ents, leader, any, allIn, i, e, foe;
    host = host || {};
    if (!use() || !orderName) return orderName;
    if (orderName === 'focus') {
      foe = findById(host.ents, focusId);
      if (!knownFoe(foe, host)) dropOrder();
      return orderName;
    }
    if (orderName === 'regroup') {
      ents = host.ents || [];
      leader = host.leader;
      any = false;
      allIn = true;
      for (i = 0; i < ents.length; i++) {
        e = ents[i];
        if (!commands(e)) continue;
        any = true;
        if (!leader || distOf(e, leader, host) > ARRIVE) allIn = false;
      }
      if (any && allIn) dropOrder();
    }
    return orderName;
  }

  function noteMoraleFlee(e) {
    if (!use() || !orderName || !e) return false;
    if (e.hero || e.ghost || e.dead || e.crushed) return false;
    if (e.team !== 'party') return false;
    if (!e.col || !e.col.key) return false;
    if (e.kind === 'gnome' || e.noz) return false;
    dropOrder();
    return true;
  }

  function clear() {
    tappedId = null;
    return dropOrder();
  }

  var api = {
    VERBS: VERBS,
    ARRIVE: ARRIVE,
    MELEE: MELEE,
    get FLAG() { return FLAG; },
    set FLAG(v) { FLAG = !!v; },
    use: use,
    order: order,
    commands: commands,
    validFocus: validFocus,
    noteTap: noteTap,
    pickFocus: pickFocus,
    issue: issue,
    decide: decide,
    settle: settle,
    noteMoraleFlee: noteMoraleFlee,
    clear: clear
  };

  root.PartyOrders = api;
  if (root.SystemsReady && typeof root.SystemsReady.declare === 'function') {
    root.SystemsReady.declare('PartyOrders', api);
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
