# Protected-asset audit

Audited 2026-10-22 from this branch (`cursor/bone-crown-prompt-draw-65ea`), which has the same image bytes as `main` `92aca4b`. No art files were changed here. Nothing in this audit was repaired.

Compared, for every path:

- the approval commit named below, when there is one
- `HEAD` (same bytes as `main` `92aca4b` for every image)
- live `https://www.legendofmacar.com/`
- open `#342` tip `b5b6b3f` (`cursor/l3-own-shell-4c0f`)
- open `#343` tip `ac67287` (`cursor/level-distinct-groundwork-ba84`)

Binding means `SPRITE_FILES` in `index.html` names that path. Preload means the path is in `src/assets/asset-manifest.js`, which is the list the loader uses. The critical `first[]` queue and the `<link rel="preload">` tags cover the title and the Chapter I entrance, not every sprite. A file can sit in the manifest because it is on disk and still have no sprite key.

Scene pixels are a headless Chrome diff at 1280×800: draw the scene, hide that sprite or prop, count pixels that change. File-opaque means the decoded image itself has painted pixels. Every file in `assets/protected-assets.json` decodes with painted pixels (smallest is the scene crown, 4192 opaque pixels).

## What to look at

Two real gaps, both already on `main`. `#342` and `#343` do not add a third.

| what | verdict | where it still is | what changed it |
| --- | --- | --- | --- |
| Hold / Regroup / Focus HUD (`#244`, `#255`) | unrendered | `PartyOrders.js` is still loaded. `PartyOrders.FLAG` is forced `false`. There is no HUD draw. Chrome: `hasDraw` false | `#260` `4233ecf` "Mobile HUD declutter: drop party orders, slim party strip, compact corner" (2026-09-26). Same flag on the `#342` tip and the `#343` tip |
| Macar NE / NW / SE / SW sheets from the `#251` facing set, and `dwarf_macar_ne_w1.png` | missing on disk, live HTTP 404, missing on both open tips | `MACAR_PLAN` still names `macar_ne_w1`, `macar_ne_w2`, `macar_se_w1`, `macar_se_w2`. `SPRITE_FILES.macar_ne_w2` still points at the deleted file. Walk code uses a frame only when `sprReady`, so those octants fall through to the front `w1`/`w2` pair | `916621c` "Macar anchor lock: keep only dwarf_macar_atk_contact.png", merged as `570ed13` (2026-09-29, no PR number). `src/qa/MacarAnchor.js` records this as Nick's 2026-09-28 anchor lock and lists the files that must stay off disk |

`#302` (`6c460fb`, merge `d56c6ca`) did not delete the `#247` altar. It pointed the chapel key `altar_teeth` at `prop_altar_teeth_no_walls_v13.png`. The Nick Good sheet `prop_altar_teeth.png` (`a1c9a92a…`, same bytes as `prop_altar.png`) is still on disk, in the manifest, and live, and it has no `SPRITE_FILES` key. The chapel draws v13. v13 is a candidate in the manifest (no Good on record). Same binding on `#342` and `#343`.

## Replaced, file still present

These hashes differ from the approval commit. The current file is bound, in the manifest, live HTTP 200 with the same hash, and the same on both open tips. Current Macar, ghost, crown, and face scenes still paint (pixel counts below).

| asset | approval | current sha256 | first commit after the approval | how to read it |
| --- | --- | --- | --- | --- |
| `dwarf_macar.png` | `#246` Nick Good freearm v11 `f3fc2871…` | `08a88353…` | `916621c` anchor lock, merge `570ed13` | later sheets. `#272` `299ae36` sets haft length "per Nick" |
| `dwarf_macar_w1.png` | `#246` `c343f37f…` | `571b6abb…` | `88a4660` "Restore original Macar…", which is inside `#257` | same chain, then the anchor set |
| `dwarf_macar_w2.png` | `#246` `3feca682…` | `bae79c43…` | `88a4660` inside `#257` | same |
| `dwarf_macar_back_w1.png` | `#251` `e203a8ea…` | `66973b2e…` | `916621c` / `570ed13` | file remains, bytes replaced, still the north walk |
| `dwarf_macar_back_w2.png` | `#251` `b293328d…` | `23adb464…` | `916621c` / `570ed13` | same |
| `dwarf_talpor_ghost.png` | `#250` Nick CALL `c73fa0ad…` | `c519730f…` | `b303ea8` "Bind the approved Talpor idle and the coin pile", landed in `#257` | later approval, still the idle the ghosts draw |
| `prop_bone_crown_scene.png` | `#247` `c3e2071a…` | `8b3950d3…` | `#263` `3623f46` opened the middle | protected entry is the `#263` hash. Live matches `#263` |
| `prop_demon_dwarfface.png` | `#247` `b3396abe…` | `6204175d…` | `cdfc51f` "Bind the approved demon face plates…", upright plates `2a86792`, both inside `#257` | protected entry is the `#257` v5 hash. Chapel face scene is 52695 px |

