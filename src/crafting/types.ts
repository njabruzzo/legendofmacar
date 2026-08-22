/** Resource keys match RESMETA / G.res in index.html */
export type ResourceId = string;

export type CraftItemKind = 'potion' | 'weapon' | 'armor' | 'magic' | 'pack';

/** Where a recipe can appear. Unscoped recipes are valid at camp and field stations. */
export type CraftStationKind = 'camp' | 'field';

/** Item payload stowed via givePotion / giveMagic / addToPack */
export interface CraftItemDef {
  n: string;
  d?: string;
  k?: string;
  cat?: string;
  gp?: number;
  plus?: number;
  vs?: string;
  charges?: number;
  cursed?: boolean;
}

export interface CraftOutput {
  kind: CraftItemKind;
  item?: CraftItemDef;
  /** For kind === 'pack' */
  field?: string;
  count?: number;
  packKey?: string;
}

export interface CraftRecipe {
  id: string;
  name: string;
  group: string;
  station?: CraftStationKind;
  skill?: string;
  skillLevel?: number;
  skillXp?: number;
  /** Sapper-only recipe (Pordoom). Never rolled into a station's d4 pool. */
  sapper?: boolean;
  knownBy?: string;
  ingredients: Record<ResourceId, number>;
  output: CraftOutput;
  info?: string;
}

export interface CraftRecipeBook {
  version: number;
  recipes: CraftRecipe[];
}

/** Bridge into Legend of Macar runtime (G.res, packs, skills). */
export interface CraftingBridge {
  getResource(id: ResourceId): number;
  spendResources(cost: Record<ResourceId, number>): boolean;
  applyOutput(recipe: CraftRecipe): void;
  skillLevel?(skill: string): number;
  learnSkill?(skill: string, xp: number): void;
}

export interface CraftCheck {
  ok: boolean;
  recipeId: string;
  message: string;
  missing?: Record<ResourceId, number>;
}

export type CraftResult = CraftCheck;
