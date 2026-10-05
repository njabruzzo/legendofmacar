# Down-facing axe idle

`dwarf_macar_idle_axe_s_v3.png` is a single transparent full-body standing
pose, generated with the original `dwarf_macar.png` as the identity and
material reference and the axe idle atlas as the weapon reference.
Macar faces down toward the viewer with both feet planted and the axe
resting over his shoulder.

Both `macar_axe_idle_s` and the base `macar_axe` inventory/loading fallback
use this image. Other axe directions and weapon
animations retain their existing sources. The idle loader scales the
whole square image into its standard 512-pixel canvas rather than
cropping it as a multi-pose atlas. Its crown seat is calibrated in that
canvas's coordinates; generated paint and alpha remain unchanged.

The existing idle selection also uses this standing frame when Macar
stops walking down or recovers from an axe attack while facing down.
The approved axe walk keys bypass equal-canvas-size matching while retaining
the existing frame-fit checks, so the square idle cannot suppress the tall walks.
