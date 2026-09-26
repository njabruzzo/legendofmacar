# Legend of Macar verification map

This directory is the maintained source for verifying the user-facing behavior of Legend of Macar. Read the index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Launch the isolated harness at `http://127.0.0.1:4174` from the repo root (`control-macar launch --port 4174`).
- Use the disposable Chrome profile created by that launch so `legendofmacar.save.v2` and the v1/good/pending mirrors start empty.
- Put `control-macar` on `PATH`.
- Run `control-macar doctor` and require the isolated origin, injected probe, and living Chrome pid.
- Never drive `https://www.legendofmacar.com` from this skill. That origin holds the player's book.
- Never drive an instance that was not started by this verification run.
- Start title proofs from a blank book (splash `Continue`, then primary `New descent` on `title_menu`). If menu `Continue` is visible on an isolated origin, run `control-macar browser isolate-saves` and reload.

## Driving conventions

- Start every recipe from the baseline state unless its preconditions say otherwise.
- Prefer labeled menu plates and keyboard verbs over CSS coordinates. The canvas has no DOM ARIA tree; use `control-macar browser snapshot --aria` as the virtual tree.
- Treat every command as literal. Keep quoted names and flags unchanged.
- Run browser actions through `control-macar browser`.
- Restore a blank book after a mutation that writes a save, unless the recipe is proving Continue. Do not remove proof artifacts during cleanup.
- `?play` / `#play` is a debug skip. Do not use it to satisfy a mapped title entry.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof includes a virtual ARIA snapshot and a screenshot with the app identity visible (title plate, chapter plate, or play HUD).
- Save proof includes a second user-facing view: reload title, open the menu, and read save `Continue`, plus the probe `hasSave` / `saveKeys` fields.
- Record the feature ID and entry point used with every artifact.
- Report an unreachable path with the attempted command and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with control-macar` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only user paths, stable handles, required state, commands, and observable proof.

## Features

- [Title, new game, continue](./title-new-game.md) covers the Book One splash, the second title menu, New descent, wipe-and-restart, and Continue from a marked book.
- [Movement and HUD](./movement-hud.md) covers walking, the standing skill bar, Defend vs walk-right, and the collapsed combat log.
- [Combat basics](./combat-basics.md) covers Attack, Defend-blocks-Attack, and the first-room quiet rule.
- [Inventory and camp](./inventory-camp.md) covers PACK / Drop, in-seam camp rest, and the post-chapter CAMP plate.
- [Search and craft](./search-craft.md) covers both SEARCH verbs and Craft at or away from the station.
