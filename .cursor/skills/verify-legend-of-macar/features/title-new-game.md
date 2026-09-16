# Title, new game, continue

The Book One splash lets a player begin a descent, refuse or burn an existing mark, open Chapters or Credits, and continue a saved book.

## Sub-features

- `title-visible` shows Book One and either `Enter the Deep` (blank book) or `Continue` plus `New descent` (marked book).
- `title-chapters` opens the chapter list from `Chapters` and returns with `Back`.
- `title-credits` opens Credits and returns with `Back` or Escape.
- `enter-the-deep` starts Chapter I from a blank book.
- `intro-visible` shows the Chapter I plate (`The Rubble and the Ruby`) and `Descend`.
- `descend-to-play` leaves the plate and reaches the seam with the play HUD.
- `new-descent-wipe` asks before burning a mark (`Burn it` / `Keep the mark`).
- `continue-save` reopens the marked book from `Continue`.

## How to get to it (user POV)

- Load the game root and wait for the splash.
- Choose `Enter the Deep` when the book is blank.
- Choose `Continue` when a mark exists.
- Choose `New descent`, then `Burn it` or `Keep the mark`.
- Choose `Chapters` or `Credits` from the bottom band.

## Driving it with control-macar

Preconditions:

- Legend of Macar is healthy at `http://127.0.0.1:4174`.
- The disposable profile has no save (`Enter the Deep` is the primary plate).
- `control-macar doctor` reports the isolated origin and injected probe.

- **Open title.** Load the root. Run `control-macar browser open /` and `control-macar browser wait --scene title`. The virtual tree lists `Enter the Deep`, `Chapters`, and `Credits`.
- **Prove title.** Capture the splash. Run `control-macar browser snapshot --path artifacts/<run>/title-visible.json --aria` and `control-macar browser screenshot --path artifacts/<run>/title-visible.png`. The artifacts show Book One and `Enter the Deep`, not `Continue`.
- **Enter the Deep.** Choose `Enter the Deep`. Run `control-macar browser click --name "Enter the Deep"` and `control-macar browser wait --scene intro`. Scene is `intro`.
- **Prove intro.** Capture the chapter plate. Run `control-macar browser snapshot --path artifacts/<run>/intro-visible.json --aria` and `control-macar browser screenshot --path artifacts/<run>/intro-visible.png`. The artifacts name Chapter I / The Rubble and the Ruby and show `Descend`.
- **Descend.** Choose `Descend`. Run `control-macar browser click --name "Descend"` and `control-macar browser wait --scene play --timeout 60`. Scene is `play` and a player named MACAR exists.
- **Prove play HUD.** Capture the seam. Run `control-macar browser snapshot --path artifacts/<run>/play-hud.json --aria` and `control-macar browser screenshot --path artifacts/<run>/play-hud.png`. Labels include `PACK`, `Defend`, `Attack`, two `SEARCH`, `Camp`, and `Craft`. `Rally` is absent.
- **Chapters entry.** From a fresh title, choose `Chapters`. Run `control-macar browser click --name "Chapters"` and `control-macar browser wait --scene chapters`. Heading path is the chapter list; `Back` returns to `title`.
- **Credits entry.** From title, choose `Credits`. Run `control-macar browser click --name "Credits"` and `control-macar browser wait --scene credits`. Escape or `Back` returns to `title`.
- **Continue entry.** From play, press Escape, choose `Save game`, reload `/`, and choose `Continue`. Run `control-macar browser press --key Escape`, `control-macar browser click --name "Save game"`, `control-macar browser open /`, and `control-macar browser click --name "Continue"`. Title first shows `Continue`; after the click, scene is `play` or `camp` and `hasSave` stays true.
- **Wipe entry.** On a marked title, choose `New descent` then `Keep the mark`. Run `control-macar browser click --name "New descent"` and `control-macar browser click --name "Keep the mark"`. The burn prompt closes and `Continue` remains. Then choose `New descent` and `Burn it` only when the recipe is allowed to destroy the disposable mark.

## Gotchas

- A ready splash paints the gold title on the artwork. Assert `Enter the Deep` / `Continue` in the snapshot, not a canvas OCR of `THE LEGEND OF MACAR`.
- `?play` or `#play` skips the splash and rewrites `document.title`. That is not this feature.
- `Descend` may sit on `intro` until chapter art is ready. Wait for `scene=play`, not a fixed sleep. A hint `The seam is still settling.` means wait longer, then snapshot again.
- Any key on a non-play scene is also a center tap. Do not press letters on the title; they can hit `Enter the Deep` or `Chapters` by accident.
- Isolated runs must start blank. `Continue` on a fresh profile means a leftover book — isolate-saves and reload before proving `enter-the-deep`.
- Burning the book is destructive. Use `Keep the mark` unless the check is `new-descent-wipe`.