`#238` and `#240` did not change ghost files. They are the spectral-white and outline pass (`GHOST_CYAN_MIX`, `GHOST_EDGE_BLUR`, and the rest of that block), and that pass is still in `index.html`. The sheets it tints are the `#248` / `#249` Nick Good files, which match `HEAD` and live.

## Scene pixels (1280×800)

| scene | px that change when the art is hidden | read |
| --- | --- | --- |
| Title menu `#239` `title_menu.jpg` | 874771 | full-bleed cover |
| Title splash `#229` `title_splash.jpg` | 1020591 | draws |
| Chapter I ruby door `#229` / `#243` | 58719 | door prop found and painted. `#243` changed the draw, not the png, and the png still matches `#229` |
| Stone dwarf face | 4975 | painted |
| Teeth chapel floor `#252` (`teeth_floor` + atlas) | 274756 | both sheets decoded (512×512 and 1280×640) |
| Tooth props on that floor | 348 across 48 props | `tooth`, `tooth_2`, `tooth_3` decoded |
| Seated bone crown | 1050 | one `drawBoneCrownAt` |
| Chapel demon face `#257` | 52695 | painted |
| Four ghost dwarves (`#248` idle, `#249` walk) | 3582 | hiding every loaded ghost key changes the frame |
| Macar (idle + front `w1`/`w2` + attack) | 869 | current sheets paint. The `#246` bytes are the replaced rows above |
| Rest card `#325` bare `vB` | 1402 | `drawSleepRest` |
| Rest card `#325` crowned `vA2` | 1402 | Nick Good via Eva Review Desk chat, 2026-10-08 CT. Protected as `restCardMacarCrown` |
| Animate Dead party strip `#253` | 6046 | with the crown worn, `partyPortraitList` leads with Macar, then Pordoom, Fendur, Orbo, Talpor |
| Party-orders HUD | 0 | no draw function |

`intro_ch1.jpg` matches the `#229` tree (`0a55def9…`), is the Chapter I splash (`chapterSplashImg`), is in the critical queue, and is live HTTP 200. `intro_cavein.jpg` matches `#229` and is the fallback when `intro_ch1` is absent. Chapel walls `tile_wall_teeth_chapel.png` and `tile_wall_teeth_chapel_opaque.png` match `ea2baeb` (merged as `#234`) and live. Lever and pillar ruby match `347d721` and live. `prop_rubywall.png` matches the `#243` tree and live.

`prop_rubydoor_stairs_v2.png` was not in the `#243` tree. It arrived in `b66212b` and matches live. It is bound as `rubydoor_stairs`.

## Open tips

`#342` `b5b6b3f` against `main`: every audited image that exists on `main` is the same blob. The branch only adds Level 3 web sheets and three hourglass props, and binds those new keys. It does not restore the deleted Macar frames or the party-orders HUD.

`#343` `ac67287` against `main`: no asset-file adds, edits, or deletes. `index.html` can register `tile_floor_*_116.png` and `_66.png` siblings and multiply-tint a floor when a level sets `tileset.tint`. The same diff says Chapter I has no campaign tileset, so its mine floor and coping stay. Sprite paths for the Nick set are unchanged. The party-orders flag is still false. The deleted Macar frames are still absent.

## `assets/protected-assets.json`

