# Inventory and camp

PACK opens Macar's backpack with large item titles and Drop. Camp from the bar rests in the seam when no blades are out. The CAMP plate with Repair / Improve / Craft / Other tabs appears only after a chapter is cleared.

## Sub-features

- `pack-open` opens BACKPACK from the PACK plate or `i` / `p` / `4`.
- `pack-drop` shows Drop on a row (do not drop the last hammer on a run that still needs combat).
- `pack-leave` returns to play with Escape.
- `camp-rest` starts the in-seam rest (`Macar decides to camp to rest and heal.`) when no foe is near.
- `camp-plate` shows CAMP, tabs, Save, and Go deeper after a chapter clear.

## How to get to it (user POV)

- In play, tap PACK or press `i`, `p`, or `4`. Tap Macar's portrait for the same pack.
- On a pack row, choose Drop to put the item at Macar's feet.
- Press Escape to close the pack.
- In play, tap Camp or press `c` / `3` to rest if the room is quiet.
- Clear a chapter to reach the CAMP plate (Save / Go deeper). Continue from title can reopen that plate when the book was marked at camp.

## Driving it with control-macar

Preconditions:

- Legend of Macar is healthy at `http://127.0.0.1:4174`.
- Scene is `play` in the quiet first room (or `camp` when proving `camp-plate` from a camp save).
- `control-macar doctor` reports the isolated origin.

- **Open pack.** Press `i`. Run `control-macar browser press --key i` and `control-macar browser wait --scene pack`. Snapshot and screenshot `pack-open`. The tree or pixels show `BACKPACK` and a `Drop` chip. Item titles are large.
- **Leave pack.** Press Escape. Run `control-macar browser press --key Escape` and `control-macar browser wait --scene play`. Scene is `play`.
- **Camp rest.** From quiet play, press `c`. Run `control-macar browser press --key c` and `control-macar browser snapshot --path artifacts/<run>/camp-rest.json --aria` plus a screenshot. `sleepShow` is true or the caption / log reads `Macar decides to camp to rest and heal.` Wait until `sleepShow` is false before more movement. A later title reload may show `Continue` because rest writes the book.
- **CAMP plate.** Only after a chapter clear (or Continue into a camp mark). Run `control-macar browser wait --scene camp` and snapshot `camp-plate`. Gold title is `CAMP`. Tabs include Repair, Improve, Craft, Other. Footer has `Save` and `Go deeper`. If you cannot reach a cleared chapter, record `camp-plate=skip reason=verified-unreachable: CAMP plate is post-chapter; first-room rest is camp-rest, not camp-plate`.

## Gotchas

- `camp-rest` is not `G.scene==='camp'`. The rest overlay stays in `play`. Do not fail `camp-rest` because scene is still `play`.
- Camp rest is refused when a foe is near (`Not while blades are out.`). Chapter I first room is the safe proof.
- Camp rest on open passages rolls a wanderer check. Capture the log line; a spawned wanderer is still a successful rest attempt that was interrupted.
- Drop mutates the floor and the pack. Prefer proving the Drop chip exists unless the recipe is `pack-drop`.
- Continue after a rest writes `legendofmacar.save.v2`. Isolate-saves before the next title-new-game run.
- Inventory titles must include Drop. A pack without Drop fails Helm's standing note.
