/**
 * Browser build of src/crafting/CraftingEngine.ts (no bundler — GitHub Pages).
 * Keep recipes in sync with src/crafting/recipes.json.
 */
(function (root) {
  'use strict';

  var DEFAULT_RECIPES = {
    version: 1,
    recipes: [
      {
        id: 'healing_potion',
        name: 'Healing Potion',
        group: 'BREWERY',
        station: 'field',
        skill: 'forage',
        skillLevel: 1,
        skillXp: 6,
        ingredients: { barley: 1, resin: 1 },
        output: {
          kind: 'potion',
          item: { n: 'Cure Light Wounds', d: 'Cures 10 hp.', k: 'heal10', gp: 400 }
        },
        info: 'Cure Light Wounds draught into the ale flask.'
      },
      {
        id: 'longsword',
        name: 'Long Sword',
        group: 'FORGE',
        station: 'field',
        skill: 'weapon',
        skillLevel: 2,
        skillXp: 10,
        ingredients: { ironstone: 3, timber: 1 },
        output: {
          kind: 'weapon',
          item: {
            n: 'Long Sword',
            cat: 'Sword',
            k: 'weapon',
            d: 'Forged at the station anvil. Plain steel, honest edge.',
            plus: 0
          }
        },
        info: "Plain long sword into MACAR's pack. Weapon Smithing rank 2."
      },
      {
        id: 'pack_bombs',
        name: 'Pack Bombs',
        group: 'BENCH',
        station: 'field',
        skill: 'bomb',
        skillLevel: 1,
        skillXp: 10,
        ingredients: { powder: 2, ironstone: 1 },
        output: { kind: 'pack', field: 'bombs', count: 2, packKey: 'macar' },
        info: "Powder, casing, fuse — two 10d10 throwables into MACAR's pack."
      },
      {
        id: 'resin_fuse_bombs',
        name: 'Resin-Fuse Bombs',
        group: 'BENCH',
        station: 'field',
        skill: 'bomb',
        skillLevel: 2,
        skillXp: 8,
        ingredients: { powder: 1, resin: 2 },
        output: { kind: 'pack', field: 'bombs', count: 2, packKey: 'macar' },
        info: 'Tackier fuse. Two more 10d10 bombs.'
      },
      {
        id: 'cave_ale',
        name: 'Cave Ale',
        group: 'BREWERY',
        station: 'field',
        skill: 'ale',
        skillLevel: 1,
        skillXp: 8,
        ingredients: { barley: 2 },
        output: { kind: 'pack', field: 'ales', count: 2, packKey: 'macar' },
        info: 'Two draughts. Each heals d10.'
      },
      {
        id: 'hide_cloak',
        name: 'Hide Cloak',
        group: 'TAILOR',
        station: 'field',
        skill: 'cloth',
        skillLevel: 1,
        skillXp: 8,
        ingredients: { hide: 2, silk: 1 },
        output: {
          kind: 'armor',
          item: {
            n: 'Hide Cloak',
            cat: 'Armor/Shield',
            k: 'armor',
            d: 'Sewn at a field station. Quiet hide over the mail.',
            plus: 0
          }
        },
        info: "A hide cloak into MACAR's pack."
      },
      {
        id: 'bone_scale',
        name: 'Bone-Scale Shirt',
        group: 'FORGE',
        station: 'field',
        skill: 'armour',
        skillLevel: 2,
        skillXp: 8,
        ingredients: { bone: 3, hide: 1, ironstone: 1 },
        output: {
          kind: 'armor',
          item: {
            n: 'Bone-Scale Shirt',
            cat: 'Armor/Shield',
            k: 'armor',
            d: 'Overlapped bone on hide. Forged at the anvil.',
            plus: 0
          }
        },
        info: "Bone-scale shirt into MACAR's pack. Armour rank 2."
      },
      {
        id: 'deepsilver_pick',
        name: 'Deepsilver Pick',
        group: 'FORGE',
        station: 'field',
        skill: 'mining',
        skillLevel: 2,
        skillXp: 8,
        ingredients: { deepsilver: 2, timber: 1, ironstone: 1 },
        output: {
          kind: 'weapon',
          item: {
            n: 'Deepsilver Pick',
            cat: 'Sword',
            k: 'weapon',
            d: 'A pale pick from the anvil. Honest and ugly.',
            plus: 0
          }
        },
        info: "Deepsilver pick into MACAR's pack. Mining rank 2."
      },
      {
        id: 'star_hammer',
        name: 'Star-Peen Hammer',
        group: 'FORGE',
        station: 'field',
        skill: 'weapon',
        skillLevel: 3,
        skillXp: 10,
        ingredients: { starmetal: 1, ironstone: 2, timber: 1 },
        output: {
          kind: 'weapon',
          item: {
            n: 'Star-Peen Hammer',
            cat: 'Sword',
            k: 'weapon',
            d: 'Starmetal peen on an iron head. The seam remembers.',
            plus: 1
          }
        },
        info: "Star-peen hammer into MACAR's pack. Weapon Smithing rank 3."
      },
      {
        id: 'silk_jack',
        name: 'Silk-Lined Jack',
        group: 'TAILOR',
        station: 'field',
        skill: 'cloth',
        skillLevel: 2,
        skillXp: 8,
        ingredients: { silk: 2, hide: 1 },
        output: {
          kind: 'armor',
          item: {
            n: 'Silk-Lined Jack',
            cat: 'Armor/Shield',
            k: 'armor',
            d: 'Spider silk under hide. Quiet in the dark.',
            plus: 0
          }
        },
        info: "Silk-lined jack into MACAR's pack. Cloth rank 2."
      },
      {
        id: 'iron_case_bombs',
        name: 'Iron-Case Bombs',
        group: 'BENCH',
        station: 'field',
        skill: 'bomb',
        skillLevel: 3,
        skillXp: 10,
        ingredients: { ironstone: 3, timber: 1, powder: 1 },
        output: { kind: 'pack', field: 'bombs', count: 3, packKey: 'macar' },
        info: 'Three iron-cased 10d10 throwables into MACAR\'s pack. Bomb rank 3.'
      },
      {
        id: 'marrow_draught',
        name: 'Marrow Draught',
        group: 'BREWERY',
        station: 'field',
        skill: 'forage',
        skillLevel: 2,
        skillXp: 8,
        ingredients: { bone: 2, resin: 1 },
        output: {
          kind: 'potion',
          item: { n: 'Marrow Draught', d: 'Cures 20 hp.', k: 'heal20' }
        },
        info: 'Marrow draught into the ale flask. Forage rank 2.'
      },
      {
        id: 'borgas_burp',
        name: "Borga's Burp",
        group: 'BENCH',
        station: 'field',
        sapper: true,
        knownBy: 'pordoom',
        skill: 'bomb',
        skillLevel: 1,
        skillXp: 8,
        ingredients: { powder: 1, barley: 1, resin: 1 },
        output: { kind: 'pack', field: 'burps', count: 1, packKey: 'pordoom' },
        info: "The sapper's brew-bomb. 3d10 in a wet cough of fire."
      }
    ]
  };

  function CraftingEngine() {}

  CraftingEngine.recipes = [];
  CraftingEngine.byId = Object.create(null);

  CraftingEngine.setRecipes = function (recipes) {
    CraftingEngine.recipes = (recipes || []).slice();
    CraftingEngine.byId = Object.create(null);
    for (var i = 0; i < CraftingEngine.recipes.length; i++) {
      var r = CraftingEngine.recipes[i];
      CraftingEngine.byId[r.id] = r;
    }
  };

  CraftingEngine.load = function (url) {
    url = url || 'src/crafting/recipes.json';
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('Crafting recipes failed: ' + res.status);
        return res.json();
      })
      .then(function (book) {
        CraftingEngine.setRecipes(book.recipes || []);
      })
      .catch(function () {
        CraftingEngine.setRecipes(DEFAULT_RECIPES.recipes);
      });
  };

  CraftingEngine.list = function (station) {
    if (!station) return CraftingEngine.recipes.slice();
    var out = [];
    for (var i = 0; i < CraftingEngine.recipes.length; i++) {
      var r = CraftingEngine.recipes[i];
      if (!r.station || r.station === station) out.push(r);
    }
    return out;
  };

  CraftingEngine.get = function (id) {
    return CraftingEngine.byId[id] || null;
  };

  CraftingEngine.stationPool = function () {
    var out = [];
    for (var i = 0; i < CraftingEngine.recipes.length; i++) {
      var r = CraftingEngine.recipes[i];
      if (r.sapper) continue;
      if (!r.station || r.station === 'field') out.push(r);
    }
    return out;
  };

  CraftingEngine.pickRandom = function (count, rng, filter) {
    var roll = rng || Math.random;
    var pool = CraftingEngine.stationPool();
    if (filter) {
      var filtered = [];
      for (var f = 0; f < pool.length; f++) if (filter(pool[f])) filtered.push(pool[f]);
      pool = filtered;
    }
    var n = Math.max(0, Math.min(count | 0, pool.length));
    var copy = pool.slice();
    var out = [];
    for (var i = 0; i < n; i++) {
      var j = i + Math.floor(roll() * (copy.length - i));
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
      out.push(copy[i]);
    }
    return out;
  };

  CraftingEngine.canCraft = function (recipeId, bridge) {
    var recipe = CraftingEngine.get(recipeId);
    if (!recipe) return { ok: false, recipeId: recipeId, message: 'Unknown recipe.' };

    var missing = Object.create(null);
    var ing = recipe.ingredients || {};
    for (var res in ing) {
      if (!Object.prototype.hasOwnProperty.call(ing, res)) continue;
      var need = ing[res];
      var have = bridge.getResource(res);
      if (have < need) missing[res] = need - have;
    }

    if (recipe.skill && recipe.skillLevel != null && bridge.skillLevel) {
      var lvl = bridge.skillLevel(recipe.skill);
      if (lvl < recipe.skillLevel) {
        return {
          ok: false,
          recipeId: recipeId,
          message: 'Need ' + recipe.skill + ' rank ' + recipe.skillLevel + ' (have ' + lvl + ').',
          missing: Object.keys(missing).length ? missing : undefined
        };
      }
    }

    if (Object.keys(missing).length) {
      return { ok: false, recipeId: recipeId, message: 'Missing materials.', missing: missing };
    }

    return { ok: true, recipeId: recipeId, message: 'Ready to craft.' };
  };

  CraftingEngine.craftItem = function (recipeId, bridge) {
    var check = CraftingEngine.canCraft(recipeId, bridge);
    if (!check.ok) return check;

    var recipe = CraftingEngine.get(recipeId);
    if (!bridge.spendResources(recipe.ingredients)) {
      return { ok: false, recipeId: recipeId, message: 'Could not spend materials.' };
    }

    bridge.applyOutput(recipe);

    if (recipe.skill && recipe.skillXp && bridge.learnSkill) {
      bridge.learnSkill(recipe.skill, recipe.skillXp);
    }

    return { ok: true, recipeId: recipeId, message: 'Crafted ' + recipe.name + '.' };
  };

  CraftingEngine.setRecipes(DEFAULT_RECIPES.recipes);

  root.CraftingEngine = CraftingEngine;
})(typeof window !== 'undefined' ? window : globalThis);
