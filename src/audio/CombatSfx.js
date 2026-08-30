/**
 * Combat one-shots + a quiet clash bed. HTMLAudio, not a second BGM voice.
 * Hits are voice-limited so a pile-on does not become noise.
 * Victory horn is a one-shot overlay (does not duck BGM). PackVictory /
 * BossVictory remain Bgm stings so explore resumes after the wipe.
 */
(function (root) {
  'use strict';

  var GAP_ANY = 0.09;
  var GAP_KIND = 0.18;
  var MAX_VOICES = 2;
  var BED_VOL = 0.16;
  var HIT_VOL = 0.58;

  function nowMs() { return Date.now(); }

  function hitKind(atk) {
    if (!atk) return 'light';
    if (atk.hero) return 'heavy';
    if (atk.role === 'pick' || atk.role === 'shield') return 'heavy';
    if (atk.ranged || atk.role === 'bolt' || atk.atkKind === 'bow') return 'light';
    var blob = [atk.kind, atk.name, atk.n, atk.sprite].join(' ');
    if (/hammer|axe|maul|pick|mace|club|golem|giant|troll|warden|king|statue|construct/i.test(blob)) return 'heavy';
    if (atk.boss || (atk.dmg || 0) >= 16) return 'heavy';
    return 'light';
  }

  function CombatSfx(opts) {
    opts = opts || {};
    this.files = opts.files || (opts.hitHeavy1 || opts.clashBed ? opts : {});
    this.assetUrl = opts.assetUrl || function (s) { return s; };
    this._Audio = opts.Audio || (typeof Audio !== 'undefined' ? Audio : null);
    this._clock = opts.now || nowMs;
    this.volume = opts.volume == null ? HIT_VOL : opts.volume;
    this.bedVol = opts.bedVol == null ? BED_VOL : opts.bedVol;
    this._lastAny = 0;
    this._lastKind = {};
    this._voices = 0;
    this._rr = { heavy: 0, light: 0 };
    this._bed = null;
    this._bedOn = false;
    this.plays = [];
  }

  CombatSfx.hitKind = hitKind;

  CombatSfx.prototype._list = function (kind) {
    var files = this.files || {};
    if (kind === 'heavy') return [files.hitHeavy1, files.hitHeavy2].filter(Boolean);
    if (kind === 'light') return [files.hitLight1, files.hitLight2].filter(Boolean);
    if (kind === 'bed') return files.clashBed ? [files.clashBed] : [];
    return [];
  };

  CombatSfx.prototype._pick = function (kind) {
    var list = this._list(kind);
    if (!list.length) return null;
    var i = this._rr[kind] || 0;
    this._rr[kind] = (i + 1) % list.length;
    return list[i % list.length];
  };

  CombatSfx.prototype._canPlay = function (kind, t) {
    if (this._voices >= MAX_VOICES) return false;
    if (t - this._lastAny < GAP_ANY * 1000) return false;
    if (t - (this._lastKind[kind] || 0) < GAP_KIND * 1000) return false;
    return true;
  };

  CombatSfx.prototype._makeEl = function (loop) {
    var AudioCtor = this._Audio;
    if (!AudioCtor) return null;
    var el = new AudioCtor();
    el.loop = !!loop;
    el.preload = 'auto';
    el.crossOrigin = 'anonymous';
    try { el.playsInline = true; } catch (_) {}
    el.autoplay = false;
    el.volume = 1;
    return el;
  };

  CombatSfx.prototype._startEl = function (el, vol) {
    if (!el) return false;
    try { el.volume = vol; } catch (_) {}
    try { el.currentTime = 0; } catch (_) {}
    var p;
    try { p = el.play(); } catch (_) { return false; }
    if (p && p.then) p.catch(function () {});
    return true;
  };

  CombatSfx.prototype.hit = function (atk) {
    if (!this._Audio) return false;
    var kind = hitKind(atk);
    var t = this._clock();
    if (!this._canPlay(kind, t)) return false;
    var src = this._pick(kind);
    if (!src) return false;
    var el = this._makeEl(false);
    if (!el) return false;
    el.src = this.assetUrl(src);
    var self = this;
    this._voices++;
    this._lastAny = t;
    this._lastKind[kind] = t;
    this.plays.push(kind);
    var done = function () {
      self._voices = Math.max(0, self._voices - 1);
      try { el.pause(); } catch (_) {}
    };
    if (typeof el.addEventListener === 'function') {
      el.addEventListener('ended', done, { once: true });
    }
    setTimeout(done, 1400);
    return this._startEl(el, this.volume);
  };

  CombatSfx.prototype.startBed = function () {
    var src = this.files && this.files.clashBed;
    if (!src || !this._Audio) return false;
    if (!this._bed) this._bed = this._makeEl(true);
    if (!this._bed) return false;
    if (this._bedOn && this._bed && !this._bed.paused) return true;
    var url = this.assetUrl(src);
    if ((this._bed.src || '').indexOf(src.split('/').pop()) < 0) this._bed.src = url;
    this._bed.loop = true;
    this._bedOn = true;
    return this._startEl(this._bed, this.bedVol);
  };

  CombatSfx.prototype.horn = function (which) {
    var files = this.files || {};
    var src = which === 'boss' ? files.bossHorn : files.packHorn;
    if (!src || !this._Audio) return false;
    var el = this._makeEl(false);
    if (!el) return false;
    el.src = this.assetUrl(src);
    this.plays.push(which === 'boss' ? 'bossHorn' : 'packHorn');
    return this._startEl(el, 0.72);
  };

  CombatSfx.prototype.stopBed = function () {
    this._bedOn = false;
    if (!this._bed) return;
    try { this._bed.pause(); } catch (_) {}
    try { this._bed.currentTime = 0; } catch (_) {}
  };

  CombatSfx.prototype.bedPlaying = function () {
    return !!(this._bedOn && this._bed && !this._bed.paused);
  };

  CombatSfx.create = function (opts) { return new CombatSfx(opts); };

  root.CombatSfx = CombatSfx;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
