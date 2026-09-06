/**
 * MAC-09 Batch F — authored Chapter I room interactions.
 *
 * resolveInteraction(actor, prop, action, host) validates, commits
 * inventory/world once, emits existing SFX/FX hooks, and invalidates
 * Navigation topology after terrain changes.
 *
 * Destruction goes through host.breakRock. Secrets go through
 * host.openSecret. No fire/terrain-tag sim. No generator redesign.
 *
 * Three optional Chapter I variants (existing rubble / crate / bones):
 *   weak_seam      — mine a weakened plug; the long corridor still works
 *   noisy_cache    — take now (bounded nearby alert) or SEARCH to quiet it
 *   guarded_alcove — visible clue before commit; taking wakes the watch
 *
 * Flag: Interaction.FLAG default ON.
 * Rollback: Interaction.FLAG=false or load with ?interact=0.
 */
(function (root) {
  'use strict';

  var FLAG = true;

  var WEAK_HP = 16;
  var ALERT_R = 6.5;

  /* South store (22–39,52–65) ↔ mid-south hall (54–69,44–55).
     Approaches leave a 2×2 rock plug at 46–47,53–54. Alternate
     route is the existing corridor (40,35)→(58,48). */
  var WEAK_APPROACH = [
    { x: 40, y: 53, w: 6, h: 3 },
    { x: 48, y: 53, w: 6, h: 3 }
  ];
  var WEAK_CELLS = [
    [46, 53], [47, 53],
    [46, 54], [47, 54]
  ];

  var ROOMS = {
    weak_seam: {
      id: 'weak_seam',
      disc: 'ch1.weak_seam',
      actions: { mine: 1, break: 1 },
      cells: WEAK_CELLS,
      label: 'Mine the weak seam'
    },
    noisy_cache: {
      id: 'noisy_cache',
      disc: 'ch1.noisy_cache',
      actions: { take: 1, search: 1 },
      labelTake: 'Take the cache (noisy)',
      labelSearch: 'Search the cache carefully'
    },
    guarded_alcove: {
      id: 'guarded_alcove',
      disc: 'ch1.guarded_alcove',
      actions: { take: 1, read: 1 },
      label: 'Take the watched crate',
      labelClue: 'Read the scratch'
    },
    alcove_clue: {
      id: 'alcove_clue',
      disc: 'ch1.guarded_alcove',
      actions: { read: 1 },
      label: 'Read the scratch'
    }
  };

  var PROTECTED_KINDS = {
    rubydoor: 1, dwarfface: 1, lift: 1, rubypillar: 1,
    secret_door: 1, rubywall: 1
  };

  function use() {
    if (!FLAG) return false;
    try {
      if (typeof location !== 'undefined' && location.search &&
          /(?:^|[?&])interact=0(?:&|$)/.test(location.search)) {
        return false;
      }
    } catch (err) { /* node / missing location */ }
    return true;
  }

  function variantOf(prop) {
    if (!prop || !prop.interact) return null;
    return ROOMS[prop.interact] || null;
  }

  function cellKey(i, j) {
    return String(i) + ',' + String(j);
  }

  function isWeakCell(i, j) {
    var n;
    for (n = 0; n < WEAK_CELLS.length; n++) {
      if (WEAK_CELLS[n][0] === i && WEAK_CELLS[n][1] === j) return true;
    }
    return false;
  }

  function fillRect(grid, x, y, w, h, t) {
    var j, i;
    if (!grid) return;
    for (j = y; j < y + h; j++) {
      if (!grid[j]) continue;
      for (i = x; i < x + w; i++) {
        if (grid[j][i] !== undefined) grid[j][i] = t;
      }
    }
  }

  function isProtectedKind(k) {
    return !!(k && PROTECTED_KINDS[k]);
  }

  function crushBlocked(L, i, j) {
    var crush = L && L.crush;
    var k, s;
    if (!crush) return false;
    for (k in crush) {
      if (!Object.prototype.hasOwnProperty.call(crush, k)) continue;
      s = crush[k];
      if (!s) continue;
      if (Math.hypot((i + 0.5) - s.x, (j + 0.5) - s.y) < 1.15) return true;
    }
    return false;
  }

  function secretBlocked(L, i, j) {
    var secrets = (L && L.secrets) || [];
    var n, sec, si, sj, w, h;
    for (n = 0; n < secrets.length; n++) {
      sec = secrets[n];
      if (!sec || sec.open) continue;
      si = sec.i != null ? sec.i : (sec.x | 0);
      sj = sec.j != null ? sec.j : (sec.y | 0);
      w = sec.w || 3;
      h = Math.max(1, sec.h || 1);
      if (i >= si && i < si + w && j >= sj && j < sj + h) return true;
    }
    return false;
  }

  /**
   * Progression-critical cells stay out of generic terrain effects.
   * Weak-seam plug cells are authored mineables and are not protected.
   */
  function isProtectedCell(L, i, j) {
    if (!L || i == null || j == null) return false;
    if (isWeakCell(i, j)) return false;
    if (L.n === 1 && i < 14) return true;
    if (crushBlocked(L, i, j)) return true;
    if (secretBlocked(L, i, j)) return true;
    if (L.n === 1) {
      if (Math.hypot(i + 0.5 - 36.5, j + 0.5 - 7.28) < 1.8) return true;
      if (Math.hypot(i + 0.5 - 43.2, j + 0.5 - 7.28) < 1.6) return true;
      if (Math.hypot(i + 0.5 - 36.5, j + 0.5 - 21.5) < 1.35) return true;
    }
    return false;
  }

  function isProtectedProp(prop) {
    if (!prop) return false;
    if (prop.pin || prop.cover) return true;
    return isProtectedKind(prop.k);
  }

  function discover(id, fact, loc, host) {
    var D = (host && host.Discovery) || root.Discovery;
    if (!D || typeof D.note !== 'function') return null;
    return D.note(id, fact, loc);
  }

  function emitFx(host, kind, x, y) {
    if (!host) return;
    if (typeof host.burst === 'function') {
      host.burst(x, y, kind === 'ore' ? '#d8b46a' : '#ffd27a', 12, 2.4);
    }
    if (typeof host.shake === 'function' && (kind === 'ore' || kind === 'wake')) {
      host.shake(kind === 'wake' ? 10 : 7);
    }
    if (typeof host.playSfx === 'function') host.playSfx(kind, x, y);
  }

  function markTaken(prop) {
    if (!prop) return;
    prop.taken = 1;
    prop.gone = 1;
  }

  function seamOpen(L) {
    var n, i, j, t;
    if (!L || !L.grid) return false;
    for (n = 0; n < WEAK_CELLS.length; n++) {
      i = WEAK_CELLS[n][0];
      j = WEAK_CELLS[n][1];
      t = L.grid[j] && L.grid[j][i];
      if (t === 1 || t === 2) return false;
    }
    return true;
  }

  function markSeamProps(G) {
    var props = (G && G.props) || [];
    var i, p;
    for (i = 0; i < props.length; i++) {
      p = props[i];
      if (p && p.interact === 'weak_seam') markTaken(p);
    }
  }

  function breakSeam(L, host) {
    var n, i, j, broke = 0;
    if (!L || !host || typeof host.breakRock !== 'function') return 0;
    for (n = 0; n < WEAK_CELLS.length; n++) {
      i = WEAK_CELLS[n][0];
      j = WEAK_CELLS[n][1];
      if (host.breakRock(L, i, j)) broke++;
    }
    if (broke && host.bumpTopology) host.bumpTopology('weak-seam');
    return broke;
  }

  function grantCache(host, quiet) {
    if (!host) return;
    if (typeof host.gain === 'function') {
      host.gain('ironstone', quiet ? 2 : 3);
      host.gain('barley', 1);
      if (!quiet) host.gain('hide', 1);
    }
    if (typeof host.gainCoin === 'function') host.gainCoin('cp', quiet ? 8 : 14);
    if (typeof host.learn === 'function') host.learn(quiet ? 'forage' : 'weapon', 2);
  }

  function grantAlcove(host) {
    if (!host) return;
    if (typeof host.gain === 'function') {
      host.gain('barley', 2);
      host.gain('timber', 2);
      host.gain('hide', 1);
    }
    if (typeof host.gainCoin === 'function') host.gainCoin('sp', 4);
    if (typeof host.learn === 'function') host.learn('forage', 2);
  }

  function alertNearby(host, x, y, r) {
    if (!host || typeof host.alertNearby !== 'function') return 0;
    return host.alertNearby(x, y, r == null ? ALERT_R : r) || 0;
  }

  function canQuiet(actor, action, host) {
    if (action === 'search') return true;
    if (host && typeof host.isSearching === 'function' && host.isSearching(actor)) return true;
    if (host && typeof host.hasTool === 'function' && host.hasTool(actor, 'search')) return true;
    return false;
  }

  /**
   * Validate, commit once, emit existing FX, invalidate nav after terrain.
   */
  function resolveInteraction(actor, prop, action, host) {
    host = host || {};
    if (!use()) return { ok: false, reason: 'flag-off' };
    if (!actor || actor.dead) return { ok: false, reason: 'no-actor' };
    if (!prop) return { ok: false, reason: 'no-prop' };
    if (prop.gone || prop.taken) return { ok: false, reason: 'spent' };
    if (isProtectedProp(prop) && action !== 'read') {
      return { ok: false, reason: 'protected' };
    }

    var spec = variantOf(prop);
    if (!spec || !spec.actions[action]) return { ok: false, reason: 'bad-action' };

    var L = host.lvl || host.L || (host.G && host.G.lvl);
    var G = host.G;
    var x = prop.x, y = prop.y;
    var quiet, broke, woke;

    if (spec.id === 'weak_seam' && (action === 'mine' || action === 'break')) {
      if (L && seamOpen(L)) {
        markTaken(prop);
        markSeamProps(G);
        discover(spec.disc, 'opened', { x: x, y: y }, host);
        return { ok: true, reason: 'already-open', committed: false };
      }
      broke = breakSeam(L, host);
      markTaken(prop);
      markSeamProps(G);
      discover(spec.disc, 'opened', { x: x, y: y }, host);
      emitFx(host, 'ore', x, y);
      if (typeof host.say === 'function') {
        host.say(broke ? 'The weak seam gives. A short cut opens in the rock.' : 'The seam is already dust.', '#d8c49a');
      }
      return { ok: true, reason: 'mined', committed: true, broke: broke, topology: true };
    }

    if (spec.id === 'noisy_cache' && (action === 'take' || action === 'search')) {
      quiet = canQuiet(actor, action, host);
      markTaken(prop);
      grantCache(host, quiet);
      discover(spec.disc, 'taken', { x: x, y: y }, host);
      discover(spec.disc, quiet ? 'quiet' : 'noisy', { x: x, y: y }, host);
      emitFx(host, quiet ? 'quiet' : 'noise', x, y);
      if (!quiet) alertNearby(host, x, y, ALERT_R);
      if (typeof host.say === 'function') {
        host.say(quiet
          ? 'Careful hands. The cache comes free without a clatter.'
          : 'The crate screams on the stone. Something nearby heard.',
          quiet ? '#cfe0ea' : '#ffb45c');
      }
      return { ok: true, reason: quiet ? 'quiet' : 'noisy', committed: true, quiet: quiet };
    }

    if ((spec.id === 'guarded_alcove' || spec.id === 'alcove_clue') && action === 'read') {
      discover(spec.disc, 'clue', { x: x, y: y }, host);
      if (prop.interact === 'alcove_clue') prop.read = 1;
      if (typeof host.say === 'function') {
        host.say('A scratch on the bone: the watch wakes if the grain is touched.', '#c9b895');
      }
      if (typeof host.hint === 'function') {
        host.hint('The crate is watched. Take it and the sleeper rises.', 4.2);
      }
      return { ok: true, reason: 'clue', committed: false };
    }

    if (spec.id === 'guarded_alcove' && action === 'take') {
      markTaken(prop);
      grantAlcove(host);
      discover(spec.disc, 'taken', { x: x, y: y }, host);
      woke = typeof host.wakeSleeper === 'function' ? host.wakeSleeper(x, y) : 0;
      alertNearby(host, x, y, ALERT_R);
      emitFx(host, 'wake', x, y);
      if (typeof host.say === 'function') {
        host.say(woke
          ? 'The crate scrapes. The watch on the grain opens its eyes.'
          : 'The crate comes free. The scratch was not a lie — something stirs.',
          '#ffb45c');
      }
      return { ok: true, reason: 'taken', committed: true, woke: woke };
    }

    if (spec.id === 'alcove_clue') return { ok: false, reason: 'bad-action' };

    /* Authored secret hook — host.openSecret only. Never generic terrain. */
    if (action === 'open' && prop.secret && host.openSecret) {
      host.openSecret(prop.secret);
      if (host.bumpTopology) host.bumpTopology('openSecret');
      markTaken(prop);
      return { ok: true, reason: 'secret', committed: true, topology: true };
    }

    return { ok: false, reason: 'unhandled' };
  }

  function afterBreakRock(L, i, j, host) {
    if (!use() || !isWeakCell(i, j)) return false;
    host = host || {};
    if (L && seamOpen(L)) {
      markSeamProps(host.G);
      discover('ch1.weak_seam', 'opened', { x: i + 0.5, y: j + 0.5 }, host);
      return true;
    }
    return false;
  }

  function findProp(G, interact) {
    var props = (G && G.props) || [];
    var i, p;
    for (i = 0; i < props.length; i++) {
      p = props[i];
      if (p && p.interact === interact && !p.gone && !p.taken) return p;
    }
    return null;
  }

  function hasInteract(G, interact) {
    var props = (G && G.props) || [];
    var i, p;
    for (i = 0; i < props.length; i++) {
      p = props[i];
      if (p && p.interact === interact) return p;
    }
    return null;
  }

  function pushProp(G, spec) {
    if (!G) return null;
    G.props = G.props || [];
    if (hasInteract(G, spec.interact)) return hasInteract(G, spec.interact);
    G.props.push(spec);
    return spec;
  }

  function carveApproaches(L) {
    var n, a;
    if (!L || !L.grid) return;
    for (n = 0; n < WEAK_APPROACH.length; n++) {
      a = WEAK_APPROACH[n];
      fillRect(L.grid, a.x, a.y, a.w, a.h, 0);
    }
    /* Plug stays rock — do not recarve mined cells closed. */
    for (n = 0; n < WEAK_CELLS.length; n++) {
      a = WEAK_CELLS[n];
      if (L.grid[a[1]] && L.grid[a[1]][a[0]] === undefined) continue;
      if (L.grid[a[1]][a[0]] !== 0) L.grid[a[1]][a[0]] = 1;
    }
  }

  function weakenPlug(L) {
    var n, i, j, k;
    if (!L) return;
    L.wallHP = L.wallHP || {};
    for (n = 0; n < WEAK_CELLS.length; n++) {
      i = WEAK_CELLS[n][0];
      j = WEAK_CELLS[n][1];
      if (!L.grid || !L.grid[j] || L.grid[j][i] !== 1) continue;
      k = cellKey(i, j);
      if (!L.wallHP[k] || L.wallHP[k].hp > WEAK_HP) {
        L.wallHP[k] = { hp: WEAK_HP, max: WEAK_HP };
      }
    }
  }

  function installChapterI(L, G, host) {
    host = host || {};
    if (!use() || !L || L.n !== 1) return { ok: false, reason: 'skip' };
    G = G || host.G || {};
    G.props = G.props || [];

    carveApproaches(L);
    weakenPlug(L);

    pushProp(G, {
      x: 45.35, y: 54.15, k: 'rubble', spr: 'rubble2', s: 0.72,
      seed: 1909, interact: 'weak_seam', room: 1
    });
    pushProp(G, {
      x: 45.85, y: 53.35, k: 'orepile', s: 0.88,
      seed: 1910, interact: 'weak_seam', room: 1
    });

    pushProp(G, {
      x: 26.45, y: 80.15, k: 'crate', s: 0.95,
      seed: 1911, interact: 'noisy_cache', room: 1
    });

    pushProp(G, {
      x: 11.05, y: 61.55, k: 'bones', s: 0.9,
      seed: 1912, interact: 'alcove_clue', room: 1
    });
    pushProp(G, {
      x: 7.45, y: 62.75, k: 'crate', s: 0.92,
      seed: 1913, interact: 'guarded_alcove', room: 1
    });

    var alcove = hasInteract(G, 'guarded_alcove');
    if (typeof host.spawnSleeper === 'function' && alcove && !alcove.taken && !alcove.gone) {
      host.spawnSleeper({ x: 9.15, y: 63.85, kind: 'rat' });
    }

    return { ok: true, cells: WEAK_CELLS.slice(), rooms: ['weak_seam', 'noisy_cache', 'guarded_alcove'] };
  }

  function nearest(actor, props, maxd) {
    var best = null, bd = maxd == null ? 1.35 : maxd;
    var i, p, d, spec;
    if (!actor || !props) return null;
    for (i = 0; i < props.length; i++) {
      p = props[i];
      if (!p || p.gone || p.taken || !p.interact) continue;
      spec = variantOf(p);
      if (!spec) continue;
      d = Math.hypot(actor.x - p.x, actor.y - p.y);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  function promptFor(prop, host) {
    var spec = variantOf(prop);
    if (!spec) return null;
    if (spec.id === 'noisy_cache') {
      if (canQuiet(null, 'take', host)) return { action: 'search', label: spec.labelSearch };
      return { action: 'take', label: spec.labelTake };
    }
    if (spec.id === 'alcove_clue') return { action: 'read', label: spec.label };
    if (spec.id === 'guarded_alcove') return { action: 'take', label: spec.label };
    if (spec.id === 'weak_seam') return { action: 'mine', label: spec.label };
    return null;
  }

  function tickHints(actor, G, host) {
    var props, i, p, d;
    if (!use() || !actor) return;
    host = host || {};
    props = (G && G.props) || [];
    for (i = 0; i < props.length; i++) {
      p = props[i];
      if (!p || p.gone || p.taken) continue;
      d = Math.hypot(actor.x - p.x, actor.y - p.y);
      if (p.interact === 'weak_seam' && d < 2.2 && !p.hinted) {
        p.hinted = 1;
        discover('ch1.weak_seam', 'seen', { x: p.x, y: p.y }, host);
        if (typeof host.say === 'function') {
          host.say('The rock here is cracked and pale — a weak seam. A pick would finish it.', '#c9b895');
        }
      }
      if (p.interact === 'noisy_cache' && d < 2.0 && !p.hinted) {
        p.hinted = 1;
        discover('ch1.noisy_cache', 'seen', { x: p.x, y: p.y }, host);
        if (typeof host.say === 'function') {
          host.say('A loose crate. Grab it and it will clatter — SEARCH it and it may not.', '#c9b895');
        }
      }
      if (p.interact === 'alcove_clue' && d < 2.15 && !p.hinted) {
        p.hinted = 1;
        discover('ch1.guarded_alcove', 'seen', { x: p.x, y: p.y }, host);
        if (typeof host.say === 'function') {
          host.say('Bones by a full crate. A scratch on them waits to be read.', '#c9b895');
        }
      }
    }
  }

  function mainRouteCells() {
    /* Spawn hall → ruby / lift. Never gated on the three optionals. */
    return { spawn: { x: 20.5, y: 22.0 }, lift: { x: 36.5, y: 21.5 }, ruby: { x: 36.5, y: 7.28 } };
  }

  var api = {
    WEAK_HP: WEAK_HP,
    ALERT_R: ALERT_R,
    WEAK_CELLS: WEAK_CELLS,
    WEAK_APPROACH: WEAK_APPROACH,
    ROOMS: ROOMS,
    get FLAG() { return FLAG; },
    set FLAG(v) { FLAG = !!v; },
    use: use,
    variantOf: variantOf,
    isWeakCell: isWeakCell,
    isProtectedCell: isProtectedCell,
    isProtectedProp: isProtectedProp,
    seamOpen: seamOpen,
    resolveInteraction: resolveInteraction,
    afterBreakRock: afterBreakRock,
    installChapterI: installChapterI,
    nearest: nearest,
    promptFor: promptFor,
    tickHints: tickHints,
    mainRouteCells: mainRouteCells
  };

  root.Interaction = api;
  if (root.SystemsReady && typeof root.SystemsReady.declare === 'function') {
    root.SystemsReady.declare('Interaction', api);
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
