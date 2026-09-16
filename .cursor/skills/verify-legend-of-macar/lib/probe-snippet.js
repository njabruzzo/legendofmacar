/* VERIFY-SCAFFOLDING begin — injected by control-macar at serve time.
   Read-only probe. Not a product API. Never ship this in index.html. */
(function installMacarVerify(){
  if (window.__MACAR_VERIFY__) return;
  try {
    if (typeof menuBtn === 'function') {
      var _menuBtn = menuBtn;
      menuBtn = function(g, label, cx, cy, w, h, fn, dim, icon){
        var before = menuHits.length;
        var ret = _menuBtn(g, label, cx, cy, w, h, fn, dim, icon);
        if (menuHits.length > before && menuHits[menuHits.length - 1]) {
          menuHits[menuHits.length - 1].name = String(label);
        }
        return ret;
      };
    }
  } catch (err) { console.warn('macar-verify menuBtn wrap failed', err); }

  function snap(){
    var p = null;
    try { p = typeof player === 'function' ? player() : null; } catch (e) {}
    var menus = [];
    try {
      for (var i = 0; i < menuHits.length; i++) {
        var h = menuHits[i];
        menus.push({ name: h.name || '', x: h.x, y: h.y, w: h.w, h: h.h });
      }
    } catch (e) {}
    var hud = [];
    try {
      for (var j = 0; j < UIBTN.length; j++) {
        var b = UIBTN[j];
        hud.push({ key: b.key, label: b.label || '', x: b.x, y: b.y, r: b.r || 0 });
      }
    } catch (e) {}
    var saveKeys = [];
    try {
      if (typeof GameSave !== 'undefined') {
        [GameSave.KEY, GameSave.KEY_V1, GameSave.KEY_GOOD, GameSave.KEY_PENDING].forEach(function (k) {
          if (k && localStorage.getItem(k)) saveKeys.push(k);
        });
      }
    } catch (e) {}
    var log = [];
    try {
      (G.log || []).forEach(function (row) { log.push(String(row.t || '')); });
    } catch (e) {}
    var worldReady = false;
    try { worldReady = typeof worldArtReady === 'function' ? !!worldArtReady(G.ch) : false; } catch (e) {}
    return {
      probe: 1,
      scene: G.scene,
      ch: G.ch || 0,
      paused: !!G.paused,
      wipeAsk: !!G.wipeAsk,
      packWho: G.packWho || null,
      packTab: G.packTab || null,
      campTab: G.campTab || null,
      splash: (typeof SPLASH_STATE !== 'undefined') ? SPLASH_STATE : null,
      worldArtReady: worldReady,
      wantPlay: !!G._wantPlay,
      defending: !!(p && p.defending),
      searching: !!G.searching,
      secretSearch: !!G.secretSearch,
      digging: !!G.digging,
      sleepShow: !!G.sleepShow,
      showLog: !!G.showLog,
      fightOn: !!G.fightOn,
      hint: G.hint ? String(G.hint.t) : null,
      prompt: (typeof PROMPT !== 'undefined' && PROMPT) ? String(PROMPT.label || '') : null,
      player: p ? {
        name: p.name, x: p.x, y: p.y, hp: p.hp, maxhp: p.maxhp,
        fdx: p.fdx, fdy: p.fdy, defending: !!p.defending
      } : null,
      menus: menus,
      hud: hud,
      hudLabels: hud.map(function (b) { return b.label; }).filter(Boolean),
      log: log,
      hasSave: (typeof GameSave !== 'undefined') ? !!GameSave.has(localStorage) : false,
      saveKeys: saveKeys,
      saveLabel: (typeof GameSave !== 'undefined' && GameSave.has(localStorage))
        ? GameSave.label(GameSave.read(localStorage)) : '',
      vw: (typeof VW !== 'undefined') ? VW : 0,
      vh: (typeof VH !== 'undefined') ? VH : 0,
      port: !!(typeof PORT !== 'undefined' && PORT),
      title: document.title
    };
  }

  function pointerAt(x, y){
    var cv = document.getElementById('c');
    if (!cv) return { ok: false, reason: 'no-canvas' };
    var opts = { pointerId: 1, pointerType: 'mouse', clientX: x, clientY: y, bubbles: true, cancelable: true };
    cv.dispatchEvent(new PointerEvent('pointerdown', opts));
    cv.dispatchEvent(new PointerEvent('pointerup', opts));
    return { ok: true, x: x, y: y };
  }

  window.__MACAR_VERIFY__ = {
    version: 1,
    snapshot: snap,
    clickName: function (name) {
      var s = snap();
      for (var i = 0; i < s.menus.length; i++) {
        if (s.menus[i].name === name) {
          var m = s.menus[i];
          var hit = pointerAt(m.x + m.w / 2, m.y + m.h / 2);
          hit.name = name;
          return hit;
        }
      }
      return { ok: false, reason: 'no-menu', names: s.menus.map(function (m) { return m.name; }) };
    },
    clickHud: function (key) {
      var s = snap();
      for (var i = 0; i < s.hud.length; i++) {
        if (s.hud[i].key === key) {
          var b = s.hud[i];
          var hit = pointerAt(b.x, b.y);
          hit.key = key;
          return hit;
        }
      }
      return { ok: false, reason: 'no-hud', keys: s.hud.map(function (b) { return b.key; }) };
    },
    press: function (key, type) {
      var ev = type === 'up' ? 'keyup' : 'keydown';
      window.dispatchEvent(new KeyboardEvent(ev, { key: key, bubbles: true, cancelable: true }));
      return { ok: true, key: key, type: ev };
    },
    clearSaves: function () {
      if (typeof GameSave !== 'undefined') GameSave.clear(localStorage);
      return { ok: true, hasSave: typeof GameSave !== 'undefined' && !!GameSave.has(localStorage) };
    }
  };
})();
/* VERIFY-SCAFFOLDING end */
