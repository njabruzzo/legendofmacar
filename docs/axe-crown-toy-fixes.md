# Axe, crown entrance and windup-toy regressions

The live axe walk atlas had only north/south views. Side and diagonal
headings now use the existing directional axe carry artwork, with the
world's gait bob and westward mirroring. North/south retain their four
painted walk phases. Full leg-stride cycles for the other six headings
remain an art limitation; no new walking paint was introduced.

The axe attack binding now uses `assets/creatures/dwarf_macar_axe_atk_v2.png`.
This is a single right-facing attack pose, mirrored for left headings;
it does not supply eight distinct attack poses. Its crown seat is calibrated
for the repaired image. Existing maul and crossbow bindings are unchanged.

The crown-chamber entrance uses the existing chapel masonry across the
bone wall and both flanks. Its authored row is 102–111 at y=15, with the
three-cell passage at 105–107. Room carving and saved terrain reconciliation
retain the flanks and preserve unrelated excavated terrain.

Toy destruction starts a dedicated procedural boom exactly once, then
places separate gear, spring and emerald resource drops on nearby clear
floor. Each has its own SVG artwork and uses the ordinary resource pickup
path. Pickup holds and all three resource drops survive saves. The boom
uses original synthesized PCM audio, independent of the melee-hit limiter.

Verification includes the full Node test suite; the live weapon browser
matrix, Chapter I shovel/search/open/reload/travel path, real axe Attack
button with 1/60 and 50 ms updates, melee/bolt toy destruction, pickup,
crafting and party movement regressions. Browser scene galleries show the
closed/open entrance and the three floor drops.

## Attack-art repair provenance

Created with the built-in image-generation tool using the old attack sprite
as the character/pose reference and the existing axe idle atlas as the
weapon reference. Original generated alpha is retained. Final prompt:

> Repair image 1 as a production game attack sprite. Change ONLY the held
> weapon: entirely remove BOTH the existing heavy rectangular maul and the
> crude flat polygon axe overlay and their extra shafts. Replace with ONE
> detailed double-bladed steel axe with dark wrapped haft and engraved
> dwarven metalwork matching the axe design in image 2. Macar's two existing
> hands should grasp this single axe shaft naturally during this exact
> swing pose. Preserve image 1's established brown-haired dwarf, face, beard,
> fur collar, gold-and-brown armor, limbs, stance, perspective, proportions,
> realistic painterly texture and lighting unchanged. Image 2 is
> weapon-design reference only; do not change character coloring to its
> orange hair. Full isolated character and single weapon, actual transparent
> background, generous clear transparent margin on all sides. No maul head,
> no crossbow, no flat geometric overlay, no text. Keep swing directed
> screen-right as image 1.
