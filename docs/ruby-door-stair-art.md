# Ruby-door stone stairs

The three entrance steps use a new weathered stone material atlas at
`assets/props/prop_rubydoor_steps_stone_v1.png`. The artwork was generated
with the existing ruby door and worked-wall tile as visual references.
It adds worn stone blocks, chipped edges, fine cracks, and a carved
interlaced band that echoes the doorway's ornament.

The renderer projects three different strips of the upper stone panel
onto the existing tread geometry. A strip of the lower carved panel
textures the recessed risers and exposed ends. Material slices are
cached, and the asset is preloaded in Chapters I and III. Dark stone
fills remain available while the material is unavailable.

The doorway's existing width, stair footprint, collision, and
interaction behavior are preserved. The door, wall, and floor assets
are unchanged.

Validation: all 117 automated test files passed; the browser render
suite passed 1,338 checks and Chapter I progression passed 197 checks.
The actual rendered door scene was visually inspected.
