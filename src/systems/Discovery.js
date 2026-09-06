/**
 * MAC-09 — compact discovery journal starter.
 *
 * Stable ids, idempotent notes, only facts actually discovered.
 * Unresolved encountered locations may show a map marker (not solutions).
 *
 * Flag: Discovery.FLAG default ON.
 * Rollback: Discovery.FLAG=false or load with ?discover=0.
 *
 * Save: optional GameSave v2 play.discoveries. Omitted when empty so
 * old readers stay valid.
 */
(function (root) {
  'use strict';

  var FLAG = true;
  var notes = Object.create(null);

  var RESOLVE_FACTS = { opened: 1, taken: 1 };

  function use() {
    if (!FLAG) return false;
    try {
      if (typeof location !== 'undefined' && location.search &&
          /(?:^|[?&])discover=0(?:&|$)/.test(location.search)) {
        return false;
      }
    } catch (err) { /* node / missing location */ }
    return true;
  }

  function validId(id) {
    return typeof id === 'string' && /^[a-z0-9]+(?:[._][a-z0-9]+)+$/.test(id);
  }

  function validFact(fact) {
    return typeof fact === 'string' && /^[a-z][a-z0-9_]*$/.test(fact) && fact.length <= 24;
  }

  function get(id) {
    return notes[id] || null;
  }

  function has(id, fact) {
    var row = notes[id];
    if (!row) return false;
    if (!fact) return true;
    return !!(row.facts && row.facts.indexOf(fact) >= 0);
  }

  function list() {
    var ids = Object.keys(notes);
    var out = [];
    var i;
    for (i = 0; i < ids.length; i++) out.push(cloneRow(notes[ids[i]]));
    return out;
  }

  function cloneRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      facts: (row.facts || []).slice(),
      x: row.x, y: row.y,
      resolved: !!row.resolved
    };
  }

  /**
   * Unresolved encountered locations — a marker, not a solution.
   * Requires a seen/clue fact and a stored position. Opened/taken drop it.
   */
  function markers() {
    if (!use()) return [];
    var ids = Object.keys(notes);
    var out = [];
    var i, row, facts, encountered;
    for (i = 0; i < ids.length; i++) {
      row = notes[ids[i]];
      if (!row || row.resolved || row.x == null || row.y == null) continue;
      facts = row.facts || [];
      encountered = facts.indexOf('seen') >= 0 || facts.indexOf('clue') >= 0;
      if (!encountered) continue;
      out.push({ id: row.id, x: row.x, y: row.y });
    }
    return out;
  }

  function serialize() {
    var rows = list();
    return rows.length ? rows : [];
  }

  function writeNote(id, fact, loc) {
    if (!validId(id) || !validFact(fact)) return null;
    var row = notes[id];
    if (!row) {
      row = { id: id, facts: [], x: null, y: null, resolved: false };
      notes[id] = row;
    }
    if (row.facts.indexOf(fact) < 0) row.facts.push(fact);
    if (loc && loc.x != null && row.x == null) {
      row.x = +loc.x;
      row.y = +loc.y;
    }
    if (RESOLVE_FACTS[fact]) row.resolved = true;
    return row;
  }

  /**
   * Record one discovered fact. No-op if the id/fact is already noted,
   * the flag is off, or the id/fact is malformed. Never invents facts.
   */
  function note(id, fact, loc) {
    if (!use()) return null;
    return writeNote(id, fact, loc);
  }

  function restore(rows) {
    reset();
    if (!rows || !rows.length) return [];
    var i, row, facts, f;
    for (i = 0; i < rows.length; i++) {
      row = rows[i];
      if (!row || !validId(row.id)) continue;
      facts = row.facts || [];
      for (f = 0; f < facts.length; f++) {
        writeNote(row.id, facts[f], { x: row.x, y: row.y });
      }
      if (row.resolved && notes[row.id]) notes[row.id].resolved = true;
    }
    return list();
  }

  function reset() {
    notes = Object.create(null);
  }

  var api = {
    get FLAG() { return FLAG; },
    set FLAG(v) { FLAG = !!v; },
    use: use,
    note: note,
    has: has,
    get: get,
    list: list,
    markers: markers,
    serialize: serialize,
    restore: restore,
    reset: reset,
    validId: validId
  };

  root.Discovery = api;
  if (root.SystemsReady && typeof root.SystemsReady.declare === 'function') {
    root.SystemsReady.declare('Discovery', api);
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
