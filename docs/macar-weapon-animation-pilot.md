# Axe walk and crossbow firing pilot

This review prototype explores the frame alignment and firing/recovery approach described by Scenario's [Iso Cycles](https://www.scenario.com/explorations/iso-cycles/) and [directional-cycle guide](https://github.com/scenario-labs/skills/blob/main/skills/scenario-sprite-animation/references/directional-cycles.md). Scenario is not connected in this session; the pilot uses built-in ImageGen rather than Scenario's image-to-video route. No Scenario generation, credits or account changes were made.

## Artwork and preview

The approved `dwarf_macar_idle_axe_v2.png` and `dwarf_macar_idle_xbow_v2.png` are the character/weapon references. Original `dwarf_macar_axe.png` and `dwarf_macar_xbow.png` provide supporting face/armor detail. All approved files remain unchanged.

New files under `assets/creatures/pilots/` contain sixteen poses each: eight front southeast frames followed by eight rear northeast frames. The preview mirrors them for southwest/northwest. Each sequence is row-major over two rows of a four-column sheet. Generated rows are not exactly registered, so extraction uses measured empty row gaps and plants each frame on its measured opaque foot baseline. The preview does not change paint or alpha.

Open `src/qa/weapon-animation-pilot.html` through a local server. It loops the axe at eight frames per second and shows an eight-frame crossbow action at ten frames per second. Crossbow frame 4 is the release, followed by settling and lowering back to rest. The detached bolt remains separate and points toward its target. Pause, Next frame, Fire again and 50 ms simulation controls support review.

ImageGen outputs used:
- Axe initial: `exec-87c9830b-2faf-4b37-8c05-44d0dea581f2.png`, rejected for tight margins.
- Axe margin iteration: `exec-9ceb37e8-a427-4b73-94a4-17e124870770.png`.
- Crossbow: `exec-e6c26723-2bf9-4c58-8c0f-fa4681d726ce.png`.

Brief invariants: existing dwarf identity, detailed painted rendering, identical weapon and clothing, fixed front/rear isometric camera, alternating eight-frame walk, crossbow raise/aim/fire/settle/lower/rest, full figures inside cells, transparent background, no crown or detached bolt baked into the sheet.

These assets are intentionally review-only. Visible colored edge artifacts, frame-to-frame shape drift and the exact idle transition need further cleanup. Mirroring swaps handedness. Cardinal views, crown seats and integration with the game's combat/recovery timers have not been implemented for these new sheets. This is a test of a frame-sheet approach, not evidence that Scenario's video generator was tested.

## Independent bolt correction

The game's actual crossbow projectile previously accumulated spin and used that spin to rotate `fx_bolt`. `stepShot` now leaves bolts unspun while preserving existing spin for other effects. `drawShot` projects velocity with the same axes as `w2s`, cancels the existing artwork's painted tilt, and holds the tip along the straight flight direction. A cold-art fallback draws a directional shaft/tip. Targeting, damage, ammo, release timing and collision behavior are unchanged. This applies to any bolt using the shared renderer.

Validation: 118 automated test files passed, zero failures/skips. Bolt regression cases cover eight directions, party/foe shots, normal and 50 ms frames, phone/laptop projection ratios, and loaded/cold art. Actual browser game: 1,914 checks passed, including sixteen bolt direction/timing scenarios and the existing weapon, equipment, ghost and follower checks. The new pilot remains outside the live game.
