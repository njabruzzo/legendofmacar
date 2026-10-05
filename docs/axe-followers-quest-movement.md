# Axe selection and party movement repairs

Based on main `5cfd88c`. Includes the down-facing axe idle originally proposed
in draft PR #282; the animation pilot and staircase drafts are separate.

- Axe identification accepts weapon IDs and war/great axe names. The corrected
  down idle also supplies inventory and loading fallbacks. Known axe walk frames
  retain eligibility despite their different canvas dimensions.
- Click navigation routes Macar around terrain. Every automatic follower uses
  its own breadcrumb/rank goal, including during rejoin. Followers yield to the
  leader, while their own swept spacing guards remain active.
- One-cell passages retain a standable center. Waypoint steering clamps the
  final stride with speed boots and 50 ms frames, and only skips a corner when
  the connecting segment is clear. Route failure waits and retries; no teleport.
- Route planning uses a stable heap and per-plan standability caching, avoids
  needless replanning, and backs off failed searches. Existing actor-specific
  collision, topology invalidation, combat, orders and story controls remain.
- Successful crown and tooth pickups end search/dig mode. The electrum tooth,
  coin count and saved curse strain no longer reduce movement. Coin conversion
  remains; ordinary combat slow and web effects retain their behavior.

Verification: 118 automated test files, 1,337 weapon/crown/follower browser
checks, 197 Chapter I progression checks and 24,084 additional movement checks
passed. New cases cover all four ghosts, terrain detours, parked ghosts in
one-cell passages, normal/50 ms frames, speed boots and all three quest pickups.
The heap search also matches the reference planner's shortest route length.

Limits: axe/crossbow walks and strikes still use their existing production
artwork; the separate generated animation pilot is not included. Unreachable
destinations wait rather than cross solid terrain. Planning remains synchronous
and expansion-capped; difficult searches can still cause an occasional frame
pause. In the local movement run, p95 update time was 0.2 ms and maximum was
142.4 ms for the full update. These timings are hardware-specific.
