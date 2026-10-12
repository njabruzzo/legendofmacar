/**
 * Loads a campaign level from the data modules into the dungeon engine.
 * Data files stay wired:false. Only levels in LIVE are installed onto a chapter.
 * L1 is the exception: no boss, six Thin Ones, the lever opens the way down.
 */
(function (root) {
  'use strict';

  var LIVE = { 2: true, 3: true };
  var SPIDER_KEYS = { spider: 1, spiderHuge: 1, spiderGiant: 1, phasespider: 1, spiderQueen: 1 };
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

  function shellChapter(level) {
    level = level | 0;
    if (level === 3) return 2;
    return level;
  }

  function shouldInstall(G) {
    if (!G || !G.lvl) return false;
    var level = G.campaignLevel || 1;
    if (!LIVE[level]) return false;
    if (shellChapter(level) !== (G.lvl.n | 0)) return false;
    return !!load(level);
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

  function campGoDeeper(G) {
    if (!G) return 'chapter';
    var stored = G.campaignLevel || 1;
    var level = stored;
    if (G.cleared && G.cleared[1] && level < 2) level = 2;
    var shell = shellChapter(level);
    if (LIVE[level] && (G.ch | 0) < shell) {
      G.campaignLevel = level;
      return 'enter';
    }
    var next = (level | 0) + 1;
    if (LIVE[level] && LIVE[next] && (G.ch | 0) >= shell) {
      G.campaignLevel = stored >= level ? next : level;
      return 'enter';
    }
    if (LIVE[level] && !LIVE[next] && (G.ch | 0) >= shell) {
      G.campaignLevel = level;
      return 'soon';
    }
    return 'chapter';
  }

  function gaps(spec) {
    var out = [];
    var open = (spec && spec.open) || [];
    for (var i = 0; i < open.length; i++) {
      if (open[i] && open[i].note && open[i].note.indexOf('(open)') >= 0) out.push(open[i].id);
    }
    if (spec && spec.quest && UNWIRED_QUESTS[spec.quest.id]) out.push(spec.quest.id);
    if (spec && LIVE[spec.level] && !LIVE[(spec.level | 0) + 1]) out.push('elevator-returns-to-camp');
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
    if (shaman && typeof shaman.commandRangeTiles === 'number') return shaman.commandRangeTiles;
    var lines = (shaman && shaman.cadence) || [];
    for (var i = 0; i < lines.length; i++) {
      var m = String(lines[i]).match(/within (\d+) tiles/);
      if (m) return +m[1];
    }
    return null;
  }

  function unitRng(opts) {
    if (opts && typeof opts.rng === 'function') return opts.rng();
    return Math.random();
  }

  function rollHpExpr(expr, rng, minHp) {
    var m = String(expr || '').match(/^(\d+)d(\d+)([+-]\d+)?$/i);
    var floor = minHp == null ? 1 : minHp;
    if (!m) return floor;
    var total = m[3] ? +m[3] : 0;
    var n = +m[1];
    var sides = +m[2];
    for (var i = 0; i < n; i++) total += 1 + Math.floor(rng() * sides);
    return Math.max(floor, total);
  }

  function stampHp(e, sheet, scale, rng) {
    if (!e || !sheet) return e;
    var hp1e = null;
    if (typeof sheet.hp === 'number') hp1e = sheet.hp;
    else if (sheet.hpRoll) hp1e = rollHpExpr(sheet.hpRoll, rng, sheet.hpMin);
    if (hp1e == null) return e;
    e.hp1e = hp1e;
    e.hp = Math.max(1, Math.round(hp1e * (scale || 4)));
    e.maxhp = e.hp;
    return e;
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
    if (key === 'goblinShaman' || key === 'goblinLeader' || key === 'shaman' || key === 'leader') return foe.goblin || null;
    if (key === 'rubyGuardian') return foe.thinone || foe.statue || null;
    if (SPIDER_KEYS[key]) return foe.spider || null;
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
    var sheet = mon;
    if (member && member.role === 'assistants' && spec.data && spec.data.MONSTERS && spec.data.MONSTERS.goblinLeader) {
      sheet = spec.data.MONSTERS.goblinLeader;
    }
    var neutral = !!(mon && mon.fights === false);
    var make = neutral ? null : pickFactory(opts.foe, key);
    var e = make ? make() : {
      team: neutral ? 'neutral' : 'foe',
      hp: 8, maxhp: 8, name: key, kind: key,
      sprite: (mon && mon.art && mon.art.key) || key,
      scale: 1, atk: 0, atkMax: 0.42, stun: 0, dead: false, r: 0.4
    };
    if (!(e.scale > 0)) e.scale = 1;
    var scale = opts.scale || 4;
    if (!neutral) e.team = 'foe';
    e.boss = 0;
    e.chapterBoss = 0;
    e.campaignKey = key;
    var xp = printed(spec, key);
    if (xp != null) e.campaignXp = xp;
    if (sheet) {
      if (member && member.role === 'assistants') e.name = 'Goblin assistant';
      else if (mon && mon.name) e.name = mon.name;
      if (typeof sheet.ac === 'number') e.ac = sheet.ac;
      if (sheet.attacks && sheet.attacks[0] && sheet.attacks[0].damage) e.dice = sheet.attacks[0].damage;
      stampHp(e, sheet, scale, function () { return unitRng(opts); });
      if (sheet.hitAsHd) e.hd = sheet.hitAsHd;
      if (typeof sheet.toHit === 'number') {
        e.toHit = sheet.toHit;
        e.sa = '';
        e.strMul = 0;
      }
      var artKey = (mon && mon.art && mon.art.key) || (sheet.art && sheet.art.key);
      if (artKey) e.sprite = artKey;
      if (mon && mon.ruby && typeof mon.ruby.gp === 'number') e.rubyGp = mon.ruby.gp;
      if (mon && mon.disease) {
        e.poison = 0;
        e.killPoison = 0;
        e.slowPoison = 0;
        e.sa = '';
        e.diseaseBite = mon.disease.perBite;
      }
    }
    if (group) e.room = group.room || group.id || e.room;
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
    if (SPIDER_KEYS[key]) e.campaignPoison = 1;
    if (mon && mon.phaseWindow && typeof mon.phaseWindow.sec === 'number') {
      e.phased = 1;
      e.phaseWindowSec = mon.phaseWindow.sec;
    }
    if (neutral) {
      e.team = 'neutral';
      e.npc = 1;
      e.aggro = 0;
      e.attacks = [];
      e.campaignPoison = 0;
    }
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
    var king = root.L2 && root.L2.KING;
    if (king && king.cornerRoom && map && map.boss && map.boss.key === 'goblinKing' && eng('rect')) {
      var room = king.cornerRoom;
      eng('rect')(g, room.x | 0, room.y | 0, room.w | 0, room.h | 0, 0);
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
        if (prop.itemId) p.itemId = prop.itemId;
        if (prop.toothKind) p.toothKind = prop.toothKind;
        if (prop.wall && !p.wall) p.wall = prop.wall;
        if (prop.throneDoor) p.throneDoor = 1;
        if (prop.emptySocket) p.emptySocket = 1;
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
    placeKingPieces(G, spec);
  }

  function placeKingPieces(G, spec) {
    var map = spec.map || {};
    var data = spec.data || {};
    var tooth = map.tooth;
    var face = data.TOOTH;
    if (tooth && tooth.x != null && tooth.y != null) {
      var flags = (G.lvl && G.lvl.flags) || {};
      placeProp(G, {
        x: tooth.x, y: tooth.y, k: 'demonface',
        wall: (face && face.wall) || 'n',
        s: 1.12, seed: 774,
        toothKind: 'electrum', itemId: tooth.id || 'grond_tooth_electrum_2',
        campaign: 1, emptySocket: flags.electrumTooth2 ? 1 : 0
      });
    }
    var king = data.KING;
    if (!king) return;
    if (king.throne) placeProp(G, { x: king.throne.x, y: king.throne.y, k: 'throne', s: 1.2, campaign: 1 });
    if (king.throneDoor) {
      placeProp(G, {
        x: king.throneDoor.x, y: king.throneDoor.y, k: 'gate',
        campaign: 1, throneDoor: 1, wall: king.throneDoor.wall || 'n'
      });
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
    spawnRescue(G, opts, spec);
  }

  function spawnRescue(G, opts, spec) {
    var pieces = (spec.map && spec.map.setPieces) || [];
    for (var i = 0; i < pieces.length; i++) {
      var piece = pieces[i];
      if (!piece || piece.id !== 'trapped-pixie') continue;
      var e = makeEnt(opts, spec, 'pixie', { role: 'rescue' }, null);
      e.x = piece.x;
      e.y = piece.y;
      G.ents.push(e);
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
      var spec = L.campaignSpec;
      if (inner && (!spec || (spec.level | 0) === (L.n | 0))) inner.call(this, dt);
      api.tick(G, dt);
    };
    wrapped._campaign = 1;
    L.tick = wrapped;
  }

  function install(G, opts) {
    opts = opts || {};
    clearDust(G);
    if (!shouldInstall(G)) {
      G.poisonMode = '';
      return false;
    }
    var spec = load((G.campaignLevel || G.lvl.n) | 0);
    if (!spec) return false;
    G.poisonMode = (spec.data && spec.data.POISON && spec.data.POISON.mode === 'h1') ? 'h1' : '';
    var L = G.lvl;
    L.campaignSpec = spec;
    L.flags = L.flags || {};
    L.flags.campaign = 1;
    L.flags.placed = 1;
    L.flags.spiderLoot = 1;
    L.flags.campaignInstalled = 1;
    L._campaignHost = { rollExpr: opts.rollExpr || null, scale: opts.scale || 4, rng: opts.rng || null };
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
    preloadCard(spec);
    return true;
  }

  function spent(e, name) {
    return String(e.spellsSpent || '').split(',').indexOf(name) >= 0;
  }

  function markSpent(e, name) {
    e.spellsSpent = e.spellsSpent ? (e.spellsSpent + ',' + name) : name;
  }

  function actorLevel(def) {
    if (def && def.lvl) return def.lvl | 0;
    if (def && def.hero && eng('partyLevel')) return eng('partyLevel')() | 0;
    return 1;
  }

  function die20(G) {
    var host = G && G.lvl && G.lvl._campaignHost;
    if (host && typeof host.d20 === 'function') return host.d20();
    if (eng('d20')) return eng('d20')();
    return 1 + Math.floor(Math.random() * 20);
  }

  function saveVs(G, target, kind) {
    var host = G && G.lvl && G.lvl._campaignHost;
    if (host && typeof host.save === 'function') return !!host.save(target, kind);
    if (eng('savingThrow')) return !!eng('savingThrow')(target, kind);
    return false;
  }

  function touchLands(G, atk, def) {
    var roll = die20(G);
    var host = G && G.lvl && G.lvl._campaignHost;
    var need = null;
    if (host && typeof host.need === 'function') need = host.need(atk, def);
    else if (eng('thacNeed') && eng('effectiveAC')) need = eng('thacNeed')(atk, eng('effectiveAC')(def, atk));
    if (need == null) need = 20;
    var bonus = eng('hitBonus') ? eng('hitBonus')(atk, def) : ((atk && atk.toHit) || 0);
    return roll === 20 || (roll + bonus) >= need;
  }

  function spellList(shaman, e) {
    if (!shaman) return [];
    if (e && e.spellSet === 'swap') return shaman.swap || [];
    return shaman.memorized || [];
  }

  function shamanLine(spec, spell) {
    var talk = spec && spec.data && spec.data.DIALOGUE && spec.data.DIALOGUE.shaman;
    if (!talk || !spell) return '';
    var pool = null;
    if (spell.stunSec) pool = talk.command;
    else if (spell.damage) pool = talk.causeLightWounds;
    if (!pool || !pool.length) return '';
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function showBark(G, speaker, text) {
    if (!text) return;
    G.campaignBark = { speaker: speaker, text: text, life: 3.4 };
    if (eng('say')) eng('say')(speaker + ': ' + text, '#d6e2a8');
  }

  function resolveSpell(G, e, p, spell, spec) {
    var shaman = spec.data && spec.data.SHAMAN;
    var host = (G.lvl && G.lvl._campaignHost) || {};
    var scale = host.scale || 4;
    var roll = host.rollExpr;
    if (spell.stunSec) {
      var dur = spell.durationSec || spell.stunSec;
      if (commandLands(G, p, spell) && !(p.stun > 0)) {
        p.stun = Math.max(p.stun || 0, dur);
        p.commandHeld = dur;
      }
      showBark(G, 'SHAMAN', shamanLine(spec, spell));
    } else if (spell.area && spell.durationSec) {
      G.darkZones = G.darkZones || [];
      G.darkZones.push({ x: p.x, y: p.y, r: 2, t: spell.durationSec, magical: 1 });
    } else if (spell.touchHit) {
      var landed = touchLands(G, e, p);
      if (landed && spell.damage) {
        var raw = (typeof roll === 'function') ? roll(spell.damage) : 4;
        if (eng('damage')) eng('damage')(p, Math.round(raw * scale), '#c07bff', e);
        else p.hp = Math.max(0, (p.hp || 0) - Math.round(raw * scale));
        showBark(G, 'SHAMAN', shamanLine(spec, spell));
      } else if (landed && spell.fleeSec) {
        if (!saveVs(G, p, 'spell')) {
          p.fearT = Math.max(p.fearT || 0, spell.fleeSec);
          p.causeFear = spell.fleeSec;
          var dx = p.x - e.x, dy = p.y - e.y;
          var len = Math.hypot(dx, dy) || 1;
          p.fleeTo = { x: p.x + (dx / len) * 4, y: p.y + (dy / len) * 4 };
          p.fearFlee = 1;
        }
      }
    }
    markSpent(e, spell.name);
    if (shaman && shaman.spellEverySec) e.spellCd = shaman.spellEverySec;
  }

  function commandLands(G, def, spell) {
    var gate = (spell && spell.saveLevel) || 6;
    if (actorLevel(def) < gate) return true;
    return !saveVs(G, def, 'spell');
  }

  function tickCasters(G, dt) {
    var L = G.lvl;
    var spec = L && L.campaignSpec;
    var shaman = spec && spec.data && spec.data.SHAMAN;
    if (!shaman) return;
    var p = hero(G);
    if (!p) return;
    if (p.commandHeld > 0) p.commandHeld = Math.max(0, p.commandHeld - dt);
    if (p.causeFear > 0) {
      p.causeFear = Math.max(0, p.causeFear - dt);
      if (p.causeFear <= 0 && p.fearFlee) {
        var release = eng('releaseHeroFear');
        if (release) release(p);
        else {
          p.fearFlee = 0;
          p.fearPlaced = 0;
          p.fleeTo = null;
          p.dest = null;
          p.moving = 0;
          p.ix = 0;
          p.iy = 0;
        }
      }
    }
    var tiles = commandTiles(shaman);
    var closeTiles = shaman.closeTiles || 6;
    var every = shaman.spellEverySec;
    var fleeAt = shaman.fleeAtHpFraction;
    var ents = G.ents || [];
    for (var i = 0; i < ents.length; i++) {
      var e = ents[i];
      if (!e || !e.caster || e.dead || e.team !== 'foe' || e.sleeping) continue;
      var max = e.maxhp || e.hp || 1;
      if (typeof fleeAt === 'number' && e.hp <= max * fleeAt && !e.fleeTo && !e.cornered) {
        var dx = e.x - p.x, dy = e.y - p.y;
        var len = Math.hypot(dx, dy) || 1;
        e.fleeTo = { x: e.x + (dx / len) * 6, y: e.y + (dy / len) * 6 };
      }
      if (e._wind) {
        e._wind.left -= dt;
        if (e._wind.left > 0) continue;
        var spell = e._wind.spell;
        e._wind = null;
        resolveSpell(G, e, p, spell, spec);
        continue;
      }
      if (e.spellCd > 0) { e.spellCd -= dt; continue; }
      var list = spellList(shaman, e);
      var touch = (e.range || 0.8) + 0.4;
      var next = null;
      for (var s = 0; s < list.length; s++) {
        var row = list[s];
        if (spent(e, row.name)) continue;
        if (row.stunSec && tiles != null && near(e, p, tiles) && !(p.stun > 0) && !(p.commandHeld > 0)) { next = row; break; }
        if (row.area && near(e, p, closeTiles)) { next = row; break; }
        if (row.touchHit && near(e, p, touch)) { next = row; break; }
      }
      if (next) e._wind = { spell: next, left: next.windupSec || 0 };
      else if (every) e.spellCd = 0;
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

  function hostOf(G) {
    return (G && G.lvl && G.lvl._campaignHost) || {};
  }

  function roll100(G) {
    var host = hostOf(G);
    if (typeof host.d100 === 'function') return host.d100() | 0;
    return 1 + Math.floor(Math.random() * 100);
  }

  function hostRng(G) {
    var host = hostOf(G);
    if (typeof host.rng === 'function') return host.rng;
    return Math.random;
  }

  function tileDist(a, b) {
    if (!a || !b) return 99;
    return Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0));
  }

  function diseaseOf(G, atk) {
    var spec = G && G.lvl && G.lvl.campaignSpec;
    var key = atk && atk.campaignKey;
    var mon = spec && spec.data && spec.data.MONSTERS && key && spec.data.MONSTERS[key];
    return (mon && mon.disease) || null;
  }

  function tryDisease(G, atk, def) {
    if (!G || !atk || !def || !(atk.diseaseBite > 0)) return false;
    var dis = diseaseOf(G, atk);
    if (!dis || dis.lethal) return false;
    var roll = roll100(G);
    if (roll > (dis.perBite || 5)) return false;
    if (saveVs(G, def, dis.save || 'poison')) return false;
    def.ratFever = 1;
    def.disease = 1;
    if (G.lvl) {
      G.lvl.flags = G.lvl.flags || {};
      G.lvl.flags.ratFever = 1;
    }
    return true;
  }

  function onFoeHit(G, atk, def) {
    return tryDisease(G, atk, def);
  }

  function healKindBlocked(e, kind) {
    return !!(e && e.ratFever && (kind === 'rest' || kind === 'regen'));
  }

  function applyHealKind(e, n, kind, scale) {
    if (!e || e.dead) return 0;
    if (healKindBlocked(e, kind)) return 0;
    var amt = Math.round((+n || 0) * (scale || 4));
    var cap = e.maxhp == null ? Infinity : e.maxhp;
    e.hp = Math.min(cap, (e.hp || 0) + amt);
    return amt;
  }

  function cureDisease(G, e) {
    if (e) {
      e.ratFever = 0;
      e.disease = 0;
      e.diseaseT = 0;
      e.campRestSec = 0;
    }
    if (G && G.lvl && G.lvl.flags) G.lvl.flags.ratFever = 0;
  }

  function noteCampRest(G, who, sec) {
    if (!who) return false;
    var fever = !!(who.ratFever || (G && G.lvl && G.lvl.flags && G.lvl.flags.ratFever));
    if (!fever) return false;
    who.ratFever = 1;
    var spec = G && G.lvl && G.lvl.campaignSpec;
    var rat = spec && spec.data && spec.data.MONSTERS && spec.data.MONSTERS.rat;
    var need = (rat && rat.disease && rat.disease.campSec) || 360;
    who.campRestSec = (who.campRestSec || 0) + (sec || 0);
    if (who.campRestSec >= need) {
      cureDisease(G, who);
      return true;
    }
    return false;
  }

  function syncFever(G) {
    var flags = G && G.lvl && G.lvl.flags;
    if (!flags) return;
    var ents = G.ents || [];
    for (var i = 0; i < ents.length; i++) {
      var e = ents[i];
      if (!e || e.team !== 'party' || e.dead) continue;
      if (flags.ratFever) e.ratFever = 1;
    }
  }

  function attackMod(e) {
    return (e && e.ratFever) ? -1 : 0;
  }

  function darkPenalty(e, zones, dwarf) {
    var magical = false;
    var plain = false;
    zones = zones || [];
    for (var i = 0; i < zones.length; i++) {
      var z = zones[i];
      if (!z || (z.t || 0) <= 0 || !e) continue;
      if (Math.hypot((e.x || 0) - z.x, (e.y || 0) - z.y) > (z.r || 1)) continue;
      if (z.magical) magical = true;
      else plain = true;
    }
    if (magical) return -4;
    if (plain && !dwarf) return -4;
    return 0;
  }

  function saidLine(e, kind) {
    return String((e && e.kingLines) || '').split(',').indexOf(kind) >= 0;
  }

  function markLine(e, kind) {
    if (!e || saidLine(e, kind)) return false;
    e.kingLines = e.kingLines ? (e.kingLines + ',' + kind) : kind;
    return true;
  }

  function kingBark(G, e, kind) {
    var data = G && G.lvl && G.lvl.campaignSpec && G.lvl.campaignSpec.data;
    var line = data && data.DIALOGUE && data.DIALOGUE.king && data.DIALOGUE.king[kind];
    if (!line || !markLine(e, kind)) return;
    showBark(G, 'KING', line);
  }

  function onHurt(G, e) {
    if (!e || e.dead || e.hp <= 0 || e.campaignRole !== 'boss') return;
    kingBark(G, e, 'hurt');
  }

  function onDown(G, e) {
    if (!e || e.campaignRole !== 'boss') return;
    kingBark(G, e, 'death');
  }

  function kingOf(G) {
    var ents = (G && G.ents) || [];
    for (var i = 0; i < ents.length; i++) {
      var e = ents[i];
      if (e && e.campaignRole === 'boss' && !e.dead) return e;
    }
    return null;
  }

  function callGoblins(G, king, n) {
    if (!king || king.called) return 0;
    king.called = 1;
    var room = king.room || 'king-hall';
    var pool = [];
    var ents = G.ents || [];
    for (var i = 0; i < ents.length; i++) {
      var e = ents[i];
      if (!e || e.dead || e === king) continue;
      if (e.campaignKey !== 'goblin') continue;
      if (e.room !== room) continue;
      pool.push(e);
    }
    var take = Math.min(Math.max(0, n | 0), pool.length);
    for (var j = 0; j < take; j++) {
      pool[j].aggro = 99;
      pool[j].engaged = 1;
    }
    return take;
  }

  function cornerKing(king) {
    if (!king) return;
    king.cornered = 1;
    king.moraleChecked = 1;
    king.fleeTo = null;
    king.fleePath = null;
    king.onArrive = null;
    king.fleeStuck = 0;
  }

  function startKingFlee(G, king) {
    var data = G.lvl && G.lvl.campaignSpec && G.lvl.campaignSpec.data;
    var K = data && data.KING;
    if (!K || !K.throneDoor || !K.corner) return;
    king.fleePath = [{ x: K.corner.x, y: K.corner.y }];
    king.fleeTo = { x: K.throneDoor.x, y: K.throneDoor.y };
    king.fleeStuck = 0;
    king.onArrive = function () { cornerKing(king); };
    kingBark(G, king, 'flee');
  }

  function shamanAlive(G) {
    var ents = G.ents || [];
    for (var i = 0; i < ents.length; i++) {
      var e = ents[i];
      if (e && e.caster && !e.dead && e.team === 'foe') return true;
    }
    return false;
  }

  function kingStep(G, king) {
    if (!G || !king || king.dead) return;
    var data = G.lvl && G.lvl.campaignSpec && G.lvl.campaignSpec.data;
    var K = data && data.KING;
    if (!K) return;
    var morale = K.morale || {};
    var max = king.maxhp || king.hp || 1;
    var frac = morale.belowHpFraction == null ? 0.3 : morale.belowHpFraction;
    if (!king.cornered && !king.moraleChecked && king.hp < max * frac) {
      king.moraleChecked = 1;
      var roll = roll100(G);
      var hold = morale.holdOnOrUnder == null ? 55 : morale.holdOnOrUnder;
      if (roll <= hold) king.moraleHold = 1;
      else {
        king.moraleHold = 0;
        var n = rollHpExpr(K.call || '1d4', hostRng(G), 1);
        callGoblins(G, king, n);
        startKingFlee(G, king);
      }
    }
    if (king.fleeTo) return;
    var p = hero(G);
    var close = (data.SHAMAN && data.SHAMAN.closeTiles) || 6;
    if (p && shamanAlive(G) && tileDist(king, p) <= close) {
      kingBark(G, king, 'taunt');
      var ents = G.ents || [];
      for (var i = 0; i < ents.length; i++) {
        var e = ents[i];
        if (e && e.caster && !e.dead) { e.aggro = 99; e.engaged = 1; }
      }
    }
    var reach = (king.range || 0.8) + 0.4;
    if (p && tileDist(king, p) <= reach) king.specialty = 1;
  }

  function tickKing(G, dt) {
    var data = G.lvl && G.lvl.campaignSpec && G.lvl.campaignSpec.data;
    var K = data && data.KING;
    var king = kingOf(G);
    if (!K || !king) return;
    king._moraleT = (king._moraleT || 0) + (dt || 0);
    if (king._moraleT < (K.checkEverySec || 1)) return;
    king._moraleT = 0;
    kingStep(G, king);
  }

  function kingTarget(king, G) {
    if (!king || king.campaignRole !== 'boss') return null;
    var p = hero(G);
    if (!p) return null;
    var macarD = tileDist(king, p);
    if (macarD <= 4) return p;
    var ents = (G && G.ents) || [];
    var best = null;
    var bd = macarD;
    for (var i = 0; i < ents.length; i++) {
      var e = ents[i];
      if (!e || e === king || e.hero || e.team !== 'party') continue;
      if (e.dead && !e.ghost) continue;
      var d = tileDist(king, e);
      if (d < bd) { bd = d; best = e; }
    }
    return best || p;
  }

  function ghostKinRisen(G) {
    var ents = (G && G.ents) || [];
    for (var i = 0; i < ents.length; i++) {
      var e = ents[i];
      if (e && e.ghost && !e.hero && e.team === 'party') return true;
    }
    return false;
  }

  function goblinLines(G) {
    var talk = G && G.lvl && G.lvl.campaignSpec && G.lvl.campaignSpec.data && G.lvl.campaignSpec.data.DIALOGUE;
    var lines = (talk && talk.lines) ? talk.lines.slice() : [];
    var from = ((talk && talk.ghostFrom) || 12) - 1;
    var to = ((talk && talk.ghostTo) || 15) - 1;
    if (!ghostKinRisen(G)) {
      lines = lines.filter(function (_line, i) { return i < from || i > to; });
    }
    return lines;
  }

  function tickBarks(G, dt) {
    var L = G && G.lvl;
    var talk = L && L.campaignSpec && L.campaignSpec.data && L.campaignSpec.data.DIALOGUE;
    if (!talk) return;
    L._barkClock = (L._barkClock || 0) + (dt || 0);
    if (G.campaignBark && G.campaignBark.life > 0) {
      G.campaignBark.life -= dt || 0;
      if (G.campaignBark.life <= 0) G.campaignBark = null;
    }
    if (G.campaignBark && G.campaignBark.speaker && G.campaignBark.speaker !== 'GOBLIN' && G.campaignBark.life > 2.5) return;
    var p = hero(G);
    if (!p) return;
    var every = talk.barkEverySec || 6;
    L._barkAt = L._barkAt || {};
    var ents = G.ents || [];
    for (var i = 0; i < ents.length; i++) {
      var e = ents[i];
      if (!e || e.dead || !e.insultsOnly || e.team !== 'foe') continue;
      if (tileDist(e, p) > 8) continue;
      var room = e.room || 'floor';
      if ((L._barkAt[room] || 0) > L._barkClock) continue;
      var pool = goblinLines(G);
      if (!pool.length) return;
      var rng = hostRng(G);
      var line = pool[Math.floor(rng() * pool.length) % pool.length];
      L._barkAt[room] = L._barkClock + every;
      showBark(G, 'GOBLIN', line);
      return;
    }
  }

  function overlapBox(a, b) {
    if (!a || !b) return false;
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function hudBoxes(vw, vh, hud) {
    var list = (hud && hud.obstacles) ? hud.obstacles.slice() : [];
    if (list.length) return list;
    var pad = 8;
    var port = vh > vw;
    var scale = (hud && hud.scale > 0) ? hud.scale : Math.max(0.66, Math.min(1.3, Math.min(vw, vh) / (port ? 430 : 700)));
    if (vw < 900) {
      var sz = 76;
      var mini = { x: vw - sz - pad, y: pad, w: sz, h: sz };
      var tap = 44;
      list.push(mini);
      list.push({ x: mini.x - pad - tap, y: pad, w: tap, h: tap });
    } else {
      var msz = Math.round(96 * scale);
      list.push({ x: vw - msz - Math.round(10 * scale), y: Math.max(8, Math.round(8 * scale)), w: msz, h: msz });
    }
    return list;
  }

  function boxOf(ob) {
    if (!ob) return null;
    return { x: ob.x || 0, y: ob.y || 0, w: ob.w || ob.sz || 0, h: ob.h || ob.sz || 0 };
  }

  function barkRect(vw, vh, portrait, face, hud) {
    vw = vw || 390;
    vh = vh || 844;
    var port = vh > vw;
    var scale = (hud && hud.scale > 0) ? hud.scale : Math.max(0.66, Math.min(1.3, Math.min(vw, vh) / (port ? 430 : 700)));
    var font = Math.max(10, Math.round(12 * scale));
    var h = Math.max(28, Math.round(font * 2.4));
    var pad = 8;
    var obstacles = hudBoxes(vw, vh, hud);
    function blocked(box) {
      if (overlapBox(box, portrait) || overlapBox(box, face)) return true;
      for (var i = 0; i < obstacles.length; i++) {
        if (overlapBox(box, boxOf(obstacles[i]))) return true;
      }
      return false;
    }
    var x = pad;
    var y = pad;
    if (portrait && portrait.w) {
      x = (portrait.x || 0) + portrait.w + pad;
      y = portrait.y || pad;
    }
    var right = vw - pad;
    for (var i = 0; i < obstacles.length; i++) {
      var ob = boxOf(obstacles[i]);
      if (y < ob.y + ob.h && y + h > ob.y) right = Math.min(right, ob.x - pad);
    }
    var maxW = Math.round(280 * scale);
    var w = Math.max(72, Math.min(maxW, right - x));
    var box = { x: x, y: y, w: w, h: h, font: font };
    if (w < 140 || blocked(box)) {
      var low = (portrait && portrait.h) ? ((portrait.y || 0) + portrait.h + pad) : (y + h + pad);
      for (var j = 0; j < obstacles.length; j++) {
        var o2 = boxOf(obstacles[j]);
        low = Math.max(low, o2.y + o2.h + pad);
      }
      box = { x: pad, y: low, w: Math.max(72, Math.min(maxW, vw - pad * 2)), h: h, font: font };
      if (overlapBox(box, face)) box.y = (face.y || 0) + (face.h || 0) + pad;
      if (overlapBox(box, portrait)) box.x = (portrait.x || 0) + (portrait.w || 0) + pad;
    }
    if (box.y + box.h > vh - pad) box.y = Math.max(pad, vh - box.h - pad);
    return box;
  }

  function pryTooth(G, face) {
    if (!G || !face || face.gone || face.emptySocket) return { ok: 0, reason: 'gone' };
    var flags = (G.lvl && G.lvl.flags) || {};
    if (G.lvl) G.lvl.flags = flags;
    if (flags.electrumTooth2) return { ok: 0, reason: 'taken' };
    var spec = G.lvl && G.lvl.campaignSpec;
    var data = spec && spec.data;
    var mapTooth = (spec && spec.map && spec.map.tooth) || {};
    var tooth = (data && data.TOOTH) || {};
    var id = face.itemId || mapTooth.id || tooth.id || 'grond_tooth_electrum_2';
    var name = mapTooth.name || tooth.name || 'Electrum Tooth 2';
    if (name === "Grond's Electrum Tooth") name = 'Electrum Tooth 2';
    var it = {
      id: id,
      n: name,
      k: 'misc',
      cat: 'Quest',
      noSell: 1,
      quest: 1,
      noAuto: 1,
      grondTooth: 'electrum',
      spr: 'icon_pack',
      d: 'A silvery-electrum fang. While Macar carries or wears it, every coin becomes electrum. It does not slow his movement.'
    };
    /* Tooth 1's curse is grondTooth electrum: coins convert, and the fang
       can still be set aside. The map may say cursed. Tooth 2 follows that
       rule and does not take the bind flag. */
    if (eng('stowPackItem')) eng('stowPackItem')(it);
    flags.electrumTooth2 = 1;
    face.emptySocket = 1;
    if (eng('convertCoinsToElectrum')) eng('convertCoinsToElectrum')();
    if (eng('say')) eng('say')('Macar takes the electrum tooth. Coin turns while he carries it.', '#c8d4c0');
    return { ok: 1, item: it };
  }

  function dustSpec() {
    var data = root.L3;
    return (data && data.PIXIE && data.PIXIE.dust) || null;
  }

  function dustMoveMul(e) {
    if (!e || !e.pixieDust) return 1;
    var dust = dustSpec();
    return (dust && typeof dust.moveMul === 'number') ? dust.moveMul : 1;
  }

  function dustCdMul(e) {
    if (!e || !e.pixieDust) return 1;
    var dust = dustSpec();
    return (dust && typeof dust.cdMul === 'number') ? dust.cdMul : 1;
  }

  function clearDust(G) {
    var ents = (G && G.ents) || [];
    for (var i = 0; i < ents.length; i++) {
      var e = ents[i];
      if (!e) continue;
      e.pixieDust = 0;
      e.pixieCap = 0;
      e.pixieCapOn = 0;
    }
  }

  function armDust(G, e) {
    if (!e) e = hero(G);
    if (!e) return false;
    e.pixieDust = 1;
    e.pixieCap = 0;
    e.pixieCapOn = 0;
    return true;
  }

  function noteFight(G) {
    var ents = (G && G.ents) || [];
    for (var i = 0; i < ents.length; i++) {
      var e = ents[i];
      if (e && e.pixieDust) {
        e.pixieCapOn = 1;
        e.pixieCap = 0;
      }
    }
  }

  function actorCon(target, opts) {
    if (opts && typeof opts.con === 'number') return opts.con;
    if (!target) return null;
    if (typeof target.con === 'number') return target.con;
    if (target.abil && typeof target.abil.con === 'number') return target.abil.con;
    return null;
  }

  function actorLevel(target, opts) {
    if (opts && typeof opts.level === 'number') return opts.level;
    if (!target) return null;
    if (typeof target.lvl === 'number') return target.lvl;
    if (target.abil && typeof target.abil.lvl === 'number') return target.abil.lvl;
    return null;
  }

  function poisonHit(atk, target, opts) {
    var poison = root.SpiderPoison;
    if (!poison || typeof poison.resolve !== 'function' || !atk || !target) return null;
    var spider = atk.campaignKey || 'spider';
    if (!poison.SPIDERS || !poison.SPIDERS[spider]) return null;
    opts = opts || {};
    var roll = opts.roll;
    if (roll == null) roll = 1 + Math.floor(Math.random() * 20);
    try {
      return poison.resolve(
        { hp: target.hp, ghost: !!target.ghost },
        {
          mode: 'h1',
          spider: spider,
          level: actorLevel(target, opts),
          con: actorCon(target, opts),
          roll: roll,
          antitoxin: !!opts.antitoxin
        }
      );
    } catch (err) {
      return null;
    }
  }

  function applyPoison(atk, target, bite, opts) {
    bite = bite || 0;
    var fx = poisonHit(atk, target, opts);
    if (!fx) return { dmg: bite, skipped: true, fx: null };
    if (fx.immune || fx.saved) return { dmg: bite, skipped: false, fx: fx, poison: 0 };
    var extra = fx.damage | 0;
    var hp = target.hp || 0;
    if (bite >= hp) extra = 0;
    else extra = Math.min(extra, Math.max(0, hp - bite - 1));
    return { dmg: bite + extra, skipped: false, fx: fx, poison: extra };
  }

  function tickTimers(G, dt) {
    var spec = G.lvl && G.lvl.campaignSpec;
    var dust = spec && spec.data && spec.data.PIXIE && spec.data.PIXIE.dust;
    var cap = dust && typeof dust.cap === 'number' ? dust.cap : 0;
    var ents = G.ents || [];
    for (var i = 0; i < ents.length; i++) {
      var e = ents[i];
      if (!e) continue;
      if (e.h1Slow > 0) {
        e.h1Slow -= dt;
        if (e.h1Slow <= 0) { e.h1Slow = 0; e.h1MoveMul = 0; }
      }
      if (e.phaseOpen > 0) e.phaseOpen = Math.max(0, e.phaseOpen - dt);
      if (e.ceiling > 0) e.ceiling = Math.max(0, e.ceiling - dt);
      if (e.pixieDust && e.pixieCapOn && G.fightOn && cap > 0) {
        e.pixieCap = (e.pixieCap || 0) + dt;
        if (e.pixieCap >= cap) clearDust(G);
      }
      if (e.dead && e.pixieDust) clearDust(G);
    }
  }

  function tickQueen(G) {
    var spec = G.lvl && G.lvl.campaignSpec;
    var queen = spec && spec.data && spec.data.QUEEN;
    var brood = (spec && spec.map && spec.map.brood) || (queen && queen.brood);
    if (!brood) return;
    var ents = G.ents || [];
    for (var i = 0; i < ents.length; i++) {
      var e = ents[i];
      if (!e || e.dead || e.campaignKey !== 'spiderQueen' || e.broodCalled) continue;
      var max = e.maxhp || e.hp || 1;
      var frac = typeof brood.belowHpFraction === 'number' ? brood.belowHpFraction : 0.5;
      if (e.hp > max * frac) continue;
      e.broodCalled = 1;
      var seconds = queen && queen.ceiling && queen.ceiling.seconds;
      if (typeof seconds === 'number') e.ceiling = seconds;
      var tunnels = brood.tunnels || [];
      var hugeN = rollCount(brood.huge || '1').main;
      var giantN = brood.giant || 0;
      var opts = { foe: G._campaignFoe || {}, scale: (G.lvl._campaignHost && G.lvl._campaignHost.scale) || 4 };
      var made = 0;
      function spot(n) {
        if (!tunnels.length) return { x: e.x, y: e.y };
        var t = tunnels[n % tunnels.length];
        return { x: t.x, y: t.y + n * 0.35 };
      }
      var h;
      for (h = 0; h < hugeN; h++) {
        var huge = makeEnt(opts, spec, 'spiderHuge', { role: 'brood' }, null);
        var hs = spot(made);
        huge.x = hs.x;
        huge.y = hs.y;
        huge.aggro = 99;
        huge.fromBrood = 1;
        G.ents.push(huge);
        made++;
      }
      var g;
      for (g = 0; g < giantN; g++) {
        var giant = makeEnt(opts, spec, 'spiderGiant', { role: 'brood' }, null);
        var gs = spot(made);
        giant.x = gs.x;
        giant.y = gs.y;
        giant.aggro = 99;
        giant.fromBrood = 1;
        G.ents.push(giant);
        made++;
      }
    }
  }

  function grantDust(pix) {
    var gives = (pix && pix.gives) || {};
    var item = {
      id: gives.id,
      n: gives.name,
      name: gives.name,
      k: gives.k,
      count: gives.count || 1,
      d: 'One battle. The step takes the highest haste. The swing comes twice as often.'
    };
    if (eng('giveMagic')) eng('giveMagic')(item, true);
    return item;
  }

  function tickPixie(G, dt) {
    var spec = G.lvl && G.lvl.campaignSpec;
    var pix = spec && spec.data && spec.data.PIXIE;
    if (!pix || pix.fights !== false) return;
    var p = hero(G);
    if (!p) return;
    var rounds = (pix.free && pix.free.rounds) || 1;
    var round = eng('roundSec');
    var need = round ? round(rounds) : rounds;
    var webs = (G.props || []).filter(function (pr) { return pr && pr.k === 'web'; });
    var ents = G.ents || [];
    for (var i = 0; i < ents.length; i++) {
      var e = ents[i];
      if (!e || e.dead || e.vanished || e.campaignKey !== 'pixie') continue;
      var onWeb = false;
      for (var w = 0; w < webs.length; w++) if (near(e, webs[w], 1.25)) onWeb = true;
      if (!onWeb || !near(p, e, 1.25)) { e._free = 0; continue; }
      e._free = (e._free || 0) + (dt || 0);
      if (e._free < need) continue;
      var item = grantDust(pix);
      G._dust = item;
      e.dead = 1;
      e.hidden = 1;
      e.hp = 0;
      e.vanished = 1;
      if (eng('say')) eng('say')('The pixie presses dust into Macar\'s hand and is gone.', '#e0d2ff');
    }
  }

  function enterNext(G) {
    if (!G) return;
    var spec = G.lvl && G.lvl.campaignSpec;
    var cur = (spec && spec.level) || (G.campaignLevel | 0) || 1;
    var nxt = nextLevel(cur);
    if (nxt && LIVE[nxt]) {
      G.campaignLevel = nxt;
      var shell = shellChapter(nxt);
      if (eng('startChapter')) eng('startChapter')(shell);
      return;
    }
    if (eng('endChapter')) eng('endChapter')();
    else G.scene = 'camp';
  }

  function tick(G, dt) {
    var L = G && G.lvl;
    if (!L || !L.flags || !L.flags.campaign || !L.campaignSpec) return;
    dt = dt || 0;
    syncFever(G);
    syncGates(G);
    tickKing(G, dt);
    tickCasters(G, dt);
    tickBarks(G, dt);
    tickTimers(G, dt);
    tickQueen(G);
    tickPixie(G, dt);
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
          enterNext(G);
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

  function preloadCard(spec) {
    var src = (spec && spec.map && spec.map.elevator && spec.map.elevator.transitionCard)
      || (spec && spec.table && spec.table.elevator && spec.table.elevator.transitionCard)
      || '';
    var key = cardKey(src);
    var load = eng('loadSpriteKeyNow');
    if (key && load) load(key);
  }

  function showCard(G) {
    var spec = G.lvl && G.lvl.campaignSpec;
    if (!spec) return;
    preloadCard(spec);
    var src = (spec.map && spec.map.elevator && spec.map.elevator.transitionCard)
      || (spec.table && spec.table.elevator && spec.table.elevator.transitionCard)
      || '';
    G.campaignCard = { src: src, key: cardKey(src), title: spec.name, line: 'The elevator descends.' };
    G.scene = 'campaign-card';
  }

  function finishCard(G) {
    if (!G) return;
    G.campaignCard = null;
    enterNext(G);
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
    shellChapter: shellChapter,
    shouldInstall: shouldInstall,
    blocksWarren: blocksWarren,
    noteCleared: noteCleared,
    campGoDeeper: campGoDeeper,
    poisonHit: poisonHit,
    applyPoison: applyPoison,
    dustMoveMul: dustMoveMul,
    dustCdMul: dustCdMul,
    armDust: armDust,
    clearDust: clearDust,
    noteFight: noteFight,
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
    spawnWander: spawnWander,
    rollHpExpr: rollHpExpr,
    onFoeHit: onFoeHit,
    onHurt: onHurt,
    onDown: onDown,
    cureDisease: cureDisease,
    noteCampRest: noteCampRest,
    healKindBlocked: healKindBlocked,
    applyHealKind: applyHealKind,
    attackMod: attackMod,
    darkPenalty: darkPenalty,
    kingStep: kingStep,
    kingTarget: kingTarget,
    cornerKing: cornerKing,
    pryTooth: pryTooth,
    barkRect: barkRect,
    goblinLines: goblinLines,
    tickBarks: tickBarks
  };

  root.CampaignRuntime = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
