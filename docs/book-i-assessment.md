# Legend of Macar — Book I assessment

For Nick. This is a design read of the live approach (vanilla JS, Canvas 2D isometric, GitHub Pages, localStorage). It is not a rewrite plan and does not change game logic.

Read against `main` after PR #84. Live site: [www.legendofmacar.com](https://www.legendofmacar.com).

## In-flight PRs — do not fight these

| PR | State | What it owns | Implication |
| --- | --- | --- | --- |
| [#81](https://github.com/njabruzzo/legendofmacar/pull/81) | Draft | Stair / lift / bronze-door landings so iso walls stop burying descents | Hold any layout move of the Chapter I lift, Chapter II stairs, or warren king-stair until this lands or is closed |
| [#80](https://github.com/njabruzzo/legendofmacar/pull/80) | Open | Chapter I fallen kin + cave-in | Largely already on `main` via #82 / #83 and the corpse-spread commit. Treat as stale unless it still has unique art |
| [#44](https://github.com/njabruzzo/legendofmacar/pull/44) | Draft | Pure black behind wall faces | Hold lighting / fog-renderer experiments until this is merged or dropped |

Recent `main` already has: fallen-kin opening, paper-doll pack, AD&D to-hit matrices, craft stations, ghost-kit, spider-lord poison, mobile Attack/Defend on the right, Android tear fixes, secret hoards / Goblin King.

---

## 1. What the game already does well

This is not a prototype waiting for “real RPG systems.” The Baldur’s Gate-shaped loop is in the file.

**The opening is a scene, not a lecture.** Chapter I drops Macar in rubble with four named corpses (Pordum, Fendur, Orbo, Talpor), a ruby door, and one job: walk to the kin. Intro splash + one hint (`drawIntro`, `CRUSH_SPOTS`, `drawFallenKin` in `index.html`). No skill tree, no class picker.

**Information design is already BG-like.** Party portraits with HP / AC / class (`drawPortraitStack`), 60-foot fog of war (`SIGHT_R=12`, `rebuildVision`), minimap with letter tokens and `E` for visible foes (`drawMinimap`), collapsible objectives (`drawObjectives`), and a world-space guide arrow the code itself calls “the single biggest nav win” (`drawGuideArrow`).

**Combat is AD&D 1e under a real-time skin, and it is real.** Fighter / cleric / thief / monster matrices (`thacNeed`, tested in `src/combat/AttackMatrix.test.js`). Dwarf CON saves (`src/combat/DwarfSaves.test.js`). Surprise and initiative become stun windows (`beginFight`). Floating miss / save / poison / rust text (`ftext`). Macar already has a painted melee arc (`drawHeroMeleeArc`). Hurt vignette, hit-stop, screen shake, death flash.

**Pack and craft are shipped, not stubbed.** Paper-doll AD&D slots (`src/packs/EquipmentSlots.js`). Per-kin packs, ghost-kit take/use (`GhostKit.js`), borrow-and-return after camp (`BorrowKit.js`). CraftingEngine + `src/crafting/recipes.json` with a station UI that already shows READY / LOCKED, materials on hand, and a FORGE button (`drawCraft`). One station per chapter (`src/props/CraftStation.js`).

**Saves exist and the title already speaks “Continue.”** One localStorage slot (`src/saves/GameSave.js`). Title shows **Continue** vs **New descent** when a book is marked (`drawTitle`). Pause and camp have **Save**. Chapter clear writes quietly (`endChapter` → `writeGameSave(true)`). Label includes chapter name and time.

**The art pipeline is the identity.** ~977 PNGs under `assets/` (creatures with walk / atk / dead / ghost / back frames, props, tiles, UI icons). Baked rock + lightmap + bloom, phone-safe renderer, diagnostic ⚑ overlay. Do not replace this.

**Book I has a spine.** Five chapters, unlock on clear, camp between them, lair packs instead of kitchen-sink waves (`src/dungeon/MonsterPacks.test.js`), secret stonework, Goblin King optional deep (`GoblinWarren.test.js`), dwarf mouth → Mouth-Key + Shadow Cleaver (`src/props/DwarfMouth.js`).

---

## 2. Highest-leverage improvements (stay in this approach)

Each item is something a new player can feel. Sizes assume one idea-sized PR, vanilla JS, no new engine.

### 1. Make combat readable in the room (not only in the dice)

**Player-facing:** You can tell who is swinging, whether it hit, and how much it hurt, without decoding a pile of stacked numbers.

**Why:** `addAttack` already rolls d20 vs AC and `say()`s a full line, and `drawLog` already paints a COMBAT LOG panel — **but `drawLog` is never called.** `drawHUD` skips it. In the world, `ftext` stacks `miss 14`, `16 vs 10`, and `-8` on the same tile. Foes have no wind-up tell; only Macar gets `drawHeroMeleeArc`. Initiative is a silent stun. The math is good; the feedback is not.

**Feasible because:** Reuse `G.log` + unused `drawLog`. Split `ftext` so damage (`-8`) is large and to-hit is smaller or log-only. When `e.atk>0` on a foe, draw a short ground ring (same pattern as Macar’s gold ellipse). `e.stun` can tint the portrait or show “WAIT”.

**Size:** medium.

### 2. Name the HUD verbs so a new player can use them

**Player-facing:** The bar reads as actions, not identical gold icons. Two searches stop meaning the same thing. Craft stops pretending it is always available.

**Why:** `HUDSKILLS` already has labels, and `drawSlot` draws them when the button is large enough — but both stone-search and herb-search are labeled **Search**. HUD **Craft** (`openCraftBench`) fails with “Macar needs a crafting station” unless you are standing on the anvil. **RALLY** exists (`ABIL`, key `5`) and is listed on the pause screen, but it is not on the HUD. Desktop parks ~11 skills in one row.

**Feasible because:** Change the two `label:` strings (Herb / Stone, or Forage / Seam). Dim Craft and point `drawGuideArrow` at `nearestCraftStation` when tapped far away. Put Rally on the HUD or drop it from the pause key list. No new system.

**Size:** small.

### 3. Make the save book trustworthy

**Player-facing:** You always know whether the book is marked. Continue loads that mark. New descent asks before it burns it. Dying offers that mark, not only “restart the chapter from scratch.”

**Why:** Autosave runs on chapter clear only. Camp rest (`campRest`) heals, advances the day, and returns borrowed gear — **and does not save.** Death (`drawDead`) is **Try again** → `startChapter(G.ch)`, which wipes the mid-floor position even if a save exists. **New descent** calls `startChapter(1)` with no confirm and does not `GameSave.clear`. One slot (`legendofmacar.save.v1`) is the right call for GitHub Pages; the hole is *when* it writes and *how* death / new-game talk about it.

**Feasible because:** `writeGameSave`, `loadSavedGame`, `GameSave.has` / `label` / `clear` already exist. Call quiet save at the end of a successful `campRest`. Death menu: Continue (load) + Try again. Title: confirm New descent, then `GameSave.clear`. Optional: a small book pip on the pause button after a write.

**Size:** small.

### 4. Use audio as information, not only as a soundtrack

**Player-facing:** A hit sounds like a hit. A miss is dry. The menu ticks. Low HP and Macar-down have a sting. Battle music is not the title theme again.

**Why:** There are three loops (`assets/music/`: Song of the Forge, The Cave, Dungeon_1). `wantedMusic()` already swaps title / ch1 / ch2 / battle — **but battle points at the same file as title.** There is **no `assets/sfx/`** and no `playSfx`. Unlock-on-gesture and a single `<audio id="bgm">` already work.

**Feasible because:** Add a second `<audio>` (or a tiny Web Audio buffer pool) for one-shot stingers. Hook existing events: `damage`, miss in `addAttack`, `menuBtn` / `fire`, `G.hurt`, `G.scene='dead'`, `beginFight`. Keep CC-licensed shorts next to `CREDITS.txt`. Do not build a mixer app.

**Size:** small for UI + hit/miss; medium if you also replace battle BGM.

### 5. Teach Book I by revealing verbs, not by dumping the whole miner kit

**Player-facing:** The first minutes are: walk, take the kin’s kit, touch the ruby, fight, ride the lift. Dig, forage, camp, and craft show up when the floor needs them.

**Why:** Ch1 intro copy is already tight. Then `drawIntro`’s Descend button fires a chain of `G.taught` hints (move / dig / herb / floor) — and the HUD still shows Pack, Defend, Attack, Shoot, Throw, Heal, Search, Search, Dig, Camp, Craft from frame one. Later hints cite “1–4 in 6” and the Dungeon Masters Guide. That is table-culture flavor for *you*; it is noise for a first-time player.

**Feasible because:** `G.taught` is already saved. Gate HUD slots with the same flags (show Dig after first solid wall, Craft after the station is seen, Camp after first blood). Keep the dwarf voice in `say()`, not in a tutorial overlay.

**Size:** small.

### 6. Let juice ride the sprites you already paint

**Player-facing:** A blow pops. Loot reads. The ruby door and the anvil ask to be touched. The game still looks like this game.

**Why:** Hit-stop, shake, flash, bursts, floating text, embers, icon `_w1/_w2/_atk` frames, and Macar’s swing arc already exist. Foes do not telegraph. Loot piles and the craft station do not pulse the way the interact prompt does (`drawPromptBtn`). That gap is feedback, not a missing engine.

**Feasible because:** Copy `drawHeroMeleeArc` / gold ellipse to foes on `e.atk`. Reuse the prompt pulse on `k==='craftstation'`, `k==='rubydoor'`, and loot. Keep the PNG pipeline; do not reskin the game.

**Size:** small.

### 7. Accessibility that fits a canvas game

**Player-facing:** Buttons have unique words. HP is a number, not only a color. Combat can be read as text. Hints wrap. Color is never the only “you may click this.”

**Why:** Party HP already prints `12/28 hp` next to the bar (good). Foe world-bars are color-only until they are bosses (`drawEnt`). READY / LOCKED on craft already uses words (keep that). Two Search labels fail uniqueness. Long `hint()` strings do not wrap (`drawHint` is one `fillText`). The ⚑ overlay is DOM — proof you can put a little chrome outside the canvas if needed (mute, continue). Full screen-reader play is not realistic for this renderer; do not promise it.

**Feasible because:** Unique HUD labels (item 2), wrap `drawHint`, put HP digits on boss / hurt foes, keep Continue as a real button. No UI framework.

**Size:** small.

### 8. Make the anvil findable the first time

**Player-facing:** You find one forge on the floor, walk up, get “Craft at the station,” and understand recipes are *here*, not in a global menu.

**Why:** Stations are hardcoded per chapter (`CraftStation.SPOTS`) and dress into the level, but nothing marks them on the minimap or guide until you already know. HUD Craft is a trap (item 2). Camp after a chapter has a *second* craft list (`campActions`) that does not use the station — two crafts, two places.

**Feasible because:** Minimap already draws special tiles (bronze = gold). Add a distinct mark for `k==='craftstation'`. First Craft tap while far: hint + guide arrow. Later: one sentence in the Ch1 intro after the kin are looted. Leave the Engine / recipes file alone.

**Size:** small.

---

## 3. What not to do

- **Do not swap engines or add a bundler / React / Phaser / TypeScript build.** `SkillSystem.ts` is a comment-blueprint; the game loads `SkillSystem.js` on GitHub Pages. Dual `.ts`/`.js` for CraftingEngine is already a sync tax. Do not grow it.
- **Do not extract `index.html` (10,924 lines) into an ECS.** `registerSystem` + `SkillSystem` is the right *increment*. Combat, dungeon, and renderer still live as functions in one file, and the tests (`AttackMatrix.test.js` and friends) scrape those functions out of the HTML on purpose. A giant split PR will stall features.
- **Do not add a backend, accounts, cloud saves, or multiplayer.** The product is a Pages site and one localStorage book.
- **Do not convert combat to tabletop turns.** It is real-time with AD&D rolls. Initiative is already a stun window. A round clock would fight `SkillSystem` cooldowns and the mobile HUD.
- **Do not add a lecture tutorial, quest log app, dialogue tree tool, or crafting minigame.** Intro cards, `hint()`, `say()`, NPC `startTalk`, and the craft station UI exist.
- **Do not rebuild the bestiary or add “more monsters.”** The Underdark list is huge. Lair packs (`spawnLairGroup`) are the design. More kinds will not make Chapter I better.
- **Do not reskin to a new art bible.** The juice work is feedback on *these* sprites.
- **Do not land layout or wall-renderer work that races #81 or #44.**
- **Do not keep editing `legend-of-macar (2).html` or `index-4.html` as if they were the game.** `index.html` is the live file; the other two are stale copies.

---

## 4. Suggested build order (idea-sized PRs)

Do these on `main` as separate PRs. Each should ship with the matching icon / sting / copy, then be playable on Pages.

1. **HUD verbs** — unique Search labels; Craft dim + “walk to the anvil”; Rally on the bar or off the pause list. Small. Unblocks first-minutes.
2. **Save book** — autosave after a clean camp; death Continue; confirm New descent. Small. Trust before longer sessions.
3. **Combat ticker** — actually draw `drawLog` (compact, above the skill bar); big damage numbers; foe wind-up ring. Medium. This is the BG feel.
4. **Audio stingers** — UI tick, hit, miss, low-HP, death; optionally a real battle loop instead of Song of the Forge. Small / medium. Same hooks as (3).
5. **Ch1 verb reveal** — hide Dig / Camp / Craft until taught; one hint per beat. Small. After the HUD is named.
6. **Anvil findable** — minimap mark + guide on first Craft. Small. After (1) and (5).
7. **Only then:** if #81 has merged, a descent-polish pass if anything is still buried. If #44 has merged, lighting/fog polish. Do not start those first.

Stop after (3) if time is short. Readable combat plus a trusted Continue button will do more for “Baldur’s Gate-style” than another chapter of content.

---

*Assessment only. No game logic changed.*
