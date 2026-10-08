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
 */
(function (root) {
  'use strict';

  var POISON_MODE = 'h1';

  var SPIDERS = {
    spider: { name: 'large', save: 2 },
    spiderHuge: { name: 'huge', save: 1 },
    spiderGiant: { name: 'giant', save: 0 },
    phasespider: { name: 'phase', save: -2 },
    spiderQueen: { name: 'queen', save: -2 }
  };

  function fighterPoisonBase(level) {
    if (level <= 4) return 13;
    if (level <= 6) return 11;
    if (level <= 8) return 10;
    return 8;
  }

  function conBonus(con) {
    if (con >= 18) return 5;
    if (con >= 14) return 4;
    return null;
  }

  function saveTarget(opts) {
    var spider = SPIDERS[opts.spider];
    if (!spider) throw new Error('unknown spider');
    var base = opts.base != null ? opts.base : fighterPoisonBase(opts.level);
    var bonus = opts.conBonus != null ? opts.conBonus : conBonus(opts.con);
    if (bonus == null) throw new Error('CON bonus is only printed for 14-18');
    var anti = opts.antitoxin ? 4 : 0;
    var periapt = opts.periaptPlus || 0;
    return base - bonus - spider.save - anti - periapt;
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
    var saved = opts.roll >= target;
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
