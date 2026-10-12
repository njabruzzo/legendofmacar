/**
 * Spider poison, house rule H1 only (rules 1.16, decision D5-B).
 * Pure function. Not loaded by index.html.
 *
 * A failed save deals floor(50% of current HP), and at least 1 point,
 * then stops at 1 HP if that would kill. It never kills.
 * It applies a slow of moveMul 0.5 for 2 seconds.
 * Kin use the same numbers. Ghosts are immune. Antitoxin ends the slow.
 *
 * There is no raw-death path and no damage-over-time path.
 * At 1 HP the failed save leaves the creature at 1 HP and still applies the slow.
 *
 * The save target is the PHB fighter poison base for Macar's live
 * fighter level, minus the dwarf CON bonus, plus the size modifier.
 * Bases are F1-F2 14, F3-F4 13, F5-F6 11, F7-F8 10, F9-F10 8.
 * Size is added: large +2, huge +3, giant +4, phase +6, queen +6.
 * CampaignTable.poisonSave stays the printed book column and is not
 * the runtime modifier. The target floors at 2. A natural 1 always fails.
 * The dwarf CON bonus is +0 below 4, +1 at 4-6, +2 at 7-10, +3 at 11-13,
 * +4 at 14-17, and +5 at 18. A low CON still rolls the save.
 */
(function (root) {
  'use strict';

  var table = root.CampaignTable;
  if (!table && typeof module === 'object' && module.exports) table = require('../campaign/CampaignTable');
  if (!table || !table.poisonSave) throw new Error('SpiderPoison needs CampaignTable.poisonSave');

  var POISON_MODE = 'h1';
  var POISON_SAVE = table.poisonSave;

  var POISON_BASE = [
    { from: 1, to: 2, base: 14 },
    { from: 3, to: 4, base: 13 },
    { from: 5, to: 6, base: 11 },
    { from: 7, to: 8, base: 10 },
    { from: 9, to: 10, base: 8, source: 'PHB fighter' }
  ];

  /* Added to the target. The printed poisonSave column is a different sign. */
  var SIZE_MOD = { large: 2, huge: 3, giant: 4, phase: 6, queen: 6 };

  var SPIDERS = {
    spider: { name: 'large', size: 'large' },
    spiderHuge: { name: 'huge', size: 'huge' },
    spiderGiant: { name: 'giant', size: 'giant' },
    phasespider: { name: 'phase', size: 'phase' },
    spiderQueen: { name: 'queen', size: 'queen' }
  };

  function fighterPoisonBase(level) {
    for (var i = 0; i < POISON_BASE.length; i++) {
      var band = POISON_BASE[i];
      if (level >= band.from && level <= band.to) return band.base;
    }
    throw new Error('poison base is printed for F1 through F10');
  }

  function conBonus(con) {
    var n = typeof con === 'number' ? con : 0;
    if (n >= 18) return 5;
    if (n >= 14) return 4;
    if (n >= 11) return 3;
    if (n >= 7) return 2;
    if (n >= 4) return 1;
    return 0;
  }

  function saveTarget(opts) {
    var spider = SPIDERS[opts.spider];
    if (!spider) throw new Error('unknown spider');
    var base = opts.base != null ? opts.base : fighterPoisonBase(opts.level);
    var bonus = opts.conBonus != null ? opts.conBonus : conBonus(opts.con);
    var mod = opts.mod != null ? opts.mod : SIZE_MOD[spider.size];
    if (typeof mod !== 'number') throw new Error('spider save modifier is missing');
    var anti = opts.antitoxin ? 4 : 0;
    var periapt = opts.periaptPlus || 0;
    var target = base - bonus + mod - anti - periapt;
    /* 6 #12 — the save target never goes below 2, so a natural 1 always fails. */
    if (target < 2) target = 2;
    return target;
  }

  function failedSave(hp) {
    var rolled = Math.max(1, Math.floor(hp * 0.5));
    var next = hp - rolled;
    var damage = rolled;
    if (next < 1) {
      next = 1;
      damage = Math.max(0, hp - 1);
    }
    return {
      hp: next,
      rolledDamage: rolled,
      damage: damage,
      killed: false,
      slow: { moveMul: 0.5, seconds: 2 }
    };
  }

  function resolve(creature, opts) {
    var mode = (opts && opts.mode) || POISON_MODE;
    if (mode !== POISON_MODE) throw new Error('poison mode must be h1');
    var hp = creature.hp;
    if (creature.ghost) {
      return { immune: true, saved: false, hp: hp, damage: 0, killed: false, slow: null };
    }
    var target = saveTarget(opts);
    var saved = opts.roll !== 1 && opts.roll >= target;
    if (saved) {
      return { immune: false, saved: true, hp: hp, damage: 0, killed: false, slow: null, target: target };
    }
    var effect = failedSave(hp);
    effect.immune = false;
    effect.saved = false;
    effect.target = target;
    return effect;
  }

  function cure(creature) {
    return {
      hp: creature.hp,
      ghost: !!creature.ghost,
      slow: null,
      moveMul: 1
    };
  }

  var api = {
    POISON_MODE: POISON_MODE,
    poisonSave: POISON_SAVE,
    SIZE_MOD: SIZE_MOD,
    POISON_BASE: POISON_BASE,
    SPIDERS: SPIDERS,
    fighterPoisonBase: fighterPoisonBase,
    conBonus: conBonus,
    saveTarget: saveTarget,
    failedSave: failedSave,
    resolve: resolve,
    cure: cure,
    wired: false
  };

  root.SpiderPoison = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