Recorded 227. Enforced 225. Unenforced candidates 2: altar v13 (`altar_teeth`, `assets/props/prop_altar_teeth_no_walls_v13.png`) and `crown_bone_wall_v1` (`crown_bone_wall`, `assets/tiles/crown_bone_wall_v1.png`).

The enforced set is the 4 `protected` entries plus the 221 `bound` entries. The gate fails if any of those files is deleted or renamed, if its sha256 drifts, if `SPRITE_FILES` no longer binds it, or if the preload registry drops it. A byte change against `main` is allowed only when the same change sets a new `approvedBy`. The two candidates stay recorded and unenforced: v13 has no Good (the `#247` sheet is the separate `altar` key), and the crown bone wall has no Good.

35 entries carry `approvedBy` (the 4 protected ones, plus 31 bound ones whose bytes still match a cited PR, commit, or date, including the `#249` ghost walks `fendur_ghost_w1` / `w2` and the same pair for Pordoom, Orbo, and Talpor). The other 190 bound entries are enforced without a cited approval. Bare rest card vB (`restCardMacar`) carries the same Eva citation as the crowned card. For every entry the recorded sha256 matches the file on `HEAD`, the sprite key is bound, the path is in the preload manifest, live is HTTP 200 with that hash, and both open tips have the same blob. None of the files is blank.

Protected:

| key | sha256 | approval on the entry | scene px |
| --- | --- | --- | --- |
| `bone_crown` | `5826539d44b7e2a7c8743be127af7b724fd31c61c07b900a6b0d9a597a040692` | `#247` | worn / take sheet; scene crown is the altar paint |
| `bone_crown_scene` | `8b3950d3807e7947480a0a9d73d82cb86a85b07dbaac0c355f4784143c9c60f3` | `#263` (seat `#257`) | 1050 |
| `demon_dwarfface` | `6204175dc88fe15450c514361a24585bb5d08e882e06253ec7c497234302fa39` | `#257` | 52695 |
| `restCardMacarCrown` | `9b6333bcc8b2e506587aa912673943042edbd38d5f3e36366caeb2ae3936faa6` | Nick Good via Eva Review Desk chat, 2026-10-08 CT | 1402 |

## Full catalog

`sha256` is the first 12 hex digits. `live` is `200 same` when the live bytes match `HEAD`. `#342` and `#343` are `same` when the git blob matches `HEAD`. `bound` is whether `SPRITE_FILES` names the path. `manifest` is `asset-manifest.js`.

