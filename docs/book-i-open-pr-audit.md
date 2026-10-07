# Book I open PR audit — 2026-10-06

Reviewed against main 7c9efa9c and the completion branch. Closing a PR does not delete its branch or archived artwork.

| PR | Disposition | Evidence |
|---|---|---|
| #44 | Superseded | Current black canvas, beyond-wall mask and face renderer; HallVisibility tests. |
| #80 | Superseded | Current CRUSH_SPOTS and native start cave-in cells, titles and fallen-kin progression. Preserve historical art on its branch. |
| #81 | Carried forward | Modern south descents, carved landings, visible stairs, bronze wall plane and guardian gates. VisibleDescents tests plus floors 2–5 regression. |
| #85 | Carried forward | Historical assessment imported to book-i-assessment.md with its age explicitly marked. |
| #107 | Superseded | Chapter II intro has identical Git blob 681e0b063af740d6cf6c894716bec36b4fd518dd; current mood-only intros/start log and BookIPresentation tests. |
| #145 | Superseded | Current prop_dwarfface.png and DwarfFaceCrop tests already maintain the corrected crop. Historical alternative remains in its branch. |
| #152 | Blocked; retain draft | Seven approved KEEP PNG payloads are absent from the PR. Its legacy effect implementation also needs a separate rebase onto current fx_* rendering. Do not apply obsolete front-only Macar walk locks. |

## Missing approved sprite payloads

PR #152 contains code/tests, no PNG payloads. A checksum audit of 35 named local candidates found no match to the approved SHA-256 prefixes:

| Destination | Expected prefix |
|---|---|
| dwarf_macar | 531f9088 |
| dwarf_pordoom | 07f4a194 |
| dwarf_fendur | fc2f236f |
| dwarf_orbo | fd170b38 |
| dwarf_talpor | a3f25962 |
| mon_goblin | 6324446e |
| mon_goblin_king (approved Goblin B) | d79f41bf |

The original seven approved PNGs are required before exact signed-pack binding can be completed. Generated replacement art cannot satisfy those hashes.

## Verification

132 automated tests pass. Browser suites: shared Macar 1,631; shafts 2,192; weapon/crown 2,420; Chapter I 459; party movement 24,124; Book I path 266 — zero failures. Book I path resolves encounters through damage handlers; it verifies progression, saves and boss phases, not difficulty balance. Manual browser review confirmed clear south stair landings and camp descent on floors 2–4 and wall-backed ruby placement on floor 5.

Combat uses distinct windup/contact/recovery bodies with the same body canvas across maul, axe and crossbow. Crossbow aiming reuses recovery posture; separate directional bow draw/release body frames remain a possible future visual refinement.
