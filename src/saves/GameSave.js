/**
 * Persist Legend of Macar campaign + mid-dungeon progress.
 *
 * Schema v2 (MAC-01) snapshots the mutable world that actually has writers:
 * chapter identity, campaign/party/inventory, roster HP, flags/secrets/loot,
 * world ents (stable sid + numeric EID), terrain grid, wallHP, explored cells,
 * props (gone/taken plus trap/fallen/backwall/scatter/interact identity),
 * objective done-bits, and kill count.
 *
 * MAC-03 haste: optional play.party[].effects + baseSp/baseCd when a timed
 * haste is active. MAC-09: optional play.discoveries when the journal has
 * facts. Navigation is still not invented here.
 *
 * Storage:
 *   legendofmacar.save.v2         live v2 slot
 *   legendofmacar.save.v2.pending atomic write scratch
 *   legendofmacar.save.v2.good    last-known-good v2
 *   legendofmacar.save.v1         legacy slot + compatible mirror (never deleted
 *                                 by migration; old builds keep reading v:1)
 *
 * Feature flag: GameSave.setWorldSchema(false) writes/reads v1 only.
 */
(function (root) {
  'use strict';

  var KEY_V1 = 'legendofmacar.save.v1';
  var KEY = 'legendofmacar.save.v2';
  var KEY_GOOD = 'legendofmacar.save.v2.good';
  var KEY_PENDING = 'legendofmacar.save.v2.pending';
  var VER = 2;
  var VER_LEGACY = 1;
  var worldSchemaOn = true;

  var ENT_COPY = [
    'kind','sprite','name','team','hp','maxhp','x','y','r','scale','sp','dmg','range','cd',
    'ranged','dead','corpse','looted','crushed','ghost','prone','hidden','boss','glow','aggro',
    'rubyDrop','nozCamp','shaman','webTalk','webTalkDone','webCorpse','tied','npc','ally',
    'sleeping','lootBlocked','drop','kit','hero','role','cls','race','fdx','fdy',
    'id','sid','treasure','tt','hd','interactSleeper'
  ];

  var PROP_COPY = [
    'x','y','k','s','spr','seed','gone','taken','pin','cover','webRock','label','n',
    'dress','plant','craft','lairDen','station','stone',
    'trap','fallen','backwall','scatter',
    'interact','room','hinted','read'
  ];

  var ENT_BOOL = {
    ranged:1, dead:1, corpse:1, looted:1, crushed:1, ghost:1, prone:1, hidden:1,
    boss:1, rubyDrop:1, nozCamp:1, shaman:1, webTalk:1, webTalkDone:1, webCorpse:1,
    tied:1, npc:1, ally:1, sleeping:1, lootBlocked:1, hero:1, interactSleeper:1
  };

  function clone(v) {
    if (v == null) return v;
    return JSON.parse(JSON.stringify(v));
  }

  function setWorldSchema(on) {
    worldSchemaOn = !!on;
    return worldSchemaOn;
  }

  function worldSchemaEnabled() {
    return worldSchemaOn;
  }

  function packRows(grid) {
    if (!grid || !grid.length) return null;
    var out = [];
    for (var j = 0; j < grid.length; j++) {
      var row = grid[j];
      if (!row) { out.push(''); continue; }
      var s = '';
      for (var i = 0; i < row.length; i++) s += String(row[i] | 0);
      out.push(s);
    }
    return out;
  }

  function unpackRows(rows) {
    if (!rows || !rows.length) return null;
    var out = [];
    for (var j = 0; j < rows.length; j++) {
      var s = rows[j] || '';
      var row = new Array(s.length);
      for (var i = 0; i < s.length; i++) row[i] = (s.charCodeAt(i) - 48) | 0;
      out.push(row);
    }
    return out;
  }

  function isRosterParty(e) {
    return !!(e && e.team === 'party' && e.col && e.col.key);
  }

  function findHero(G) {
    var ents = (G && G.ents) || [];
    var i, e, fallen = null;
    for (i = 0; i < ents.length; i++) {
      e = ents[i];
      if (e && e.hero && !e.dead) return e;
    }
    for (i = 0; i < ents.length; i++) {
      e = ents[i];
      if (e && e.hero) { fallen = e; break; }
    }
    return fallen;
  }

  function stableSid(e) {
    if (!e) return 'ent#0';
    if (e.sid) return e.sid;
    return String(e.kind || 'ent') + '#' + String(e.id != null ? e.id : 0);
  }

  function stampEnt(e, sv) {
    if (!e || !sv) return e;
    for (var i = 0; i < ENT_COPY.length; i++) {
      var k = ENT_COPY[i];
      if (sv[k] === undefined) continue;
      e[k] = ENT_BOOL[k] ? !!sv[k] : clone(sv[k]);
    }
    if (sv.id != null) e.id = sv.id;
    e.sid = sv.sid || stableSid(sv);
    if (e.maxhp == null && e.hp != null) e.maxhp = e.hp;
    return e;
  }

  function captureEnt(e) {
    var o = {};
    stampEnt(o, e);
    o.sid = stableSid(e);
    return o;
  }

  function captureProp(p) {
    var o = {};
    for (var i = 0; i < PROP_COPY.length; i++) {
      var k = PROP_COPY[i];
      if (p && p[k] !== undefined) o[k] = clone(p[k]);
    }
    return o;
  }

  function captureLoot(z) {
    return {
      id: z.id,
      x: z.x, y: z.y, r: z.r || 0.38,
      kind: z.kind, coins: clone(z.coins || {}), gems: z.gems || 0, jew: z.jew || 0,
      potions: clone(z.potions || []), items: clone(z.items || []),
      res: z.res ? clone(z.res) : null,
      label: z.label, glow: z.glow,
      _corpse: z._corpse
    };
  }

  function captureParty(e) {
    var row = {
      key: e.col.key,
      id: e.id,
      sid: stableSid(e),
      hp: e.hp, maxhp: e.maxhp,
      dead: !!e.dead, ghost: !!e.ghost, crushed: !!e.crushed,
      x: e.x, y: e.y, looted: !!e.looted
    };
    if (root.TimedEffects && root.TimedEffects.serialize) {
      var fx = root.TimedEffects.serialize(e);
      if (fx && fx.length) {
        row.effects = fx;
        if (e.baseSp != null) row.baseSp = e.baseSp;
        if (e.baseCd != null) row.baseCd = e.baseCd;
      }
    }
    return row;
  }

  function captureWorld(G, extra) {
    G = G || {};
    extra = extra || {};
    var L = G.lvl;
    var p = findHero(G);
    if (!L || !p) return null;
    var nextEid = extra.nextEid;
    if (nextEid == null && typeof G.nextEid === 'number') nextEid = G.nextEid;
    var world = {
      x: p.x, y: p.y, hp: p.hp, maxhp: p.maxhp,
      flags: clone(L.flags || {}),
      secrets: (L.secrets || []).map(function (s) {
        return { i: s.i, j: s.j, kind: s.kind, open: !!s.open, hinted: !!s.hinted };
      }),
      loot: (G.loot || []).filter(function (z) { return z && !z.gone; }).map(captureLoot),
      warrenSeed: L.warrenSeed || 0,
      dressSeed: L.dressSeed || 0,
      kingLevel: !!(L.flags && L.flags.kingLevel),
      party: (G.ents || []).filter(isRosterParty).map(captureParty),
      ents: (G.ents || []).filter(function (e) { return e && !isRosterParty(e); }).map(captureEnt),
      props: (G.props || []).map(captureProp),
      grid: packRows(L.grid),
      seen: packRows(L.seen),
      wallHP: clone(L.wallHP || {}),
      objs: (L.objs || []).map(function (o) { return { t: o.t, d: !!o.d }; }),
      kills: G.kills || 0,
      nextEid: nextEid != null ? nextEid : null,
      w: L.w, h: L.h, n: L.n
    };
    if (root.Discovery && root.Discovery.serialize) {
      var disc = root.Discovery.serialize();
      if (disc && disc.length) world.discoveries = disc;
    }
    return world;
  }

  function rowsMatchLevel(rows, L) {
    if (!rows || !L || !L.w || !L.h) return false;
    if (rows.length !== L.h) return false;
    return (rows[0] || '').length === L.w;
  }

  function applyWorld(G, play, hooks) {
    if (!G || !play) return false;
    var L = G.lvl;
    hooks = hooks || {};
    var applied = { grid: false, seen: false, wallHP: false, props: false, ents: false, loot: false, party: false };

    if (L && play.grid && rowsMatchLevel(play.grid, L)) {
      var grid = unpackRows(play.grid);
      if (grid) { L.grid = grid; applied.grid = true; }
    }
    if (L && play.seen && rowsMatchLevel(play.seen, L)) {
      var seen = unpackRows(play.seen);
      if (seen) { L.seen = seen; applied.seen = true; }
    }
    if (L && play.wallHP && typeof play.wallHP === 'object') {
      L.wallHP = clone(play.wallHP);
      applied.wallHP = true;
    }
    if (play.props) {
      G.props = clone(play.props);
      applied.props = true;
    }
    if (L && play.objs && L.objs) {
      for (var oi = 0; oi < play.objs.length && oi < L.objs.length; oi++) {
        if (play.objs[oi]) L.objs[oi].d = !!play.objs[oi].d;
      }
    }
    if (play.kills != null) G.kills = play.kills | 0;

    if (play.ents) {
      var keep = (G.ents || []).filter(isRosterParty);
      var world = [];
      for (var ei = 0; ei < play.ents.length; ei++) {
        var sv = play.ents[ei];
        var e = hooks.remakeEnt ? hooks.remakeEnt(sv) : stampEnt({}, sv);
        if (e) world.push(e);
      }
      G.ents = keep.concat(world);
      applied.ents = true;
    }

    if (play.loot) {
      G.loot = play.loot.map(function (z) {
        return {
          id: z.id, x: z.x, y: z.y, r: z.r || 0.38, gone: 0,
          kind: z.kind || 'pile',
          coins: clone(z.coins || {}), gems: z.gems || 0, jew: z.jew || 0,
          potions: clone(z.potions || []), items: clone(z.items || []),
          res: z.res ? clone(z.res) : null,
          label: z.label, glow: z.glow,
          _corpse: z._corpse
        };
      });
      applied.loot = true;
    }

    if (play.party) {
      (play.party || []).forEach(function (sv) {
        var pe = (G.ents || []).find(function (z) { return z.col && z.col.key === sv.key; });
        if (!pe) return;
        pe.x = sv.x; pe.y = sv.y;
        pe.hp = sv.hp; pe.maxhp = sv.maxhp || pe.maxhp;
        pe.dead = !!sv.dead; pe.ghost = !!sv.ghost; pe.crushed = !!sv.crushed;
        if (sv.looted != null) pe.looted = !!sv.looted;
        if (sv.id != null) pe.id = sv.id;
        if (sv.sid) pe.sid = sv.sid;
        if (pe.crushed) { pe.prone = 1; pe.corpse = 1; pe.moving = 0; pe.hidden = 0; }
        if (sv.baseSp != null) pe.baseSp = sv.baseSp;
        if (sv.baseCd != null) pe.baseCd = sv.baseCd;
        if (sv.effects && root.TimedEffects && root.TimedEffects.restore) {
          root.TimedEffects.restore(pe, sv.effects);
        }
      });
      applied.party = true;
    }
    if (play.discoveries && root.Discovery && root.Discovery.restore) {
      root.Discovery.restore(play.discoveries);
      applied.discoveries = true;
    }
    return applied;
  }

  function maxSavedId(play) {
    var mx = 0;
    function consider(id) {
      if (id != null && id > mx) mx = id;
    }
    if (!play) return 0;
    (play.ents || []).forEach(function (e) { consider(e && e.id); });
    (play.party || []).forEach(function (e) { consider(e && e.id); });
    (play.loot || []).forEach(function (z) { consider(z && z.id); consider(z && z._corpse); });
    if (play.nextEid != null) consider((play.nextEid | 0) - 1);
    return mx;
  }

  function normalizePlay(play) {
    if (!play || typeof play !== 'object') return play;
    play = clone(play);
    if (!play.flags || typeof play.flags !== 'object') play.flags = {};
    if (!Array.isArray(play.secrets)) play.secrets = [];
    if (!Array.isArray(play.loot)) play.loot = [];
    if (!Array.isArray(play.party)) play.party = [];
    return play;
  }

  function stripWorld(play) {
    if (!play || typeof play !== 'object') return play;
    return {
      x: play.x, y: play.y, hp: play.hp, maxhp: play.maxhp,
      flags: clone(play.flags || {}),
      secrets: clone(play.secrets || []),
      loot: (play.loot || []).map(function (z) {
        return {
          x: z.x, y: z.y, kind: z.kind, coins: z.coins, gems: z.gems, jew: z.jew,
          potions: z.potions, items: z.items, label: z.label, glow: z.glow
        };
      }),
      warrenSeed: play.warrenSeed || 0,
      dressSeed: play.dressSeed || 0,
      kingLevel: !!play.kingLevel,
      party: clone(play.party || [])
    };
  }

  function validatePlay(play) {
    if (play == null) return true;
    if (typeof play !== 'object') return false;
    if (play.ents && !Array.isArray(play.ents)) return false;
    if (play.props && !Array.isArray(play.props)) return false;
    if (play.loot && !Array.isArray(play.loot)) return false;
    if (play.party && !Array.isArray(play.party)) return false;
    if (play.grid && !Array.isArray(play.grid)) return false;
    if (play.seen && !Array.isArray(play.seen)) return false;
    if (play.wallHP && typeof play.wallHP !== 'object') return false;
    if (play.flags && typeof play.flags !== 'object') return false;
    if (play.discoveries && !Array.isArray(play.discoveries)) return false;
    return true;
  }

  function validateSnap(snap) {
    if (!snap || typeof snap !== 'object') return false;
    var v = snap.v;
    if (v !== VER && v !== VER_LEGACY) return false;
    if (snap.ch != null && typeof snap.ch !== 'number') return false;
    if (snap.play != null && !validatePlay(snap.play)) return false;
    return true;
  }

  function migrate(snap) {
    if (!snap || typeof snap !== 'object') return null;
    snap = clone(snap);
    var ver = snap.schemaVersion || snap.v || VER_LEGACY;
    if (ver >= VER) {
      snap.v = VER;
      snap.schemaVersion = VER;
      if (snap.play) snap.play = normalizePlay(snap.play);
      return validateSnap(snap) ? snap : null;
    }
    snap.v = VER;
    snap.schemaVersion = VER;
    snap.migratedFrom = VER_LEGACY;
    if (snap.play) snap.play = normalizePlay(snap.play);
    return validateSnap(snap) ? snap : null;
  }

  function toLegacy(snap) {
    if (!snap) return null;
    var out = {
      v: VER_LEGACY,
      at: snap.at,
      scene: snap.scene,
      ch: snap.ch || 1,
      unlocked: snap.unlocked || 1,
      cleared: clone(snap.cleared || {}),
      coin: clone(snap.coin || {}),
      res: clone(snap.res || {}),
      packs: clone(snap.packs || {}),
      equipped: clone(snap.equipped || {}),
      charXp: clone(snap.charXp || {}),
      abil: clone(snap.abil || {}),
      ghostAllies: clone(snap.ghostAllies || {}),
      borrowed: clone(snap.borrowed || []),
      taught: clone(snap.taught || {}),
      day: snap.day || 1,
      dayClock: snap.dayClock || 0,
      pordoomGiftDay: snap.pordoomGiftDay || 0,
      macarGearReady: snap.macarGearReady || 0,
      gnomeGift: !!snap.gnomeGift,
      xp: clone(snap.xp || {}),
      skillSnap: clone(snap.skillSnap || {}),
      gear: clone(snap.gear || {}),
      bombs: snap.bombs || 0,
      ales: snap.ales || 0,
      play: snap.play ? stripWorld(snap.play) : null
    };
    return out;
  }

  function snapshot(G, extra) {
    G = G || {};
    extra = extra || {};
    var scene = extra.scene || G.scene || 'play';
    if (scene === 'intro' || scene === 'pause') scene = 'play';
    var play = extra.play || null;
    if (play) play = worldSchemaOn ? normalizePlay(play) : stripWorld(play);
    return {
      v: worldSchemaOn ? VER : VER_LEGACY,
      schemaVersion: worldSchemaOn ? VER : VER_LEGACY,
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
      play: play
    };
  }

  function applyCampaign(G, snap) {
    if (!G || !snap) return null;
    G.ch = snap.ch || 1;
    G.unlocked = snap.unlocked || 1;
    G.cleared = clone(snap.cleared || {});
    G.coin = clone(snap.coin || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 });
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

  function parseSlot(raw) {
    if (!raw) return null;
    try {
      var snap = JSON.parse(raw);
      if (!validateSnap(snap)) return null;
      return snap;
    } catch (e) {
      return null;
    }
  }

  function writeSlot(store, key, json) {
    store.setItem(key, json);
    var back = store.getItem(key);
    if (back == null) return null;
    return parseSlot(back);
  }

  function writeLegacy(store, snap) {
    if (!store || !snap) return false;
    try {
      var json = JSON.stringify(snap);
      var check = JSON.parse(json);
      if (!validateSnap(check)) return false;
      store.setItem(KEY_V1, json);
      return true;
    } catch (e) {
      return false;
    }
  }

  function write(store, snap) {
    if (!store || !snap) return false;
    if (!worldSchemaOn) return writeLegacy(store, toLegacy(snap));

    var normalized = migrate(snap);
    if (!normalized) return false;
    var json;
    try { json = JSON.stringify(normalized); }
    catch (e) { return false; }
    var round;
    try { round = JSON.parse(json); }
    catch (e) { return false; }
    if (!validateSnap(round)) return false;

    var pending;
    try { pending = writeSlot(store, KEY_PENDING, json); }
    catch (e) { return false; }
    if (!pending) {
      try { store.removeItem(KEY_PENDING); } catch (e2) {}
      return false;
    }

    var live;
    try { live = writeSlot(store, KEY, json); }
    catch (e) { return false; }
    if (!live) return false;

    try { store.setItem(KEY_GOOD, json); }
    catch (e) { /* live is committed; good is a spare */ }

    try { store.setItem(KEY_V1, JSON.stringify(toLegacy(live))); }
    catch (e) { /* never delete v1 if the mirror cannot be refreshed */ }

    try { store.removeItem(KEY_PENDING); } catch (e) {}
    return true;
  }

  function readRaw(store, key) {
    if (!store) return null;
    try { return store.getItem(key); } catch (e) { return null; }
  }

  function read(store) {
    if (!store) return null;
    if (!worldSchemaOn) {
      var legacyOnly = parseSlot(readRaw(store, KEY_V1));
      return legacyOnly && legacyOnly.v === VER_LEGACY ? legacyOnly : null;
    }
    var live = parseSlot(readRaw(store, KEY));
    if (live) return migrate(live);
    var pending = parseSlot(readRaw(store, KEY_PENDING));
    if (pending) return migrate(pending);
    var good = parseSlot(readRaw(store, KEY_GOOD));
    if (good) return migrate(good);
    var legacy = parseSlot(readRaw(store, KEY_V1));
    if (legacy) return migrate(legacy);
    return null;
  }

  function has(store) {
    return !!read(store);
  }

  function clear(store) {
    if (!store) return;
    try { store.removeItem(KEY); } catch (e) {}
    try { store.removeItem(KEY_GOOD); } catch (e) {}
    try { store.removeItem(KEY_PENDING); } catch (e) {}
    try { store.removeItem(KEY_V1); } catch (e) {}
  }

  function chapterName(ch) {
    var names = { 1: 'The Rubble', 2: 'The First Floor', 3: 'The Ruin', 4: 'The Dead City', 5: 'The Holy Sacrifice' };
    return names[ch] || ('Chapter ' + ch);
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
    KEY_V1: KEY_V1,
    KEY_GOOD: KEY_GOOD,
    KEY_PENDING: KEY_PENDING,
    VER: VER,
    VER_LEGACY: VER_LEGACY,
    clone: clone,
    snapshot: snapshot,
    applyCampaign: applyCampaign,
    write: write,
    read: read,
    has: has,
    clear: clear,
    chapterName: chapterName,
    label: label,
    setWorldSchema: setWorldSchema,
    worldSchemaEnabled: worldSchemaEnabled,
    captureWorld: captureWorld,
    applyWorld: applyWorld,
    stampEnt: stampEnt,
    migrate: migrate,
    validateSnap: validateSnap,
    toLegacy: toLegacy,
    packRows: packRows,
    unpackRows: unpackRows,
    isRosterParty: isRosterParty,
    maxSavedId: maxSavedId,
    stripWorld: stripWorld
  };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
