/**
 * Loads a campaign level from the data modules into the dungeon engine.
 * Data files stay wired:false. Only levels in LIVE are installed onto a chapter.
 * L1 is the exception: no boss, six Thin Ones, the lever opens the way down.
 */
(function (root) {
  'use strict';

  var LIVE = { 2: true };
  var UNWIRED_QUESTS = { holy_hammer: true, holy_anvil: true };
  var PACK = 0.8;

  function eng(name) {
    var fn = root[name];
    return typeof fn === 'function' ? fn : null;
  }

  function book() {
    if (root.CampaignBook) return root.CampaignBook;
    if (typeof require !== 'function') return null;
    try {
      var fs = require('fs');
      var path = require('path');
      root.CampaignBook = JSON.parse(fs.readFileSync(path.join(__dirname, 'maps/campaign-levels.json'), 'utf8'));
      return root.CampaignBook;
    } catch (err) {
      return null;
    }
  }

  function mapRow(n) {
    var levels = (book() && book().levels) || [];
    for (var i = 0; i < levels.length; i++) {
      var row = levels[i];
      if (!row) continue;
      if (row.level === n || row.id === 'L' + n) return row;
    }
    return null;
  }

  function levelData(n) {
    var key = 'L' + n;
    if (root[key]) return root[key];
    if (typeof require !== 'function') return null;
    try { return require('./L' + n); }
    catch (err) { return null; }
  }

  function tableRow(n) {
    return root.CampaignTable && root.CampaignTable.level ? root.CampaignTable.level(n) : null;
  }

  function rulesRow(n) {
    return root.ExitRules && root.ExitRules.forLevel ? root.ExitRules.forLevel(n) : null;
  }

  function load(n) {
    n = n | 0;
    if (n < 1 || n > 10) return null;
    var map = mapRow(n);
    var table = tableRow(n);
    var rules = rulesRow(n);
    if (!map && !table && !rules) return null;
    var data = n === 1 ? null : levelData(n);
    var quest = table && table.quest;
    return {
      level: n,
      id: (map && map.id) || ('L' + n),
      name: (map && map.name) || (table && table.name) || ('Level ' + n),
      map: map,
      table: table,
      rules: rules,
      data: data,
      enter: !!LIVE[n],
      stairsOpenOn: (rules && rules.stairsOpenOn) || (map && (map.stairsOpenOn || (map.stairs && map.stairs.opensOn))) || (n === 1 ? 'lever' : 'bossKill'),
      guardian: (rules && rules.guardian) || null,
      boss: (rules && rules.boss) || null,
      quest: quest || null,
      questSkipWired: !!(quest && !UNWIRED_QUESTS[quest.id]),
      open: (data && data.OPEN) || []
    };
  }

  function nextLevel(n) {
    var nxt = (n | 0) + 1;
    if (nxt < 1 || nxt > 10) return null;
    return load(nxt) ? nxt : null;
  }

  function shouldInstall(G) {
    if (!G || !G.lvl) return false;
    var n = G.lvl.n | 0;
    if ((G.campaignLevel || 1) !== n) return false;
    if (!LIVE[n]) return false;
    return !!load(n);
  }

  function blocksWarren(G) {
    return shouldInstall(G);
  }

  function noteCleared(G) {
    if (!G || G.ch !== 1) return null;
    var nxt = nextLevel(1);
    if (nxt) G.campaignLevel = nxt;
    return nxt;
  }

  function printed(spec, key) {
    if (!spec || !key) return null;
    if (spec.data && spec.data.XP && spec.data.XP[key] != null) return spec.data.XP[key] | 0;
    var table = spec.table;
    if (table) {
      if (table.boss && table.boss.key === key && table.boss.xp != null) return table.boss.xp | 0;
      var lists = [table.residents, table.minions];
      for (var li = 0; li < lists.length; li++) {
        var list = lists[li] || [];
        for (var i = 0; i < list.length; i++) {
          if (list[i] && list[i].key === key && list[i].xp != null) return list[i].xp | 0;
        }
      }
    }
    var guards = root.CampaignTable && root.CampaignTable.GUARDIANS;
    if (guards) {
      for (var g = 0; g < guards.length; g++) {
        if (guards[g].level === spec.level && guards[g].key === key && guards[g].formula) return guards[g].formula.xp | 0;
      }
    }
    return null;
  }

  function beginRun(spec) {
    var g = spec.guardian || { count: 0, key: '' };
    var bossKey = null;
    if (spec.map && spec.map.boss && spec.map.boss.key) bossKey = spec.map.boss.key;
    else if (spec.table && spec.table.boss && spec.table.boss.key) bossKey = spec.table.boss.key;
    return {
      spec: spec,
      guardianKey: g.key || '',
      guardianLeft: g.count || 0,
      bossKey: bossKey,
      bossAlive: !!bossKey,
      leverEnabled: (g.count || 0) === 0,
      leverPulled: false,
      card: null,
      stairsOpen: false,
      xp: 0,
      kills: [],
      bossFlag: false
    };
  }

  function kill(run, key) {
    var xp = printed(run.spec, key);
    if (xp == null) xp = 0;
    run.xp += xp;
    run.kills.push({ key: key, xp: xp });
    if (key === run.guardianKey && run.guardianLeft > 0) {
      run.guardianLeft -= 1;
      if (run.guardianLeft === 0) run.leverEnabled = true;
    }
    if (run.bossKey && key === run.bossKey) {
      run.bossAlive = false;
      if (run.spec.stairsOpenOn === 'bossKill') run.stairsOpen = true;
    }
    run.bossFlag = false;
    return xp;
  }

  function pullLever(run) {
    if (!run.leverEnabled || run.leverPulled) return false;
    if (run.bossAlive && run.spec.rules && run.spec.rules.livingBossBlocksElevator) return false;
    run.leverPulled = true;
    if (run.spec.stairsOpenOn === 'lever') {
      run.stairsOpen = true;
      run.card = null;
      return true;
    }
    var map = run.spec.map;
    var table = run.spec.table;
    run.card = (map && map.elevator && map.elevator.transitionCard)
      || (table && table.elevator && table.elevator.transitionCard)
      || null;
    return true;
  }

  function spawnCount(spec) {
    var n = 0;
    var groups = (spec.map && spec.map.spawns) || [];
    for (var i = 0; i < groups.length; i++) {
      var members = groups[i].members || [];
      for (var m = 0; m < members.length; m++) n += members[m].count || 0;
    }
    return n;
  }

  function gaps(spec) {
    var out = [];
    var open = (spec && spec.open) || [];
    for (var i = 0; i < open.length; i++) {
      if (open[i] && open[i].note && open[i].note.indexOf('(open)') >= 0) out.push(open[i].id);
    }
    if (spec && spec.quest && UNWIRED_QUESTS[spec.quest.id]) out.push(spec.quest.id);
    if (spec && spec.level === 2) out.push('elevator-returns-to-camp');
    return out;
  }

  function parseCount(expr) {
    var s = String(expr || '1').trim();
    var mix = s.match(/^(\d+)\+(\d+)d(\d+)\s+([a-z]+)/i);
    if (mix) {
      return { base: +mix[1], dice: +mix[2], sides: +mix[3], extra: mix[4].replace(/s$/i, '') };
    }
    var dice = s.match(/^(\d+)d(\d+)/i);
    if (dice) return { base: 0, dice: +dice[1], sides: +dice[2], extra: null };
    var n = parseInt(s, 10);
    return { base: isNaN(n) ? 0 : n, dice: 0, sides: 0, extra: null };
  }

  function rollCount(expr, rng) {
    var part = parseCount(expr);
    var roll = rng || Math.random;
    var extraN = 0;
    var main = part.base;
    if (part.extra) {
      for (var i = 0; i < part.dice; i++) extraN += 1 + Math.floor(roll() * part.sides);
    } else {
      for (var j = 0; j < part.dice; j++) main += 1 + Math.floor(roll() * part.sides);
    }
    if (!part.dice && !part.base) main = 1;
    return { main: main, extraKey: part.extra, extra: extraN };
  }

  function commandTiles(shaman) {
    var lines = (shaman && shaman.cadence) || [];
    for (var i = 0; i < lines.length; i++) {
      var m = String(lines[i]).match(/within (\d+) tiles/);
      if (m) return +m[1];
    }
    return null;
  }

  function cardKey(src) {
    if (!src) return '';
    return String(src).split('/').pop().replace(/\.[a-z0-9]+$/i, '');
  }

  function hero(G) {
    var ents = (G && G.ents) || [];
    for (var i = 0; i < ents.length; i++) {
      if (ents[i] && ents[i].hero && !ents[i].dead) return ents[i];
    }
    return null;
  }

  function near(a, b, d) {
    if (!a || !b || a.x == null || b.x == null) return false;
    var dx = a.x - b.x, dy = a.y - b.y;
    return dx * dx + dy * dy < d * d;
  }

  function pickFactory(foe, key) {
    foe = foe || {};
    if (key === 'goblinShaman' || key === 'goblinLeader') return foe.goblin || null;
    if (key === 'rubyGuardian') return foe.thinone || foe.statue || null;
    if (key === 'goblinBoss') return foe.goblinBoss || foe.goblin || null;
    if (key === 'goblinKing') return foe.goblinKing || foe.goblin || null;
    if (foe[key]) return foe[key];
    return foe.goblin || foe.rat || null;
  }

  function seat(member) {
    var n = member.count || 1;
    var out = [];
    for (var i = 0; i < n; i++) {
      if (i === 0) out.push({ x: member.x, y: member.y });
      else {
        var a = (i / n) * Math.PI * 2;
        out.push({ x: member.x + Math.cos(a) * PACK, y: member.y + Math.sin(a) * PACK });
      }
    }
    return out;
  }

  function makeEnt(opts, spec, key, member, group) {
    var mon = spec.data && spec.data.MONSTERS && spec.data.MONSTERS[key];
    var make = pickFactory(opts.foe, key);
    var e = make ? make() : { team: 'foe', hp: 8, maxhp: 8, name: key, kind: key, sprite: key };
    var scale = opts.scale || 4;
    e.team = 'foe';
    e.boss = 0;
    e.chapterBoss = 0;
    e.campaignKey = key;
    var xp = printed(spec, key);
    if (xp != null) e.campaignXp = xp;
    if (mon) {
      if (mon.name) e.name = mon.name;
      if (typeof mon.ac === 'number') e.ac = mon.ac;
      if (mon.attacks && mon.attacks[0] && mon.attacks[0].damage) e.dice = mon.attacks[0].damage;
      if (typeof mon.hp === 'number') {
        e.hp = Math.round(mon.hp * scale);
        e.maxhp = e.hp;
      }
      if (mon.art && mon.art.key) e.sprite = mon.art.key;
      if (mon.ruby && typeof mon.ruby.gp === 'number') e.rubyGp = mon.ruby.gp;
    }
    if ((mon && mon.dialogue === 'insults-only') || (group && group.dialogue === 'insults-only')) {
      e.insultsOnly = 1;
      e.parley = false;
      e.bargain = false;
    }
    var bossKey = spec.map && spec.map.boss && spec.map.boss.key;
    if ((member && member.role === 'boss') || (bossKey && key === bossKey && member && member.role === 'boss')) e.campaignRole = 'boss';
    else e.campaignRole = (member && member.role) || 'resident';
    if (key === 'goblinShaman' || (mon && mon.casterLevel)) {
      e.caster = 1;
      e.shaman = 0;
      e.npc = 0;
      e.spellSet = (member && member.spellSet) || 'memorized';
      if (e.name === 'Goblin Shaman' && mon && mon.name) e.name = mon.name;
    }
    if (group && group.id === 'camp') e.nozCamp = 1;
    e.boss = 0;
    e.chapterBoss = 0;
    return e;
  }

  function stampGuardian(opts, spec, e) {
    var mon = spec.data && spec.data.MONSTERS && spec.data.MONSTERS.rubyGuardian;
    var node = spec.map && spec.map.guardian;
    e.campaignRole = 'guardian';
    e.campaignKey = (node && node.key) || 'rubyGuardian';
    var xp = printed(spec, e.campaignKey);
    if (xp != null) e.campaignXp = xp;
    e.kind = 'construct';
    e.rubyDrop = 0;
    e.boss = 0;
    e.chapterBoss = 0;
    e.sleeping = 1;
    e.aggro = 0;
    e.name = (mon && mon.name) || (node && node.name) || 'Ruby Guardian';
    var art = (node && node.art && node.art.key) || (mon && mon.art && mon.art.key);
    if (art) e.sprite = art;
    if (mon && typeof mon.ac === 'number') e.ac = mon.ac;
    if (mon && mon.attacks && mon.attacks[0]) e.dice = mon.attacks[0].damage;
    var hp1e = (mon && typeof mon.hp === 'number') ? mon.hp : (node && typeof node.hp === 'number' ? node.hp : null);
    if (hp1e != null) {
      e.hp = Math.round(hp1e * (opts.scale || 4));
      e.maxhp = e.hp;
    }
    if (mon && mon.ruby && typeof mon.ruby.gp === 'number') e.rubyGp = mon.ruby.gp;
    return e;
  }

  function carveMap(L, map) {
    if (!L || !L.grid || !eng('caveDisk')) return;
    var g = L.grid;
    var rooms = (map.layout && map.layout.rooms) || [];
    var byId = {};
    for (var i = 0; i < rooms.length; i++) {
      var room = rooms[i];
      byId[room.id] = room;
      if (room.kind === 'rect' && eng('rect') && room.origin) {
        eng('rect')(g, room.origin.x | 0, room.origin.y | 0, room.w | 0, room.h | 0, 0);
      }
      var rw = room.rw || (room.kind === 'rect' ? 11 : 4);
      var rh = room.rh || (room.kind === 'rect' ? 7.2 : 3);
      eng('caveDisk')(g, room.x, room.y, rw, rh, room.id === 'arrival' || room.id === 'stair-chamber' ? 3 : 0);
    }
    var link = [];
    var secret = null;
    var secrets = map.secrets || [];
    for (var s = 0; s < secrets.length; s++) if (secrets[s].id === 'warrens') secret = secrets[s];
    ['warren-mouth', 'warren-shaman', 'warren-stair', 'king-hall'].forEach(function (id) {
      if (byId[id]) link.push([byId[id].x, byId[id].y]);
    });
    if (secret && link.length && eng('carvePath')) {
      eng('carvePath')(g, [[secret.x, (secret.y || 0) + 1.2]].concat(link), 2.2, 0);
    }
    var seals = (L.secrets || []).concat(secrets);
    for (var k = 0; k < seals.length; k++) {
      if (seals[k] && !seals[k].open && eng('sealSecretCells')) eng('sealSecretCells')(g, seals[k]);
    }
  }

  function stripTravelProps(G) {
    G.props = (G.props || []).filter(function (p) {
      if (!p) return false;
      if (p.k === 'floorRubyDoor') return false;
      if (p.k === 'floorlever' && !p.campaign) return false;
      return true;
    });
  }

  function placeProp(G, prop) {
    var props = G.props || (G.props = []);
    for (var i = 0; i < props.length; i++) {
      var p = props[i];
      if (p && p.k === prop.k && near(p, prop, 1.4)) {
        p.campaign = prop.campaign || p.campaign;
        return p;
      }
    }
    props.push(prop);
    return prop;
  }

  function placeLevel(G, spec) {
    var map = spec.map;
    if (!map) return;
    stripTravelProps(G);
    if (map.rubyDoor && map.rubyDoor.placement === 'fixed') {
      placeProp(G, { x: map.rubyDoor.x, y: map.rubyDoor.y, k: map.rubyDoor.prop || 'rubydoor', campaign: 1 });
    }
    if (map.lever && map.lever.placement === 'fixed') {
      placeProp(G, { x: map.lever.x, y: map.lever.y, k: map.lever.prop || 'floorlever', campaign: 1 });
    }
    if (map.elevator && map.elevator.placement === 'fixed') {
      placeProp(G, { x: map.elevator.x, y: map.elevator.y, k: map.elevator.prop || 'lift', campaign: 1 });
    }
    if (map.stairs) {
      var stairs = null;
      var props = G.props || [];
      for (var i = 0; i < props.length; i++) {
        if (props[i] && props[i].k === 'stairs' && near(props[i], map.stairs, 3)) stairs = props[i];
      }
      if (stairs) stairs.campaign = 'floor';
      else placeProp(G, { x: map.stairs.x, y: map.stairs.y, k: 'stairs', campaign: 'floor' });
    }
    var pieces = map.setPieces || [];
    for (var p = 0; p < pieces.length; p++) {
      if (pieces[p].id === 'warren-stair') {
        placeProp(G, { x: pieces[p].x, y: pieces[p].y, k: 'stairs', campaign: 'warren' });
      }
    }
  }

  function spawnPinned(G, opts, spec) {
    var map = spec.map;
    if (!map) return;
    var groups = map.spawns || [];
    for (var i = 0; i < groups.length; i++) {
      var group = groups[i];
      var members = group.members || [];
      for (var m = 0; m < members.length; m++) {
        var member = members[m];
        var spots = seat(member);
        for (var s = 0; s < spots.length; s++) {
          var e = makeEnt(opts, spec, member.key, member, group);
          e.x = spots[s].x;
          e.y = spots[s].y;
          G.ents.push(e);
        }
      }
    }
    var node = map.guardian;
    if (node && node.placement === 'fixed') {
      var make = pickFactory(opts.foe, node.key || 'rubyGuardian');
      var g = make ? make() : { team: 'foe', hp: 8, maxhp: 8 };
      stampGuardian(opts, spec, g);
      g.x = node.x;
      g.y = node.y;
      G.ents.push(g);
    }
    var nozAt = null;
    var pieces = map.setPieces || [];
    for (var n = 0; n < pieces.length; n++) if (pieces[n].id === 'noz') nozAt = pieces[n];
    if (nozAt && opts.ally && typeof opts.ally.noz === 'function') {
      var already = (G.ents || []).some(function (e) { return e && e.name === 'Noz'; });
      if (!already) {
        var noz = opts.ally.noz();
        noz.x = nozAt.x;
        noz.y = nozAt.y;
        G.ents.push(noz);
      }
    }
  }

  function stripMoved(G, spec) {
    var removed = (spec.map && spec.map.removed) || [];
    var spiders = false;
    for (var i = 0; i < removed.length; i++) {
      if (removed[i] && /spider/i.test(removed[i].was || '')) spiders = true;
    }
    if (!spiders) return;
    G.props = (G.props || []).filter(function (p) { return p && p.k !== 'web' && p.k !== 'eggs'; });
  }

  function bindTick(G) {
    var L = G.lvl;
    if (!L || (L.tick && L.tick._campaign)) return;
    var inner = L.tick;
    var wrapped = function (dt) {
      if (inner) inner.call(this, dt);
      api.tick(G, dt);
    };
    wrapped._campaign = 1;
    L.tick = wrapped;
  }

  function install(G, opts) {
    opts = opts || {};
    if (!shouldInstall(G)) return false;
    var spec = load(G.lvl.n | 0);
    if (!spec) return false;
    var L = G.lvl;
    L.campaignSpec = spec;
    L.flags = L.flags || {};
    L.flags.campaign = 1;
    L.flags.placed = 1;
    L.flags.spiderLoot = 1;
    L.flags.campaignInstalled = 1;
    L._campaignHost = { rollExpr: opts.rollExpr || null, scale: opts.scale || 4 };
    if (opts.foe) G._campaignFoe = opts.foe;
    if (spec.name) L.title = spec.name;
    if (opts.fresh !== false) {
      L.flags.rubyWoke = 0;
      L.flags.leverPulled = 0;
      L.flags.stairsOpen = 0;
      L.flags.guardianDead = 0;
      L.flags.bossDead = 0;
      G.ents = (G.ents || []).filter(function (e) { return e && e.team !== 'foe'; });
      stripMoved(G, spec);
      carveMap(L, spec.map || {});
      placeLevel(G, spec);
      spawnPinned(G, opts, spec);
    } else {
      stripTravelProps(G);
      placeLevel(G, spec);
    }
    bindTick(G);
    return true;
  }

  function spent(e, name) {
    return String(e.spellsSpent || '').split(',').indexOf(name) >= 0;
  }

  function markSpent(e, name) {
    e.spellsSpent = e.spellsSpent ? (e.spellsSpent + ',' + name) : name;
  }

  function tickCasters(G, dt) {
    var L = G.lvl;
    var spec = L && L.campaignSpec;
    var shaman = spec && spec.data && spec.data.SHAMAN;
    if (!shaman) return;
    var p = hero(G);
    if (!p) return;
    var tiles = commandTiles(shaman);
    var every = shaman.spellEverySec;
    var fleeAt = shaman.fleeAtHpFraction;
    var host = L._campaignHost || {};
    var roll = host.rollExpr;
    var scale = host.scale || 4;
    var ents = G.ents || [];
    for (var i = 0; i < ents.length; i++) {
      var e = ents[i];
      if (!e || !e.caster || e.dead || e.team !== 'foe' || e.sleeping) continue;
      var max = e.maxhp || e.hp || 1;
      if (typeof fleeAt === 'number' && e.hp <= max * fleeAt && !e.fleeTo) {
        var dx = e.x - p.x, dy = e.y - p.y;
        var len = Math.hypot(dx, dy) || 1;
        e.fleeTo = { x: e.x + (dx / len) * 6, y: e.y + (dy / len) * 6 };
      }
      if (e.spellSet !== 'memorized') continue;
      if (e._wind) {
        e._wind.left -= dt;
        if (e._wind.left > 0) continue;
        var spell = e._wind.spell;
        e._wind = null;
        if (spell.stunSec && !(p.stun > 0)) {
          p.stun = Math.max(p.stun || 0, spell.stunSec);
          p.commandHeld = spell.stunSec;
        }
        if (spell.damage && typeof roll === 'function' && eng('damage')) {
          eng('damage')(p, Math.round(roll(spell.damage) * scale), '#c07bff', e);
        }
        markSpent(e, spell.name);
        if (every) e.spellCd = every;
        continue;
      }
      if (p.commandHeld > 0) p.commandHeld = Math.max(0, p.commandHeld - dt);
      if (e.spellCd > 0) { e.spellCd -= dt; continue; }
      var list = shaman.memorized || [];
      var next = null;
      for (var s = 0; s < list.length; s++) {
        var row = list[s];
        if (spent(e, row.name)) continue;
        if (row.stunSec && tiles != null && near(e, p, tiles) && !(p.stun > 0) && !(p.commandHeld > 0)) { next = row; break; }
        if (row.damage && row.range === 'touch' && near(e, p, (e.range || 0.8) + 0.4)) { next = row; break; }
      }
      if (next) e._wind = { spell: next, left: next.windupSec || 0 };
    }
  }

  function syncGates(G) {
    var L = G.lvl;
    var spec = L && L.campaignSpec;
    if (!spec) return;
    var guards = 0;
    var boss = false;
    var ents = G.ents || [];
    for (var i = 0; i < ents.length; i++) {
      var e = ents[i];
      if (!e || e.dead || e.team !== 'foe') continue;
      if (e.campaignRole === 'guardian') guards++;
      if (e.campaignRole === 'boss') boss = true;
    }
    L.flags.guardianDead = guards === 0 ? 1 : 0;
    L.flags.bossDead = boss ? 0 : 1;
    if (spec.stairsOpenOn === 'bossKill') L.flags.stairsOpen = boss ? 0 : 1;
    else if (spec.stairsOpenOn === 'lever') L.flags.stairsOpen = L.flags.leverPulled ? 1 : 0;
  }

  function piece(map, id) {
    var list = (map && map.setPieces) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function tick(G, dt) {
    var L = G && G.lvl;
    if (!L || !L.flags || !L.flags.campaign || !L.campaignSpec) return;
    syncGates(G);
    tickCasters(G, dt || 0);
    var p = hero(G);
    if (!p || !eng('interact')) return;
    var spec = L.campaignSpec;
    var map = spec.map || {};
    if (map.rubyDoor && near(p, map.rubyDoor, 1.8) && !L.flags.rubyWoke) {
      eng('interact')('Touch the ruby door', function () {
        L.flags.rubyWoke = 1;
        var ents = G.ents || [];
        for (var i = 0; i < ents.length; i++) {
          var e = ents[i];
          if (e && e.campaignRole === 'guardian' && !e.dead) { e.sleeping = 0; e.aggro = 99; }
        }
        if (eng('say')) eng('say')('The ruby wakes. The guardian stirs.', '#ff334a');
      });
      return;
    }
    if (map.lever && near(p, map.lever, 1.8) && !L.flags.leverPulled) {
      if (!L.flags.guardianDead) {
        eng('interact')('The guardian still holds the lever', function () {
          if (eng('say')) eng('say')('The guardian still holds the lever.', '#c9b895');
        });
      } else {
        eng('interact')('Pull the lever', function () {
          L.flags.leverPulled = 1;
          if (spec.stairsOpenOn === 'lever') {
            L.flags.stairsOpen = 1;
            if (eng('endChapter')) eng('endChapter')();
          } else showCard(G);
        });
      }
      return;
    }
    if (map.stairs && near(p, map.stairs, 2.3)) {
      if (!L.flags.stairsOpen) {
        eng('interact')('The floor boss still holds the stair', function () {
          if (eng('say')) eng('say')('The floor boss still holds the stair.', '#c9b895');
        });
      } else {
        eng('interact')('Climb the stair', function () {
          if (eng('endChapter')) eng('endChapter')();
        });
      }
      return;
    }
    var warren = piece(map, 'warren-stair');
    if (warren && near(p, warren, 2.3)) {
      eng('interact')('Descend to the king hall', function () {
        var land = warren.landsAt || warren;
        p.x = land.x;
        p.y = land.y;
        if (G.cam) { G.cam.x = p.x; G.cam.y = p.y; }
      });
    }
  }

  function showCard(G) {
    var spec = G.lvl && G.lvl.campaignSpec;
    if (!spec) return;
    var src = (spec.map && spec.map.elevator && spec.map.elevator.transitionCard)
      || (spec.table && spec.table.elevator && spec.table.elevator.transitionCard)
      || '';
    G.campaignCard = { src: src, key: cardKey(src), title: spec.name, line: 'The elevator descends.' };
    G.scene = 'campaign-card';
  }

  function finishCard(G) {
    if (!G) return;
    G.campaignCard = null;
    if (eng('endChapter')) eng('endChapter')();
    else G.scene = 'camp';
  }

  function spawnWander(G, p, foe) {
    var L = G && G.lvl;
    var spec = L && L.campaignSpec;
    if (!spec || !L.flags || !L.flags.campaign) return [];
    var slots = (spec.map && spec.map.wander && spec.map.wander.slots) || (spec.data && spec.data.WANDER) || [];
    if (!slots.length) return [];
    var factories = foe || G._campaignFoe || {};
    var roll = Math.floor(Math.random() * slots.length);
    var slot = slots[roll] || slots[0];
    var count = rollCount(slot.count);
    var names = [];
    var spots = (eng('wanderSpawnSpots') && p) ? eng('wanderSpawnSpots')(p) : [];
    function at(i) {
      if (spots[i]) return spots[i];
      if (!p) return { x: 0, y: 0 };
      var a = (i / 6) * Math.PI * 2;
      return { x: p.x + Math.cos(a) * 6, y: p.y + Math.sin(a) * 6 };
    }
    var made = 0;
    function push(key, spellSet) {
      var e = makeEnt({ foe: factories, scale: (L._campaignHost && L._campaignHost.scale) || 4 }, spec, key, { spellSet: spellSet || 'memorized' }, null);
      var spot = at(made);
      e.x = spot.x;
      e.y = spot.y;
      e.aggro = 99;
      G.ents.push(e);
      names.push(e.name || key);
      made++;
    }
    for (var i = 0; i < count.main; i++) push(slot.key, slot.key === 'goblinShaman' ? 'memorized' : null);
    for (var j = 0; j < count.extra; j++) push(count.extraKey, null);
    if (names.length && eng('beginFight')) eng('beginFight')(G.ents[G.ents.length - 1]);
    return names;
  }

  var api = {
    LIVE: LIVE,
    UNWIRED_QUESTS: UNWIRED_QUESTS,
    load: load,
    nextLevel: nextLevel,
    shouldInstall: shouldInstall,
    blocksWarren: blocksWarren,
    noteCleared: noteCleared,
    printed: printed,
    beginRun: beginRun,
    kill: kill,
    pullLever: pullLever,
    spawnCount: spawnCount,
    gaps: gaps,
    parseCount: parseCount,
    rollCount: rollCount,
    install: install,
    tick: tick,
    showCard: showCard,
    finishCard: finishCard,
    spawnWander: spawnWander
  };

  root.CampaignRuntime = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
