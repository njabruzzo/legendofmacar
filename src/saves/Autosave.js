/**
 * Quiet autosave policy for Legend of Macar.
 *
 * writeGameSave already stores a loadable play or camp book. This module
 * only decides when that write is safe. Dialogue, the title book, and the
 * death / win plates are refused: Continue would rebuild them wrong.
 *
 * A fresh descent writes immediately. Play writes again on a 90s cadence
 * and when the page hides or unloads, so a reload or a phone evicting the
 * tab loses at most a short stretch. Hide events are debounced; the slot
 * is about 66KB and must not be rewritten twice in one dismiss.
 */
(function (root) {
  'use strict';

  var PERIOD_SEC = 90;
  var HIDE_GAP_MS = 500;

  function livingHero(G) {
    var ents = (G && G.ents) || [];
    var i, e;
    for (i = 0; i < ents.length; i++) {
      e = ents[i];
      if (e && e.hero && !e.dead) return e;
    }
    return null;
  }

  /* Scene stored in the slot. Camp overlays must stay camp or Continue
     drops the player back into a finished descent. */
  function bookScene(G) {
    if (!G) return 'play';
    if (G.scene === 'camp') return 'camp';
    if (G.scene === 'pack' && G.packFrom && G.packFrom !== 'play') return 'camp';
    if (G.scene === 'craft' && G.craftFrom && G.craftFrom !== 'play') return 'camp';
    return 'play';
  }

  function descentReady(G) {
    return !!(G && G.lvl && livingHero(G));
  }

  /**
   * True when writeGameSave + loadSavedGame returns to play or camp.
   * Title, death, win, intro, and an open conversation are not in the slot.
   */
  function loadable(G) {
    if (!G) return false;
    var sc = G.scene;
    if (sc === 'title' || sc === 'title_menu' || sc === 'dead' || sc === 'win' || sc === 'intro') return false;
    if (sc === 'chapters' || sc === 'credits') return false;
    if (G.talk || G.mercyTalk) return false;
    if (sc === 'camp') return true;
    if (sc === 'pack') {
      if (G.packFrom && G.packFrom !== 'play') return true;
      return descentReady(G);
    }
    if (sc === 'craft') {
      if (G.craftFrom && G.craftFrom !== 'play') return true;
      return descentReady(G);
    }
    if (sc === 'trade' || sc === 'play') return descentReady(G);
    return false;
  }

  /**
   * reason: 'fresh' | 'hide' | 'tick'
   * nowSec/lastSec are the game clock (G.t). nowMs/lastMs collapse
   * visibilitychange + pagehide into one write.
   */
  function due(reason, nowSec, lastSec, nowMs, lastMs) {
    if (reason === 'fresh') return true;
    nowSec = +nowSec || 0;
    lastSec = lastSec == null ? -1e9 : +lastSec;
    nowMs = +nowMs || 0;
    lastMs = lastMs == null ? 0 : +lastMs;
    if (reason === 'hide') {
      if (!lastMs) return true;
      return (nowMs - lastMs) >= HIDE_GAP_MS;
    }
    return (nowSec - lastSec) >= PERIOD_SEC;
  }

  root.Autosave = {
    PERIOD_SEC: PERIOD_SEC,
    HIDE_GAP_MS: HIDE_GAP_MS,
    livingHero: livingHero,
    bookScene: bookScene,
    loadable: loadable,
    due: due
  };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
