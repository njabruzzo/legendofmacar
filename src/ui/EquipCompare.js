/**
 * Batch G — equipment compare panel.
 *
 * Inspects a candidate item against the selected character's worn kit.
 * Preview is read-only: clone + EquipmentSlots.equip on the clone via
 * DerivedStats.previewEquip. It does not consume the item, mutate live
 * stats, or tick TimedEffects.
 *
 * Shows only supported effects: hit/damage implications, protection,
 * movement, cooldown, requirements, relevant resistances. Kit (base
 * equipment) is listed separately from TimedEffects haste.
 *
 * Does not invent a power score.
 *
 * Flag: EquipCompare.FLAG default ON.
 * Rollback: EquipCompare.FLAG=false or load with ?equipCompare=0
 * (legacy tap-to-don, no panel).
 *
 * Touch: hits() is meant for TapGate overlayHits — consume-once, no dest.
 */
(function (root) {
  'use strict';

  var FLAG = true;

  function use() {
    if (!FLAG) return false;
    try {
      if (typeof location !== 'undefined' && location.search &&
          /(?:^|[?&])equipCompare=0(?:&|$)/.test(location.search)) {
        return false;
      }
    } catch (err) { /* node / missing location */ }
    return true;
  }

  function DS() {
    return root.DerivedStats || null;
  }

  function ES() {
    return root.EquipmentSlots || null;
  }

  function itemSlotOf(it) {
    var slots = ES();
    if (slots && slots.itemSlot) return slots.itemSlot(it);
    return it && it.slot || null;
  }

  function slotLabel(slot) {
    var slots = ES();
    if (slots && slots.slotDef) {
      var def = slots.slotDef(slot);
      return (def && (def.label || def.short)) || slot;
    }
    return slot || '';
  }

  function occupant(eq, slot) {
    if (!eq || !slot) return null;
    return eq[slot] || (slot === 'primary' ? eq.weapon : null) ||
      (slot === 'chest' ? eq.armor : null) || null;
  }

  function fmtSigned(n) {
    n = +n || 0;
    if (n > 0) return '+' + n;
    return String(n);
  }

  function fmtMul(n) {
    n = +n || 1;
    if (Math.abs(n - 1) < 1e-9) return '1×';
    return (Math.round(n * 100) / 100) + '×';
  }

  function fmtCd(n) {
    n = +n || 0;
    return (Math.round(n * 100) / 100).toFixed(2) + 's';
  }

  function fmtHit(snap) {
    var bits = [fmtSigned(snap.hitPlus)];
    if (snap.strHit) bits.push('STR ' + fmtSigned(snap.strHit));
    return bits.join(' · ');
  }

  function fmtDmg(snap) {
    var d = snap.dice || '1d8';
    if (snap.strDmg) d += (snap.strDmg > 0 ? '+' : '') + snap.strDmg;
    return d;
  }

  function fmtProt(snap) {
    var s = 'AC ' + snap.ac;
    if (snap.acMissile != null && snap.acMissile !== snap.ac) s += ' / ' + snap.acMissile + ' vs missiles';
    return s;
  }

  function resistKey(row) {
    return row.k + '|' + row.label;
  }

  /**
   * Read-only inspect. Mutates neither actor, equipped, item, nor timers.
   */
  function inspect(actor, equipped, item, opts) {
    opts = opts || {};
    var derived = DS();
    var slots = ES();
    var current = derived && derived.compute
      ? derived.compute(actor, equipped, opts)
      : null;
    var out = {
      ok: false,
      reason: null,
      reasonText: '',
      slot: null,
      slotLabel: '',
      item: item || null,
      worn: null,
      current: current,
      preview: null,
      already: false,
      lines: [],
      kitLines: [],
      tempLines: [],
      reqLines: [],
      resistLines: []
    };
    if (!item) {
      out.reason = 'no-item';
      out.reasonText = derived ? derived.blockedText('no-item') : 'No item to don.';
      out.reqLines.push(out.reasonText);
      return out;
    }
    var slot = itemSlotOf(item);
    out.slot = slot;
    out.slotLabel = slot ? slotLabel(slot) : '';
    var worn = occupant(equipped, slot);
    out.worn = worn;
    if (worn === item) {
      out.ok = true;
      out.already = true;
      out.reqLines.push('Already worn');
      if (current) {
        out.preview = current;
        fillCompareLines(out, current, current);
      }
      return out;
    }
    if (!slot || (slots && slots.isEquippable && !slots.isEquippable(item))) {
      out.reason = 'no-slot';
      out.reasonText = derived ? derived.blockedText('no-slot', item)
        : 'This does not occupy a body slot.';
      out.reqLines.push(out.reasonText);
      if (current) fillCompareLines(out, current, null);
      return out;
    }
    if (worn && worn.cursed && worn !== item) {
      out.reason = 'cursed';
      out.reasonText = derived ? derived.blockedText('cursed', worn)
        : 'The curse binds. It will not be set aside.';
      out.reqLines.push(out.reasonText);
      out.reqLines.push('Occupies ' + out.slotLabel + ': ' + (worn.n || 'cursed kit'));
      if (current) fillCompareLines(out, current, null);
      return out;
    }
    if (!derived) {
      out.reason = 'no-stats';
      out.reasonText = 'Cannot don this now.';
      return out;
    }
    var trial = derived.previewEquip(equipped, item);
    if (!trial.ok) {
      out.reason = trial.reason || 'blocked';
      out.reasonText = derived.blockedText(out.reason, item);
      out.reqLines.push(out.reasonText);
      if (current) fillCompareLines(out, current, null);
      return out;
    }
    out.ok = true;
    out.already = !!trial.already;
    out.slot = trial.slot || slot;
    out.slotLabel = slotLabel(out.slot);
    out.preview = derived.compute(actor, trial.equipped, opts);
    out.reqLines.push('Fits ' + out.slotLabel);
    if (worn && worn !== item) out.reqLines.push('Replaces ' + (worn.n || 'worn kit'));
    else if (out.already) out.reqLines.push('Already worn');
    fillCompareLines(out, current, out.preview);
    return out;
  }

  function pushLine(list, key, label, cur, next, opts) {
    opts = opts || {};
    var changed = !opts.force && next != null && cur !== next;
    list.push({
      k: key,
      label: label,
      cur: cur,
      next: next,
      changed: !!changed,
      temp: !!opts.temp
    });
  }

  function fillCompareLines(out, cur, next) {
    if (!cur) return;
    var kit = out.kitLines;
    var temp = out.tempLines;
    pushLine(kit, 'protection', 'Protection', fmtProt(cur), next ? fmtProt(next) : null);
    pushLine(kit, 'hit', 'Hit', fmtHit(cur), next ? fmtHit(next) : null);
    pushLine(kit, 'damage', 'Damage', fmtDmg(cur), next ? fmtDmg(next) : null);
    pushLine(kit, 'move', 'Move (kit)', fmtMul(cur.moveMul), next ? fmtMul(next.moveMul) : null);
    pushLine(kit, 'cooldown', 'Cooldown (kit)', fmtCd(cur.wornCd), next ? fmtCd(next.wornCd) : null);
    var cH = cur.temp || {};
    var nH = (next && next.temp) || cH;
    if (cH.haste || nH.haste) {
      var phase = (nH.phase || cH.phase || 'haste');
      var rem = nH.remaining != null ? nH.remaining : cH.remaining;
      pushLine(temp, 'haste-move', 'Haste move', fmtMul(cH.moveMul || 1),
        fmtMul(nH.moveMul || 1), { temp: true });
      pushLine(temp, 'haste-cd', 'Haste cooldown',
        cH.phase === 'rest' ? 'rest' : fmtMul(cH.cdMul || 1),
        nH.phase === 'rest' ? 'rest' : fmtMul(nH.cdMul || 1), { temp: true });
      pushLine(temp, 'haste-left', 'Haste left',
        (Math.round((cH.remaining || 0) * 10) / 10) + 's ' + (cH.phase || ''),
        (Math.round((rem || 0) * 10) / 10) + 's ' + phase, { temp: true, force: true });
    }
    var seen = Object.create(null);
    var i, row, key, nextMap = Object.create(null);
    var nRes = (next && next.resists) || [];
    for (i = 0; i < nRes.length; i++) nextMap[resistKey(nRes[i])] = nRes[i];
    var cRes = cur.resists || [];
    for (i = 0; i < cRes.length; i++) {
      row = cRes[i];
      key = resistKey(row);
      seen[key] = 1;
      pushLine(out.resistLines, row.k, row.label, row.text,
        next ? ((nextMap[key] && nextMap[key].text) || '—') : null);
    }
    for (i = 0; i < nRes.length; i++) {
      row = nRes[i];
      key = resistKey(row);
      if (seen[key]) continue;
      pushLine(out.resistLines, row.k, row.label, '—', row.text);
    }
    var notes = (next && next.hitNotes) || cur.hitNotes || [];
    for (i = 0; i < notes.length; i++) {
      pushLine(kit, 'note', 'Note', notes[i], notes[i], { force: true });
    }
    out.lines = kit.concat(temp).concat(out.resistLines);
  }

  function hits(rect, fn) {
    if (!rect) return [];
    return [{
      x: rect.x, y: rect.y, w: rect.w, h: rect.h,
      kind: 'equipCompare',
      fn: typeof fn === 'function' ? fn : function () {}
    }];
  }

  function layout(x, y, w, h) {
    return { x: x, y: y, w: w, h: h };
  }

  /**
   * Draw the small compare plate. Host supplies plate/ellipsize/fonts.
   * Returns the rect so the host can register overlayHits.
   */
  function draw(g, rect, report, host) {
    host = host || {};
    if (!rect || !g) return rect;
    var s = host.s || 1;
    var FONT_UI = host.FONT_UI || 'sans-serif';
    var FONT_TITLE = host.FONT_TITLE || FONT_UI;
    var x = rect.x, y = rect.y, w = rect.w, h = rect.h;
    if (typeof host.plate === 'function') host.plate(g, x, y, w, h, 6, 0.88);
    else {
      g.fillStyle = 'rgba(18,12,8,0.88)';
      g.fillRect(x, y, w, h);
    }
    g.strokeStyle = report && !report.ok ? 'rgba(255,110,90,0.75)' : 'rgba(255,208,124,0.55)';
    g.lineWidth = 1.4;
    if (typeof host.roundPath === 'function') {
      host.roundPath(g, x + 1, y + 1, w - 2, h - 2, 6);
      g.stroke();
    } else {
      g.strokeRect(x + 1, y + 1, w - 2, h - 2);
    }
    var pad = 8 * s;
    var who = (host.whoName || 'MACAR').toUpperCase();
    var title = 'COMPARE  ·  ' + who;
    g.save();
    g.beginPath();
    g.rect(x + 2, y + 2, w - 4, h - 4);
    g.clip();
    g.font = '800 ' + (9 * s) + 'px ' + FONT_TITLE;
    g.fillStyle = '#ffe9c0';
    g.textAlign = 'left';
    g.fillText(title, x + pad, y + 13 * s);
    var sub = '';
    if (report && report.item) {
      sub = report.item.n || '';
      if (report.worn && report.worn !== report.item) sub = (report.worn.n || 'worn') + '  →  ' + sub;
    }
    g.font = '700 ' + (8 * s) + 'px ' + FONT_UI;
    g.fillStyle = 'rgba(210,190,150,0.88)';
    var ellip = host.ellipsize;
    g.fillText(ellip ? ellip(g, sub, w - pad * 2) : sub, x + pad, y + 24 * s);
    var yy = y + 36 * s;
    var lineH = 11 * s;
    var floor = y + h - 6 * s;
    function row(label, cur, next, warn) {
      if (yy > floor) return false;
      g.font = '700 ' + (8 * s) + 'px ' + FONT_UI;
      g.fillStyle = warn ? '#ff8a7a' : 'rgba(180,160,120,0.86)';
      g.fillText(label, x + pad, yy);
      var right = cur || '';
      if (next && next !== cur) right = (cur || '—') + '  →  ' + next;
      g.fillStyle = warn ? '#ffb0a0' : '#f4e2b8';
      g.fillText(ellip ? ellip(g, right, w - pad * 2 - 72 * s) : right, x + pad + 72 * s, yy);
      yy += lineH;
      return true;
    }
    if (report && !report.ok && report.reasonText) {
      row('Blocked', report.reasonText, null, true);
    }
    var kit = (report && report.kitLines) || [];
    var i, ln;
    for (i = 0; i < kit.length; i++) {
      ln = kit[i];
      if (ln.k === 'note') continue;
      if (!row(ln.label, ln.cur, ln.next, false)) break;
    }
    var temp = (report && report.tempLines) || [];
    if (temp.length && yy <= floor) {
      var hm = '', hc = '', hl = '';
      for (i = 0; i < temp.length; i++) {
        if (temp[i].k === 'haste-move') hm = temp[i].cur;
        if (temp[i].k === 'haste-cd') hc = temp[i].cur;
        if (temp[i].k === 'haste-left') hl = temp[i].cur;
      }
      row('Haste (temp)', [hm, hc, hl].filter(Boolean).join('  ·  '), null, false);
    }
    var resists = (report && report.resistLines) || [];
    for (i = 0; i < resists.length; i++) {
      ln = resists[i];
      if (!row(ln.label, ln.cur, ln.next, false)) break;
    }
    var reqs = (report && report.reqLines) || [];
    for (i = 0; i < reqs.length; i++) {
      if (report && !report.ok && i === 0) continue;
      if (!row('Need', reqs[i], null, !!(report && !report.ok))) break;
    }
    g.restore();
    g.textAlign = 'left';
    return rect;
  }

  var api = {
    get FLAG() { return FLAG; },
    set FLAG(v) { FLAG = !!v; },
    use: use,
    inspect: inspect,
    hits: hits,
    layout: layout,
    draw: draw,
    fmtSigned: fmtSigned,
    fmtMul: fmtMul,
    fmtCd: fmtCd
  };

  root.EquipCompare = api;
  if (root.SystemsReady && typeof root.SystemsReady.declare === 'function') {
    root.SystemsReady.declare('EquipCompare', api);
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
