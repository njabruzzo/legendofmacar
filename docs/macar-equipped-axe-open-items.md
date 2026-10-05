# Equipped axe and open draft integration

Equipping an axe now selects the axe art family independently of image readiness. A ready directional standing view can render before the original carry PNG finishes loading. The selected standing direction is requested first. IDs such as `iron_axe` and `macar-axe` classify correctly even without an item name; pickaxes remain excluded. Equipment and idle-atlas script URLs are versioned to refresh cached module code.

Legacy saves without `macarHeld` now display the primary weapon. A retained secondary crossbow no longer silently becomes the carry pose. Explicit crossbow selection still works, and an active Shoot temporarily uses crossbow art; an expired `atkKind: 'bow'` alone cannot retain it. Existing marked selections survive save/reload.

This branch incorporates the existing work in PRs #280, #281 and #282: the independent bolt-flight correction and isolated animation preview, the carved stone stairs, and the detailed down-facing axe standing pose. No original sprite PNGs were replaced. The new assets have distinct filenames, so the existing source-asset revision remains 130.

## Validation

- `npm test`: 119 test files passed, zero failures or skips.
- New regressions exercise cold axe loading, a directional idle finishing before legacy carry art, ID-only axes, retained crossbow selection, expired Shoot state, and direction-first loading.
- The combined asset gallery was rendered with the actual idle slicing and crown layout modules and inspected. It is an asset preview, not a dungeon playthrough.
- The formal browser harness could not establish CDP. The cloud-browser attempt timed out. Browser play-path verification is unconfirmed; this is not a formal APPROVE.

## Remaining animation work

The axe/crossbow animation pilot remains isolated from gameplay. The current walk/attack sprites have the previously documented front-facing artwork limitations. Attempts to clean the pilot and create complete directional replacements failed visual QA: fluorescent edge artifacts persisted, some weapon tips clipped, and gait/pose consistency was insufficient. Those attempts were not bound to gameplay or substituted for approved sheets. Full directional walk/attack replacement remains unresolved.

Keep this integration draft for visual review. Nothing from this branch has been merged or deployed.
