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
        station: 'camp',
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
        station: 'camp',
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
            d: 'Forged at the camp anvil. Plain steel, honest edge.',
            plus: 0
          }
        },
        info: "Plain long sword into MACAR's pack. Weapon Smithing rank 2."
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
