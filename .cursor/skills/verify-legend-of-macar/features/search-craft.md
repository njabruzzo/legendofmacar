# Search and craft

Play has two SEARCH verbs — herbs on the floor and secret doors in the stone — plus Craft, which lights at a station and dims with a guide arrow when Macar is far from the anvil.

## Sub-features

- `search-herbs` starts floor SEARCH with `f` or the plant SEARCH plate.
- `search-secret` starts seam SEARCH with `t` or the door SEARCH plate.
- `search-stop` toggles the same key to stop searching.
- `craft-open` opens the craft bench with `k` or the Craft plate.
- `craft-far` keeps Craft labeled Craft (not a word on the art) and points a guide when far from the station.
- `craft-station` runs a recipe only at a reachable anvil.

## How to get to it (user POV)

- In play, tap the plant SEARCH plate or press `f`.
- Tap the door SEARCH plate or press `t`.
- Tap Craft or press `k`. Walk toward the anvil if the plate is dim.
- Scavenge world craft props by walking up and using the prompt.

## Driving it with control-macar

Preconditions:

- Legend of Macar is healthy at `http://127.0.0.1:4174`.
- Scene is `play` in Chapter I (first room is enough for SEARCH and a far Craft).
- `control-macar doctor` reports the isolated origin.

- **Herb SEARCH.** Press `f`. Run `control-macar browser press --key f` and `control-macar browser snapshot --path artifacts/<run>/search-herbs.json --aria` plus a screenshot. `searching` is true. Hint or log mentions herb / floor search. Both SEARCH labels remain `SEARCH`.
- **Stop herb SEARCH.** Press `f` again. Run `control-macar browser press --key f`. `searching` is false.
- **Secret SEARCH.** Press `t`. Run `control-macar browser press --key t` and `control-macar browser snapshot --path artifacts/<run>/search-secret.json --aria`. `secretSearch` is true. Hint or log mentions seams / secret doors. The plate label is still `SEARCH`, not Seams.
- **Craft far from the anvil.** Press `k`. Run `control-macar browser press --key k` and `control-macar browser wait --scene craft --timeout 10`. If scene becomes `craft`, snapshot `craft-open` and leave with Escape. If Craft stays dim in `play` with a guide, snapshot `craft-far` and treat `craft-open` as reached only when scene is `craft`. The label stays `Craft` (no `ANVIL` on the icon).
- **Craft at a station.** Walk until the Craft plate is undimmed, then press `k`. If no station is reachable from the first room after a genuine approach, record `craft-station=skip reason=verified-unreachable: no craft station in range from the attempted room`.

## Gotchas

- Two plates share the word SEARCH. Distinguish them by key (`f` vs `t`) or hud key (`search` vs `secret`), never by a Herbs / Seams label — those words are gone.
- SEARCH and Craft titles sit above the slot, not on the art.
- Craft away from the station is supposed to dim and may open a bench with no station recipes. That is not a crafted-item proof.
- `F SEARCH` / `T SEARCH` appear on the pause legend. Rally does not.
- Opening pack or pause cancels a clean SEARCH snapshot. Leave those closed.
