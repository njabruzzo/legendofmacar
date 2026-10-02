# Walk with idle proportions

The axe study now renders original pixels from dwarf_macar_idle_axe_v2.png rather than separately redrawn walking bodies. Front/rear body, thigh, calf and boot regions are rotated/translated at joints. All parts share one 0.6 display scale; no limb or boot is stretched or independently resized. Two-link joint solving preserves thigh and calf lengths and uses opposing, continuous foot trajectories. The torso has a small forward lean and weight-shift bob.

Each facing is shown beside its official idle reference at the same scale. The existing user preview tab was refreshed and front/rear views checked. Playback remains continuous, including at 50ms frame intervals. Source PNGs remain unchanged.

Relevant regression checks pass: fixed thigh/calf lengths, continuous foot trajectories, opposite steps, rigid boot rendering, and one shared scale. Existing posture-source isolation/alpha checks also pass. The full gameplay suite was not rerun for this preview-only change.

This is a proportion/fidelity preview, not approved gameplay art. The rigid pieces do not create newly exposed surfaces; joint masks/overlaps and pose polish still need visual review. Crossbow and live game animation remain unchanged. Nothing was merged or deployed.

Imagegen front/rear idle-reference and fidelity-transfer attempts were rejected because frames repeated the leading leg or still drifted from idle proportions. No generated image from those attempts is referenced by this revision. The final approach uses runtime Canvas joint transforms of the existing idle asset.