| key | group | sha256 | live | #342 | #343 | bound | manifest |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `bone_crown` | protected | `5826539d44b7` | 200 same | same | same | yes | yes |
| `bone_crown_scene` | protected | `8b3950d3807e` | 200 same | same | same | yes | yes |
| `demon_dwarfface` | protected | `6204175dc88f` | 200 same | same | same | yes | yes |
| `altar_teeth` | candidates | `3045eb1ed30b` | 200 same | same | same | yes | yes |
| `crown_bone_wall` | candidates | `e2a6dd43e9f8` | 200 same | same | same | yes | yes |
| `restCardMacarCrown` | protected | `9b6333bcc8b2` | 200 same | same | same | yes | yes |
| `altar` | bound | `a1c9a92a2569` | 200 same | same | same | yes | yes |
| `banner` | bound | `97f1ac7d0e8d` | 200 same | same | same | yes | yes |
| `barrel` | bound | `36e48c869c1c` | 200 same | same | same | yes | yes |
| `barrow` | bound | `f64002ebce8a` | 200 same | same | same | yes | yes |
| `bat` | bound | `7f9addfb851a` | 200 same | same | same | yes | yes |
| `beetle` | bound | `a5337ad20e6d` | 200 same | same | same | yes | yes |
| `beholder` | bound | `29c008643f31` | 200 same | same | same | yes | yes |
| `bell` | bound | `6003dd805093` | 200 same | same | same | yes | yes |
| `bones` | bound | `db3fdca64f85` | 200 same | same | same | yes | yes |
| `boulder` | bound | `78c3b1fd3b22` | 200 same | same | same | yes | yes |
| `boulder2` | bound | `637b022bc298` | 200 same | same | same | yes | yes |
| `brazier` | bound | `a5b23f8e5d15` | 200 same | same | same | yes | yes |
| `bronzedoor` | bound | `159621586051` | 200 same | same | same | yes | yes |
| `burrower` | bound | `3024089e5cd1` | 200 same | same | same | yes | yes |
| `cart` | bound | `c0369669383e` | 200 same | same | same | yes | yes |
| `cavefern` | bound | `68f1c166c644` | 200 same | same | same | yes | yes |
| `cavein` | bound | `53059dd14e8d` | 200 same | same | same | yes | yes |
| `ch1_lift_lever` | bound | `9fe322138544` | 200 same | same | same | yes | yes |
| `ch1_lift_lever_thrown` | bound | `fd6dc4082ed5` | 200 same | same | same | yes | yes |
| `ch1_pillar_ruby` | bound | `b40ad69fe074` | 200 same | same | same | yes | yes |
| `chain` | bound | `e30432aa04bc` | 200 same | same | same | yes | yes |
| `champion` | bound | `44c3ddbce399` | 200 same | same | same | yes | yes |
| `chapters_plate` | bound | `09f22b0afb2d` | 200 same | same | same | yes | yes |
| `construct` | bound | `34b683521e53` | 200 same | same | same | yes | yes |
| `craftstation` | bound | `57c3158d37fe` | 200 same | same | same | yes | yes |
| `crate` | bound | `ac1c2ecf671f` | 200 same | same | same | yes | yes |
| `crawler` | bound | `304164df1e8a` | 200 same | same | same | yes | yes |
| `crystal` | bound | `53dbcd10524d` | 200 same | same | same | yes | yes |
| `demon_dwarfface_empty` | bound | `2ee12bb9b794` | 200 same | same | same | yes | yes |
| `demon_dwarfface_vault` | bound | `b3396abe313b` | 200 same | same | same | yes | yes |
| `demonface` | bound | `6204175dc88f` | 200 same | same | same | yes | yes |
| `drake` | bound | `8bce40f3cdca` | 200 same | same | same | yes | yes |
| `drow` | bound | `4e3e1d12cc81` | 200 same | same | same | yes | yes |
| `drow_mage` | bound | `7fc62600f1c8` | 200 same | same | same | yes | yes |
| `duergar` | bound | `b8f724436542` | 200 same | same | same | yes | yes |
| `duergar_overseer` | bound | `21413f26fc1b` | 200 same | same | same | yes | yes |
| `dwarf_skeleton_idle` | bound | `98cee784262a` | 200 same | same | same | yes | yes |
| `dwarfface` | bound | `f3b58cfa5b01` | 200 same | same | same | yes | yes |
| `dwarfkey` | bound | `15314429d1c3` | 200 same | same | same | yes | yes |
| `eggs` | bound | `19a3592c359a` | 200 same | same | same | yes | yes |
| `elder` | bound | `5cd61007a4ea` | 200 same | same | same | yes | yes |
| `fendur` | bound | `ec758c71d84c` | 200 same | same | same | yes | yes |
| `fendur_dead` | bound | `e4479f195f61` | 200 same | same | same | yes | yes |
| `fendur_ghost` | bound | `efbc262377be` | 200 same | same | same | yes | yes |
| `fendur_ghost_back` | bound | `a9abb6d10a95` | 200 same | same | same | yes | yes |
| `fendur_ghost_w1` | bound | `4e7b7e257046` | 200 same | same | same | yes | yes |
| `fendur_ghost_w2` | bound | `74fee9634ab4` | 200 same | same | same | yes | yes |
| `floor_fungi` | bound | `e354c985df90` | 200 same | same | same | yes | yes |
| `floor_hall` | bound | `eedf9fd47b0a` | 200 same | same | same | yes | yes |
| `floor_mine` | bound | `654bf11901c7` | 200 same | same | same | yes | yes |
| `floor_ruin` | bound | `ae0504f23bdc` | 200 same | same | same | yes | yes |
| `fx_bolt` | bound | `fa37aab4e905` | 200 same | same | same | yes | yes |
| `fx_bomb` | bound | `5f26e986a7ce` | 200 same | same | same | yes | yes |
| `fx_flame` | bound | `7af66319506a` | 200 same | same | same | yes | yes |
| `fx_heal` | bound | `b3ae50ae7ca1` | 200 same | same | same | yes | yes |
| `fx_hex` | bound | `854d59af9c4d` | 200 same | same | same | yes | yes |
| `fx_spit` | bound | `b2c78286513b` | 200 same | same | same | yes | yes |
| `fx_wisp` | bound | `140502db04c4` | 200 same | same | same | yes | yes |
| `gate` | bound | `d45b65903fdf` | 200 same | same | same | yes | yes |
| `glowcap` | bound | `3f9f543afa6a` | 200 same | same | same | yes | yes |
| `gnome` | bound | `ac14a9c6854c` | 200 same | same | same | yes | yes |
| `gnome_good` | bound | `6b361755e923` | 200 same | same | same | yes | yes |
| `gnome_sapper` | bound | `acb4d659aa24` | 200 same | same | same | yes | yes |
| `gnome_tinker` | bound | `08a7a5104ea2` | 200 same | same | same | yes | yes |
| `golem_brass` | bound | `0038318fe267` | 200 same | same | same | yes | yes |
| `golem_gold` | bound | `045f2fdd710f` | 200 same | same | same | yes | yes |
| `golem_platinum` | bound | `d2db50167567` | 200 same | same | same | yes | yes |
| `golem_silver` | bound | `a0a3c51f726f` | 200 same | same | same | yes | yes |
| `hidepile` | bound | `b92c4021f2d7` | 200 same | same | same | yes | yes |
| `hookedhorror` | bound | `25977ef7a76f` | 200 same | same | same | yes | yes |
| `horror` | bound | `eebb86ad405c` | 200 same | same | same | yes | yes |
| `icon_attack` | bound | `b75211f22af0` | 200 same | same | same | yes | yes |
| `icon_attack_long` | bound | `824e9b4fc55d` | 200 same | same | same | yes | yes |
| `icon_attack_wide` | bound | `0312fbfe040c` | 200 same | same | same | yes | yes |
| `icon_bomb` | bound | `3a79a64861d2` | 200 same | same | same | yes | yes |
| `icon_boots` | bound | `2bfd62e0a8a3` | 200 same | same | same | yes | yes |
| `icon_bracers` | bound | `5a66408f1210` | 200 same | same | same | yes | yes |
| `icon_campfire` | bound | `069ceae89b44` | 200 same | same | same | yes | yes |
| `icon_chest` | bound | `b0fe9096fa35` | 200 same | same | same | yes | yes |
| `icon_climb` | bound | `4c82f1001229` | 200 same | same | same | yes | yes |
| `icon_craft` | bound | `b6b49a904d9d` | 200 same | same | same | yes | yes |
| `icon_cross` | bound | `b1233016f0bb` | 200 same | same | same | yes | yes |
| `icon_crossbow` | bound | `de3bc7e7acb9` | 200 same | same | same | yes | yes |
| `icon_defend` | bound | `21ba89209d3a` | 200 same | same | same | yes | yes |
| `icon_flask` | bound | `95bb1f0d28b8` | 200 same | same | same | yes | yes |
| `icon_gloves` | bound | `346520043c08` | 200 same | same | same | yes | yes |
| `icon_helm` | bound | `349d0f3afec8` | 200 same | same | same | yes | yes |
| `icon_necklace` | bound | `b601fe55fd4d` | 200 same | same | same | yes | yes |
| `icon_pack` | bound | `5fe9750ffbae` | 200 same | same | same | yes | yes |
| `icon_pants` | bound | `0d99486db942` | 200 same | same | same | yes | yes |
| `icon_plant` | bound | `11f326614f55` | 200 same | same | same | yes | yes |
| `icon_quiver` | bound | `fab61e698f9e` | 200 same | same | same | yes | yes |
| `icon_save` | bound | `f44fc5d455de` | 200 same | same | same | yes | yes |
| `icon_secret` | bound | `cc044eab79da` | 200 same | same | same | yes | yes |
| `icon_shield` | bound | `21ba89209d3a` | 200 same | same | same | yes | yes |
| `icon_shovel` | bound | `7c66e477d00c` | 200 same | same | same | yes | yes |
| `icon_specialty_i` | bound | `2ddd27c222a1` | 200 same | same | same | yes | yes |
| `icon_specialty_ii` | bound | `6794b9984571` | 200 same | same | same | yes | yes |
| `icon_specialty_iii` | bound | `e827952b2d0c` | 200 same | same | same | yes | yes |
| `icon_specialty_iv` | bound | `3d8aebab64e2` | 200 same | same | same | yes | yes |
| `icon_sword` | bound | `904938e93de9` | 200 same | same | same | yes | yes |
| `idol` | bound | `8bbbe38bc50c` | 200 same | same | same | yes | yes |
| `intro_cavein` | bound | `51034bb4d232` | 200 same | same | same | yes | yes |
| `intro_ch1` | bound | `0a55def985ef` | 200 same | same | same | yes | yes |
| `intro_ch2` | bound | `21f18694ea49` | 200 same | same | same | yes | yes |
| `intro_ch3` | bound | `48afd1432d44` | 200 same | same | same | yes | yes |
| `intro_ch4` | bound | `03c7bc7a5670` | 200 same | same | same | yes | yes |
| `intro_ch5` | bound | `9776a342a0d8` | 200 same | same | same | yes | yes |
| `king` | bound | `2e7ff80faabf` | 200 same | same | same | yes | yes |
| `lantern` | bound | `41dd40ecf48c` | 200 same | same | same | yes | yes |
| `lichen` | bound | `6d0684ec1c30` | 200 same | same | same | yes | yes |
| `lift` | bound | `32f311b7ded4` | 200 same | same | same | yes | yes |
| `loot_chest` | bound | `1a46a969c0f6` | 200 same | same | same | yes | yes |
| `loot_coins` | bound | `81ca34432b7a` | 200 same | same | same | yes | yes |
| `loot_gems` | bound | `c1100342e67e` | 200 same | same | same | yes | yes |
| `loot_herbs` | bound | `5911a53055c1` | 200 same | same | same | yes | yes |
| `loot_jewelry` | bound | `4fed435a99da` | 200 same | same | same | yes | yes |
| `loot_ore` | bound | `677e7f05234b` | 200 same | same | same | yes | yes |
| `loot_potion` | bound | `839116dbd8d7` | 200 same | same | same | yes | yes |
| `loot_ruby` | bound | `f579fb93be29` | 200 same | same | same | yes | yes |
| `loot_ruby_shard` | bound | `1725be07d6c4` | 200 same | same | same | yes | yes |
| `macar` | bound | `08a88353af7a` | 200 same | same | same | yes | yes |
| `macar_atk_contact` | bound | `54f072cde627` | 200 same | same | same | yes | yes |
| `macar_atk_n` | bound | `c6aa96e19bf5` | 200 same | same | same | yes | yes |
| `macar_atk_ne` | bound | `edce85439bfb` | 200 same | same | same | yes | yes |
| `macar_atk_s` | bound | `90cbd314522c` | 200 same | same | same | yes | yes |
| `macar_atk_se` | bound | `6220591132e7` | 200 same | same | same | yes | yes |
| `macar_axe` | bound | `eaed5bbc3ced` | 200 same | same | same | yes | yes |
| `macar_axe_atk` | bound | `8ffda9a2e004` | 200 same | same | same | yes | yes |
| `macar_axe_w1` | bound | `40284dffb585` | 200 same | same | same | yes | yes |
| `macar_axe_w2` | bound | `26f6fc2a7c4a` | 200 same | same | same | yes | yes |
| `macar_back_w1` | bound | `66973b2e4ed9` | 200 same | same | same | yes | yes |
| `macar_back_w2` | bound | `23adb464d651` | 200 same | same | same | yes | yes |
| `macar_e_w1` | bound | `24cd742dc876` | 200 same | same | same | yes | yes |
| `macar_e_w2` | bound | `8fd94baf140a` | 200 same | same | same | yes | yes |
| `macar_w1` | bound | `571b6abb1706` | 200 same | same | same | yes | yes |
| `macar_w2` | bound | `bae79c43dd42` | 200 same | same | same | yes | yes |
| `macar_xbow` | bound | `b1492e0b118c` | 200 same | same | same | yes | yes |
| `macar_xbow_atk` | bound | `a93734c1b58a` | 200 same | same | same | yes | yes |
| `macar_xbow_w1` | bound | `6360113f90b4` | 200 same | same | same | yes | yes |
| `macar_xbow_w2` | bound | `561a4f808c1b` | 200 same | same | same | yes | yes |
| `moss` | bound | `56bf5f695ff2` | 200 same | same | same | yes | yes |
| `myconid` | bound | `44205eb273a7` | 200 same | same | same | yes | yes |
| `names` | bound | `5e5a8b3207af` | 200 same | same | same | yes | yes |
| `nightbloom` | bound | `34c3aa07a948` | 200 same | same | same | yes | yes |
| `orbo` | bound | `0c8230170964` | 200 same | same | same | yes | yes |
| `orbo_dead` | bound | `d45f3db3c43c` | 200 same | same | same | yes | yes |
| `orbo_ghost` | bound | `a077fef6e802` | 200 same | same | same | yes | yes |
| `orbo_ghost_back` | bound | `ab5d037dc248` | 200 same | same | same | yes | yes |
| `orbo_ghost_w1` | bound | `2a5d1c8b1802` | 200 same | same | same | yes | yes |
| `orbo_ghost_w2` | bound | `db0716eadfa2` | 200 same | same | same | yes | yes |
| `orepile` | bound | `3756a9a4beb9` | 200 same | same | same | yes | yes |
| `pickpile` | bound | `4fbdeda11885` | 200 same | same | same | yes | yes |
| `pillar` | bound | `9e1472242a14` | 200 same | same | same | yes | yes |
| `pordoom` | bound | `5b416f3e300e` | 200 same | same | same | yes | yes |
| `pordoom_dead` | bound | `a1b66a08980a` | 200 same | same | same | yes | yes |
| `pordoom_ghost` | bound | `6ef58ed61618` | 200 same | same | same | yes | yes |
| `pordoom_ghost_back` | bound | `1f0ee2d72b83` | 200 same | same | same | yes | yes |
| `pordoom_ghost_w1` | bound | `e66b2a100238` | 200 same | same | same | yes | yes |
| `pordoom_ghost_w2` | bound | `a243e0404733` | 200 same | same | same | yes | yes |
| `rat` | bound | `0df30799ce18` | 200 same | same | same | yes | yes |
| `restCardMacar` | bound | `cc9bb737bcbf` | 200 same | same | same | yes | yes |
| `roots` | bound | `facb0fe28d5a` | 200 same | same | same | yes | yes |
| `rubble` | bound | `dcc7148ef0d8` | 200 same | same | same | yes | yes |
| `rubble2` | bound | `5c879f49e788` | 200 same | same | same | yes | yes |
| `rubydoor` | bound | `6abd669ddf79` | 200 same | same | same | yes | yes |
| `rubydoor_face` | bound | `98fb95370478` | 200 same | same | same | yes | yes |
| `rubydoor_stairs` | bound | `b5ffa904207e` | 200 same | same | same | yes | yes |
| `rubypillar` | bound | `432686c041bc` | 200 same | same | same | yes | yes |
| `rubywall` | bound | `d68572d9e791` | 200 same | same | same | yes | yes |
| `ruin_house` | bound | `6184cfae78c4` | 200 same | same | same | yes | yes |
| `sack` | bound | `b92c4021f2d7` | 200 same | same | same | yes | yes |
| `secret_door` | bound | `33d653fa9f4a` | 200 same | same | same | yes | yes |
| `secret_wall_e` | bound | `ba6f5466aa04` | 200 same | same | same | yes | yes |
| `secret_wall_n` | bound | `c490d09ccdbd` | 200 same | same | same | yes | yes |
| `secret_wall_w` | bound | `4621b98c25cc` | 200 same | same | same | yes | yes |
| `shadowcleaver` | bound | `bf42ed8b0add` | 200 same | same | same | yes | yes |
| `shroom` | bound | `f910770755ae` | 200 same | same | same | yes | yes |
| `slime` | bound | `b48d948f4625` | 200 same | same | same | yes | yes |
| `spider` | bound | `1c911c5cee0b` | 200 same | same | same | yes | yes |
| `spitter` | bound | `e1fa3599900e` | 200 same | same | same | yes | yes |
| `sporepuff` | bound | `ecd741ab154f` | 200 same | same | same | yes | yes |
| `stairs` | bound | `ef29c9e5efe0` | 200 same | same | same | yes | yes |
| `stalagmite` | bound | `f4cc7af680d6` | 200 same | same | same | yes | yes |
| `talpor` | bound | `3106ea98fad4` | 200 same | same | same | yes | yes |
| `talpor_dead` | bound | `dd79311c68d3` | 200 same | same | same | yes | yes |
| `talpor_ghost` | bound | `c519730f04e3` | 200 same | same | same | yes | yes |
| `talpor_ghost_back` | bound | `3d36c50f74c2` | 200 same | same | same | yes | yes |
| `talpor_ghost_w1` | bound | `20180a390e3d` | 200 same | same | same | yes | yes |
| `talpor_ghost_w2` | bound | `a901092acf2d` | 200 same | same | same | yes | yes |
| `teeth_floor` | bound | `fab3cda0d6c5` | 200 same | same | same | yes | yes |
| `teeth_floor_atlas` | bound | `07c952f9db73` | 200 same | same | same | yes | yes |
| `thinone` | bound | `de1874d8095b` | 200 same | same | same | yes | yes |
| `throne` | bound | `8473a433e258` | 200 same | same | same | yes | yes |
| `timber` | bound | `d1088ff5002b` | 200 same | same | same | yes | yes |
| `title_logo` | bound | `11cb79a2256e` | 200 same | same | same | yes | yes |
| `title_menu` | bound | `bf6f14a4f4a4` | 200 same | same | same | yes | yes |
| `title_splash` | bound | `6944babd0fa4` | 200 same | same | same | yes | yes |
| `tooth` | bound | `4ee0a1975ba3` | 200 same | same | same | yes | yes |
| `tooth_2` | bound | `75526373dbbf` | 200 same | same | same | yes | yes |
| `tooth_3` | bound | `a08696f728f2` | 200 same | same | same | yes | yes |
| `trap_pit` | bound | `1c542b1c25d9` | 200 same | same | same | yes | yes |
| `trap_runes` | bound | `c4d0f9796eb4` | 200 same | same | same | yes | yes |
| `trap_spikes` | bound | `54baced09cc9` | 200 same | same | same | yes | yes |
| `troll` | bound | `f9517e8e6b30` | 200 same | same | same | yes | yes |
| `tunnel` | bound | `5c296be947cc` | 200 same | same | same | yes | yes |
| `umberhulk` | bound | `c2e9262db26a` | 200 same | same | same | yes | yes |
| `undead` | bound | `dff2b2223379` | 200 same | same | same | yes | yes |
| `urn` | bound | `2e0a942ff55d` | 200 same | same | same | yes | yes |
| `wall_cave` | bound | `64dc010636de` | 200 same | same | same | yes | yes |
| `wall_cave_face` | bound | `00a5ae7314c6` | 200 same | same | same | yes | yes |
| `wall_cave_face_shade` | bound | `850d6d0ea378` | 200 same | same | same | yes | yes |
| `wall_face` | bound | `e7bb64fa0dc9` | 200 same | same | same | yes | yes |
| `wall_face_shade` | bound | `48396b7203ea` | 200 same | same | same | yes | yes |
| `wall_teeth_chapel` | bound | `226f5b26e333` | 200 same | same | same | yes | yes |
| `wall_teeth_chapel_opaque` | bound | `2a1c563bd435` | 200 same | same | same | yes | yes |
| `wall_worked` | bound | `e8b01f67ee61` | 200 same | same | same | yes | yes |
| `warden` | bound | `41bb927ada7b` | 200 same | same | same | yes | yes |
| `winduptoy` | bound | `37b78eef9522` | 200 same | same | same | yes | yes |
| `winduptoy_wound` | bound | `38111c957287` | 200 same | same | same | yes | yes |
| `wraith` | bound | `1854e6bf417f` | 200 same | same | same | yes | yes |
