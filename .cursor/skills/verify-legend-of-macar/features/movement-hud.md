# Movement and HUD

Play lets a dwarf walk the seam from keys or the left stick, read a standing skill bar, raise a shield with V, and keep the combat log collapsed at the top until opened.

## Sub-features

- `move-walk-right` walks screen-right with `d` (not Defend).
- `move-walk-left` walks screen-left with `a`.
- `hud-standing` shows PACK, Defend, Attack, Shoot, Throw, Heal, two SEARCH, Dig, Camp, and Craft on the desktop bar.
- `hud-no-rally` keeps Rally off the bar and off More.
- `hud-search-labels` paints SEARCH above both the herb plate and the secret-door plate.
- `hud-craft-label` paints Craft above the craft icon, not on the art.
- `hud-log-collapsed` starts COMBAT LOG collapsed at the top.
- `defend-v` raises Defend with `v` and shows the DEFEND float / shield hint.

## How to get to it (user POV)

- Descend into play from the Chapter I plate (see title-new-game).
- Hold WASD or the arrow keys. `d` / Right is walk-right.
- Read the bottom skill plates; titles sit above the icons.
- Press `v` to raise or lower the shield.
- Press Escape for the pause key list (`V Defend`, `F SEARCH`, `T SEARCH`, no Rally icon note).

## Driving it with control-macar

Preconditions:

- Legend of Macar is healthy at `http://127.0.0.1:4174`.
- Scene is `play` after a mapped new-game descend (not `?play`).
- `control-macar doctor` reports the isolated origin.
- Desktop viewport (launch default 1280×800) so the full bar is on one row.

- **Read the bar.** Snapshot play. Run `control-macar browser snapshot --path artifacts/<run>/hud-standing.json --aria` and `control-macar browser screenshot --path artifacts/<run>/hud-standing.png`. Labels include `PACK`, `Defend`, `Attack`, `SEARCH` twice, `Camp`, and `Craft`. No `Rally`. Combat log is not expanded (`showLog` is false).
- **Walk right.** Hold `d`. Run `control-macar browser state`, note `player.x` / `player.y`, then `control-macar browser press --key d --hold-ms 800`, then `control-macar browser snapshot --path artifacts/<run>/move-walk-right.json --aria`. Position changes along the walk-right axis and `defending` stays false.
- **Walk left.** Hold `a` the same way. Run `control-macar browser press --key a --hold-ms 800`. Position moves opposite the previous step.
- **Defend.** Press `v`. Run `control-macar browser press --key v` and `control-macar browser snapshot --path artifacts/<run>/defend-v.json --aria`. `defending` is true and the hint or log mentions the shield / AC. Press `v` again to lower it before other combat checks.
- **Log collapsed.** If `showLog` is true, press Escape once. Run `control-macar browser snapshot --path artifacts/<run>/hud-log-collapsed.json --aria`. `showLog` is false.

## Gotchas

- `d` is walk-right. `v` is Defend. Treating `d` as Defend is a failed check, not a control quirk.
- Title and intro swallow keys as a center tap. Only press WASD / `v` in `play`.
- Phone / portrait layout parks extra verbs under `More`. Launch stays landscape 1280×800 so the standing bar is complete; a portrait run must open More before asserting missing plates.
- Craft dims when Macar is not at the station. The label is still `Craft`.
- Rally still exists as key `5` (heal + buff). It must not appear as a HUD icon. Do not treat a missing Rally plate as a missing verb unless you are proving the hidden key.
- Dialogue, hints, and inspect plates sit above terrain. A talk plate eats movement until dismissed.
