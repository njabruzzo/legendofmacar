/**
 * Invisibility and ethereal targeting (rules G1, G17a).
 * Potion duration is 4+1d4 turns (50–80s at 10s/turn). Herb hide is 12s.
 * Dust of Disappearance sets invisNoBreak: attacking does not end it,
 * and even true seeing cannot target the dusted.
 * A hostile act ends ordinary invisibility, including the ring.
 */
(function (root) {
  'use strict';

  function hay(e) {
    if (!e) return '';
    return [e.kind, e.name, e.n, e.sprite, e.role].join(' ');
  }

  function hellSees(seeker, actor) {
    var gen = actor ? (actor.invisGen || 0) : 0;
    if (seeker._invisGen === gen && typeof seeker._invisRoll === 'number') {
      return seeker._invisRoll < 0.5;
    }
    if (typeof seeker._invisRoll === 'number' && seeker._invisGen == null) {
      seeker._invisGen = gen;
      return seeker._invisRoll < 0.5;
    }
    seeker._invisGen = gen;
    seeker._invisRoll = Math.random();
    return seeker._invisRoll < 0.5;
  }

  function seesInvisible(seeker, actor) {
    if (!seeker) return false;
    if (actor && actor.invisNoBreak) return false;
    var h = hay(seeker);
    if (/beholder/i.test(h) || seeker.kind === 'beholder') return true;
    if (/undying king/i.test(h) || seeker.kind === 'king') return true;
    if (/ruby guardian|thin one|thinone/i.test(h) || seeker.rubyGuardian || seeker.rubyDrop) return true;
    if (seeker.kind === 'statue' && (seeker.rubyDrop || /thin/i.test(h))) return true;
    if (/hell ?hound|hellhound/i.test(h)) return hellSees(seeker, actor);
    return false;
  }

  function isHidden(actor) {
    if (!actor) return false;
    if ((actor.etherealT || 0) > 0) return true;
    if ((actor.invisT || 0) > 0) return true;
    if ((actor.invis || 0) > 0) return true;
    return false;
  }

  function skipsTarget(seeker, actor) {
    if (!isHidden(actor)) return false;
    if ((actor.etherealT || 0) > 0) return true;
    if (actor.invisNoBreak) return true;
    if (seesInvisible(seeker, actor)) return false;
    return true;
  }

  function grant(e, seconds, opts) {
    if (!e) return;
    opts = opts || {};
    var s = Math.max(0, +seconds || 0);
    e.invisT = Math.max(e.invisT || 0, s);
    e.invis = Math.max(e.invis || 0, s);
    e.invisNoBreak = opts.noBreak ? 1 : 0;
    e.invisRing = opts.ring ? 1 : 0;
    e.aggro = opts.aggro != null ? opts.aggro : 2;
    e.invisGen = (e.invisGen || 0) + 1;
  }

  function breakHostile(e) {
    if (!e || e.invisNoBreak) return;
    if (!isHidden(e)) return;
    e.invis = 0;
    e.invisT = 0;
    e.invisRing = 0;
    e.invisNoBreak = 0;
    e.aggro = 7.5;
  }

  function tick(e, dt) {
    if (!e || e.dead) return;
    dt = dt || 0;
    if ((e.invis || 0) >= 1e8) e.invisRing = 1;
    if (e.invisRing) {
      e.invisT = Math.max(e.invisT || 0, e.invis || 0);
    } else if ((e.invisT || 0) > 0 || ((e.invis || 0) > 0 && (e.invis || 0) < 1e8)) {
      if ((e.invisT || 0) > 0) e.invisT -= dt;
      if ((e.invis || 0) > 0 && (e.invis || 0) < 1e8) e.invis -= dt;
      if ((e.invisT || 0) <= 0 && (e.invis || 0) <= 0) {
        e.invisT = 0;
        e.invis = 0;
        e.invisNoBreak = 0;
        e.aggro = 7.5;
      }
    }
    if ((e.controlT || 0) > 0) {
      e.controlT -= dt;
      if (e.controlT <= 0) {
        e.controlT = 0;
        e.charmed = 0;
        e.noBreathParty = 0;
        e.aggro = Math.max(e.aggro || 0, 7.5);
      }
    }
    if ((e.espT || 0) > 0) e.espT = Math.max(0, e.espT - dt);
    if ((e.treasureT || 0) > 0) e.treasureT = Math.max(0, e.treasureT - dt);
    if ((e.appearT || 0) > 0) e.appearT = Math.max(0, e.appearT - dt);
    if ((e.etherealDelay || 0) > 0) {
      e.etherealDelay -= dt;
      if (e.etherealDelay <= 0 && e.etherealPending) {
        e.etherealPending = 0;
        e.etherealDelay = 0;
        e.ethereal = 1;
        e.etherealT = e.etherealHold || 50;
        e.hover = 1;
      }
    } else if ((e.etherealT || 0) > 0) {
      e.etherealT -= dt;
      if (e.etherealT <= 0) {
        e.etherealT = 0;
        e.ethereal = 0;
      }
    }
  }

  var api = {
    grant: grant,
    breakHostile: breakHostile,
    tick: tick,
    skipsTarget: skipsTarget,
    sees: seesInvisible,
    isHidden: isHidden,
    turnSeconds: function (d4) { return (4 + (d4 || 0)) * 10; }
  };

  root.Invisibility = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
