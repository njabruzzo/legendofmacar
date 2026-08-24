/**
 * Persist Legend of Macar campaign + mid-dungeon progress.
 * One slot in localStorage. The host game supplies G and play extras.
 */
(function (root) {
  'use strict';

  var KEY = 'legendofmacar.save.v1';
  var VER = 1;

  function clone(v) {
    if (v == null) return v;
    return JSON.parse(JSON.stringify(v));
  }

  function snapshot(G, extra) {
    G = G || {};
    extra = extra || {};
    var scene = extra.scene || G.scene || 'play';
    if (scene === 'intro' || scene === 'pause') scene = 'play';
    return {
      v: VER,
      at: Date.now(),
      scene: scene,
      ch: G.ch || 1,
      unlocked: G.unlocked || 1,
      cleared: clone(G.cleared || {}),
      coin: clone(G.coin || {}),
      res: clone(G.res || {}),
      packs: clone(G.packs || {}),
      equipped: clone(G.equipped || {}),
      charXp: clone(G.charXp || {}),
      abil: clone(G.abil || {}),
      ghostAllies: clone(G.ghostAllies || {}),
      borrowed: clone(G.borrowed || []),
      taught: clone(G.taught || {}),
      day: G.day || 1,
      dayClock: G.dayClock || 0,
      pordoomGiftDay: G.pordoomGiftDay || 0,
      macarGearReady: G.macarGearReady || 0,
      gnomeGift: !!G.gnomeGift,
      xp: clone(G.xp || {}),
      skillSnap: clone(G.skillSnap || {}),
      gear: clone(G.gear || {}),
      bombs: G.bombs || 0,
      ales: G.ales || 0,
      play: extra.play || null
    };
  }

  function applyCampaign(G, snap) {
    if (!G || !snap) return null;
    G.ch = snap.ch || 1;
    G.unlocked = snap.unlocked || 1;
    G.cleared = clone(snap.cleared || {});
    G.coin = clone(snap.coin || {cp:0,sp:0,ep:0,gp:0,pp:0});
    G.res = clone(snap.res || {});
    G.packs = clone(snap.packs || {});
    G.equipped = clone(snap.equipped || {});
    G.charXp = clone(snap.charXp || {});
    G.abil = clone(snap.abil || {});
    G.ghostAllies = clone(snap.ghostAllies || {});
    G.borrowed = clone(snap.borrowed || []);
    G.taught = clone(snap.taught || {});
    G.day = snap.day || 1;
    G.dayClock = snap.dayClock || 0;
    G.pordoomGiftDay = snap.pordoomGiftDay || 0;
    G.macarGearReady = snap.macarGearReady || 0;
    G.gnomeGift = !!snap.gnomeGift;
    if (snap.xp) G.xp = clone(snap.xp);
    if (snap.skillSnap) G.skillSnap = clone(snap.skillSnap);
    if (snap.gear) G.gear = clone(snap.gear);
    if (snap.bombs != null) G.bombs = snap.bombs;
    if (snap.ales != null) G.ales = snap.ales;
    return snap;
  }

  function write(store, snap) {
    if (!store || !snap) return false;
    store.setItem(KEY, JSON.stringify(snap));
    return true;
  }

  function read(store) {
    if (!store) return null;
    try {
      var raw = store.getItem(KEY);
      if (!raw) return null;
      var snap = JSON.parse(raw);
      if (!snap || snap.v !== VER) return null;
      return snap;
    } catch (e) {
      return null;
    }
  }

  function has(store) {
    return !!read(store);
  }

  function clear(store) {
    if (store) store.removeItem(KEY);
  }

  function chapterName(ch) {
    var names = {1:'The Rubble',2:'The First Floor',3:'The Ruin',4:'The Dead City',5:'The Holy Sacrifice'};
    return names[ch] || ('Chapter '+ch);
  }

  function label(snap) {
    if (!snap) return 'No save';
    var where = snap.scene === 'camp' ? 'Camp after ' : '';
    var title = chapterName(snap.ch || 1);
    var when = snap.at ? new Date(snap.at).toLocaleString() : '';
    return (where + title + (when ? '  ·  ' + when : '')).replace(/\s+/g, ' ').trim();
  }

  root.GameSave = {
    KEY: KEY,
    VER: VER,
    clone: clone,
    snapshot: snapshot,
    applyCampaign: applyCampaign,
    write: write,
    read: read,
    has: has,
    clear: clear,
    chapterName: chapterName,
    label: label
  };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
