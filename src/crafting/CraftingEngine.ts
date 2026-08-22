import type {
  CraftCheck,
  CraftRecipe,
  CraftRecipeBook,
  CraftResult,
  CraftingBridge,
  ResourceId,
} from './types';

export type { CraftCheck, CraftRecipe, CraftRecipeBook, CraftResult, CraftingBridge } from './types';

export class CraftingEngine {
  private static recipes: CraftRecipe[] = [];
  private static byId: Record<string, CraftRecipe> = Object.create(null);

  /** Load recipe book from JSON (GitHub Pages path). */
  static async load(url = 'src/crafting/recipes.json'): Promise<void> {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Crafting recipes failed to load: ' + res.status);
    const book = (await res.json()) as CraftRecipeBook;
    CraftingEngine.setRecipes(book.recipes || []);
  }

  static setRecipes(recipes: CraftRecipe[]): void {
    CraftingEngine.recipes = recipes.slice();
    CraftingEngine.byId = Object.create(null);
    for (const recipe of CraftingEngine.recipes) {
      CraftingEngine.byId[recipe.id] = recipe;
    }
  }

  static list(station?: CraftRecipe['station']): CraftRecipe[] {
    if (!station) return CraftingEngine.recipes.slice();
    return CraftingEngine.recipes.filter(r => !r.station || r.station === station);
  }

  static get(id: string): CraftRecipe | null {
    return CraftingEngine.byId[id] || null;
  }

  /** Verify ingredients and optional skill rank without mutating inventory. */
  static canCraft(recipeId: string, bridge: CraftingBridge): CraftCheck {
    const recipe = CraftingEngine.get(recipeId);
    if (!recipe) {
      return { ok: false, recipeId, message: 'Unknown recipe.' };
    }

    const missing: Record<ResourceId, number> = {};
    for (const [res, need] of Object.entries(recipe.ingredients)) {
      const have = bridge.getResource(res);
      if (have < need) missing[res] = need - have;
    }

    if (recipe.skill && recipe.skillLevel != null && bridge.skillLevel) {
      const lvl = bridge.skillLevel(recipe.skill);
      if (lvl < recipe.skillLevel) {
        return {
          ok: false,
          recipeId,
          message: `Need ${recipe.skill} rank ${recipe.skillLevel} (have ${lvl}).`,
          missing: Object.keys(missing).length ? missing : undefined,
        };
      }
    }

    if (Object.keys(missing).length) {
      return { ok: false, recipeId, message: 'Missing materials.', missing };
    }

    return { ok: true, recipeId, message: 'Ready to craft.' };
  }

  /** Spend ingredients and grant the recipe output through the bridge. */
  static craftItem(recipeId: string, bridge: CraftingBridge): CraftResult {
    const check = CraftingEngine.canCraft(recipeId, bridge);
    if (!check.ok) return check;

    const recipe = CraftingEngine.get(recipeId)!;
    if (!bridge.spendResources(recipe.ingredients)) {
      return { ok: false, recipeId, message: 'Could not spend materials.' };
    }

    bridge.applyOutput(recipe);

    if (recipe.skill && recipe.skillXp && bridge.learnSkill) {
      bridge.learnSkill(recipe.skill, recipe.skillXp);
    }

    return { ok: true, recipeId, message: 'Crafted ' + recipe.name + '.' };
  }
}

export default CraftingEngine;

declare global {
  interface Window {
    CraftingEngine: typeof CraftingEngine;
  }
}
