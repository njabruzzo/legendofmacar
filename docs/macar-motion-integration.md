# Approved walking and side crossbow integration

The gameplay renderer now loads and selects the approved four-phase axe and crossbow walking sheets. The cycle uses alternating opposite-foot contacts with a passing pose between each contact. North, northeast and northwest select the rear view; the other headings select the front view. Existing facing mirroring applies. Hammer walking and axe/hammer melee attacks retain their original sources.

Crossbow standing, firing and recovery use the approved side-profile aim drawing, so stopping or firing no longer swaps back to the rejected weapon drawing. Crossbow walking has four new matching frames. Projectile mechanics retain the earlier constant-velocity, no-gravity, no-spin correction.

Sprite cells preserve source alpha, use measured foot baselines and a common head-to-ground height, and bypass variable opaque-box foot centering. Each cell includes its crown seat. Source art remains unchanged in versioned PNGs; original assets are retained.

## Validation (2026-10-02)

- 122 automated test files pass; no failures or skips.
- Gameplay browser matrix: 2,125 checks, no failures; 216 weapon poses, 16 follower scenarios, 96 ghost poses and 16 bolt cases.
- Movement browser fixture: 24,124 checks, no failures at 16.7ms and 50ms frames.
- Chapter I fixture: 205 checks, no failures, including digging into the crown room and elevator progression.
- New regression covers all four phases at normal/50ms frames, all eight heading selections, 18 transparent cell crops, no meaningful crop loss and mirrored crown seats.

## Remaining limits

The new cycle has front/rear body views plus mirroring, rather than eight independently drawn headings. Crossbow firing/recovery currently hold one aim pose; distinct recoil/reloading artwork is still needed. This is not a complete new directional attack set. Occasional synchronous path-planning spikes persist: latest movement fixture maximum 252.1ms, p95 0.5ms. Passing movement assertions does not establish hitch-free performance.

Changes are local on fix/axe-followers-quest-movement. Not merged or live.

## Asset generation

Tool: built-in imagegen, edit mode, transparent_background=true. Selected PNGs were copied unchanged into assets/creatures/pilots. Existing approved front/rear four-phase axe sheets and side-profile crossbow were references.

Front prompt: preserve all four leg poses and the character from the approved front axe sheet; replace only the axe and weapon-holding arms with the approved side-profile crossbow. Long wooden stock, metal bow seen edge-on, trigger, level aim to the right; keep transparent background and the four-cell layout.

Rear prompt: preserve all four leg poses and the character from the approved rear axe sheet; replace only the axe and weapon-holding arms with the same side-profile crossbow, level to the right; keep the rear body view, transparent background and four-cell layout.

Selected assets: macar-crossbow-walk-front-v6.png and macar-crossbow-walk-rear-v6.png. Gameplay also uses macar-axe-walk-front-cycle-v4.png, macar-axe-walk-rear-cycle-v4.png and macar-crossbow-side-v5.png.
