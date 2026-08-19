/**
 * SkillSystem — browser ECS skill / cooldown layer for Legend of Macar.
 *
 * Architectural blueprint (public ECS layout):
 *   GameEngine constructs systems, then gameLoop() calls system.update(dt)
 *   every tick. Cooldown data lives on components (remaining vs duration),
 *   not in the renderer. See Mustafa-Kum/typescript-action-roguelike:
 *     game/GameEngine.ts        — register + per-frame dispatch
 *     game/systems/SkillSystem.ts
 *     game/systems/WeaponSystem.ts  — cooldownTimer -= dt each frame
 *     game/systems/MovementSystem.ts
 *
 * -----------------------------------------------------------------------------
 * Movement / position: blueprint vs this game
 * -----------------------------------------------------------------------------
 *
 * Blueprint MovementSystem (open arena, velocity component):
 *   position.x += dirX * moveSpeed * dt
 *   position.y += dirY * moveSpeed * dt
 *   No tile collision. dt is often milliseconds / 1000.
 *
 * This game (index.html) is still an array-of-structs world, not archetypes:
 *
 *   1. loop(now)  — requestAnimationFrame engine
 *        dt = min((now - last) / 1000, 0.05)   // seconds, spiral-of-death clamp
 *        update(dt) then render()
 *
 *   2. Player / kin intent in update():
 *        analog stick + WASD → isometric world dir (dx, dy)
 *        tap-to-move sets e.dest; then dx,dy = dest - pos
 *        steerWalk(e, dx, dy, speed, dt)
 *          turnToward (facing lerp)
 *          e.ix, e.iy = facing * speed
 *          move(e, e.ix, e.iy, dt)
 *
 *   3. move(e, dx, dy, dt)  — axis-separated collision (not a free +=)
 *        nx = e.x + dx * dt
 *        ny = e.y + dy * dt
 *        if canBe(nx, e.y): e.x = nx
 *        if canBe(e.x, ny): e.y = ny
 *
 *   4. Foes / kin in the same update() entity loop:
 *        steerWalk toward target, then knockback: move(e, e.kx*6, e.ky*6, dt)
 *
 * Register this system in that same real-time loop (see index.html `loop` /
 * `update` / `registerSystem`) so HUD ability cooldowns tick every play frame.
 */

export type EntityId = number | 'hud';

/** Standard cooldown data component (remaining vs full duration, seconds). */
export interface CooldownComponent {
  remaining: number;
  duration: number;
}

/** Slot identity — which skill this cooldown belongs to. */
export interface SkillSlotComponent {
  key: string;
  label?: string;
  ownerId: EntityId;
}

export interface SkillRecord {
  slot: SkillSlotComponent;
  cooldown: CooldownComponent;
}

export interface AbilityDef {
  key: string;
  cd: number;
  label?: string;
}

export interface AttackEntity {
  id?: number;
  ct?: number;
  cd?: number;
  dead?: boolean;
}

export interface SkillWorld {
  ents?: AttackEntity[];
  abilities?: AbilityDef[];
  cds?: Record<string, number>;
}

function clamp0(n: number): number {
  return n < 0 ? 0 : n;
}

export class SkillSystem {
  readonly name = 'SkillSystem';

  private hud: SkillRecord[] = [];
  private hudMap: Record<string, SkillRecord> = Object.create(null);
  private liveCds: Record<string, number> | null = null;
  private abilityDefs: AbilityDef[] = [];

  bindHud(abilities: AbilityDef[], cds: Record<string, number>): this {
    this.abilityDefs = abilities || [];
    this.liveCds = cds;
    this.hud = [];
    this.hudMap = Object.create(null);
    for (let i = 0; i < this.abilityDefs.length; i++) {
      const a = this.abilityDefs[i];
      const rec: SkillRecord = {
        slot: { key: a.key, label: a.label, ownerId: 'hud' },
        cooldown: {
          remaining: cds && cds[a.key] ? cds[a.key] : 0,
          duration: a.cd || 0
        }
      };
      this.hud.push(rec);
      this.hudMap[a.key] = rec;
    }
    return this;
  }

  reset(): void {
    for (let i = 0; i < this.hud.length; i++) {
      this.hud[i].cooldown.remaining = 0;
      if (this.liveCds) this.liveCds[this.hud[i].slot.key] = 0;
    }
  }

  isReady(key: string): boolean {
    const rec = this.hudMap[key];
    if (!rec) return true;
    return rec.cooldown.remaining <= 0;
  }

  remaining(key: string): number {
    const rec = this.hudMap[key];
    return rec ? rec.cooldown.remaining : 0;
  }

  ratio(key: string): number {
    const rec = this.hudMap[key];
    if (!rec || rec.cooldown.duration <= 0) return 0;
    return rec.cooldown.remaining / rec.cooldown.duration;
  }

  /** Start a HUD skill cooldown. Returns false if still cooling down. */
  trigger(key: string, duration?: number): boolean {
    const rec = this.hudMap[key];
    if (!rec) return false;
    if (rec.cooldown.remaining > 0) return false;
    if (duration != null) rec.cooldown.duration = duration;
    rec.cooldown.remaining = rec.cooldown.duration;
    if (this.liveCds) this.liveCds[key] = rec.cooldown.remaining;
    return true;
  }

  clear(key: string): void {
    const rec = this.hudMap[key];
    if (!rec) return;
    rec.cooldown.remaining = 0;
    if (this.liveCds) this.liveCds[key] = 0;
  }

  /**
   * Tick one unit's attack cooldown data (`e.ct` remaining, `e.cd` duration).
   * Call this in the existing entity loop so attack timing stays frame-accurate.
   */
  tickAttack(entity: AttackEntity, dt: number): void {
    if (!entity || entity.dead) return;
    if (typeof entity.ct === 'number' && entity.ct > 0) {
      entity.ct = clamp0(entity.ct - dt);
    }
  }

  /**
   * Per-frame system. Pulls HUD writes from `cds` (fire() still assigns there),
   * ticks remaining, pushes back so the skill bar stays in sync.
   */
  update(dt: number, world?: SkillWorld): void {
    if (!(dt > 0)) return;
    const cds = (world && world.cds) || this.liveCds;
    const abilities = (world && world.abilities) || this.abilityDefs;

    if (cds && abilities && abilities.length) {
      if (!this.liveCds || this.hud.length !== abilities.length) {
        this.bindHud(abilities, cds);
      }
      for (let i = 0; i < this.hud.length; i++) {
        const rec = this.hud[i];
        const key = rec.slot.key;
        const live = cds[key];
        rec.cooldown.remaining = typeof live === 'number' ? live : rec.cooldown.remaining;
        const def = abilities[i];
        if (def && def.cd != null) rec.cooldown.duration = def.cd;
        if (rec.cooldown.remaining > 0) {
          rec.cooldown.remaining = clamp0(rec.cooldown.remaining - dt);
        }
        cds[key] = rec.cooldown.remaining;
      }
    }
  }
}

export default SkillSystem;

declare global {
  interface Window {
    SkillSystem: typeof SkillSystem;
  }
}
