# Macar combat and crossbow art — 2026-10-06

Generated with the built-in imagegen tool, using existing shared Macar body and crossbow icon as references. Original assets retained.

- macar-combat-v2.png: 971×1619 transparent raster, three columns × five views. Fractional source cells are normalized at runtime; alpha bounds set scale from each row's windup, preserving contact crouch. Same cached body canvas is reused across all weapons.
- macar-crossbow-v1.png: 1254×1254 transparent equipment raster. Separate layer attaches to shared grip anchors.
- Existing maul/axe shafts remain fixed at .53/.65 of rendered body height, including combat stages.
- West headings mirror east views. Combat crown/grip positions are measured per pose.
- Crossbow ranged state uses the shared recovery stance with crossbow equipment; it does not have a separate draw/release body cycle.

## Combat prompt

Create a transparent game combat sprite sheet of the EXACT SAME dwarf Macar in the supplied body atlas. Preserve his face, brown swept hair, three brown beard braids with gold cuffs, dark brown gold-studded armor, fur mantle, belt and boots, dwarf build and painted photoreal game style. NO weapons or shafts anywhere: fists grip invisible equipment for engine composition. Strict THREE equal columns and FIVE equal rows, output 1536x2560, each cell512x512. Exactly 15 complete full-body non-overlapping sprites, head near y85, planted soles near y475, ample transparent margin. Row views exactly: SOUTH front, SOUTH EAST front three-quarter right, EAST profile right, NORTH EAST rear three-quarter right, NORTH full rear. Each row THREE distinct successive melee poses: col1 WINDUP both fists together raised above shoulder, torso twisted to ready a heavy strike, planted spread boots; col2 CONTACT match the original atlas last column crouched strike torso/fists low forward, opposite torso rotation; col3 RECOVERY body rises after impact, fists together midway at waist and torso unwinds back to ready stance, boots stable. Motion must be visibly different between windup/contact/recovery. All 15 are the same man, same clothing details and fixed camera/scale, matching the reference. No crown, no alternate red-haired face, no cape redesign. True alpha transparency, no shadows, floor, borders, labels or text, no fragments in neighboring cells. Exact equal cell grid essential.

## Crossbow prompt

Generate a single isolated fantasy dwarven crossbow for a game equipment layer, matching the supplied icon: dark brown carved wooden stock, blackened steel prod, gold/brass fittings, engraved angular dwarf motifs. Photoreal painted style matching Macar's existing equipment. Transparent alpha background, no frame, text, hands, person, floor or shadows. Entire crossbow full uncropped, with ample margin. Viewed from slight elevated three-quarter side, stock horizontal pointing RIGHT; butt LEFT near x100, trigger/grip center x360, bolt rail ends RIGHT near x850, bow/prod curves above and below rail at x720. Shaft axis y500. Compact functional crossbow, taut visible bowstring and loaded bolt, no scope, modern parts or rifle barrel. Square1024x1024. This will be attached to a shared character body in the renderer.
