# Combat basics

Play lets Macar swing Attack, refuse a swing while the shield is up, and read hits in a top combat log. Chapter I's first room stays quiet until the east chamber opens.

## Sub-features

- `combat-attack` starts a melee swing with `1` or the Attack plate while Defend is down.
- `combat-defend-blocks` refuses Attack while Defend is up and says so in the hint or log.
- `combat-log` keeps COMBAT LOG collapsed at the top and expands only when opened.
- `combat-foe` lands a swing on a living foe (not available in the quiet first room).

## How to get to it (user POV)

- Descend into play, then press `1` or tap Attack.
- Press `v` to raise Defend, then try Attack.
- Tap the COMBAT LOG chip at the top to expand or collapse it.
- Reach a foe only after leaving the quiet first room (Chapter I: east chamber after all four kin are Roused).

## Driving it with control-macar

Preconditions:

- Legend of Macar is healthy at `http://127.0.0.1:4174`.
- Scene is `play`, no talk plate, Defend is down unless the check is `combat-defend-blocks`.
- `control-macar doctor` reports the isolated origin.

- **Attack while open.** Press Attack. Run `control-macar browser press --key 1` and `control-macar browser snapshot --path artifacts/<run>/combat-attack.json --aria` plus a screenshot. The log or hint shows a swing line, or Macar's attack pose is active. `defending` is false.
- **Defend blocks Attack.** Raise the shield, then press Attack. Run `control-macar browser press --key v`, `control-macar browser press --key 1`, and `control-macar browser snapshot --path artifacts/<run>/combat-defend-blocks.json --aria`. Hint or log includes `Defend is up` / `No attacks while the shield is raised`. Lower the shield with `v` afterward.
- **Collapsed log.** After a swing, confirm the chip. Run `control-macar browser snapshot --path artifacts/<run>/combat-log.json --aria`. `showLog` is false unless you clicked the chip. Opening the chip is a second action; capture both states if you prove expand.
- **Foe in range.** Walk until a foe is on screen, then Attack. If the snapshot still shows `fightOn` false and no foe after you attempted the east exit, record `combat-foe=skip reason=verified-unreachable: Chapter I first room is quiet until four Rouse`. Do not mark it pass from the quiet-room swing.

## Gotchas

- The first Chapter I room is authored quiet. A swing with no foe is not a kill proof.
- Attack while Defend is up is supposed to fail. A swing in that state is a product break.
- `q` and Space also fire Attack. Prefer `1` so the check matches the pause legend.
- Shift+9 is a debug slay and is not a player path.
- Specialty plates (6–9) sit above Attack. Do not click them when proving a basic swing.
