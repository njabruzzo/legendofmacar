# Shared Macar body and walking art

The maul and axe are now equipment layers on the exact same Macar body frame. The runtime uses one body atlas with five views and six states (idle, four walking phases, melee contact). West-facing directions mirror their east-facing counterparts. Legacy maul/axe fallback keys are composed from the same atlas, so cold loads cannot bring back an unrelated Macar body. Crossbow artwork is outside this change.

The walking cycle advances only when Macar moves; a blocked step plants idle. The equipment layer uses measured pommel/socket landmarks and the existing shaft-length targets (maul 0.53, axe 0.65 of entity height). Crown and feet anchors belong to the body frame, independent of the weapon.

Assets produced with the built-in imagegen skill, using `assets/creatures/dwarf_macar.png` as the character identity reference and `assets/creatures/dwarf_macar_idle_axe_s_v3.png` as the battle-axe equipment reference. Original sprites remain available. Generated source alpha is preserved on disk; the runtime atlas slicer excludes disconnected edge flecks from neighboring cells.

## Body atlas

`assets/creatures/shared/macar-body-v1.png`, 1374 × 1145, 6 columns × 5 rows.

Prompt:

Create a transparent game animation sprite sheet of the EXACT dwarf Macar in the supplied reference: same stern broad face, swept brown hair, three long brown beard braids with gold cuffs, fur mantle, dark brown leather coat with gold triangular studs, diamond belt buckle, fur-topped armored boots, squat broad dwarf build. Do not redesign him. This is a SHARED weaponless body atlas: NO maul, axe, crossbow, shaft or weapon anywhere. His right hand remains raised at shoulder height, clenched to grip an invisible shoulder-carried weapon; free arm animates naturally. Actual alpha transparency, no shadows, no floor, no labels or grid lines. Output 3072x2560 pixels, strict SIX equal columns and FIVE equal rows, 512x512 cells. Exactly thirty complete non-overlapping full-body sprites, centered at x midpoint of every cell, both feet never cropped, head aligned near y90 and planted sole at y480 in each cell; 35px transparent margin all sides. All thirty depict the SAME man with identical clothing/face/build and fixed camera scale. Five view rows: row1 facing SOUTH straight front; row2 SOUTH EAST front three-quarter toward image right; row3 EAST true side profile toward image right; row4 NORTH EAST rear three-quarter toward image right; row5 NORTH full back. Six animation columns in EACH row: col1 idle relaxed upright with BOTH feet planted parallel; col2 walking left-foot contact, left leg forward right leg back; col3 walking passing pose left planted right knee forward lifted; col4 opposite right-foot contact right forward left back; col5 opposite passing pose right planted left knee forward lifted; col6 melee contact body pose leaning into a strike with both hands together low in front, gripping an invisible long weapon, boots planted wide. Walking must show visibly different alternating legs and foot placements, not duplicated standing poses. Keep head and shoulders consistent through all frames; very slight natural gait bob only. Preserve the photoreal painted fantasy style and original Macar identity, no crown (game adds crown), no orange/red-haired substitute, no different face, no cape replacing coat. Every row uses its requested view consistently through all six poses. Exact equal cell grid essential for engine slicing.

## Equipment atlas

`assets/creatures/shared/macar-weapons-v1.png`, 1254 × 1254, 2 rows.

Prompt:

Transparent game equipment sprite sheet ONLY two weapons, NO character, NO hands, no background, no floor, no text. Square 1536x1536 strict two equal horizontal rows. Top row: Macar's exact dark steel rectangular maul from reference1 with gold angular knotwork face, attached to its dark leather-wrapped brown shaft with gold pommel and bands. Bottom row: Macar's exact double-bladed dark steel battle axe from reference2 with sharp silver crescent cutting edges, gold/ivory Celtic knot patterns, gold central socket. Photoreal painted fantasy game art matching references. Both weapon shafts point strictly horizontal from LEFT pommel to RIGHT head socket, no angle; pommel centered x140, head socket centered x1080. Top shaft y384; lower shaft y1152. EXACT SAME shaft length between pommel and head socket in both. Full rectangular maul head spans y150..618 around the socket top row, symmetric double crescent axe head spans y906..1398 bottom row. Gold sockets connect shaft seamlessly to heads. Complete entire weapons with generous transparent margins on all four edges and zero overlap between rows. Real alpha transparency. Preserve their approved style rather than inventing new weapon designs.

