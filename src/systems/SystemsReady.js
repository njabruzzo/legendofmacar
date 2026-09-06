/**
 * MAC-05/06 — systems module readiness.
 *
 * Host load path (do not replace with type="module"):
 *   <script src="src/systems/SystemsReady.js"></script>
 *   <script src="src/combat/TimedEffects.js"></script>
 *   <script src="src/ui/TapGate.js"></script>
 *   <!-- future Batch D: Navigation.js / PartyOrders.js — same sync tags -->
 *   <script> /* play loop * /
 *
 * Classic tags block HTML parse, so declare() runs before loop() is defined.
 * That is the proven first-frame path. This file is not a bundler.
 *
 * If a future file cannot use a sync tag, call loadScript(src, name) and
 * the host already holds update() / tryEnterPlay via systemsHold() until
 * pending === 0. Do not add type="module" (deferred; races the first frame).
 *
 * Required now: TimedEffects (MAC-03, already shipped).
 * Upcoming (optional until Batch D): Navigation, PartyOrders.
 */
(function (root) {
  'use strict';

  var declared = Object.create(null);
  var pending = 0;
  var REQUIRED = ['TimedEffects'];
  var UPCOMING = ['Navigation', 'PartyOrders'];

  function declare(name, api) {
    if (!name) return null;
    declared[name] = api == null ? true : api;
    return declared[name];
  }

  function get(name) {
    return declared[name] || null;
  }

  function has(name) {
    return !!declared[name];
  }

  function names() {
    return Object.keys(declared);
  }

  function pendingCount() {
    return pending;
  }

  function markPending() {
    pending++;
    return pending;
  }

  function markSettled() {
    pending = Math.max(0, pending - 1);
    return pending;
  }

  function playReady() {
    var i;
    for (i = 0; i < REQUIRED.length; i++) {
      if (!declared[REQUIRED[i]]) return false;
    }
    return pending === 0;
  }

  function systemsHold() {
    return !playReady();
  }

  /**
   * Explicit awaited loader. Prefer a sync <script src> tag instead.
   * async=false preserves order if a late insert is unavoidable.
   */
  function loadScript(src, name) {
    markPending();
    function finish(ok) {
      markSettled();
      return ok;
    }
    if (typeof document === 'undefined' || !document.createElement) {
      try {
        if (typeof require === 'function' && src) require(src);
        return Promise.resolve(finish(name ? has(name) : true));
      } catch (err) {
        return Promise.resolve(finish(false));
      }
    }
    return new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = function () { resolve(finish(true)); };
      s.onerror = function () { resolve(finish(false)); };
      (document.head || document.documentElement).appendChild(s);
    });
  }

  function reset() {
    declared = Object.create(null);
    pending = 0;
  }

  root.SystemsReady = {
    REQUIRED: REQUIRED,
    UPCOMING: UPCOMING,
    declare: declare,
    get: get,
    has: has,
    names: names,
    pendingCount: pendingCount,
    markPending: markPending,
    markSettled: markSettled,
    playReady: playReady,
    systemsHold: systemsHold,
    loadScript: loadScript,
    reset: reset
  };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
