# Walk with idle proportions

The axe study now renders original pixels from dwarf_macar_idle_axe_v2.png rather than separately redrawn walking bodies. Front/rear body, thigh, calf and boot regions are rotated/translated at joints. All parts share one 0.6 display scale; no limb or boot is stretched or independently resized. Two-link joint solving preserves thigh and calf lengths and uses opposing, continuous foot trajectories. The torso has a small forward lean and weight-shift bob.

Each facing is shown beside its official idle reference at the same scale. The existing user preview tab was refreshed and front/rear views checked. Playback remains continuous, including at 50ms frame intervals. Source PNGs remain unchanged.

Relevant regression checks pass: fixed thigh/calf lengths, continuous foot trajectories, opposite steps, rigid boot rendering, and one shared scale. Existing posture-source isolation/alpha checks also pass. The full gameplay suite was not rerun for this preview-only change.

This is a proportion/fidelity preview, not approved gameplay art. The rigid pieces do not create newly exposed surfaces; joint masks/overlaps and pose polish still need visual review. Crossbow and live game animation remain unchanged. Nothing was merged or deployed.

Imagegen front/rear idle-reference and fidelity-transfer attempts were rejected because frames repeated the leading leg or still drifted from idle proportions. No generated image from those attempts is referenced by this revision. The final approach uses runtime Canvas joint transforms of the existing idle asset.

## Reference-based stance study

Motion reference: https://auteddy.github.io/project_images/isometric_mixamo_dummy_2D_v1_512x512/Walking_8dir_merged.gif (creator: https://auteddy.itch.io/8-directional-character-mixamo-dummy). Inspected the animated eight-direction preview. No reference art was copied.

Replaced the sinusoidal foot motion with a 60% grounded stance and 40% lifted return, alternating legs half a cycle apart. Front diagonals now project foot travel downward at a 2:1 isometric slope, rear diagonals upward. Joint lengths and rigid boot proportions remain fixed. These timings and distances are our adaptation, not measured reference data.

The local preview was refreshed and checked beside the official idle. Relevant rig tests pass, including stance contact, swing lift, cycle closure and proportion preservation. This remains a rigid idle-art study: it cannot supply newly exposed knee/boot surfaces or a fully authored walk. It is not a finished gameplay walk and has not been deployed.

## Contact-pose generation audit

Two built-in imagegen attempts on October 3 failed visual acceptance. The initial two-pose sheet repeats the image-right leading boot; the targeted correction still repeats that leading leg and changes boot proportions. Both also retain a backdrop despite requesting transparent output. Neither asset was copied into gameplay or referenced by the preview. Prompt constraints: original idle identity and high fidelity, two opposite contact poses facing down-right, unchanged chunky boot sizes and short legs, axe on shoulder, transparent background.

Generated outputs: exec-1176b103-31a4-4668-bf0b-17ea5fa1b8a1.png and exec-87a7b6d1-0bf8-4217-9858-ee7e5026fb39.png in the session generated_images directory. A convincing authored cycle remains unresolved; tests of rig geometry do not establish visual acceptance.

## Down-right eight-pose review

Added an eight-pose contact/transfer/passing/return sheet above playback, with Next pose stepping by one eighth cycle. Increased source-space foot travel from +/-12 to +/-24 pixels and swing lift from 8 to 12; removed constant torso rotation and lowered the hips to give the fixed-length legs reach without stretching boots. Original source sprite remains unchanged. This is a manually configured rigid-part animation, not new authored bitmap frames.

Inspected the pose sheet in the browser. Knee/hip segmentation is still visible; this preview is not visually accepted or integrated into gameplay. Rig checks cover both 16.7ms and 50ms updates, opposing foot contacts, fixed lengths, rigid boot scale, continuous motion and cycle closure.
