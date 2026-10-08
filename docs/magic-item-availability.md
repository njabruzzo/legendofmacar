# Magic inventory and loot availability

New random treasure uses `MagicItemAvailability` as an explicit allowlist.
An item is eligible only when its described gameplay effect has an engine path.
The original tables remain intact for old saves and future implementation.
Within an eligible category, retained entries keep their original relative roll weights.
Scrolls currently have no fully implemented entries, so scroll rolls yield no item.
Potion rolls are restricted to implemented healing, extra healing, longevity,
fire resistance and poison effects (including the campaign's explicit healing amounts).
Poison stays in Brews and is excluded from the Magic view.

Included equipment covers ordinary enchantment bonuses on armor, shields and
weapons, supported enemy-specific sword bonuses, magical arrows, the listed
protection/resistance/free-action/invisibility/regeneration rings, magic missiles,
the listed boots/cloaks/gauntlets, and health/poison/wound-closure periapts.
The authoritative names and rules are in `src/packs/MagicItemAvailability.js`.
Items with only placeholder, partial or generic effects are excluded from new
random loot, including wishes, planar gates, golem manuals, spell scrolls,
life stealing, disruption, crossbow speed/distance, and most rods/staves/wands.

Items already present in saves are retained and explicitly marked when their
special effect is unfinished. Ordinary kit remains in the internal `magic`
storage array for save compatibility, but the Magic view classifies the item
itself using catalog identity and enchantment metadata. Ordinary weapons,
armor, beer, resources, supplies, notes and mundane quest objects are excluded.
Gear, Supplies, Materials, Quest and Notes have separate category controls.

Wearables and held rods/wands have slots. Select equipped activated magic and
choose **Use magic power** during a descent. Invisibility is an at-will toggle;
attacking uses the existing invisibility-breaking rules. Regeneration restores
one HP per advanced dungeon turn while worn and stops when stowed. Magic
missiles use the existing bolt damage path and charge counter; an empty wand
does not cast. Loose magical arrows are readied and consumed by the existing
ammunition path rather than worn as armor.

Validation covers 700 deterministic eligible loot rolls plus 100 excluded
scroll rolls, inventory classification, equipment slots, activated wearable
powers, charge exhaustion, worn-only regeneration, and real browser damage
and inventory rendering. Run `/qa-shared-macar?magicInventory=1` for the browser
fixture.
