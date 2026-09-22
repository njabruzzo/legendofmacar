/**
 * Party orders for Chapter I kin — Hold, Regroup, Focus.
 *
 * Not an RTS. One order for the whole commanded party. Issuing the
 * active order again clears it and the host returns to auto follow/fight.
 *
 * Commanded kin are the same up roster dwarves the follow/fight brain
 * already moves (Navigation.livingKin / kinCanAutoFight), including Book I
 * ghosts after Rouse. A null order does not intercept them: decide()
 * returns handled:false and ghost follow stays on the host path.
 * This module never assigns e.x / e.y and never clears e.ghost.
 *
 * Noz, gnomes, fleeTo, and downed kin are not commanded.
 *
 * Flag: PartyOrders.FLAG default ON.
 * Rollback: PartyOrders.FLAG=false or load with ?orders=0.
 *
 * Assumptions (no sage brief on disk):
 *   Hold stops advancement. It does not raise Macar's shield
 *   (AC +4, attack lock). A foe already in reach may still be struck.
 *   Regroup walks toward the existing partyForm slot and stays formed
 *   until the order is cleared. The host may path the Navigation pilot.
 *   Focus prefers a tapped foe, then Macar's current aim / marked dest.
 *   With neither, kin wait — they do not pick their own nearest.
 */
(function (root) {
  'use strict';

  var FLAG = true;
  var VERBS = { hold: 1, regroup: 1, focus: 1 };
  var orderName = null;
  var focusId = null;
  var tappedId = null;

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
    if (e.team !== 'party') return false;
    if (!e.col || !e.col.key) return false;
    if (isStoryLocked(e)) return false;
    return true;
  }

  function aliveFoe(e) {
    return !!(e && e.team === 'foe' && !e.dead && !e.npc);
  }

  function findById(ents, id) {
    var i;
    if (id == null || !ents) return null;
    for (i = 0; i < ents.length; i++) {
      if (ents[i] && ents[i].id === id) return ents[i];
    }
    return null;
  }

  function noteTap(foe) {
    if (aliveFoe(foe) && foe.id != null) tappedId = foe.id;
    return tappedId;
  }

  function pickFocus(host) {
    host = host || {};
    var ents = host.ents || [];
    var tapped = findById(ents, tappedId);
    var leader, marked;
    if (aliveFoe(tapped)) return tapped;
    leader = host.leader;
    if (leader && aliveFoe(leader.aim)) return leader.aim;
    if (leader && leader.dest && leader.dest.foe != null) {
      marked = findById(ents, leader.dest.foe);
      if (aliveFoe(marked)) return marked;
    }
    return null;
  }

  function formGoal(e, leader, host) {
    var idx = 1;
    var goal = null;
    if (!leader) return null;
    if (typeof host.formIndex === 'function') {
      try { idx = host.formIndex(e); } catch (err) { idx = 1; }
    }
    if (idx == null || idx < 1) idx = 1;
    if (typeof host.partyForm === 'function') {
      try { goal = host.partyForm(idx, leader); } catch (err2) { goal = null; }
    }
    if (!goal) goal = { x: leader.x, y: leader.y };
    return goal;
  }

  function issue(verb, host) {
    var foe = null;
    verb = String(verb || '').toLowerCase();
    if (!use()) return { ok: false, reason: 'off', order: null };
    if (!VERBS[verb]) return { ok: false, reason: 'bad-verb', order: orderName };
    if (orderName === verb) {
      orderName = null;
      focusId = null;
      return { ok: true, order: null, cleared: true, verb: verb };
    }
    orderName = verb;
    if (verb === 'focus') {
      foe = pickFocus(host);
      focusId = foe && foe.id != null ? foe.id : null;
      return { ok: true, order: 'focus', foe: foe, missing: !foe };
    }
    focusId = null;
    return { ok: true, order: verb, foe: null, missing: false };
  }

  function decide(e, leader, host) {
    var foe, want;
    host = host || {};
    if (!use() || !orderName || !commands(e)) return { handled: false, order: orderName };
    if (orderName === 'hold') {
      return { handled: true, verb: 'hold', advance: false, defensive: true, order: 'hold' };
    }
    if (orderName === 'regroup') {
      return {
        handled: true,
        verb: 'regroup',
        advance: true,
        form: true,
        goal: formGoal(e, leader, host),
        order: 'regroup'
      };
    }
    foe = pickFocus(host);
    focusId = foe && foe.id != null ? foe.id : focusId;
    if (!aliveFoe(foe)) {
      return { handled: true, verb: 'focus', advance: false, foe: null, wait: true, order: 'focus' };
    }
    want = e && e.ranged ? (e.range || 1) * 0.7 : ((e && e.range) || 1);
    return { handled: true, verb: 'focus', advance: true, foe: foe, want: want, order: 'focus' };
  }

  function clear() {
    orderName = null;
    focusId = null;
    tappedId = null;
    return null;
  }

  var api = {
    VERBS: VERBS,
    get FLAG() { return FLAG; },
    set FLAG(v) { FLAG = !!v; },
    use: use,
    order: order,
    commands: commands,
    noteTap: noteTap,
    pickFocus: pickFocus,
    issue: issue,
    decide: decide,
    clear: clear
  };

  root.PartyOrders = api;
  if (root.SystemsReady && typeof root.SystemsReady.declare === 'function') {
    root.SystemsReady.declare('PartyOrders', api);
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
