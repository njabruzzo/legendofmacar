# Title, new game, continue

The Book One splash is art-only. A second menu screen starts a descent, refuses or burns an existing mark, opens Chapters or Credits, and continues a saved book.

## Sub-features

- `title-visible` shows the Book One splash and a large `Continue` (tap-anywhere also advances).
- `title-menu-visible` shows the second menu with primary `New descent` (blank book) or primary `Continue` plus secondary `New descent` (marked book), plus `Chapters` and `Credits`.
- `title-chapters` opens the chapter list from `Chapters` and returns with `Back` to the menu.
- `title-credits` opens Credits and returns with `Back` or Escape to the menu.
- `enter-the-deep` starts Chapter I from a blank book on the menu.
- `intro-visible` shows the Chapter I plate (`The Rubble and the Ruby`) and `Descend`.
- `descend-to-play` leaves the plate and reaches the seam with the play HUD.
- `new-descent-wipe` asks before burning a mark (`Burn it` / `Keep the mark`).
- `continue-save` reopens the marked book from menu `Continue` after the splash `Continue`.

## How to get to it (user POV)

- Load the game root and wait for the splash.
- Tap anywhere or choose `Continue` to open the menu.
- Choose `New descent` when the book is blank.
- Choose `Continue` when a mark exists.
- Choose secondary `New descent`, then `Burn it` or `Keep the mark`.
- Choose `Chapters` or `Credits` from the stacked menu.

## Driving it with control-macar

Preconditions:

- Legend of Macar is healthy at `http://127.0.0.1:4174`.
- The disposable profile has no save (`New descent` is the primary plate on the second screen).
- `control-macar doctor` reports the isolated origin and injected probe.

- **Open title.** Load the root. Run `control-macar browser open /` and `control-macar browser wait --scene title`. The virtual tree lists `Continue`.
- **Prove title.** Capture the splash. Run `control-macar browser snapshot --path artifacts/<run>/title-visible.json --aria` and `control-macar browser screenshot --path artifacts/<run>/title-visible.png`. The artifacts show Book One and splash `Continue`, not menu pills.
- **Open menu.** Choose `Continue` (or tap the plate). Run `control-macar browser click --name "Continue"` and `control-macar browser wait --scene title_menu`. The virtual tree lists `New descent`, `Chapters`, and `Credits`.
- **Prove menu.** Capture the menu. Run `control-macar browser snapshot --path artifacts/<run>/title-menu-visible.json --aria` and `control-macar browser screenshot --path artifacts/<run>/title-menu-visible.png`. The artifacts show primary `New descent`, not a save `Continue`.
- **New descent.** Choose `New descent`. Run `control-macar browser click --name "New descent"` and `control-macar browser wait --scene intro`. Scene is `intro`.
- **Prove intro.** Capture the chapter plate. Run `control-macar browser snapshot --path artifacts/<run>/intro-visible.json --aria` and `control-macar browser screenshot --path artifacts/<run>/intro-visible.png`. The artifacts name Chapter I / The Rubble and the Ruby and show `Descend`.
- **Descend.** Choose `Descend`. Run `control-macar browser click --name "Descend"` and `control-macar browser wait --scene play --timeout 60`. Scene is `play` and a player named MACAR exists.
- **Prove play HUD.** Capture the seam. Run `control-macar browser snapshot --path artifacts/<run>/play-hud.json --aria` and `control-macar browser screenshot --path artifacts/<run>/play-hud.png`. Labels include `PACK`, `Defend`, `Attack`, two `SEARCH`, `Camp`, and `Craft`. `Rally` is absent.
- **Chapters entry.** From a fresh title menu, choose `Chapters`. Run `control-macar browser click --name "Chapters"` and `control-macar browser wait --scene chapters`. Heading path is the chapter list; `Back` returns to `title_menu`.
- **Credits entry.** From the menu, choose `Credits`. Run `control-macar browser click --name "Credits"` and `control-macar browser wait --scene credits`. Escape or `Back` returns to `title_menu`.
- **Continue entry.** From play, press Escape, choose `Save game`, reload `/`, choose splash `Continue`, then menu `Continue`. Run `control-macar browser press --key Escape`, `control-macar browser click --name "Save game"`, `control-macar browser open /`, `control-macar browser click --name "Continue"`, `control-macar browser wait --scene title_menu`, and `control-macar browser click --name "Continue"`. Splash first shows `Continue`; the menu then shows save `Continue`; after that click, scene is `play` or `camp` and `hasSave` stays true.
- **Wipe entry.** On a marked title, choose `New descent` then `Keep the mark`. Run `control-macar browser click --name "New descent"` and `control-macar browser click --name "Keep the mark"`. The burn prompt closes and `Continue` remains. Then choose `New descent` and `Burn it` only when the recipe is allowed to destroy the disposable mark.

## Gotchas

- Play does not clear the last menu-hit list. The probe reports `menus: []` on unpaused play so a leftover `Descend` plate cannot be clicked. Assert HUD labels and `scene=play`, not intro buttons.
- A ready splash paints the gold title on the artwork. Assert splash `Continue` / menu `New descent` in the snapshot, not a canvas OCR of `THE LEGEND OF MACAR`.
- `?play` or `#play` skips the splash and rewrites `document.title`. That is not this feature.
- `Descend` may sit on `intro` until chapter art is ready. Wait for `scene=play`, not a fixed sleep. A hint `The seam is still settling.` means wait longer, then snapshot again.
- Any key on a non-play scene is also a center tap. On the splash that opens the menu. On the menu, do not press letters; they can hit `New descent` or `Chapters` by accident.
- Isolated runs must start blank. Splash always shows `Continue`. A leftover book is `New descent` on `title_menu` — isolate-saves and reload before proving `enter-the-deep`.
- Splash `Continue` and save `Continue` share a label on different scenes. Wait for `title_menu` before clicking the save plate.
- Burning the book is destructive. Use `Keep the mark` unless the check is `new-descent-wipe`.
