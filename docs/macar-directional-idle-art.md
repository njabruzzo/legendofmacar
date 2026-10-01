# Macar directional standing art

Three new transparent atlases provide planted standing poses for maul, axe and crossbow. Each atlas has three 512×512 columns and two rows: south, east, southeast / north, northeast, empty. West-facing octants mirror the corresponding east-facing standing pose. Existing sprite PNGs remain unchanged.

The built-in ImageGen tool generated these new variants using the existing Macar front, profile walk and rear walk as identity/style references. The maul atlas keeps his brown braided beard, fur mantle, studded armor and hammer. The axe variant replaces only the hammer with a double-bladed axe; the crossbow variant replaces it with a crossbow held at rest in both hands. Every pose has both feet planted, no helmet or crown, and a transparent background. The crown remains the existing separately drawn prop, calibrated for each new standing view.

Prompt set: create five standing views of the referenced Macar in the exact grid above; preserve identity, clothes, proportions, materials and painted style; keep each entire figure isolated inside its own cell, with no text, floor, shadows, helmet or crown. Weapon variant instructions: replace the hammer in all views with the specified axe or crossbow, remove the original hammer completely, and retain the standing directions and atlas layout. An axe spacing correction moves the bottom-row figures down so their weapon pixels remain in their own cells.

`MacarIdleAtlas.js` extracts each cell into a render canvas after decode, preserving generated paint and alpha. It also supplies crown seats. Maul standing views load before play; equipped weapon standing views load with the corresponding weapon art. Cold maul standing art retains the matching directional planted walk frame until its standing pose is ready.

The existing walking and attack sheets are preserved. Axe and crossbow walking/attack art still has the existing front-facing poses; this addition supplies directional standing art only.
