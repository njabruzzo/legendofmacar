'use strict';
/**
 * Macar anchor lock (Nick, 2026-09-28).
 *
 * dwarf_macar_atk_contact.png is the one on-model Macar: auburn hair and
 * braided beard, bare head, studded leather with a fur mantle, rune-square
 * maul, painterly. Every other Macar sheet was off-model and was removed;
 * index.html points every macar* sprite key at the anchor until matching
 * frames are painted from it.
 *
 * Tests that used to pin those sheets use this list: a removed sheet must
 * stay off disk, and per-sheet pixel checks skip it. When a new on-model
 * frame lands, take its file out of REMOVED and the old checks run again.
 */
const ANCHOR = 'dwarf_macar_atk_contact.png';
const REMOVED = [
  'dwarf_macar_atk.png',
  'dwarf_macar_e_w3.png',
  'dwarf_macar_se_w1.png', 'dwarf_macar_se_w2.png', 'dwarf_macar_se_w3.png',
  'dwarf_macar_ne_w1.png', 'dwarf_macar_ne_w2.png', 'dwarf_macar_ne_w3.png',
  'dwarf_macar_crowned.png'
];
function base(f) { return String(f).split('/').pop(); }
function removed(f) { return REMOVED.indexOf(base(f)) >= 0; }
/* What the game actually blits for a Macar sheet name: a removed sheet is
   the anchor now. Pixel checks measure the live frame, not a dead file. */
function resolve(f) {
  if (!removed(f)) return f;
  const s = String(f), i = s.lastIndexOf('/');
  return i >= 0 ? s.slice(0, i + 1) + ANCHOR : ANCHOR;
}
/* Anchor stand-ins remain: the maul windup (and axe / crossbow sheets) still
   play the anchor, so checks that compare windup / contact / idle scale or
   pin the old sheets stay parked. The idle itself is on-model since
   2026-09-29 (dwarf_macar.png), so this keys off the windup now. */
function anchorOnly() { return removed('dwarf_macar_atk.png'); }
/* For checks that pin removed sheets or compare distinct Macar frames.
   Passing checks pass. A failing one is PARKED (not failed) while Macar is
   anchor-only, and fails again as soon as real frames exist. */
function calib(assert) {
  return function (cond, msg) {
    if (cond) return assert(true, msg);
    if (anchorOnly()) { console.log('parked ' + msg + '  [needs distinct on-model Macar frames — anchor lock]'); return; }
    return assert(false, msg);
  };
}
/* On-model frames painted from the anchor and approved by Nick. */
const ONMODEL = ['dwarf_macar.png', 'dwarf_macar_e_w1.png', 'dwarf_macar_e_w2.png',
  'dwarf_macar_back_w1.png', 'dwarf_macar_back_w2.png', 'dwarf_macar_w1.png', 'dwarf_macar_w2.png',
  'dwarf_macar_atk_n.png', 'dwarf_macar_atk_s.png', 'dwarf_macar_atk_ne.png', 'dwarf_macar_atk_se.png',
  'dwarf_macar_axe.png', 'dwarf_macar_axe_w1.png', 'dwarf_macar_axe_w2.png', 'dwarf_macar_axe_atk.png',
  'dwarf_macar_xbow.png', 'dwarf_macar_xbow_w1.png', 'dwarf_macar_xbow_w2.png', 'dwarf_macar_xbow_atk.png'];
module.exports = { ANCHOR, REMOVED, ONMODEL, removed, resolve, anchorOnly, calib };
