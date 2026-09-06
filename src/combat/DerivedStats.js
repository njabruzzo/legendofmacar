/**
 * Batch G — pure read-only derived kit stats.
 *
 * compute(actor, equipped, opts) is the shared calculation path for
 * worn AC / hit / move / cooldown / resists. Preview and live equip
 * both call this. It does not write actor fields, does not assign
 * G.equipped, does not consume items, and does not tick TimedEffects.
 *
 * Item exceptions are copied from the host worn* helpers (audit before
 * replace): Archmagi robe AC 5 (not plus:5 jewelry), Helm of * has no
 * free AC, Dex ring is never Protection, gated +4 on AC 5, Defender
 * +1 AC / remaining plus to-hit, Displacement jewelry AC + saves,
 * ogre / dex / fumbling gauntlets, fire / warmth / poison periapt,
 * Elvenkind hide, Speed / Striding move, Quickness worn cd.
 *
 * Boots of Speed scale the move *step* (wornMoveMul). Potion haste
 * scales e.sp via TimedEffects. Those layers stay separate.
 *
 * No power score.
 */
(function (root) {
  'use strict';

  function isHero(e) {
    return !!(e && (e.hero || (e.col && e.col.key === 'macar')));
  }

  function eqOf(eq) {
    return eq || {};
  }

  function ES() {
    return root.EquipmentSlots || null;
  }

  function entityAbilOf(e, opts) {
    opts = opts || {};
    if (opts.entityAbil) return opts.entityAbil(e) || {};
    if (e && e.abil) return e.abil;
    return {};
  }

  function nameOf(it) {
    return String((it && it.n) || '');
  }

  function cloneItem(it) {
    if (!it || typeof it !== 'object') return it;
    var o = {};
    var k;
    for (k in it) {
      if (Object.prototype.hasOwnProperty.call(it, k)) o[k] = it[k];
    }
    return o;
  }

  function cloneEquipped(eq) {
    var slots = ES();
    var out = slots && slots.emptyEquipped ? slots.emptyEquipped() : {};
    var keys = slots && slots.ALL_KEYS ? slots.ALL_KEYS : Object.keys(eq || {});
    var i, k;
    for (i = 0; i < keys.length; i++) {
      k = keys[i];
      if (eq && eq[k] != null) out[k] = eq[k];
    }
    if (out.primary && !out.weapon) out.weapon = out.primary;
    if (out.chest && !out.armor) out.armor = out.chest;
    out.weapon = out.primary || out.weapon;
    out.armor = out.chest || out.armor;
    return out;
  }

  /* PHB STR to-hit / dmg. Fighter 18/00 is ogre-gauntlet melee. */
  function strMods(ab, cls) {
    var s = (ab && ab.str) | 0;
    var exc = (cls === 'f' && s >= 18) ? ((ab && ab.exc) | 0) : 0;
    var hit = 0, dmg = 0;
    if (s <= 3) { hit = -3; dmg = -1; }
    else if (s <= 5) { hit = -2; dmg = -1; }
    else if (s <= 7) { hit = -1; dmg = 0; }
    else if (s <= 15) { hit = 0; dmg = 0; }
    else if (s === 16) { hit = 0; dmg = 1; }
    else if (s === 17) { hit = 1; dmg = 1; }
    else {
      hit = 1; dmg = 2;
      if (exc >= 1 && exc <= 50) { hit = 1; dmg = 3; }
      else if (exc <= 75) { hit = 2; dmg = 3; }
      else if (exc <= 90) { hit = 2; dmg = 4; }
      else if (exc <= 99) { hit = 2; dmg = 5; }
      else if (exc >= 100) { hit = 3; dmg = 6; }
    }
    return { hit: hit, dmg: dmg };
  }

  function dexDefAdj(dex) {
    dex = dex | 0;
    if (dex <= 3) return 4;
    if (dex === 4) return 3;
    if (dex === 5) return 2;
    if (dex === 6) return 1;
    if (dex <= 14) return 0;
    if (dex === 15) return -1;
    if (dex === 16) return -2;
    if (dex === 17) return -3;
    return -4;
  }

  function dexAttackAdj(dex) {
    dex = dex | 0;
    if (dex <= 3) return -3;
    if (dex === 4) return -2;
    if (dex === 5) return -1;
    if (dex <= 15) return 0;
    if (dex === 16) return 1;
    if (dex === 17) return 2;
    return 3;
  }

  function wornDexPlus(e, eq, opts) {
    if (!isHero(e)) return 0;
    eq = eqOf(eq);
    var ring = eq.necklace || eq.ring;
    var plus = 0;
    if (ring && ring.dexPlus) plus += ring.dexPlus | 0;
    var g = eq.gloves;
    if (g && !g.cursed && !/fumbling/i.test(g.n || '') && /gauntlets of dexterity/i.test(g.n || '')) {
      var ab = entityAbilOf(e, opts);
      var base = (ab && ab.dex) || 10;
      if (base >= 18) plus += 4;
      else plus += Math.max(0, 18 - base);
    }
    return plus;
  }

  function wornOgrePower(e, eq) {
    if (!isHero(e)) return false;
    var g = eqOf(eq).gloves;
    if (!g || g.cursed || /fumbling/i.test(g.n || '')) return false;
    return /ogre power/i.test(g.n || '');
  }

  function meleeStrAbil(e, eq, opts) {
    var ab = entityAbilOf(e, opts);
    if (wornOgrePower(e, eq)) return { str: 18, exc: 100 };
    return ab;
  }

  function wornMagicResistPct(e, eq) {
    if (!isHero(e)) return 0;
    eq = eqOf(eq);
    var pct = 0;
    var it = eq.necklace || eq.ring;
    if (it && !(it.dexPlus || it.k === 'dex' || /dexterity/i.test(it.n || '')) &&
        !/displacement/i.test(it.n || '') && /protection/i.test(it.n || '') &&
        !/AC 5 or better/i.test(it.n || '')) {
      var p = it.plus | 0;
      if (p === 2) pct += 10;
      if (p === 3) pct += 15;
    }
    if ((eq.robe && /robe of the archmagi/i.test(eq.robe.n || '')) ||
        (eq.chest && /robe of the archmagi/i.test(eq.chest.n || '')) ||
        (eq.armor && /robe of the archmagi/i.test(eq.armor.n || ''))) pct += 5;
    return pct;
  }

  function wornProtectionPlus(e, eq) {
    if (!isHero(e)) return 0;
    var it = eqOf(eq).necklace || eqOf(eq).ring;
    if (!it) return 0;
    if (it.dexPlus) return 0;
    if (it.k === 'dex' || /dexterity/i.test(it.n || '')) return 0;
    if (!(it.plus)) return 0;
    if (/protection/i.test(it.n || '') || it.k === 'ring') return it.plus | 0;
    return 0;
  }

  function wornDisplacementPlus(e, eq) {
    if (!isHero(e)) return 0;
    var it = eqOf(eq).necklace || eqOf(eq).ring;
    if (!it || !/cloak of displacement/i.test(it.n || '')) return 0;
    if (it.dexPlus || it.k === 'dex' || /dexterity/i.test(it.n || '')) return 0;
    return it.plus | 0;
  }

  function wornNecklaceItem(e, eq) {
    if (!isHero(e)) return null;
    return eqOf(eq).necklace || eqOf(eq).ring || null;
  }

  function wornResistSavePlus(e, eq, kind) {
    if (!isHero(e)) return 0;
    var it = wornNecklaceItem(e, eq);
    if (!it) return 0;
    if (it.dexPlus || it.k === 'dex' || /dexterity/i.test(it.n || '')) return 0;
    var n = it.n || '';
    if (kind === 'poison' && /periapt of proof against poison/i.test(n)) return 4;
    if (kind === 'breath' && /ring of fire resistance/i.test(n)) return 4;
    if (kind === 'breath' && /ring of warmth/i.test(n)) return 2;
    return 0;
  }

  function wearingFireResistance(e, eq) {
    var it = wornNecklaceItem(e, eq);
    if (it && /ring of fire resistance/i.test(it.n || '')) return true;
    var wep = eqOf(eq).primary || eqOf(eq).weapon;
    return !!(isHero(e) && wep && /frost brand/i.test(wep.n || ''));
  }

  function wearingWarmth(e, eq) {
    var it = wornNecklaceItem(e, eq);
    return !!(it && /ring of warmth/i.test(it.n || ''));
  }

  function wearingFeatherFalling(e, eq) {
    var it = wornNecklaceItem(e, eq);
    return !!(it && /ring of feather falling/i.test(it.n || ''));
  }

  function wearingElvenkind(e, eq) {
    if (!isHero(e)) return false;
    eq = eqOf(eq);
    var boots = eq.boots;
    var cloak = eq.necklace || eq.ring;
    if (boots && /boots of elvenkind/i.test(boots.n || '')) return true;
    if (cloak && /cloak of elvenkind/i.test(cloak.n || '')) return true;
    return false;
  }

  function wearingLevitation(e, eq) {
    if (!isHero(e)) return false;
    var it = eqOf(eq).boots;
    return !!(it && /boots of levitation/i.test(it.n || ''));
  }

  function wearingFreeAction(e, eq) {
    var it = wornNecklaceItem(e, eq);
    return !!(it && /ring of free action/i.test(it.n || ''));
  }

  function wornMoveMul(e, eq) {
    if (!isHero(e)) return 1;
    var it = eqOf(eq).boots;
    if (!it) return 1;
    var n = String(it.n || '');
    if (/boots of speed/i.test(n)) return 2;
    if (/striding and springing/i.test(n)) return 1.5;
    return 1;
  }

  function wornPrimaryWeapon(e, eq) {
    if (!isHero(e)) return null;
    return eqOf(eq).primary || eqOf(eq).weapon || null;
  }

  function isQuicknessWeapon(it) {
    return !!(it && /quickness/i.test(it.n || ''));
  }

  function isDefenderSword(it) {
    var slots = ES();
    if (slots && slots.isDefenderSword) return slots.isDefenderSword(it);
    return !!(it && /defender/i.test(String(it.n || '')));
  }

  function isShield(it) {
    var slots = ES();
    if (slots && slots.isShield) return slots.isShield(it);
    return !!(it && /shield/i.test(String(it.n || '')));
  }

  function wornAttackCd(e, eq) {
    var base = (e && e.baseCd != null) ? e.baseCd : ((e && e.cd) || 1);
    if (!isHero(e)) return (e && e.cd) || base;
    var wep = wornPrimaryWeapon(e, eq);
    if (!isQuicknessWeapon(wep)) return base;
    return Math.max(0.45, base * 0.85);
  }

  function wornWeaponPlus(e, eq, def, opts) {
    opts = opts || {};
    if (!e) return 0;
    var plus = 0;
    var wep = null;
    eq = eqOf(eq);
    if (isHero(e)) {
      if (e.ranged) {
        var bow = eq.secondary;
        if (!bow) return 0;
        if (isShield(bow)) return 0;
        wep = bow;
        plus = bow.cursed ? (bow.plus || -1) : (bow.plus || 0);
        plus += (e._shotAmmoPlus | 0);
      } else {
        wep = eq.primary || eq.weapon;
        if (wep) plus = wep.cursed ? (wep.plus || -1) : (wep.plus || 0);
        else plus = (e.gear && e.gear.magicAtk) || 0;
        if (wep && /defender/i.test(wep.n || '')) plus = Math.max(0, plus - 1);
      }
    } else {
      plus = (e.gear && e.gear.magicAtk) || 0;
    }
    if (wep && typeof opts.weaponVsPlus === 'function') plus += opts.weaponVsPlus(wep, def) | 0;
    return plus;
  }

  function wornAC(e, eq, opts) {
    opts = opts || {};
    var slots = ES();
    if (slots && slots.computeWornAC) {
      return slots.computeWornAC(eqOf(eq), {
        noShield: !!opts.noShield,
        missile: !!opts.missile
      });
    }
    return 10;
  }

  function effectiveDex(e, eq, opts) {
    var ab = entityAbilOf(e, opts);
    return (ab.dex || 10) + wornDexPlus(e, eq, opts);
  }

  function kitAC(e, eq, opts) {
    opts = opts || {};
    var ac = wornAC(e, eq, opts);
    if (!opts.noDex) ac += dexDefAdj(effectiveDex(e, eq, opts));
    return ac;
  }

  function describeAC(eq) {
    var slots = ES();
    if (slots && slots.describeAC) return slots.describeAC(eqOf(eq));
    return { ac: 10, note: 'unarmored AC 10', parts: ['unarmored AC 10'] };
  }

  function hasteOf(e) {
    var TE = root.TimedEffects;
    if (!TE || typeof TE.getHaste !== 'function') return null;
    return TE.getHaste(e);
  }

  function deriveSp(e) {
    var TE = root.TimedEffects;
    if (TE && typeof TE.deriveSp === 'function') return TE.deriveSp(e);
    return e && e.baseSp != null ? e.baseSp : (e && e.sp != null ? e.sp : 3);
  }

  function deriveCd(e, eq) {
    var TE = root.TimedEffects;
    var worn = function (ent) { return wornAttackCd(ent, eq); };
    if (TE && typeof TE.deriveCd === 'function') return TE.deriveCd(e, worn);
    return worn(e);
  }

  function resistRows(e, eq) {
    var rows = [];
    var mr = wornMagicResistPct(e, eq);
    if (mr) rows.push({ k: 'magic', label: 'Magic resist', text: mr + '%' });
    var prot = wornProtectionPlus(e, eq);
    if (prot) rows.push({ k: 'saves', label: 'Saves (Protection)', text: (prot > 0 ? '+' : '') + prot });
    var disp = wornDisplacementPlus(e, eq);
    if (disp) rows.push({ k: 'saves', label: 'Saves (Displacement)', text: (disp > 0 ? '+' : '') + disp });
    var poison = wornResistSavePlus(e, eq, 'poison');
    if (poison) rows.push({ k: 'poison', label: 'Poison', text: '+' + poison + ' save' });
    if (wearingFireResistance(e, eq)) {
      var fire = wornResistSavePlus(e, eq, 'breath');
      rows.push({ k: 'fire', label: 'Fire', text: fire ? ('+' + fire + ' breath') : 'resists fire' });
    } else if (wearingWarmth(e, eq)) {
      rows.push({ k: 'cold', label: 'Cold / warmth', text: '+' + wornResistSavePlus(e, eq, 'breath') + ' breath' });
    }
    if (wearingFeatherFalling(e, eq)) rows.push({ k: 'fall', label: 'Fall', text: 'no fall damage' });
    if (wearingFreeAction(e, eq)) rows.push({ k: 'hold', label: 'Free Action', text: 'hold / web / slow' });
    if (wearingElvenkind(e, eq)) rows.push({ k: 'hide', label: 'Elvenkind', text: 'one hide' });
    if (wearingLevitation(e, eq)) rows.push({ k: 'hover', label: 'Levitation', text: 'hover (pits)' });
    return rows;
  }

  function weaponDice(e, eq) {
    var wep = wornPrimaryWeapon(e, eq);
    if (wep && wep.dice) return wep.dice;
    if (e && e.dice) return e.dice;
    return '1d8';
  }

  function hitImplications(e, eq, opts) {
    opts = opts || {};
    var cls = opts.cls || (e && e.cls) || 'f';
    var str = meleeStrAbil(e, eq, opts);
    var sm = strMods(str, cls);
    var wep = wornPrimaryWeapon(e, eq);
    var plus = wornWeaponPlus(e, eq, opts.def, opts);
    var notes = [];
    if (wep && isDefenderSword(wep)) notes.push('Defender +1 AC, rest to-hit');
    if (wep && isQuicknessWeapon(wep)) notes.push('Quickness (worn cd)');
    if (wep && /vorpal/i.test(wep.n || '')) notes.push('Vorpal on nat-20');
    if (wep && /life steal/i.test(wep.n || '')) notes.push('Life steal on hit');
    if (wep && wep.vs) notes.push('vs ' + wep.vs + (wep.vsDouble ? ' (double)' : ''));
    if (wornOgrePower(e, eq)) notes.push('Ogre STR 18/00');
    return {
      plus: plus,
      strHit: sm.hit,
      strDmg: sm.dmg,
      dice: weaponDice(e, eq),
      notes: notes
    };
  }

  /**
   * Read-only snapshot. Temporary haste is listed apart from kit.
   * Does not write e.sp / e.cd / e.hover and does not tick remaining.
   */
  function compute(e, eq, opts) {
    opts = opts || {};
    eq = eqOf(eq);
    e = e || {};
    var fx = hasteOf(e);
    var baseSp = e.baseSp != null ? e.baseSp : (e.sp != null ? e.sp : 3);
    var baseCd = e.baseCd != null ? e.baseCd : (e.cd != null ? e.cd : 1);
    var moveMul = wornMoveMul(e, eq);
    var wornCd = wornAttackCd(e, eq);
    var acDesc = describeAC(eq);
    var hit = hitImplications(e, eq, opts);
    var hasteMove = 1;
    var hasteCdMul = 1;
    if (fx && fx.phase !== 'rest') {
      hasteMove = fx.moveMul != null ? +fx.moveMul : 1;
      hasteCdMul = fx.cdMul != null ? +fx.cdMul : 1;
    } else if (fx && fx.phase === 'rest') {
      hasteMove = fx.restMul != null ? +fx.restMul : 1;
    }
    return {
      ac: kitAC(e, eq, opts),
      acMissile: kitAC(e, eq, { missile: true, noDex: opts.noDex }),
      acWorn: wornAC(e, eq, opts),
      acNote: acDesc.note || '',
      dex: effectiveDex(e, eq, opts),
      dexDef: dexDefAdj(effectiveDex(e, eq, opts)),
      hitPlus: hit.plus,
      strHit: hit.strHit,
      strDmg: hit.strDmg,
      dice: hit.dice,
      hitNotes: hit.notes,
      moveMul: moveMul,
      baseSp: baseSp,
      wornCd: wornCd,
      baseCd: baseCd,
      kit: {
        ac: kitAC(e, eq, opts),
        acMissile: kitAC(e, eq, { missile: true }),
        hitPlus: hit.plus,
        dice: hit.dice,
        strHit: hit.strHit,
        strDmg: hit.strDmg,
        moveMul: moveMul,
        attackCd: wornCd
      },
      temp: {
        haste: !!fx,
        phase: fx ? (fx.phase || 'haste') : null,
        remaining: fx ? (+fx.remaining || 0) : 0,
        moveMul: hasteMove,
        cdMul: hasteCdMul,
        derivedSp: deriveSp(e),
        derivedCd: deriveCd(e, eq)
      },
      resists: resistRows(e, eq),
      slot: null
    };
  }

  /**
   * Preview donning `item` onto a clone of `eq`. Never mutates eq or item.
   * annotate() writes slot/ac onto its argument — we clone first.
   */
  function previewEquip(eq, item) {
    var slots = ES();
    if (!slots || typeof slots.equip !== 'function') {
      return { ok: false, reason: 'no-slots', equipped: cloneEquipped(eq), item: item };
    }
    var next = cloneEquipped(eq);
    var it = cloneItem(item);
    if (slots.annotate) slots.annotate(it);
    return slots.equip(next, it);
  }

  function blockedText(reason, item) {
    if (reason === 'cursed') return 'The curse binds. It will not be set aside.';
    if (reason === 'no-slot') {
      return (item && item.n) ? (item.n + ' does not occupy a body slot.') : 'This does not occupy a body slot.';
    }
    if (reason === 'no-item') return 'No item to don.';
    if (reason === 'no-slots') return 'Cannot don this now.';
    return 'Cannot don this now.';
  }

  var api = {
    isHero: isHero,
    cloneItem: cloneItem,
    cloneEquipped: cloneEquipped,
    strMods: strMods,
    dexDefAdj: dexDefAdj,
    dexAttackAdj: dexAttackAdj,
    wornDexPlus: wornDexPlus,
    wornOgrePower: wornOgrePower,
    meleeStrAbil: meleeStrAbil,
    wornMagicResistPct: wornMagicResistPct,
    wornProtectionPlus: wornProtectionPlus,
    wornDisplacementPlus: wornDisplacementPlus,
    wornNecklaceItem: wornNecklaceItem,
    wornResistSavePlus: wornResistSavePlus,
    wearingFireResistance: wearingFireResistance,
    wearingWarmth: wearingWarmth,
    wearingFeatherFalling: wearingFeatherFalling,
    wearingElvenkind: wearingElvenkind,
    wearingLevitation: wearingLevitation,
    wearingFreeAction: wearingFreeAction,
    wornMoveMul: wornMoveMul,
    wornPrimaryWeapon: wornPrimaryWeapon,
    wornAttackCd: wornAttackCd,
    wornWeaponPlus: wornWeaponPlus,
    wornAC: wornAC,
    effectiveDex: effectiveDex,
    kitAC: kitAC,
    compute: compute,
    previewEquip: previewEquip,
    blockedText: blockedText,
    isQuicknessWeapon: isQuicknessWeapon
  };

  root.DerivedStats = api;
  if (root.SystemsReady && typeof root.SystemsReady.declare === 'function') {
    root.SystemsReady.declare('DerivedStats', api);
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
