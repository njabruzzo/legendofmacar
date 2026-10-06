# Altar left wall replacement

The blood-stained short left wall was baked into the altar sprite. `assets/props/prop_altar_teeth_open_left_v12.png` removes that wall with alpha transparency while retaining the altar, stairs, platform and right rear wall. The original `prop_altar_teeth.png` is retained.

The native west wall at x=100, y=2–13 uses the same faceL texture as the north wall behind the demonface, with the same 2.25 wall-height scale. The existing world grid remains solid there. The height predicate covers saves without wall-height metadata; room construction reapplies the per-tile heights for loaded rooms.

The edited sprite was created with the built-in imagegen skill using the original altar sprite as its reference. The output preserves the original aspect/projection; altar/crown placement uses the existing normalized sheet landmarks.

Prompt:

Edit the attached altar game sprite. Remove ONLY the LEFT rear wall: the short blood-stained masonry wall running from the far LEFT of the image upward to the rear corner at the upper center, behind and to the left of the altar. All pixels belonging to that left vertical wall and its coping must become fully transparent alpha, exposing the background for the game to draw its own wall. Preserve the RIGHT rear wall running from the upper-center corner down toward far RIGHT, unchanged. Preserve the bloody carved altar block, its top slab, all three stair steps, stone platform and floor paving, their shape, placement, color, blood stains, lighting, angle and scale EXACTLY. Do not invent any new wall or scenery. Behind the altar on the left must be empty transparent space, not black fill. Keep exact same 1075x718 canvas coordinates, full uncropped platform footprint, and camera projection. No resizing, no recentering of remaining artwork, no new objects or decorations. This is a surgical removal of one baked wall only, for replacement by a native textured wall in the engine. Actual alpha transparency.

