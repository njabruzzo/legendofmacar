/**
 * AD&D 1e paper-doll slots and armor-class values.
 * Used by the pack screen and by partyAC for Macar.
 */
(function (root) {
  'use strict';

  var SLOTS = [
    {k:'helmet', label:'Helmet', short:'Helm'},
    {k:'necklace', label:'Necklace', short:'Neck'},
    {k:'chest', label:'Chest', short:'Chest'},
    {k:'bracers', label:'Bracers', short:'Brace'},
    {k:'gloves', label:'Gloves', short:'Hand'},
    {k:'pants', label:'Pants', short:'Pants'},
    {k:'boots', label:'Boots', short:'Boot'},
    {k:'primary', label:'Primary', short:'Main'},
    {k:'secondary', label:'Secondary', short:'Off'},
    {k:'quiver', label:'Quiver', short:'Qvr'}
  ];
  var SLOT_KEYS = SLOTS.map(function (s) { return s.k; });
  var LEGACY_KEYS = ['weapon', 'armor', 'ring', 'wand', 'robe'];
  var ALL_KEYS = SLOT_KEYS.concat(LEGACY_KEYS);
  var START_WORN = ['helmet', 'chest', 'pants', 'boots', 'primary', 'secondary', 'quiver'];
  var SLOT_ICON = {
    helmet: 'icon_helm',
    necklace: 'icon_necklace',
    chest: 'icon_chest',
    bracers: 'icon_bracers',
    gloves: 'icon_gloves',
    pants: 'icon_pants',
    boots: 'icon_boots',
    primary: 'icon_attack',
    secondary: 'icon_crossbow',
    quiver: 'icon_quiver'
  };

  /* PHB armor table. Lower is better. Shield is a further −1, applied separately. */
  var ARMOR_AC = {
    none: 10,
    padded: 8,
    leather: 8,
    studded: 7,
    ring: 7,
    scale: 6,
    chain: 5,
    banded: 4,
    splint: 4,
    plate: 3,
    field: 2,
    full: 1
  };

  function emptyEquipped() {
    var eq = {};
    ALL_KEYS.forEach(function (k) { eq[k] = null; });
    return eq;
  }

  function ensureShape(eq) {
    var out = emptyEquipped();
    if (eq) {
      ALL_KEYS.forEach(function (k) {
        if (eq[k] != null) out[k] = eq[k];
      });
    }
    if (out.weapon && !out.primary) out.primary = out.weapon;
    if (out.armor && !out.chest) out.chest = out.armor;
    out.weapon = out.primary;
    out.armor = out.chest;
    return out;
  }

  function inferArmorType(name) {
    var n = String(name || '').toLowerCase();
    if (/full\s*plate/.test(n)) return 'full';
    if (/field\s*plate/.test(n)) return 'field';
    if (/plate/.test(n)) return 'plate';
    if (/banded/.test(n)) return 'banded';
    if (/splint/.test(n)) return 'splint';
    if (/chain/.test(n)) return 'chain';
    if (/scale/.test(n)) return 'scale';
    if (/ring\s*mail/.test(n)) return 'ring';
    if (/studded/.test(n)) return 'studded';
    if (/padded/.test(n)) return 'padded';
    if (/leather/.test(n) || /hide/.test(n)) return 'leather';
    if (/shield/.test(n)) return null;
    if (/armor|mail/.test(n)) return 'chain';
    return null;
  }

  function isShield(it) {
    if (!it) return false;
    return /shield/i.test(String(it.n || ''));
  }

  /** Extra descending-AC bonus vs incoming missiles. Parses "+N vs missiles" from n/d. */
  function shieldMissilePlus(it) {
    if (!it || !isShield(it)) return 0;
    if (it.missilePlus != null && it.missilePlus !== '') return it.missilePlus | 0;
    var text = String(it.n || '') + ' ' + String(it.d || '');
    var m = /[+](\d+)\s*vs\s*missiles/i.exec(text);
    return m ? (+m[1]) : 0;
  }

  function itemSlot(it) {
    if (!it) return null;
    if (it.slot && SLOT_KEYS.indexOf(it.slot) >= 0) return it.slot;
    var n = String(it.n || '') + ' ' + String(it.cat || '') + ' ' + String(it.k || '');
    if (/quiver/i.test(n)) return 'quiver';
    if (/helm|helmet/i.test(n)) return 'helmet';
    if (/necklace|amulet|medallion|periapt|pendant|torc/i.test(n)) return 'necklace';
    if (/bracer/i.test(n)) return 'bracers';
    if (/glove|gauntlet/i.test(n)) return 'gloves';
    if (/boot|shoe/i.test(n)) return 'boots';
    if (/pant|trouser|greave|legging/i.test(n)) return 'pants';
    if (it.k === 'ammo' && /(arrow|bolt|quarrel)/i.test(n)) return null;
    if (/crossbow|long\s*bow|short\s*bow|\bbow\b/i.test(n) && it.k !== 'ammo') return 'secondary';
    if (/shield/i.test(it.n || '')) return 'secondary';
    if (it.k === 'weapon' || it.cat === 'Sword' || it.cat === 'Weapon') return 'primary';
    if (/(Sword|Axe|Mace|Hammer|Spear|Dagger|Staff of Striking|Rod of (Lordly|Smiting))/i.test(it.n || '')) return 'primary';
    if (it.k === 'armor' || it.cat === 'Armor/Shield') return 'chest';
    if (/robe of the archmagi/i.test(it.n || '')) return 'chest';
    if (it.k === 'ring' || it.k === 'dex' || it.cat === 'Ring') return 'necklace';
    if (/^ring of /i.test(String(it.n || ''))) return 'necklace';
    if (/cloak of (?:protection|displacement|elvenkind)/i.test(n)) return 'necklace';
    return null;
  }

  function isEquippable(it) {
    return !!itemSlot(it);
  }

  function annotate(it) {
    if (!it || typeof it !== 'object') return it;
    var slot = itemSlot(it);
    if (slot) it.slot = slot;
    if (isArchmagiRobe(it)) {
      it.ac = 5;
      return it;
    }
    if (slot === 'chest' && !isShield(it)) {
      it.armorType = it.armorType || inferArmorType(it.n);
      if (it.ac == null && it.armorType && ARMOR_AC[it.armorType] != null) it.ac = ARMOR_AC[it.armorType];
    }
    /* Loot "Helm of *" rows have no plus — do not invent a free +1 AC. */
    if (slot === 'helmet' && it.acBonus == null && it.plus) it.acBonus = it.plus;
    return it;
  }

  function isFumblingGauntlets(it) {
    return !!(it && /gauntlet/i.test(String(it.n || '')) && (/fumbling/i.test(String(it.n || '')) || it.cursed));
  }

  function isOgreGauntlets(it) {
    if (!it || isFumblingGauntlets(it)) return false;
    return /ogre power/i.test(String(it.n || ''));
  }

  function isDexGauntlets(it) {
    if (!it || isFumblingGauntlets(it)) return false;
    return /gauntlets of dexterity/i.test(String(it.n || '')) ||
      (/gauntlet/i.test(String(it.n || '')) && /dexterity/i.test(String(it.n || '')));
  }

  function isDexRing(it) {
    if (!it) return false;
    if (/gauntlet|glove/i.test(String(it.n || ''))) return false;
    if (it.dexPlus) return true;
    if (it.k === 'dex') return true;
    return /dexterity/i.test(String(it.n || ''));
  }

  function isAc5GateRing(it) {
    return !!(it && /protection/i.test(String(it.n || '')) && /AC 5 or better/i.test(String(it.n || '')));
  }

  function isArchmagiRobe(it) {
    return !!(it && /robe of the archmagi/i.test(String(it.n || '')));
  }

  function wornArchmagiRobe(eq) {
    eq = eq || {};
    return isArchmagiRobe(eq.chest) || isArchmagiRobe(eq.armor) || isArchmagiRobe(eq.robe);
  }

  function helmAcBonus(it) {
    if (!it) return 0;
    if (it.acBonus != null) return it.acBonus;
    return it.plus || 0;
  }

  /** AC plus from jewelry. Dex rings never stack as Protection. +4-on-AC-5 is gated. */
  function jewelryAcPlus(it, acBefore) {
    if (!it || isDexRing(it) || isArchmagiRobe(it)) return 0;
    var p = it.acBonus ? it.acBonus : (it.plus || 0);
    if (!p) return 0;
    if (isAc5GateRing(it) && !(acBefore <= 5)) return 0;
    return p;
  }

  function startingItems(hammerFactory) {
    var hammer = typeof hammerFactory === 'function' ? hammerFactory() : null;
    if (!hammer) {
      hammer = {
        id: 'macar_hammer', n: "Macar's War Hammer", k: 'weapon', cat: 'Weapon',
        plus: 0, dice: '1d8', defaultWep: 1, spr: 'icon_attack',
        d: 'Your war hammer. Honest steel from the seam.'
      };
    }
    hammer.slot = 'primary';
    return [
      {
        id: 'macar_helm', n: 'Iron Helm', k: 'armor', cat: 'Armor/Shield', slot: 'helmet',
        acBonus: 1, spr: 'icon_helm',
        d: 'A miner\'s helm. Improves Armor Class by 1 (AD&D 1e).'
      },
      {
        id: 'macar_leather', n: 'Leather Armor', k: 'armor', cat: 'Armor/Shield', slot: 'chest',
        armorType: 'leather', ac: 8, plus: 0, spr: 'icon_chest',
        d: 'Hardened hide. AD&D 1e leather — Armor Class 8.'
      },
      {
        id: 'macar_pants', n: 'Wool Trousers', k: 'armor', cat: 'Clothes', slot: 'pants',
        spr: 'icon_pants',
        d: 'Sturdy miner\'s trousers. No Armor Class.'
      },
      {
        id: 'macar_boots', n: 'Leather Boots', k: 'armor', cat: 'Clothes', slot: 'boots',
        spr: 'icon_boots',
        d: 'Normal boots. No Armor Class.'
      },
      hammer,
      {
        id: 'macar_crossbow', n: 'Light Crossbow', k: 'weapon', cat: 'Weapon', slot: 'secondary',
        dice: '1d4', spr: 'icon_crossbow', ranged: 1,
        d: 'Light crossbow. AD&D 1e: 1–4 vs S-M or L. Spends a quarrel from the quiver.'
      },
      {
        id: 'macar_quiver', n: 'Bolt Quiver', k: 'ammo', cat: 'Ammo', slot: 'quiver',
        ammoType: 'bolt', spr: 'icon_quiver',
        d: 'A leather quiver. The count is the quarrels you can loose.'
      }
    ];
  }

  function slotHas(eq, it) {
    if (!eq || !it) return false;
    for (var i = 0; i < ALL_KEYS.length; i++) {
      if (eq[ALL_KEYS[i]] === it) return true;
    }
    return false;
  }

  function clearItem(eq, it) {
    if (!eq || !it) return eq;
    ALL_KEYS.forEach(function (k) {
      if (eq[k] === it) eq[k] = null;
    });
    eq.weapon = eq.primary;
    eq.armor = eq.chest;
    return eq;
  }

  function equip(eq, it) {
    eq = ensureShape(eq);
    it = annotate(it);
    var slot = itemSlot(it);
    if (!slot) return {ok: false, reason: 'no-slot', equipped: eq};
    if (isArchmagiRobe(it) && slot === 'chest') {
      var occ = eq.chest || eq.armor;
      if (occ && occ !== it && !isArchmagiRobe(occ)) {
        clearItem(eq, it);
        eq.robe = it;
        eq.weapon = eq.primary;
        eq.armor = eq.chest;
        return {ok: true, slot: 'robe', equipped: eq, prev: null};
      }
    }
    var cur = eq[slot];
    if (cur && cur !== it && cur.cursed) return {ok: false, reason: 'cursed', slot: slot, equipped: eq};
    if (cur === it) return {ok: true, slot: slot, equipped: eq, already: true};
    clearItem(eq, it);
    eq[slot] = it;
    if (slot === 'primary') eq.weapon = it;
    if (slot === 'chest') eq.armor = it;
    if (slot === 'necklace' && (it.k === 'ring' || it.cat === 'Ring' || /protection/i.test(it.n || ''))) eq.ring = it;
    eq.weapon = eq.primary;
    eq.armor = eq.chest;
    return {ok: true, slot: slot, equipped: eq, prev: cur || null};
  }

  function unequip(eq, slot) {
    eq = ensureShape(eq);
    var it = eq[slot];
    if (!it) return {ok: true, equipped: eq};
    if (it.cursed) return {ok: false, reason: 'cursed', equipped: eq, item: it};
    eq[slot] = null;
    if (slot === 'primary') eq.weapon = null;
    if (slot === 'chest') eq.armor = null;
    if (eq.ring === it) eq.ring = null;
    eq.weapon = eq.primary;
    eq.armor = eq.chest;
    return {ok: true, equipped: eq, item: it};
  }

  function wornBonus(it) {
    if (!it) return 0;
    var n = 0;
    if (it.acBonus) n += it.acBonus;
    else if (it.plus) n += it.plus;
    return n;
  }

  /**
   * Descending AC from worn kit only (no Dex, no Defend).
   * Leather 8 + helm +1 → 7. Shield is another −1 if worn in a hand.
   */
  function computeWornAC(eq, opts) {
    opts = opts || {};
    eq = eq || {};
    var chest = eq.chest || eq.armor;
    var base = 10;
    if (chest && !isShield(chest)) {
      if (isArchmagiRobe(chest)) base = 5;
      else {
        if (typeof chest.ac === 'number') base = chest.ac;
        else {
          var t = chest.armorType || inferArmorType(chest.n);
          if (t && ARMOR_AC[t] != null) base = ARMOR_AC[t];
        }
        if (chest.plus) base -= chest.plus;
      }
    }
    if (eq.robe && isArchmagiRobe(eq.robe) && 5 < base) base = 5;
    var helm = eq.helmet;
    if (helm) base -= helmAcBonus(helm);
    ['bracers', 'gloves', 'pants', 'boots'].forEach(function (s) {
      var it = eq[s];
      if (!it) return;
      if (it.acBonus) base -= it.acBonus;
      else if (it.plus) base -= it.plus;
    });
    if (!opts.noJewelry) {
      if (eq.necklace) base -= jewelryAcPlus(eq.necklace, base);
      if (eq.ring && eq.ring !== eq.necklace) base -= jewelryAcPlus(eq.ring, base);
    }
    if (!opts.noShield) {
      var sh = isShield(eq.secondary) ? eq.secondary : (isShield(eq.primary) ? eq.primary : null);
      if (sh) {
        base -= 1 + (sh.plus || 0);
        if (opts.missile) base -= shieldMissilePlus(sh);
      }
    }
    return base;
  }

  function magicAcBonus(eq) {
    eq = eq || {};
    var n = 0;
    var chest = eq.chest || eq.armor;
    if (chest && chest.plus && !isArchmagiRobe(chest)) n += chest.plus;
    var acBefore = computeWornAC(eq, {noJewelry: true});
    var ring = eq.ring || eq.necklace;
    if (ring && ring.plus) n += jewelryAcPlus(ring, acBefore);
    return n;
  }

  function describeAC(eq) {
    eq = eq || {};
    var parts = [];
    var chest = eq.chest || eq.armor;
    if (chest && !isShield(chest)) {
      if (isArchmagiRobe(chest)) parts.push('robe AC 5');
      else {
        var t = chest.armorType || inferArmorType(chest.n) || 'armor';
        var ac = (typeof chest.ac === 'number') ? chest.ac : (ARMOR_AC[t] != null ? ARMOR_AC[t] : 10);
        parts.push(t + ' AC ' + ac);
        if (chest.plus) parts.push((chest.plus > 0 ? '+' : '') + chest.plus);
      }
    } else {
      parts.push('unarmored AC 10');
    }
    if (eq.helmet) {
      var hb = helmAcBonus(eq.helmet);
      if (hb) parts.push('helm +' + hb);
    }
    if (isShield(eq.secondary) || isShield(eq.primary)) parts.push('shield');
    if (eq.necklace && eq.necklace.plus) parts.push((eq.necklace.n || 'ward') + ' +' + eq.necklace.plus);
    else if (eq.ring && eq.ring.plus) parts.push((eq.ring.n || 'ring') + ' +' + eq.ring.plus);
    return {
      ac: computeWornAC(eq),
      note: parts.join(', '),
      parts: parts
    };
  }

  function slotDef(k) {
    for (var i = 0; i < SLOTS.length; i++) if (SLOTS[i].k === k) return SLOTS[i];
    return {k: k, label: k, short: k};
  }

  function slotIcon(slot) {
    return SLOT_ICON[slot] || 'icon_pack';
  }

  /** Centered slot rect. Missing / non-finite height falls back to width so canvas gradients stay finite. */
  function slotCell(k, px, py, sw, sh) {
    sw = Number(sw);
    if (!isFinite(sw) || sw <= 0) sw = 32;
    sh = Number(sh);
    if (!isFinite(sh) || sh <= 0) sh = sw;
    return {k: k, x: px - sw / 2, y: py - sh / 2, w: sw, h: sh};
  }

  var EquipmentSlots = {
    SLOTS: SLOTS,
    SLOT_KEYS: SLOT_KEYS,
    LEGACY_KEYS: LEGACY_KEYS,
    ALL_KEYS: ALL_KEYS,
    START_WORN: START_WORN,
    SLOT_ICON: SLOT_ICON,
    ARMOR_AC: ARMOR_AC,
    emptyEquipped: emptyEquipped,
    ensureShape: ensureShape,
    inferArmorType: inferArmorType,
    isShield: isShield,
    shieldMissilePlus: shieldMissilePlus,
    itemSlot: itemSlot,
    isEquippable: isEquippable,
    annotate: annotate,
    isFumblingGauntlets: isFumblingGauntlets,
    isOgreGauntlets: isOgreGauntlets,
    isDexGauntlets: isDexGauntlets,
    isDexRing: isDexRing,
    isAc5GateRing: isAc5GateRing,
    isArchmagiRobe: isArchmagiRobe,
    wornArchmagiRobe: wornArchmagiRobe,
    helmAcBonus: helmAcBonus,
    jewelryAcPlus: jewelryAcPlus,
    startingItems: startingItems,
    slotHas: slotHas,
    clearItem: clearItem,
    equip: equip,
    unequip: unequip,
    wornBonus: wornBonus,
    computeWornAC: computeWornAC,
    magicAcBonus: magicAcBonus,
    describeAC: describeAC,
    slotDef: slotDef,
    slotIcon: slotIcon,
    slotCell: slotCell
  };

  root.EquipmentSlots = EquipmentSlots;
})(typeof window !== 'undefined' ? window : globalThis);
