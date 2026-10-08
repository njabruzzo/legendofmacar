/**
 * Level-map format, loader, and validator.
 * Describes the ruby door, guardian spawn, lever, elevator, boss, and
 * set pieces for a floor. Not loaded by index.html.
 *
 * Live books may record a feature as procedural or absent, because that
 * is how the five chapters are built today.
 * Campaign books must name every feature. Coordinates may stay unbuilt.
 */
(function (root) {
  'use strict';

  var FORMAT = 'macar-level-map';
  var VERSION = 1;
  var FEATURES = ['rubyDoor', 'guardian', 'lever', 'elevator', 'boss', 'setPieces', 'exit'];

  function isNum(n) {
    return typeof n === 'number' && isFinite(n);
  }

  function load(data) {
    var book = data;
    if (typeof data === 'string') {
      try { book = JSON.parse(data); }
      catch (err) { return { ok: false, errors: ['invalid json'], book: null }; }
    }
    var errors = validate(book);
    return { ok: errors.length === 0, errors: errors, book: book };
  }

  function validate(book) {
    var errors = [];
    if (!book || book.format !== FORMAT || book.version !== VERSION) {
      errors.push('format must be ' + FORMAT + ' version ' + VERSION);
      return errors;
    }
    if (book.affectsPlay !== false) errors.push('affectsPlay must be false');
    if (book.book !== 'live-chapters' && book.book !== 'campaign-levels') {
      errors.push('book must be live-chapters or campaign-levels');
    }
    if (!Array.isArray(book.levels) || !book.levels.length) {
      errors.push('levels must be a non-empty array');
      return errors;
    }
    var seen = Object.create(null);
    for (var i = 0; i < book.levels.length; i++) {
      errors = errors.concat(validateLevel(book.levels[i], book.book));
      var id = book.levels[i] && book.levels[i].id;
      if (id && seen[id]) errors.push('duplicate id ' + id);
      if (id) seen[id] = 1;
    }
    return errors;
  }

  function validateLevel(level, bookKind) {
    var errors = [];
    var where = (level && level.id) || '(missing id)';
    if (!level || !level.id) {
      errors.push('level missing id');
      return errors;
    }
    for (var f = 0; f < FEATURES.length; f++) {
      if (!Object.prototype.hasOwnProperty.call(level, FEATURES[f])) {
        errors.push(where + ' missing ' + FEATURES[f]);
      }
    }
    if (errors.length) return errors;
    if (!Array.isArray(level.setPieces)) errors.push(where + ' setPieces must be an array');
    if (!level.exit || (level.exit.ref !== 'live' && level.exit.ref !== 'campaign')) {
      errors.push(where + ' exit.ref must be live or campaign');
    }
    if (bookKind === 'live-chapters') errors = errors.concat(validateLive(level));
    if (bookKind === 'campaign-levels') errors = errors.concat(validateCampaign(level));
    return errors;
  }

  function validatePoint(where, feature, node, allowNone) {
    var errors = [];
    if (!node || typeof node !== 'object') {
      errors.push(where + ' ' + feature + ' must be an object');
      return errors;
    }
    var placement = node.placement;
    if (placement === 'fixed') {
      if (!isNum(node.x) || !isNum(node.y)) errors.push(where + ' ' + feature + ' fixed point needs x and y');
    } else if (placement === 'procedural' || placement === 'unbuilt') {
      /* Coordinates are allowed to be null. The feature is still named. */
    } else if (placement === 'none' && allowNone) {
      /* Live chapters that do not have this feature. */
    } else {
      errors.push(where + ' ' + feature + ' placement is not valid');
    }
    return errors;
  }

  function validateLive(level) {
    var errors = [];
    var id = level.id;
    errors = errors.concat(validatePoint(id, 'rubyDoor', level.rubyDoor, false));
    errors = errors.concat(validatePoint(id, 'lever', level.lever, false));
    errors = errors.concat(validatePoint(id, 'elevator', level.elevator, true));
    var g = level.guardian;
    if (!g || (g.placement !== 'fixed' && g.placement !== 'none')) {
      errors.push(id + ' guardian placement must be fixed or none');
    } else if (g.placement === 'fixed') {
      if (!Array.isArray(g.spawns) || g.spawns.length !== g.count) {
        errors.push(id + ' guardian spawns must match count');
      }
    }
    if (level.boss != null) {
      if (!level.boss.key || !isNum(level.boss.x) || !isNum(level.boss.y)) {
        errors.push(id + ' boss needs a key and a fixed point');
      }
    }
    if (!level.exit || level.exit.ref !== 'live') errors.push(id + ' live exit.ref must be live');
    return errors;
  }

  function validateCampaign(level) {
    var errors = [];
    var id = level.id;
    if (!/^L([1-9]|10)$/.test(id)) errors.push(id + ' is not a campaign level id');
    ['rubyDoor', 'lever', 'elevator'].forEach(function (feature) {
      var node = level[feature];
      if (!node || (node.placement !== 'unbuilt' && node.placement !== 'fixed')) {
        errors.push(id + ' ' + feature + ' must be unbuilt or fixed');
      }
    });
    var g = level.guardian;
    if (!g || (g.placement !== 'unbuilt' && g.placement !== 'fixed')) {
      errors.push(id + ' guardian must be unbuilt or fixed');
    } else if (!(g.count >= 1) || !g.tier) {
      errors.push(id + ' guardian needs a tier and a count');
    }
    var elev = level.elevator;
    if (!elev || typeof elev.transitionCard !== 'string' || !elev.transitionCard) {
      errors.push(id + ' elevator needs a transition-card art key');
    } else if (elev.transitionCard.indexOf('..') >= 0) {
      errors.push(id + ' transition card must stay inside the repo');
    }
    if (!elev || elev.auto !== true) errors.push(id + ' elevator must be automatic');
    if (!elev || elev.standIn !== true) errors.push(id + ' transition card must be marked as a stand-in');
    if (level.boss && level.boss.status === 'tbd') errors.push(id + ' boss is not TBD');
    if (level.boss != null && !level.boss.key) errors.push(id + ' boss needs a key');
    if (level.boss && level.boss.bossFlagOnIndividual) errors.push(id + ' no single creature wears a boss flag');
    if (id === 'L1') {
      var b = level.boss;
      if (!b || b.key !== 'thinOne' || b.count !== 6 || b.sameAsGuardian !== true || b.firesWhen !== 'lastDies' || b.bossFlagOnIndividual !== false) {
        errors.push('L1 boss is the six Thin Ones together and fires when the last dies');
      }
      if (!g || g.key !== 'thinOne' || g.count !== 6) errors.push('L1 guardian is the same six Thin Ones');
    }
    if (!level.exit || level.exit.ref !== 'campaign') errors.push(id + ' campaign exit.ref must be campaign');
    return errors;
  }

  var api = {
    FORMAT: FORMAT,
    VERSION: VERSION,
    FEATURES: FEATURES,
    load: load,
    validate: validate,
    wired: false
  };

  root.LevelMap = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
