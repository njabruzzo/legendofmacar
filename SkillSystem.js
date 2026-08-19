/**
 * Browser build of SkillSystem.ts (no bundler — GitHub Pages loads this script).
 * Keep in sync with SkillSystem.ts.
 */
(function (root) {
  'use strict';

  function clamp0(n) {
    return n < 0 ? 0 : n;
  }

  function SkillSystem() {
    this.name = 'SkillSystem';
    this.hud = [];
    this.hudMap = Object.create(null);
    this.liveCds = null;
    this.abilityDefs = [];
  }

  SkillSystem.prototype.bindHud = function (abilities, cds) {
    this.abilityDefs = abilities || [];
    this.liveCds = cds;
    this.hud = [];
    this.hudMap = Object.create(null);
    for (var i = 0; i < this.abilityDefs.length; i++) {
      var a = this.abilityDefs[i];
      var rec = {
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
  };

  SkillSystem.prototype.reset = function () {
    for (var i = 0; i < this.hud.length; i++) {
      this.hud[i].cooldown.remaining = 0;
      if (this.liveCds) this.liveCds[this.hud[i].slot.key] = 0;
    }
  };

  SkillSystem.prototype.isReady = function (key) {
    var rec = this.hudMap[key];
    if (!rec) return true;
    return rec.cooldown.remaining <= 0;
  };

  SkillSystem.prototype.remaining = function (key) {
    var rec = this.hudMap[key];
    return rec ? rec.cooldown.remaining : 0;
  };

  SkillSystem.prototype.ratio = function (key) {
    var rec = this.hudMap[key];
    if (!rec || rec.cooldown.duration <= 0) return 0;
    return rec.cooldown.remaining / rec.cooldown.duration;
  };

  SkillSystem.prototype.trigger = function (key, duration) {
    var rec = this.hudMap[key];
    if (!rec) return false;
    if (rec.cooldown.remaining > 0) return false;
    if (duration != null) rec.cooldown.duration = duration;
    rec.cooldown.remaining = rec.cooldown.duration;
    if (this.liveCds) this.liveCds[key] = rec.cooldown.remaining;
    return true;
  };

  SkillSystem.prototype.clear = function (key) {
    var rec = this.hudMap[key];
    if (!rec) return;
    rec.cooldown.remaining = 0;
    if (this.liveCds) this.liveCds[key] = 0;
  };

  SkillSystem.prototype.tickAttack = function (entity, dt) {
    if (!entity || entity.dead) return;
    if (typeof entity.ct === 'number' && entity.ct > 0) {
      entity.ct = clamp0(entity.ct - dt);
    }
  };

  SkillSystem.prototype.update = function (dt, world) {
    if (!(dt > 0)) return;
    var cds = (world && world.cds) || this.liveCds;
    var abilities = (world && world.abilities) || this.abilityDefs;

    if (cds && abilities && abilities.length) {
      if (!this.liveCds || this.hud.length !== abilities.length) {
        this.bindHud(abilities, cds);
      }
      for (var i = 0; i < this.hud.length; i++) {
        var rec = this.hud[i];
        var key = rec.slot.key;
        var live = cds[key];
        rec.cooldown.remaining = typeof live === 'number' ? live : rec.cooldown.remaining;
        var def = abilities[i];
        if (def && def.cd != null) rec.cooldown.duration = def.cd;
        if (rec.cooldown.remaining > 0) {
          rec.cooldown.remaining = clamp0(rec.cooldown.remaining - dt);
        }
        cds[key] = rec.cooldown.remaining;
      }
    }
  };

  root.SkillSystem = SkillSystem;
})(typeof window !== 'undefined' ? window : this);
