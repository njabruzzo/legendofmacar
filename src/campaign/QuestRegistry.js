/**
 * Quest items, crafting ingredients, and the campaign forge book.
 * Data plus a validator. Not loaded by index.html, and not merged
 * into src/crafting/recipes.json, so the live station pool is unchanged.
 *
 * Section 3.5: every ingredient maps to a level at or before the
 * recipe's neededBy. Section 2.2: every item Macar receives is usable
 * by a dwarf fighter. Class-restricted names fail even if flagged Y.
 */
(function (root) {
  'use strict';

  var ATTRIBUTION = 'This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.';

  var CLASS_RESTRICTED = {
    'Wand of Magic Missiles': 'magic-user (D13-A, 2.2)',
    'Scroll of 1-7 Spells': 'needs a caster (2.2)',
    'Ring of Wizardry': 'magic-user (2.2)'
  };

  /**
   * Earliest campaign level that can supply the ingredient.
   * how is drop, loot, pickup, dig, or craft.
   */
  var SOURCES = {
    barley: { level: 2, how: 'dig', where: 'L2 digging (1.2)' },
    resin: { level: 1, how: 'dig', where: 'L1+ digging' },
    powder: { level: 1, how: 'dig', where: 'L1+ digging' },
    ironstone: { level: 1, how: 'dig', where: 'L1+ digging' },
    timber: { level: 1, how: 'dig', where: 'L1+ digging' },
    bone: { level: 1, how: 'dig', where: 'L1+ digging' },
    starmetal: { level: 2, how: 'dig', where: 'L2+ digging (3.5)' },
    deepsilver: { level: 1, how: 'dig', where: 'Live ore seams. The deepsilver pick stays cut for lack of benefit.' },
    hide: { level: 4, how: 'drop', where: 'L4 worg pelt', source: 'worg_pelt' },
    silk: { level: 3, how: 'pickup', where: 'L3 spiders (3.5)' },
    spring: { level: 1, how: 'pickup', where: 'L1 Brass Walker toy salvage' },
    gear: { level: 1, how: 'pickup', where: 'L1 Brass Walker toy salvage' },
    emerald: { level: 1, how: 'pickup', where: 'L1 Brass Walker toy salvage' },
    spider_venom: { level: 1, how: 'drop', where: 'Cave and huge spiders, L1; also L3' },
    glowcap: { level: 1, how: 'pickup', where: 'Herb search, L1+' },
    fire_beetle_gland: { level: 1, how: 'drop', where: 'Fire beetles, L1 and L6' },
    ruby_guardian_2: { level: 2, how: 'drop', where: 'Ruby Guardian II' },
    ruby_guardian_4: { level: 4, how: 'drop', where: 'Ruby Guardian IV' },
    worg_pelt: { level: 4, how: 'drop', where: 'Worgs and wolves, L4' },
    drow_adamantite: { level: 5, how: 'drop', where: 'Drow warriors, L5' },
    magma_shard: { level: 6, how: 'drop', where: 'Fire elementals, L6' },
    heartstone: { level: 7, how: 'drop', where: 'Earth elementals, L7' },
    dragon_scale: { level: 9, how: 'loot', where: 'Red dragon corpse, 3 scales' },
    holy_anvil: { level: 9, how: 'pickup', where: 'Red dragon hoard' },
    star_hammer: { level: 2, how: 'craft', where: 'Star-Peen Hammer recipe' },
    adamantine_chain: { level: 5, how: 'craft', where: 'Adamantine Chain recipe' },
    adamantine_chain_1: { level: 7, how: 'craft', where: 'Adamantine Chain +1 recipe' }
  };

  function out(id, name, kind) {
    return { id: id, name: name, kind: kind, usableByMacar: 'Y' };
  }

  /** New forge book. Not the live recipes.json. */
  var FORGE_RECIPES = [
    {
      id: 'antitoxin',
      name: 'Antitoxin',
      srd: '3.4a',
      status: 'spec',
      neededBy: 3,
      availableFrom: 1,
      gp: 25,
      ingredientSets: [{ spider_venom: 1, glowcap: 1 }],
      output: out('antitoxin', 'Antitoxin', 'consumable')
    },
    {
      id: 'alchemists_fire',
      name: "Alchemist's Fire",
      srd: '3.4b',
      status: 'spec',
      neededBy: 3,
      availableFrom: 1,
      gp: 25,
      ingredientSets: [{ fire_beetle_gland: 1, resin: 1, powder: 1 }],
      output: out('alchemists_fire', "Alchemist's Fire", 'consumable')
    },
    {
      id: 'rune_hammer',
      name: 'Rune Hammer +2',
      srd: '3.4c',
      status: 'spec',
      neededBy: 6,
      availableFrom: 5,
      gp: 2000,
      ingredientSets: [{ star_hammer: 1, starmetal: 2, drow_adamantite: 2, ruby_guardian_4: 1 }],
      output: out('rune_hammer', 'Rune Hammer +2', 'weapon')
    },
    {
      id: 'shield_plus_1',
      name: 'Shield +1',
      srd: '3.4d',
      status: 'spec',
      neededBy: 4,
      availableFrom: 4,
      gp: 200,
      slot: 'secondary',
      sharesSlotWith: 'light crossbow',
      slotReason: 'The crossbow needs two hands, so Shield +1 stays in the secondary slot.',
      ingredientSets: [{ ironstone: 3, worg_pelt: 1, ruby_guardian_2: 1 }],
      output: out('shield_plus_1', 'Shield +1', 'shield')
    },
    {
      id: 'adamantine_chain',
      name: 'Adamantine Chain',
      srd: '3.4e',
      status: 'spec',
      neededBy: 5,
      availableFrom: 5,
      gp: 200,
      ingredientSets: [{ drow_adamantite: 3, ironstone: 4 }],
      output: out('adamantine_chain', 'Adamantine Chain', 'armor')
    },
    {
      id: 'adamantine_chain_1',
      name: 'Adamantine Chain +1',
      srd: '3.4f',
      status: 'spec',
      neededBy: 8,
      availableFrom: 7,
      gp: 2000,
      ingredientSets: [{ adamantine_chain: 1, heartstone: 2 }],
      output: out('adamantine_chain_1', 'Adamantine Chain +1', 'armor')
    },
    {
      id: 'adamantine_chain_2',
      name: 'Adamantine Chain +2',
      srd: '3.4g',
      status: 'spec',
      neededBy: 10,
      availableFrom: 9,
      gp: 20000,
      ingredientSets: [{ adamantine_chain_1: 1, dragon_scale: 1 }],
      requires: ['holy_anvil'],
      consumesRequires: false,
      output: out('adamantine_chain_2', 'Adamantine Chain +2', 'armor')
    },
    {
      id: 'potion_fire_resistance',
      name: 'Potion of Fire Resistance',
      srd: '3.4h',
      status: 'spec',
      neededBy: 6,
      availableFrom: 1,
      gp: 100,
      ingredientSets: [
        { fire_beetle_gland: 2, glowcap: 1 },
        { magma_shard: 1, glowcap: 1 }
      ],
      output: out('fireres', 'Potion of Fire Resistance', 'consumable')
    },
    {
      id: 'bolts_plus_1',
      name: 'Bolts +1',
      srd: '3.4i',
      status: 'spec',
      neededBy: 5,
      availableFrom: 2,
      gp: 100,
      conditional: 'ammo-plus',
      ingredientSets: [{ timber: 1, ironstone: 1, starmetal: 1 }],
      output: out('bolts_plus_1', 'Bolts +1', 'ammo')
    }
  ];

  /**
   * Live recipes.json ids. status cut skips the obtainability check.
   * The live file itself is not edited.
   */
  var LIVE_PLAN = {
    healing_potion: { status: 'keep', neededBy: 2, origin: 'live' },
    longsword: { status: 'cut', neededBy: null, origin: 'live', reason: '3.3 no benefit over the hammer' },
    pack_bombs: { status: 'keep', neededBy: 1, origin: 'live' },
    resin_fuse_bombs: { status: 'keep', neededBy: 1, origin: 'live' },
    cave_ale: { status: 'keep', neededBy: 2, origin: 'live' },
    hide_cloak: { status: 'keep', neededBy: 4, origin: 'live', conditional: 'base-ac', rule: 'Zero-plus armor stays only when its base AC beats current armor.', hideFrom: 'L4 worg pelt' },
    bone_scale: { status: 'keep', neededBy: 4, origin: 'live', conditional: 'base-ac', rule: 'Zero-plus armor stays only when its base AC beats current armor.' },
    deepsilver_pick: { status: 'cut', neededBy: null, origin: 'live', reason: '3.3 no benefit unless dig speed rises' },
    star_hammer: { status: 'keep', neededBy: 2, origin: 'live' },
    silk_jack: { status: 'keep', neededBy: 4, origin: 'live', conditional: 'base-ac', rule: 'Zero-plus armor stays only when its base AC beats current armor.' },
    iron_case_bombs: { status: 'keep', neededBy: 1, origin: 'live' },
    marrow_draught: { status: 'keep', neededBy: 1, origin: 'live' },
    borgas_burp: { status: 'keep', neededBy: 2, origin: 'live', wielder: 'pordoom', rule18: false, note: "Pordoom's kin item, not a rule-18 case. The fix to throw the tapped row still applies later." },
    emerald_clockwork_bolts: { status: 'keep', neededBy: 1, origin: 'live' }
  };

  var QUEST_ITEMS = [
    { id: 'grond_tooth_electrum', name: 'Electrum Tooth 1', usableByMacar: 'Y', kind: 'quest' },
    { id: 'grond_tooth_electrum_2', name: 'Electrum Tooth 2', usableByMacar: 'Y', kind: 'quest' },
    { id: 'grond_tooth_electrum_3', name: 'Electrum Tooth 3', usableByMacar: 'Y', kind: 'quest' },
    { id: 'grond_tooth_electrum_4', name: 'Electrum Tooth 4', usableByMacar: 'Y', kind: 'quest' },
    { id: 'grond_tooth_electrum_5', name: 'Electrum Tooth 5', usableByMacar: 'Y', kind: 'quest' },
    { id: 'grond_tooth_electrum_6', name: 'Electrum Tooth 6', usableByMacar: 'Y', kind: 'quest' },
    { id: 'grond_tooth_electrum_7', name: 'Electrum Tooth 7', usableByMacar: 'Y', kind: 'quest' },
    { id: 'grond_tooth_bronze', name: 'Bronze Tooth', usableByMacar: 'Y', kind: 'quest' },
    { id: 'pixie_dust', name: 'Pixie Dust', usableByMacar: 'Y', kind: 'consumable' },
    { id: 'golden_egg', name: 'Golden Egg', usableByMacar: 'Y', kind: 'consumable' },
    { id: 'holy_hammer', name: 'Holy Hammer', usableByMacar: 'Y', kind: 'weapon' },
    { id: 'holy_anvil', name: 'Holy Anvil of Truth', displayName: 'Holy Anvil of Truth', usableByMacar: 'Y', kind: 'quest' },
    { id: 'temple-ritual', name: 'Temple ritual', usableByMacar: 'Y', kind: 'ritual' }
  ];

  function setsOf(recipe) {
    if (recipe.ingredientSets && recipe.ingredientSets.length) return recipe.ingredientSets;
    if (recipe.ingredients) return [recipe.ingredients];
    return [];
  }

  function earliest(recipe, sources) {
    var sets = setsOf(recipe);
    var best = null;
    for (var s = 0; s < sets.length; s++) {
      var at = 0;
      var keys = Object.keys(sets[s]);
      for (var i = 0; i < keys.length; i++) {
        var src = sources[keys[i]];
        if (!src) return null;
        if (src.level > at) at = src.level;
      }
      if (best == null || at < best) best = at;
    }
    var req = recipe.requires || [];
    for (var r = 0; r < req.length; r++) {
      var tool = sources[req[r]];
      if (!tool) return null;
      if (best == null || tool.level > best) best = tool.level;
    }
    return best;
  }

  function validateRecipes(recipes, sources) {
    var errors = [];
    var book = sources || SOURCES;
    for (var r = 0; r < recipes.length; r++) {
      var recipe = recipes[r];
      if (recipe.status === 'cut') continue;
      if (!recipe.output || recipe.output.usableByMacar !== 'Y') {
        errors.push(recipe.id + ' output is not usable by Macar');
      } else if (CLASS_RESTRICTED[recipe.output.name]) {
        errors.push(recipe.id + ' output ' + recipe.output.name + ' is ' + CLASS_RESTRICTED[recipe.output.name]);
      }
      var sets = setsOf(recipe);
      if (!sets.length) errors.push(recipe.id + ' has no ingredients');
      var req = recipe.requires || [];
      for (var q = 0; q < req.length; q++) {
        var tool = book[req[q]];
        if (!tool) errors.push(recipe.id + ' requires ' + req[q] + ' and that tool has no source');
        else if (recipe.neededBy == null || tool.level > recipe.neededBy) {
          errors.push(recipe.id + ' requires ' + req[q] + ' at L' + tool.level + ' after L' + recipe.neededBy);
        }
      }
      for (var s = 0; s < sets.length; s++) {
        var keys = Object.keys(sets[s]);
        for (var i = 0; i < keys.length; i++) {
          var id = keys[i];
          var src = book[id];
          if (!src) errors.push(recipe.id + ' ingredient ' + id + ' has no source');
          else if (recipe.neededBy == null || src.level > recipe.neededBy) {
            errors.push(recipe.id + ' ingredient ' + id + ' arrives at L' + src.level + ' after L' + recipe.neededBy);
          }
        }
      }
    }
    return errors;
  }

  function validateItems(items) {
    var errors = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (CLASS_RESTRICTED[it.name]) errors.push(it.name + ' is ' + CLASS_RESTRICTED[it.name]);
      if (it.usableByMacar !== 'Y') errors.push((it.name || it.id) + ' is not usable by Macar');
    }
    return errors;
  }

  function liveRecipesForAudit(liveBook) {
    var outRecipes = [];
    var list = (liveBook && liveBook.recipes) || [];
    for (var i = 0; i < list.length; i++) {
      var row = list[i];
      var plan = LIVE_PLAN[row.id];
      if (!plan) {
        outRecipes.push({
          id: row.id,
          status: 'keep',
          neededBy: null,
          ingredients: row.ingredients,
          output: { id: row.id, name: row.name, usableByMacar: 'Y' }
        });
        continue;
      }
      outRecipes.push({
        id: row.id,
        status: plan.status,
        neededBy: plan.neededBy,
        ingredients: row.ingredients,
        output: { id: row.id, name: row.name, usableByMacar: 'Y' }
      });
    }
    return outRecipes;
  }

  function audit(liveBook) {
    var recipes = liveRecipesForAudit(liveBook).concat(FORGE_RECIPES);
    var items = QUEST_ITEMS.concat(FORGE_RECIPES.map(function (r) { return r.output; }));
    return validateRecipes(recipes, SOURCES).concat(validateItems(items));
  }

  var api = {
    ATTRIBUTION: ATTRIBUTION,
    CLASS_RESTRICTED: CLASS_RESTRICTED,
    SOURCES: SOURCES,
    FORGE_RECIPES: FORGE_RECIPES,
    LIVE_PLAN: LIVE_PLAN,
    QUEST_ITEMS: QUEST_ITEMS,
    earliest: earliest,
    setsOf: setsOf,
    validateRecipes: validateRecipes,
    validateItems: validateItems,
    liveRecipesForAudit: liveRecipesForAudit,
    audit: audit,
    wired: false
  };

  root.QuestRegistry = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
