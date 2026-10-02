Macar blocked-direction regression
==================================

Cause: the decorative wall clearance used 0.72 tiles, reduced to 0.5 between opposing walls. That left only an exact center line in one-tile passages and disconnected the route at elbows and dead ends. Off-center manual input could therefore be blocked despite physically walkable floor.

Fix: tiles with two or more adjacent masonry walls use the actor collision radius for the decorative clearance. Open areas retain the original wall margin; existing eight-point physical collision checks remain enforced. The shared rule also applies to living followers.

Verified a new elbow regression fails before the fix and passes afterward. Added all four elbow orientations at 16.7ms/50ms, plus horizontal/vertical off-center manual movement in both directions. Actual browser tests exercise keyboard update and click routes.

Results: 120 automated test files pass, including 1,130 PartyRouting checks; 24,124 browser movement checks and 205 Chapter I browser progression checks pass. Existing synchronous route-planning frame spikes remain a known performance limitation. This fix is local and not deployed.
