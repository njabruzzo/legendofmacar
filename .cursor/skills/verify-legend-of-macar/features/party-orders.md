# Party orders

In play, Macar can tell living kin to Hold, Regroup, or Focus from plates under the portrait stack or from the keys H, Y, and Z. The same order again returns them to follow. Ghosts ignore the orders and keep auto-follow.

## Sub-features

- `orders-visible` shows Hold, Regroup, and Focus on the play HUD.
- `order-hold` issues Hold and the hint names Hold.
- `order-regroup` issues Regroup and the hint names Regroup.
- `order-focus` issues Focus and the hint names Focus.

## How to get to it (user POV)

- Descend into play from the Chapter I plate (see title-new-game).
- Read the three plates under the portrait stack: Hold, Regroup, Focus.
- Press `h`, `y`, or `z`. Press the same key again to follow.
- Pause lists `H Hold`, `Y Regroup`, and `Z Focus`.

## Driving it with control-macar

Preconditions:

- Legend of Macar is healthy at `http://127.0.0.1:4174`.
- Scene is `play` after a mapped new-game descend (not `?play`).
- `control-macar doctor` reports the isolated origin.
- Desktop viewport (launch default 1280×800).

- **Read the orders.** Snapshot play. Run `control-macar browser snapshot --path artifacts/<run>/orders-visible.json --aria` and `control-macar browser screenshot --path artifacts/<run>/orders-visible.png`. HUD labels include `Hold`, `Regroup`, and `Focus`.
- **Hold.** Press `h`. Run `control-macar browser press --key h` and `control-macar browser snapshot --path artifacts/<run>/order-hold.json --aria`. The hint mentions Hold.
- **Regroup.** Press `y`. Run `control-macar browser press --key y` and `control-macar browser snapshot --path artifacts/<run>/order-regroup.json --aria`. The hint mentions Regroup.
- **Focus.** Press `z`. Run `control-macar browser press --key z` and `control-macar browser snapshot --path artifacts/<run>/order-focus.json --aria`. The hint mentions Focus.

## Gotchas

- Ghosts ignore Hold, Regroup, and Focus and keep auto-follow. Chapter I kin after Rouse are ghosts, so the plates still issue the order and the hint still names it, but those ghosts do not obey.
- Focus with no living foe does not arm. The hint still names Focus and the prior order stays.
- Regroup paths toward Macar, then the order clears and follow resumes.
- `h` is Hold. It is not a walk key.
- Issuing the active order again clears it. A second `h` reads as follow, not a second Hold.
- Rally stays off the bar. These three plates are not Rally.
