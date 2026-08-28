/**
 * One looping BGM, streamed (HTMLAudio), faded on the audio clock (GainNode).
 * Patterns only (no vendored engines): gesture unlock, one playlist voice,
 * keep explore seek across combat, pause on hide. iOS ignores HTMLAudio.volume
 * so fades live on Web Audio gains — never two BGM at full volume.
 */
(function (root) {
  'use strict';

  var FADE_SEC = 0.55;
  var MASTER_VOL = 0.55;
  var EXPLORE_IDS = { ch1: 1, ch2: 1 };

  function roleOf(id) {
    if (id === 'title') return 'title';
    if (id === 'chapter') return 'menu';
    if (id === 'battle') return 'combat';
    if (EXPLORE_IDS[id]) return 'explore';
    return 'idle';
  }

  function wanted(G) {
    if (!G || !G.scene) return 'title';
    var sc = G.scene;
    if (sc === 'title' || sc === 'credits') return 'title';
    if (sc === 'chapters' || sc === 'intro' || sc === 'between' || sc === 'win' || sc === 'camp' || sc === 'dead' || sc === 'trade')
      return 'chapter';
    if (G.fightOn) return 'battle';
    if (G.ch === 1 || (G.lvl && G.lvl.n === 1)) return 'ch1';
    return 'ch2';
  }

  function srcName(src) {
    if (!src) return '';
    var s = String(src);
    var q = s.split('?')[0];
    var parts = q.split('/');
    return parts[parts.length - 1];
  }

  function Bgm(opts) {
    opts = opts || {};
    this.tracks = opts.tracks || {};
    this.assetUrl = opts.assetUrl || function (s) { return s; };
    this.volume = opts.volume == null ? MASTER_VOL : opts.volume;
    this.fadeSec = opts.fadeSec == null ? FADE_SEC : opts.fadeSec;
    this._Audio = opts.Audio || (typeof Audio !== 'undefined' ? Audio : null);
    this._AC = opts.AudioContext || opts.webkitAudioContext ||
      (typeof root.AudioContext !== 'undefined' ? root.AudioContext : null) ||
      (typeof root.webkitAudioContext !== 'undefined' ? root.webkitAudioContext : null);
    this._doc = opts.document || (typeof document !== 'undefined' ? document : null);
    this._win = opts.window || (typeof window !== 'undefined' ? window : root);

    this.state = 'idle';
    this.currentId = null;
    this.exploreId = null;
    this.exploreSeek = 0;
    this.unlocked = false;
    this.queued = null;
    this.ctx = null;
    this.master = null;
    this.slots = [];
    this.pausedByBlur = false;
    this._wantId = null;
    this._installed = false;

    this._ensureContext();
  }

  Bgm.wanted = wanted;
  Bgm.roleOf = roleOf;
  Bgm.FADE_SEC = FADE_SEC;

  Bgm.prototype._ensureContext = function () {
    if (this.ctx || !this._AC) return this.ctx;
    try {
      this.ctx = new this._AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    } catch (e) {
      this.ctx = null;
      this.master = null;
    }
    return this.ctx;
  };

  Bgm.prototype._now = function () {
    return this.ctx && typeof this.ctx.currentTime === 'number' ? this.ctx.currentTime : 0;
  };

  Bgm.prototype._ramp = function (gain, to, sec) {
    if (!gain) return;
    var g = gain.gain;
    var t = this._now();
    sec = Math.max(0.05, sec == null ? this.fadeSec : sec);
    try {
      if (g.cancelScheduledValues) g.cancelScheduledValues(t);
      var from = typeof g.value === 'number' ? g.value : 0;
      if (g.setValueAtTime) g.setValueAtTime(from, t);
      if (g.linearRampToValueAtTime) g.linearRampToValueAtTime(to, t + sec);
      else g.value = to;
    } catch (e) {
      g.value = to;
    }
  };

  Bgm.prototype._makeEl = function () {
    var AudioCtor = this._Audio;
    if (!AudioCtor) return null;
    var el = new AudioCtor();
    el.loop = true;
    el.preload = 'auto';
    el.crossOrigin = 'anonymous';
    try { el.playsInline = true; } catch (_) {}
    try {
      el.setAttribute('playsinline', '');
      el.setAttribute('webkit-playsinline', '');
    } catch (_) {}
    el.autoplay = false;
    el.volume = 1;
    return el;
  };

  Bgm.prototype._wire = function (slot) {
    if (slot.srcNode || !this.ctx || !slot.el) return;
    try {
      slot.srcNode = this.ctx.createMediaElementSource(slot.el);
      slot.gain = this.ctx.createGain();
      slot.gain.gain.value = 0;
      slot.srcNode.connect(slot.gain);
      slot.gain.connect(this.master);
    } catch (e) {
      slot.srcNode = null;
      slot.gain = this.ctx ? this.ctx.createGain() : null;
    }
  };

  Bgm.prototype._slot = function () {
    var i, s;
    for (i = 0; i < this.slots.length; i++) {
      s = this.slots[i];
      if (!s.busy) return s;
    }
    if (this.slots.length >= 2) {
      s = this.slots[0].id === this.currentId ? this.slots[1] : this.slots[0];
      return s;
    }
    s = { el: this._makeEl(), srcNode: null, gain: null, id: null, busy: false, playP: null };
    if (!s.el) return null;
    this.slots.push(s);
    this._wire(s);
    return s;
  };

  Bgm.prototype._slotById = function (id) {
    var i, s, name = srcName(this.tracks[id]);
    for (i = 0; i < this.slots.length; i++) {
      s = this.slots[i];
      if (s.id === id && s.el && srcName(s.el.currentSrc || s.el.src).indexOf(name) >= 0) return s;
    }
    return null;
  };

  Bgm.prototype.isPlaying = function () {
    var i, s;
    for (i = 0; i < this.slots.length; i++) {
      s = this.slots[i];
      if (s.el && !s.el.paused && !s.el.ended) return true;
    }
    return false;
  };

  Bgm.prototype.unlock = function () {
    this.unlocked = true;
    this._ensureContext();
    var self = this;
    if (this.ctx && this.ctx.state === 'suspended' && this.ctx.resume) {
      try { this.ctx.resume(); } catch (_) {}
    }
    var want = this.queued || this._wantId;
    this.queued = null;
    if (want) this.play(want);
    return self;
  };

  Bgm.prototype.want = function (id) {
    this._wantId = id;
    if (!this.unlocked) {
      this.queued = id;
      return;
    }
    this.play(id);
  };

  Bgm.prototype._captureExplore = function () {
    if (roleOf(this.currentId) !== 'explore') return;
    this.exploreId = this.currentId;
    var slot = this._slotById(this.currentId);
    var t = slot && slot.el && typeof slot.el.currentTime === 'number' ? slot.el.currentTime : 0;
    if (isFinite(t) && t >= 0) this.exploreSeek = t;
  };

  Bgm.prototype._setSrc = function (slot, id, seek) {
    var src = this.tracks[id];
    if (!src || !slot || !slot.el) return;
    var el = slot.el;
    var url = this.assetUrl(src);
    var already = srcName(el.currentSrc || el.src);
    var name = srcName(src);
    slot.id = id;
    if (already && already.indexOf(name) >= 0) {
      if (seek != null && isFinite(seek)) {
        try { el.currentTime = seek; } catch (_) {}
      }
      return;
    }
    el.loop = true;
    el.src = url;
    try { el.load(); } catch (_) {}
    if (seek != null && isFinite(seek)) {
      var apply = function () {
        try { el.currentTime = seek; } catch (_) {}
      };
      if (typeof el.addEventListener === 'function') {
        el.addEventListener('loadedmetadata', apply, { once: true });
      }
      apply();
    }
  };

  Bgm.prototype._startEl = function (slot) {
    if (!slot || !slot.el || !this.unlocked) return;
    if (!slot.el.paused && !slot.el.ended) return;
    slot.playP = null;
    var p;
    try { p = slot.el.play(); } catch (e) { return; }
    if (p && p.then) {
      slot.playP = p;
      p.then(function () { slot.playP = null; }).catch(function () { slot.playP = null; });
    }
  };

  Bgm.prototype._stopSlot = function (slot, fade) {
    var self = this;
    if (!slot) return;
    slot.busy = false;
    if (slot.gain && fade) {
      this._ramp(slot.gain, 0, this.fadeSec);
      setTimeout(function () {
        try { slot.el.pause(); } catch (_) {}
        slot.playP = null;
      }, Math.round(this.fadeSec * 1000) + 40);
    } else {
      if (slot.gain) {
        try { slot.gain.gain.value = 0; } catch (_) {}
      }
      try { slot.el.pause(); } catch (_) {}
      slot.playP = null;
    }
  };

  Bgm.prototype.play = function (id, opts) {
    opts = opts || {};
    if (!id || !this.tracks[id]) return;
    this._wantId = id;
    if (!this.unlocked) {
      this.queued = id;
      return;
    }
    this._ensureContext();
    if (this.ctx && this.ctx.state === 'suspended' && this.ctx.resume) {
      try { this.ctx.resume(); } catch (_) {}
    }

    if (this.currentId === id) {
      var cur = this._slotById(id);
      if (cur) {
        this._startEl(cur);
        if (cur.gain) this._ramp(cur.gain, 1, 0.12);
      }
      return;
    }

    var nextRole = roleOf(id);
    if (nextRole === 'combat') this._captureExplore();

    var resumeSeek = opts.seek;
    if (resumeSeek == null && this.currentId === 'battle' && nextRole === 'explore' &&
        id === this.exploreId && this.exploreSeek > 0.05) {
      resumeSeek = this.exploreSeek;
    }
    if (nextRole === 'explore') this.exploreId = id;

    var incoming = this._slotById(id);
    if (!incoming) incoming = this._slot();
    if (!incoming) return;

    var outgoing = null;
    var i, s;
    for (i = 0; i < this.slots.length; i++) {
      s = this.slots[i];
      if (s !== incoming && s.el && !s.el.paused) outgoing = s;
    }

    this._setSrc(incoming, id, resumeSeek);
    incoming.busy = true;
    this._wire(incoming);
    if (incoming.gain) incoming.gain.gain.value = outgoing ? 0 : 1;
    this._startEl(incoming);
    if (incoming.gain) this._ramp(incoming.gain, 1, this.fadeSec);

    if (outgoing && outgoing !== incoming) this._stopSlot(outgoing, true);

    this.currentId = id;
    this.state = nextRole;
    if (nextRole === 'explore' && incoming.el && typeof incoming.el.currentTime === 'number') {
      /* seek applied; keep exploreSeek until combat overwrites it */
    }
  };

  Bgm.prototype.sync = function (G) {
    this.want(wanted(G));
  };

  Bgm.prototype.pauseForBlur = function () {
    if (this.pausedByBlur) return;
    if (!this.isPlaying()) return;
    this.pausedByBlur = true;
    var i, s;
    for (i = 0; i < this.slots.length; i++) {
      s = this.slots[i];
      if (roleOf(s.id) === 'explore' && s.el && typeof s.el.currentTime === 'number') {
        this.exploreId = s.id;
        this.exploreSeek = s.el.currentTime;
      }
      try { if (s.el) s.el.pause(); } catch (_) {}
      s.playP = null;
    }
    if (this.ctx && this.ctx.suspend) {
      try { this.ctx.suspend(); } catch (_) {}
    }
  };

  Bgm.prototype.resumeFromBlur = function () {
    if (!this.pausedByBlur) return;
    this.pausedByBlur = false;
    if (this.ctx && this.ctx.resume) {
      try { this.ctx.resume(); } catch (_) {}
    }
    if (this.currentId && this.unlocked) {
      var slot = this._slotById(this.currentId);
      if (slot) this._startEl(slot);
      else this.play(this.currentId);
    }
  };

  Bgm.prototype.installUnlock = function () {
    if (this._installed) return;
    this._installed = true;
    var self = this;
    var win = this._win;
    var doc = this._doc;
    if (!win || !win.addEventListener) return;
    var unlock = function () { self.unlock(); };
    ['pointerdown', 'touchstart', 'mousedown', 'keydown', 'click'].forEach(function (ev) {
      win.addEventListener(ev, unlock, { capture: true });
    });
    if (doc && doc.addEventListener) {
      doc.addEventListener('visibilitychange', function () {
        if (doc.hidden) self.pauseForBlur();
        else self.resumeFromBlur();
      });
    }
    win.addEventListener('pagehide', function () { self.pauseForBlur(); });
    win.addEventListener('pageshow', function () { self.resumeFromBlur(); });
  };

  Bgm.create = function (opts) { return new Bgm(opts); };

  root.Bgm = Bgm;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
