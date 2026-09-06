/**
 * MAC-05/06 — consume UI taps once.
 *
 * Portrait / menu / overlay hit targets must not also dispatch world
 * movement from resolveTaps. One tap → UI handler or dest, never both.
 *
 * Pointer type does not matter: touch and mouse both go through onDown
 * / onUp → IN.taps → resolveTaps. This helper is the shared consume step.
 *
 * Flag: TapGate.FLAG default ON.
 * Rollback: TapGate.FLAG=false or load with ?tapGate=0 (legacy fall-through).
 *
 * Does not implement party orders or Navigation A*. Host keeps fire/use
 * and menuHits for non-play scenes.
 */
(function (root) {
  'use strict';

  var FLAG = true;

  function use() {
    if (!FLAG) return false;
    try {
      if (typeof location !== 'undefined' && location.search &&
          /(?:^|[?&])tapGate=0(?:&|$)/.test(location.search)) {
        return false;
      }
    } catch (err) { /* node / missing location */ }
    return true;
  }

  function contains(h, x, y) {
    if (!h) return false;
    var w = h.w, ht = h.h;
    if (w == null || ht == null) return false;
    return x >= h.x && x <= h.x + w && y >= h.y && y <= h.y + ht;
  }

  function firstHit(hits, x, y) {
    if (!hits || !hits.length) return null;
    var i, h;
    for (i = 0; i < hits.length; i++) {
      h = hits[i];
      if (h && contains(h, x, y)) return h;
    }
    return null;
  }

  /**
   * One play-mode tap. Overlay hits consume; otherwise the caller may
   * set player dest. Never both. fn runs at most once per call.
   */
  function resolvePlayTap(hits, tap) {
    var x = tap && tap.x, y = tap && tap.y;
    var hit = firstHit(hits, x, y);
    if (hit) {
      tap.consumed = true;
      tap.world = false;
      tap.dispatches = (tap.dispatches || 0) + 1;
      if (typeof hit.fn === 'function') hit.fn(tap);
      return { consumed: true, world: false, hit: hit };
    }
    if (tap) {
      tap.consumed = false;
      tap.world = true;
      tap.dispatches = (tap.dispatches || 0) + 1;
    }
    return { consumed: false, world: true, hit: null };
  }

  var api = {
    get FLAG() { return FLAG; },
    set FLAG(v) { FLAG = !!v; },
    use: use,
    contains: contains,
    firstHit: firstHit,
    resolvePlayTap: resolvePlayTap
  };

  root.TapGate = api;
  if (root.SystemsReady && typeof root.SystemsReady.declare === 'function') {
    root.SystemsReady.declare('TapGate', api);
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
