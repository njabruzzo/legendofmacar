/**
 * Loads a campaign level from the data modules into the dungeon engine.
 * Data files stay wired:false. Only levels in LIVE are installed onto a chapter.
 * L1 is the exception: no boss, six Thin Ones, the lever opens the way down.
 */
(function (root) {
  'use strict';

  var LIVE = { 2: true, 3: true, 4: true };
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

  /* A save is a campaign book once it has entered a live level, or once
     that fact was written down. Replaying Chapter I sets the level to 1,
     which is not itself live, so the flag has to survive that pick. */
  function hasCampaignBook(G) {
    if (!G) return false;
    if (G.campaignBook) return true;
    return !!LIVE[G.campaignLevel | 0];
  }

  function keepsBook(G) {
    return hasCampaignBook(G);
  }

  /* The chapter picked is the campaign level when the save has a book:
     Chapter I is Level 1, Chapter II is Level 2, Chapter IV is Level 4.
     A live level whose shell is already this chapter was chosen before
     start (Level 3 rides Chapter II) and stays. A save that never entered
     the campaign stays off it. The book flag is set before the level
     changes, so Chapter I does not forget the book. */
  function noteChapter(G, chapter) {
    if (!G) return 0;
    chapter = chapter | 0;
    var stored = G.campaignLevel | 0;
    var book = hasCampaignBook(G);
    if (book) G.campaignBook = 1;
    if (stored && shellChapter(stored) === chapter) return stored;
    if (!book && stored) return stored;
    G.campaignLevel = chapter;
    return G.campaignLevel;
  }

  function clearedName(G) {
    if (!G) return '';
    var level = G.campaignLevel | 0;
    if (!LIVE[level]) return '';
    var spec = load(level);
    return (spec && spec.name) || '';
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

  /* Attack HD is the printed hit-as figure, else the integer in front of the HD. */
  function attackHd(sheet) {
    if (!sheet) return null;
    if (typeof sheet.hitAsHd === 'number') return sheet.hitAsHd;
    if (typeof sheet.hd === 'number') return sheet.hd;
    if (String(sheet.hd) === '1/2') return 0.5;
    var m = String(sheet.hd || '').match(/^(\d+)\s*[+-]\s*\d+$/);
    if (m) return +m[1];
    return null;
  }

  /* Fixed hp and an existing hpRoll stay. '3+3' with no hp is 3d8+3. */
  function hpDiceExpr(sheet) {
    if (!sheet || typeof sheet.hp === 'number' || sheet.hpRoll) return null;
    var hd = sheet.hd;
    if (typeof hd === 'number' && isFinite(hd) && hd > 0) return hd + 'd8';
    var plus = String(hd || '').match(/^(\d+)\s*\+\s*(\d+)$/);
    if (plus) return plus[1] + 'd8+' + plus[2];
    var minus = String(hd || '').match(/^(\d+)\s*-\s*(\d+)$/);
    if (minus) return minus[1] + 'd8-' + minus[2];
    return null;
  }

  function stampDiceHp(e, sheet, scale, rng) {
    var expr = hpDiceExpr(sheet);
    if (!e || !expr) return e;
    var hp1e = rollHpExpr(expr, rng, 1);
    e.hp1e = hp1e;
    e.hp = Math.max(1, Math.round(hp1e * (scale || 4)));
    e.maxhp = e.hp;
    return e;
  }

  var ORC_KEYS = { orc: 1, orcLeader: 1, orcGuard: 1, orcShaman: 1, orcChief: 1 };

  /* A sheet with a file uses that key. A sheet with no file is a drawn stand-in. */
  function bindArt(e, mon) {
    var art = mon && mon.art;
    if (!e || !art) return e;
    if (art.file) {
      e.sprite = art.key || e.sprite || '';
      e.artStandIn = 0;
    } else {
      e.sprite = '';
      e.artStandIn = 1;
      if (!(e.scale > 0) || !isFinite(e.scale)) e.scale = 1;
    }
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

  /* Printed spell range includes the far tile. near() stays strict for touch. */
  function inRange(a, b, d) {
    return tileDist(a, b) <= (d || 0) + 1e-6;
  }

  function pickFactory(foe, key) {
    foe = foe || {};
    if (key === 'goblinShaman' || key === 'goblinLeader' || key === 'shaman' || key === 'leader') return foe.goblin || null;
    if (key === 'rubyGuardian') return foe.thinone || foe.statue || null;
    if (key === 'orc' || key === 'orcLeader' || key === 'orcGuard' || key === 'orcShaman' || key === 'orcChief') return foe.orc || null;
    if (key === 'warg' || key === 'wolf') return foe.warg || foe.wolf || null;
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
    if (!(e.scale > 0) || !isFinite(e.scale)) e.scale = 1;
    /* No pixie sheet. The grey stand-in is about 0.4 of Macar. */
    if (key === 'pixie') e.scale = 0.4;
    /* Chief, guards, shaman, and leaders share the orc sheet. Never a grey key. */
    if (ORC_KEYS[key]) {
      if (!(e.scale > 0) || !isFinite(e.scale)) e.scale = 1;
      e.sprite = (mon && mon.art && mon.art.key) || 'orc';
      e.artStandIn = 0;
    }
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
      if (sheet.attacks && sheet.attacks[0]) {
        e.attackForm = sheet.attacks[0].form || '';
        e.printedAttacks = sheet.attacks[0].n || 1;
        if (sheet.attacks[0].everySec) e.cd = sheet.attacks[0].everySec;
      }
      stampHp(e, sheet, scale, function () { return unitRng(opts); });
      stampDiceHp(e, sheet, scale, function () { return unitRng(opts); });
      var hd = attackHd(sheet);
      if (hd != null) e.hd = hd;
      if (typeof sheet.toHit === 'number') {
        e.toHit = sheet.toHit;
        e.sa = '';
        e.strMul = 0;
      }
      bindArt(e, mon || sheet);
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
    if (member && member.wave === 'back') {
      e.hallWave = 'back';
      e.hallReserve = 1;
    }
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
    /* A plain orc is 5 hp. The printed 15 XP is that figure. */
    if (key === 'orc' && !(sheet && typeof sheet.hp === 'number')) {
      e.hp1e = 5;
      e.hp = Math.max(1, Math.round(5 * scale));
      e.maxhp = e.hp;
    }
    /* No ogre sheet. Empty sprite, finite scale, drawn as a stand-in. */
    if (key === 'ogress') {
      e.scale = 1;
      e.sprite = '';
      e.artStandIn = 1;
      e.sp = e.sp || 2.7;
      e.team = 'neutral';
      e.npc = 1;
      e.aggro = 0;
      e.attacks = [];
      e.campaignXp = null;
      e.targetable = false;
    }
    if (ORC_KEYS[key]) {
      e.sprite = (mon && mon.art && mon.art.key) || 'orc';
      e.artStandIn = 0;
      if (!(e.scale > 0) || !isFinite(e.scale)) e.scale = 1;
    }
    e.boss = 0;
    e.chapterBoss = 0;
    return e;
  }

  /* Hall disk matches carveMap: a rect with no rw/rh is 11 by 7.2.
     The leash is the shorter radius, so the pack notices the hall and
     turns around before the ruby door. */
  function roomLeash(spec, roomId) {
    var rooms = (spec && spec.map && spec.map.layout && spec.map.layout.rooms) || [];
    var room = null;
    var i;
    for (i = 0; i < rooms.length; i++) if (rooms[i] && rooms[i].id === roomId) room = rooms[i];
    if (!room) return 7.2;
    var rw = room.rw || (room.kind === 'rect' ? 11 : 4);
    var rh = room.rh || (room.kind === 'rect' ? 7.2 : 3);
    return Math.min(rw, rh);
  }

  function stampHallLeash(e, spec, group) {
    if (!e || !spec || (spec.level | 0) !== 4 || !group) return;
    var room = group.room || group.id || '';
    if (room !== 'hall-of-names') return;
    if (e.campaignKey !== 'orcChief' && !(e.campaignKey === 'orcGuard' && e.campaignRole === 'guard')) return;
    var reach = roomLeash(spec, room);
    e.homeX = e.x;
    e.homeY = e.y;
    e.leash = reach;
    if (e.hallReserve) {
      e.aggro = 0;
      e.engaged = 0;
    } else e.aggro = reach;
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
    if (mon && mon.attacks && mon.attacks[0]) {
      e.dice = mon.attacks[0].damage;
      e.attackForm = mon.attacks[0].form || 'slam';
      e.printedAttacks = mon.attacks[0].n || 1;
      e.cd = mon.attacks[0].everySec || 1.5;
    }
    e.noSpecialty = 1;
    e.specialty = 0;
    var ghd = attackHd(mon);
    if (ghd != null) e.hd = ghd;
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
    if (map && map.id === 'L4' && rooms.length && eng('carvePath')) {
      var pts = [];
      for (var r = 0; r < rooms.length; r++) pts.push([rooms[r].x, rooms[r].y]);
      var exitTile = map.ogreCave && map.ogreCave.exitTile;
      if (exitTile) pts.push([exitTile.x, exitTile.y]);
      eng('carvePath')(g, pts, 2.4, 0);
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
    placeOgreCave(G, spec);
    if ((spec.level | 0) >= 4) {
      placeCaches(G, spec);
      placeLairChest(G, spec);
    }
  }

  function placeOgreCave(G, spec) {
    var cave = spec.map && spec.map.ogreCave;
    if (!cave) return;
    var seconds = (spec.data && spec.data.CAVE && spec.data.CAVE.boulders && spec.data.CAVE.boulders.secondsEach) || 10;
    G.props = (G.props || []).filter(function (p) {
      return !(p && (p.campaign === 'ogre-seal' || p.campaign === 'golden-egg'));
    });
    var rocks = cave.boulders || [];
    var props = G.props || (G.props = []);
    var i;
    for (i = 0; i < rocks.length; i++) {
      props.push({
        x: rocks[i].x, y: rocks[i].y, k: 'boulder', spr: 'boulder', s: 0.9,
        campaign: 'ogre-seal', seal: 1, seconds: seconds
      });
    }
    var eggs = cave.eggs || [];
    for (i = 0; i < eggs.length; i++) {
      props.push({
        x: eggs[i].x, y: eggs[i].y, k: 'eggs', s: 0.7,
        campaign: 'golden-egg', itemId: 'golden_egg'
      });
    }
  }

  function dropCaches(G) {
    G.loot = (G.loot || []).filter(function (z) {
      return !(z && String(z.label || '').indexOf('Dungeon cache') === 0);
    });
  }

  function placeCaches(G, spec) {
    var caches = spec.map && spec.map.loot && spec.map.loot.caches;
    if (!caches || !caches.places || !caches.places.length) return;
    dropCaches(G);
    var level = caches.level || spec.level || 4;
    var place = eng('placeDungeonCache');
    G.loot = G.loot || [];
    for (var i = 0; i < caches.places.length; i++) {
      var xy = caches.places[i];
      var before = G.loot.length;
      if (place) place(xy[0], xy[1], level);
      if (G.loot.length === before) {
        G.loot.push({
          x: xy[0], y: xy[1], gone: 0, kind: 'pile',
          label: 'Dungeon cache (level ' + level + ')'
        });
      }
    }
  }

  function placeLairChest(G, spec) {
    var chest = spec.map && spec.map.loot && spec.map.loot.chiefChest;
    if (!chest || chest.x == null || chest.y == null) return;
    placeProp(G, { x: chest.x, y: chest.y, k: 'chest', s: 1, campaign: 'lair-chest' });
  }

  function seatParty(G, spec) {
    var at = spec.map && (spec.map.spawn || spec.map.arrival);
    if (!at || at.x == null) return;
    var ents = G.ents || [];
    for (var i = 0; i < ents.length; i++) {
      var e = ents[i];
      if (!e || e.team !== 'party' || e.dead) continue;
      e.x = at.x + (e.hero ? 0 : 0.7);
      e.y = at.y;
      e.dest = null;
      e.moving = 0;
    }
    if (G.cam) { G.cam.x = at.x; G.cam.y = at.y; }
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
        campaign: 1, emptySocket: flags[toothTakenFlag(tooth.id)] ? 1 : 0
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
          stampHallLeash(e, spec, group);
          G.ents.push(e);
        }
      }
    }
    var node = map.guardian;
    if (node && node.placement === 'fixed') {
      var make = pickFactory(opts.foe, node.key || 'rubyGuardian');
      var g = make ? make() : { team: 'foe', hp: 8, maxhp: 8, scale: 1 };
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

  function campaignReplacesShell(spec, L) {
    if (!spec || !L) return false;
    if ((spec.level | 0) !== (L.n | 0)) return true;
    return (spec.level | 0) >= 4;
  }

  function stripShellHazards(G, spec) {
    if (!campaignReplacesShell(spec, G && G.lvl)) return;
    G.props = (G.props || []).filter(function (p) { return p && p.k !== 'trap'; });
    if (G.lvl) G.lvl.objs = [];
  }

  function bindTick(G) {
    var L = G.lvl;
    if (!L || (L.tick && L.tick._campaign)) return;
    var inner = L.tick;
    var wrapped = function (dt) {
      var spec = L.campaignSpec;
      if (inner && !campaignReplacesShell(spec, L)) inner.call(this, dt);
      api.tick(G, dt);
    };
    wrapped._campaign = 1;
    L.tick = wrapped;
  }

  function partyOnly(G) {
    G.ents = (G.ents || []).filter(function (e) { return e && e.team === 'party'; });
  }

  function requestCampaignSprites() {
    var load = eng('loadSpriteKeyNow');
    if (!load) return;
    ['orc', 'warg', 'construct'].forEach(function (key) { load(key); });
  }

  function snapshotFloor(G) {
    var ents = [];
    (G.ents || []).forEach(function (e) {
      if (!e || e.team === 'party') return;
      ents.push({
        campaignKey: e.campaignKey,
        hp: e.hp,
        maxhp: e.maxhp,
        dead: e.dead ? 1 : 0,
        x: e.x,
        y: e.y,
        vanished: e.vanished ? 1 : 0,
        hidden: e.hidden ? 1 : 0,
        hallReserve: e.hallReserve ? 1 : 0,
        hallWave: e.hallWave || '',
        hallJoin: e.hallJoin ? 1 : 0,
        engaged: e.engaged ? 1 : 0,
        aggro: e.aggro
      });
    });
    function marks(list, pred) {
      var out = [];
      (list || []).forEach(function (p) {
        if (pred(p)) out.push({ x: p.x, y: p.y, gone: p.gone ? 1 : 0 });
      });
      return out;
    }
    return {
      ents: ents,
      seals: marks(G.props, function (p) { return p && p.campaign === 'ogre-seal'; }),
      eggs: marks(G.props, function (p) { return p && p.campaign === 'golden-egg'; }),
      caches: marks(G.loot, function (z) { return z && String(z.label || '').indexOf('Dungeon cache') === 0; })
    };
  }

  function restoreMarks(list, saved, pred) {
    (list || []).forEach(function (p) {
      if (!pred(p)) return;
      for (var i = 0; i < saved.length; i++) {
        if (saved[i]._used || !near(p, saved[i], 0.75)) continue;
        saved[i]._used = 1;
        if (saved[i].gone) p.gone = 1;
        break;
      }
    });
  }

  function restoreFloor(G, spec, snap) {
    if (!snap) return;
    var flags = (G.lvl && G.lvl.flags) || {};
    var pool = snap.ents || [];
    (G.ents || []).forEach(function (e) {
      if (!e || e.team === 'party' || !e.campaignKey) return;
      var best = null;
      var bi = -1;
      var bd = 1e9;
      for (var i = 0; i < pool.length; i++) {
        var s = pool[i];
        if (!s || s._used || s.campaignKey !== e.campaignKey) continue;
        var d = Math.hypot((s.x || 0) - (e.x || 0), (s.y || 0) - (e.y || 0));
        if (d < bd) { bd = d; best = s; bi = i; }
      }
      if (!best) return;
      pool[bi]._used = 1;
      var same = best.maxhp === e.maxhp;
      if (same) {
        e.hp = best.hp;
        e.maxhp = best.maxhp;
        e.dead = best.dead ? 1 : 0;
        if (best.x != null) { e.x = best.x; e.y = best.y; }
        if (best.vanished) { e.vanished = 1; e.hidden = best.hidden ? 1 : e.hidden; }
      } else if (best.dead || best.vanished) {
        e.dead = 1;
        e.hp = 0;
        if (best.vanished) { e.vanished = 1; e.hidden = 1; }
      }
      if (e.hallWave === 'back' || best.hallWave === 'back') {
        e.hallWave = 'back';
        e.hallReserve = best.hallReserve ? 1 : 0;
        e.hallJoin = best.hallJoin ? 1 : 0;
        if (e.hallReserve) {
          e.aggro = 0;
          e.engaged = 0;
          e.hallJoin = 0;
        } else {
          e.aggro = typeof best.aggro === 'number' ? best.aggro : e.leash;
          e.engaged = best.engaged ? 1 : 0;
        }
      }
    });
    restoreMarks(G.props, snap.seals || [], function (p) { return p && p.campaign === 'ogre-seal'; });
    restoreMarks(G.props, snap.eggs || [], function (p) { return p && p.campaign === 'golden-egg'; });
    restoreMarks(G.loot, snap.caches || [], function (z) {
      return z && String(z.label || '').indexOf('Dungeon cache') === 0;
    });
    var ogress = null;
    (G.ents || []).forEach(function (e) {
      if (e && e.campaignKey === 'ogress') ogress = e;
    });
    if (ogress && flags.ogressXp) {
      ogress.vanished = 1;
      ogress.hidden = 1;
      ogress.dead = 1;
      ogress.hp = 0;
      ogress.campaignXp = null;
      ogress.fleeTo = null;
    } else if (ogress && flags.ogressFled && !flags.ogressXp) {
      releaseOgress(G, spec);
    }
  }

  function rebuildCampaignFloor(G, opts, spec, keepState) {
    var snap = keepState ? snapshotFloor(G) : null;
    partyOnly(G);
    G.props = [];
    dropCaches(G);
    carveMap(G.lvl, spec.map || {});
    placeLevel(G, spec);
    stripShellHazards(G, spec);
    spawnPinned(G, opts, spec);
    if (keepState) restoreFloor(G, spec, snap);
    else seatParty(G, spec);
    requestCampaignSprites();
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
    if (root.BattleBuffs && G._battleBuffs) root.BattleBuffs.onFloorChange(G._battleBuffs, spec.level);
    syncEgg(G);
    var L = G.lvl;
    L.campaignSpec = spec;
    L.flags = L.flags || {};
    L.flags.campaign = 1;
    L.flags.placed = 1;
    L.flags.spiderLoot = 1;
    L.flags.campaignInstalled = 1;
    L._campaignHost = { rollExpr: opts.rollExpr || null, scale: opts.scale || 4, rng: opts.rng || null, d100: opts.d100 || null, save: opts.save || null, d20: opts.d20 || null };
    if (opts.foe) G._campaignFoe = opts.foe;
    if (spec.name) L.title = spec.name;
    var campaignFloor = (spec.level | 0) >= 4;
    if (opts.fresh !== false) {
      L.flags.rubyWoke = 0;
      L.flags.leverPulled = 0;
      L.flags.stairsOpen = 0;
      L.flags.guardianDead = 0;
      L.flags.bossDead = 0;
      if (campaignFloor) rebuildCampaignFloor(G, opts, spec, false);
      else {
        G.ents = (G.ents || []).filter(function (e) { return e && e.team !== 'foe'; });
        stripMoved(G, spec);
        carveMap(L, spec.map || {});
        placeLevel(G, spec);
        stripShellHazards(G, spec);
        spawnPinned(G, opts, spec);
        seatParty(G, spec);
      }
    } else if (campaignFloor) {
      rebuildCampaignFloor(G, opts, spec, true);
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
    if (shaman.houseList && shaman.houseList.length) return spellsFromHouse(shaman);
    return shaman.memorized || [];
  }

  /* Sage §7.15. The shaman is 7th level. 1 inch is 2 tiles. */
  function copiesOf(shaman, name) {
    var n = 0;
    var house = (shaman && shaman.houseList) || [];
    var i;
    for (i = 0; i < house.length; i++) if (house[i] === name) n++;
    return n || 1;
  }

  function spentCount(e, name) {
    var parts = String((e && e.spellsSpent) || '').split(',');
    var n = 0;
    var i;
    for (i = 0; i < parts.length; i++) if (parts[i] === name) n++;
    return n;
  }

  /* House rows with no printed duration or damage stay on the list and do not fire. */
  function spellsFromHouse(shaman) {
    var seg = shaman.segments || {};
    var bless = shaman.bless || {};
    var silence = shaman.silence || {};
    var hold = shaman.holdPerson || {};
    var fear = shaman.causeFear || {};
    var dark = shaman.darkness || {};
    var clw = shaman.causeLightWounds || {};
    var blessRange = inchesToTiles(bless.range);
    var rows = [
      {
        name: 'Bless',
        bless: 1,
        copies: copiesOf(shaman, 'Bless'),
        rangeTiles: blessRange,
        rounds: bless.rounds,
        bonus: bless.bonus,
        windupSec: seg.Bless || 0
      },
      {
        name: 'Cause Fear',
        touchHit: 1,
        fleeSec: fear.fleeSec || 7,
        copies: copiesOf(shaman, 'Cause Fear'),
        windupSec: seg['Cause Fear'] || 0
      },
      {
        name: 'Darkness',
        area: 1,
        darkness: 1,
        radiusTiles: dark.radiusTiles || 4,
        durationSec: dark.durationSec || 130,
        infravision: false,
        copies: copiesOf(shaman, 'Darkness'),
        windupSec: seg.Darkness || 0
      },
      {
        name: 'Cause Light Wounds',
        touchHit: 1,
        damage: clw.damage || '1d8',
        scaleLikeWeapon: 1,
        copies: copiesOf(shaman, 'Cause Light Wounds'),
        windupSec: seg['Cause Light Wounds'] || 0
      },
      {
        name: 'Hold Person',
        holdPerson: 1,
        copies: copiesOf(shaman, 'Hold Person'),
        rangeTiles: hold.rangeTiles || 12,
        capSec: hold.capSec || 3,
        windupSec: seg['Hold Person'] || 0
      },
      {
        name: "Silence 15' r.",
        silence: 1,
        copies: copiesOf(shaman, "Silence 15' r."),
        rangeTiles: (typeof silence.rangeTiles === 'number') ? silence.rangeTiles : 24,
        radiusTiles: rangeTiles(silence.radius || "15'"),
        durationSec: silence.durationSec || 14,
        kinTiles: silence.centerOnMacarIfKinWithin || 3,
        windupSec: seg["Silence 15' r."] || 0
      }
    ];
    var house = shaman.houseList || [];
    for (var i = 0; i < house.length; i++) {
      var name = house[i];
      var known = false;
      for (var r = 0; r < rows.length; r++) if (rows[r].name === name) known = true;
      if (known) continue;
      rows.push({ name: name, unprinted: 1, windupSec: seg[name] || 0 });
    }
    return rows;
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
      G.darkZones.push({
        x: p.x,
        y: p.y,
        r: spell.radiusTiles || 2,
        t: spell.durationSec,
        magical: 1,
        infravision: spell.infravision === false ? false : true
      });
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
    } else if (spell.bless) {
      var center = livingCaster(G, 'orcShaman') || e;
      blessOrcs(G, center, spell.rounds, spell.rangeTiles);
    } else if (spell.holdPerson) {
      if (e.holdFight) return;
      var free = eng('wearingFreeAction');
      var reach = spell.rangeTiles || 12;
      var cap = spell.capSec || 3;
      var heldCrowd = G.ents || [];
      for (var hi = 0; hi < heldCrowd.length; hi++) {
        var who = heldCrowd[hi];
        if (!who || who.dead || who.team !== 'party') continue;
        if (tileDist(e, who) > reach + 1e-6) continue;
        if (free && free(who)) continue;
        if (!saveVs(G, who, 'spell')) applyHold(who, cap);
      }
      e.holdFight = 1;
      if (eng('say')) eng('say')('Hold Person.', '#d6e2a8');
    } else if (spell.silence) {
      var castRange = (typeof spell.rangeTiles === 'number') ? spell.rangeTiles : 24;
      var radius = (typeof spell.radiusTiles === 'number') ? spell.radiusTiles : rangeTiles("15'");
      var kinTiles = spell.kinTiles || 3;
      var mac = hero(G);
      var center = null;
      if (mac && !mac.dead && nearestKin(G, mac, kinTiles) && tileDist(e, mac) <= castRange + 1e-6) center = mac;
      if (!center) center = (p && !p.dead && !p.hero && p.team === 'party' && tileDist(e, p) <= castRange + 1e-6) ? p : nearestKin(G, e, castRange);
      if (!center) return;
      var saved = saveVs(G, center, 'spell');
      var zone = { x: center.x, y: center.y, r: radius, t: spell.durationSec || 14 };
      if (!saved) zone.follow = center;
      G.silenceZones = G.silenceZones || [];
      G.silenceZones.push(zone);
      if (!saved) {
        var crowd = G.ents || [];
        for (var si = 0; si < crowd.length; si++) {
          var caught = crowd[si];
          if (!caught || caught.dead) continue;
          if (tileDist(center, caught) > radius + 1e-6) continue;
          applySilence(caught, spell.durationSec || 14);
        }
      }
      if (eng('say')) eng('say')('Silence.', '#d6e2a8');
    } else if (spell.unprinted) {
      return;
    }
    markSpent(e, spell.name);
    if (shaman && shaman.spellEverySec) e.spellCd = shaman.spellEverySec;
  }

  function applyHold(p, sec) {
    var dur = (typeof sec === 'number') ? sec : 3;
    p.held = Math.max(p.held || 0, dur);
    p.holdSrc = 'campaign';
    p.moving = 0;
    p.dest = null;
    p.ix = 0;
    p.iy = 0;
    p.atk = 0;
    p.swung = 0;
    p.aim = null;
  }

  function applySilence(p, sec) {
    var dur = (typeof sec === 'number') ? sec : 14;
    p.silenced = Math.max(p.silenced || 0, dur);
    p.silenceSrc = 'campaign';
  }

  function resaveHold(G, e) {
    if (!e || !((e.held || 0) > 0) || e.holdSrc !== 'campaign') return false;
    if (saveVs(G, e, 'spell')) {
      e.held = 0;
      e.holdSrc = 0;
      e.prone = 0;
      return true;
    }
    return false;
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
        var aim = e._wind.aim || p;
        e._wind = null;
        resolveSpell(G, e, aim, spell, spec);
        continue;
      }
      if (e.spellCd > 0) { e.spellCd -= dt; continue; }
      var list = spellList(shaman, e);
      var touch = (e.range || 0.8) + 0.4;
      var next = null;
      var aim = p;
      for (var s = 0; s < list.length; s++) {
        var row = list[s];
        if (row.unprinted || spentCount(e, row.name) >= (row.copies || 1)) continue;
        if (row.holdPerson && e.holdFight) continue;
        if (row.stunSec && tiles != null && inRange(e, p, tiles) && !(p.stun > 0) && !(p.commandHeld > 0)) { next = row; break; }
        if (row.area && inRange(e, p, closeTiles)) { next = row; break; }
        if (row.touchHit && near(e, p, touch)) { next = row; break; }
        if (row.bless && inRange(e, p, row.rangeTiles || 0)) { next = row; break; }
        if (row.holdPerson && inRange(e, p, row.rangeTiles || 0)) { next = row; break; }
        if (row.silence) {
          var kinNearMac = nearestKin(G, p, row.kinTiles || 3);
          if (kinNearMac && inRange(e, p, row.rangeTiles || 0)) { next = row; aim = p; break; }
          var kin = nearestKin(G, e, row.rangeTiles || 0);
          if (kin) { next = row; aim = kin; break; }
        }
      }
      if (next) e._wind = { spell: next, left: next.windupSec || 0, aim: aim };
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

  function inMagicalDark(who, zones) {
    zones = zones || [];
    for (var i = 0; i < zones.length; i++) {
      var z = zones[i];
      if (!who || !z || !z.magical || (z.t || 0) <= 0) continue;
      if (Math.hypot((who.x || 0) - z.x, (who.y || 0) - z.y) <= (z.r || 1)) return true;
    }
    return false;
  }

  function darkPenalty(e, zones, dwarf, def) {
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
    /* Magical darkness: infravision does not see through it.
       An attack into or out of the zone is at -4. */
    if (magical || inMagicalDark(def, zones)) return -4;
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

  function grantPelt(G) {
    var it = { id: 'worg_pelt', n: 'Worg pelt', k: 'pelt' };
    if (eng('stowPackItem')) eng('stowPackItem')(it);
    else {
      G.packs = G.packs || {};
      G.packs.macar = G.packs.macar || { magic: [] };
      G.packs.macar.magic = G.packs.macar.magic || [];
      G.packs.macar.magic.push(it);
    }
    return it;
  }

  function onDown(G, e) {
    if (!e) return;
    if (e.campaignKey === 'warg' || e.campaignKey === 'wolf') grantPelt(G);
    if (e.campaignRole !== 'boss') return;
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

  function livingCaster(G, key) {
    var ents = (G && G.ents) || [];
    for (var i = 0; i < ents.length; i++) {
      var e = ents[i];
      if (e && !e.dead && e.campaignKey === key) return e;
    }
    return null;
  }

  function nearestKin(G, from, tiles) {
    var ents = (G && G.ents) || [];
    var best = null;
    var bd = tiles == null ? 99 : tiles;
    for (var i = 0; i < ents.length; i++) {
      var e = ents[i];
      if (!e || e.hero || e.dead || e.team !== 'party') continue;
      var d = tileDist(from, e);
      if (d <= bd + 1e-6) { bd = d; best = e; }
    }
    return best;
  }

  function blessOrcs(G, center, rounds, tiles) {
    if (tiles == null) tiles = inchesToTiles('5"');
    if (typeof rounds !== 'number') rounds = 6;
    var dur = eng('roundSec') ? eng('roundSec')(rounds) : rounds;
    (G.ents || []).forEach(function (e) {
      if (!e || e.dead || !ORC_KEYS[e.campaignKey]) return;
      if (tileDist(e, center) > tiles + 1e-6) return;
      e.blessHit = 1;
      e.blessT = Math.max(e.blessT || 0, dur);
    });
  }

  function kingRecord(data) {
    if (!data) return null;
    return data.CHIEF || data.KING || null;
  }

  function kingStep(G, king) {
    if (!G || !king || king.dead) return;
    var data = G.lvl && G.lvl.campaignSpec && G.lvl.campaignSpec.data;
    var K = kingRecord(data);
    if (!K) return;
    var morale = K.morale || {};
    var max = king.maxhp || king.hp || 1;
    var frac = morale.belowHpFraction == null ? 0.3 : morale.belowHpFraction;
    if (typeof K.moraleBelowHpFraction === 'number') frac = K.moraleBelowHpFraction;
    if (!king.cornered && !king.moraleChecked && king.hp < max * frac) {
      king.moraleChecked = 1;
      var roll = roll100(G);
      var hold = morale.holdOnOrUnder == null ? 55 : morale.holdOnOrUnder;
      if (roll <= hold) king.moraleHold = 1;
      else {
        king.moraleHold = 0;
        if (K.fallback === 'ogre-cave') {
          var cave = (G.lvl.campaignSpec.map && G.lvl.campaignSpec.map.ogreCave) || {};
          var dest = { x: cave.x != null ? cave.x : 32, y: cave.y != null ? cave.y : 50 };
          king.fleeTo = { x: dest.x, y: dest.y };
          (G.ents || []).forEach(function (e) {
            if (e && e.campaignKey === 'orcGuard' && !e.dead) e.fleeTo = { x: dest.x, y: dest.y };
          });
        } else {
          var n = rollHpExpr(K.call || '1d4', hostRng(G), 1);
          callGoblins(G, king, n);
          startKingFlee(G, king);
        }
      }
    }
    if (king.fleeTo) return;
    var p = hero(G);
    if (data.CHIEF && !king.roared && p && data.SHAMAN && data.SHAMAN.bless) {
      var roarTiles = inchesToTiles(data.SHAMAN.bless.range);
      if (tileDist(king, p) <= roarTiles + 1e-6) {
        king.roared = 1;
        var shaman = livingCaster(G, 'orcShaman') || king;
        blessOrcs(G, shaman, data.SHAMAN.bless.rounds, roarTiles);
        if (shaman.caster) {
          markSpent(shaman, 'Bless');
          if (data.SHAMAN.spellEverySec) shaman.spellCd = data.SHAMAN.spellEverySec;
        }
        if (eng('say')) eng('say')('The chief roars.', '#d8c49a');
      }
    }
    var close = (data.SHAMAN && data.SHAMAN.closeTiles) || 6;
    if (p && !data.CHIEF && shamanAlive(G) && tileDist(king, p) <= close) {
      kingBark(G, king, 'taunt');
      var ents = G.ents || [];
      for (var i = 0; i < ents.length; i++) {
        var e = ents[i];
        if (e && e.caster && !e.dead) { e.aggro = 99; e.engaged = 1; }
      }
    }
    var reach = (king.range || 0.8) + 0.4;
    var chiefWeapon = king.campaignKey === 'orcChief' && king.campaignRole === 'boss'
      && /axe|mace|sword|hammer|spear|dagger|flail/i.test(String(king.attackForm || ''));
    if (!chiefWeapon) king.specialty = 0;
    else if (p && tileDist(king, p) <= reach && !((p.held || 0) > 0)) king.specialty = 1;
    else if (p && (p.held || 0) > 0) king.specialty = 0;
  }

  function tickKing(G, dt) {
    var data = G.lvl && G.lvl.campaignSpec && G.lvl.campaignSpec.data;
    var K = kingRecord(data);
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

  function toothTakenFlag(id) {
    if (id === 'grond_tooth_electrum_4') return 'electrumTooth4';
    if (id === 'grond_tooth_electrum_3') return 'electrumTooth3';
    return 'electrumTooth2';
  }

  function pryTooth(G, face) {
    if (!G || !face || face.gone || face.emptySocket) return { ok: 0, reason: 'gone' };
    var flags = (G.lvl && G.lvl.flags) || {};
    if (G.lvl) G.lvl.flags = flags;
    var spec = G.lvl && G.lvl.campaignSpec;
    var data = spec && spec.data;
    var mapTooth = (spec && spec.map && spec.map.tooth) || {};
    var tooth = (data && data.TOOTH) || {};
    var id = face.itemId || mapTooth.id || tooth.id || 'grond_tooth_electrum_2';
    var flag = toothTakenFlag(id);
    if (flags[flag]) return { ok: 0, reason: 'taken' };
    var name = mapTooth.name || tooth.name || (id === 'grond_tooth_electrum_3' ? 'Electrum Tooth 3' : 'Electrum Tooth 2');
    if (id === 'grond_tooth_electrum_4') name = 'Electrum Tooth 4';
    else if (id === 'grond_tooth_electrum_3') name = 'Electrum Tooth 3';
    else if (name === "Grond's Electrum Tooth") name = 'Electrum Tooth 2';
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
       can still be set aside. The map may say cursed. Teeth 2 and 3 carry
       curse coin and bind false, and the pack item does not take cursed. */
    it.curse = mapTooth.curse || tooth.curse || 'coin';
    it.bind = false;
    if (eng('stowPackItem')) eng('stowPackItem')(it);
    flags[flag] = 1;
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

  function buffState(G) {
    var B = root.BattleBuffs;
    if (!B || !G) return null;
    if (!G._battleBuffs) G._battleBuffs = B.create(G.t || 0);
    return G._battleBuffs;
  }

  function syncEgg(G) {
    var B = root.BattleBuffs;
    var p = hero(G);
    if (!p) return;
    var st = G && G._battleBuffs;
    p.eggAc = (B && st) ? B.acDelta(st) : 0;
  }

  function isEggItem(it) {
    return !!(it && (it.k === 'egg' || it.id === 'golden_egg'));
  }

  function stackMagic(pack, it) {
    if (!pack || !isEggItem(it)) return null;
    var have = null;
    for (var i = 0; i < pack.length; i++) {
      if (isEggItem(pack[i])) { have = pack[i]; break; }
    }
    if (!have) {
      it.k = it.k || 'egg';
      it.id = it.id || 'golden_egg';
      it.qty = it.qty || 1;
      pack.push(it);
      return it;
    }
    have.k = have.k || 'egg';
    have.id = have.id || it.id || 'golden_egg';
    have.qty = (have.qty || 1) + (it.qty || 1);
    return have;
  }

  /* Noz trades on Level 2. The printed price lives on Level 4. */
  function eggSpec() {
    var data = levelData(4);
    return (data && data.EGGS) || null;
  }

  function eggPrice(G) {
    var eggs = eggSpec();
    if (!eggs || typeof eggs.sellGp !== 'number') return 0;
    if (eggs.sellWhere && eggs.sellWhere !== 'Noz') return 0;
    return eggs.sellGp | 0;
  }

  function sellEgg(G) {
    var price = eggPrice(G);
    if (!price) return { ok: false, reason: 'no-price', gp: 0 };
    var magic = G && G.packs && G.packs.macar && G.packs.macar.magic;
    if (!magic) return { ok: false, reason: 'no-pack', gp: 0 };
    var idx = -1;
    for (var i = 0; i < magic.length; i++) if (isEggItem(magic[i])) { idx = i; break; }
    if (idx < 0) return { ok: false, reason: 'no-egg', gp: 0 };
    var it = magic[idx];
    if ((it.qty || 1) > 1) it.qty = (it.qty || 1) - 1;
    else magic.splice(idx, 1);
    if (eng('addCoin')) eng('addCoin')('gp', price);
    else {
      G.coin = G.coin || {};
      G.coin.gp = (G.coin.gp || 0) + price;
    }
    var eggs = eggSpec();
    if (eggs && eggs.treasureXpOnlyIfSold && eng('awardPartyXp')) eng('awardPartyXp')(price, 'Golden Egg');
    return { ok: true, gp: price };
  }

  function armEgg(G, item, pack) {
    var B = root.BattleBuffs;
    if (!B || !item) return { ok: false, reason: 'not-a-buff' };
    var st = buffState(G);
    if (isEggItem(item) && st.battleBuffs.some(function (b) { return b.k === 'egg'; })) {
      return { ok: false, reason: 'egg-blocked', endsPoisonSlow: false };
    }
    var bag = pack || [];
    var qty = item.qty || 1;
    if (isEggItem(item) && qty > 1) {
      item.qty = qty - 1;
      var token = { id: item.id, k: item.k || 'egg', n: item.n, qty: 1 };
      var scratch = [token];
      var stacked = B.use(st, scratch, token, (G && G.t) || 0);
      if (!stacked.ok) item.qty = qty;
      syncEgg(G);
      return stacked;
    }
    var res = B.use(st, bag, item, (G && G.t) || 0);
    syncEgg(G);
    return res;
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
    var B = root.BattleBuffs;
    var st = buffState(G);
    if (B && st) B.beginFight(st, null, (G && G.t) || 0);
    syncEgg(G);
  }

  function noteFightEnd(G) {
    var B = root.BattleBuffs;
    var st = G && G._battleBuffs;
    if (B && st) B.endFightIfClear(st);
    var ents = (G && G.ents) || [];
    for (var i = 0; i < ents.length; i++) if (ents[i]) ents[i].holdFight = 0;
    syncEgg(G);
  }

  function noteDeath(G) {
    var B = root.BattleBuffs;
    var st = G && G._battleBuffs;
    if (B && st) B.onDeath(st);
    syncEgg(G);
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
    var level = actorLevel(target, opts);
    if (typeof level !== 'number') level = 3;
    var con = actorCon(target, opts);
    if (typeof con !== 'number') con = 0;
    return poison.resolve(
      { hp: target.hp, ghost: !!target.ghost },
      {
        mode: 'h1',
        spider: spider,
        level: level,
        con: con,
        roll: roll,
        antitoxin: !!opts.antitoxin
      }
    );
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
      if (e.holdSrc === 'campaign' && (e.held || 0) > 0) {
        e.held -= dt;
        if (e.held <= 1e-6) { e.held = 0; e.holdSrc = 0; e.prone = 0; }
      }
      if (e.silenceSrc === 'campaign' && (e.silenced || 0) > 0) {
        e.silenced -= dt;
        if (e.silenced <= 1e-6) { e.silenced = 0; e.silenceSrc = 0; }
      }
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
    var zones = (G && G.silenceZones) || [];
    for (var z = 0; z < zones.length; z++) {
      var zone = zones[z];
      if (zone && zone.follow && !zone.follow.dead) {
        zone.x = zone.follow.x;
        zone.y = zone.follow.y;
      }
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
      var host = (G.lvl && G.lvl._campaignHost) || {};
      var opts = { foe: G._campaignFoe || {}, scale: host.scale || 4, rng: host.rng || null };
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

  function inchesToTiles(range) {
    var m = String(range || '').match(/(\d+(?:\.\d+)?)\s*"/);
    if (!m) return 0;
    return (+m[1]) * 2;
  }

  /* Feet use the 5-foot inch. 15' is 3" and 6 tiles. */
  function rangeTiles(range) {
    var feet = String(range || '').match(/(\d+(?:\.\d+)?)\s*'/);
    if (feet) return (+feet[1] / 5) * 2;
    return inchesToTiles(range);
  }

  function cdReady(e, key, dt) {
    if ((e[key] || 0) > 0) {
      e[key] -= dt || 0;
      if (e[key] < 0) e[key] = 0;
    }
    return (e[key] || 0) <= 0;
  }

  function launchShot(G, from, target, kind, extra) {
    extra = extra || {};
    var shoot = eng('shoot');
    var shot = shoot ? shoot(from, target.x, target.y, 0, kind, extra.col || '#fff', extra.spd || 7) : null;
    if (!shot) {
      shot = { x: from.x, y: from.y, kind: kind, from: from, team: from.team, life: 2.2 };
      G.shots = G.shots || [];
      G.shots.push(shot);
    }
    if (extra.dice) shot.dice = extra.dice;
    if (extra.stuckSec) shot.stuckSec = extra.stuckSec;
    shot.campaign = 1;
    return shot;
  }

  function tickRanged(G, dt) {
    var spec = G.lvl && G.lvl.campaignSpec;
    var data = spec && spec.data;
    if (!data) return;
    var p = hero(G);
    if (!p || p.dead) return;
    var guard = data.MONSTERS && data.MONSTERS.rubyGuardian;
    var queenSpec = data.QUEEN;
    var ents = G.ents || [];
    for (var i = 0; i < ents.length; i++) {
      var e = ents[i];
      if (!e || e.dead) continue;
      if (e.campaignRole === 'guardian' && guard && guard.shard && !e.sleeping) {
        if (!cdReady(e, 'shardCd', dt)) continue;
        var reach = inchesToTiles(guard.shard.range);
        var min = typeof guard.shard.minTiles === 'number' ? guard.shard.minTiles : 0;
        var d = tileDist(e, p);
        if (d + 1e-6 >= min && d <= reach + 1e-6) {
          launchShot(G, e, p, 'shard', { dice: guard.shard.damage || '1d6', col: '#ff334a', spd: 8 });
          e.shardCd = guard.shard.everySec || 4;
        }
      }
      if (e.campaignRole === 'guardian' && guard && guard.cone && !e.sleeping) {
        if (cdReady(e, 'coneCd', dt)) {
          var coneReach = inchesToTiles(guard.cone.range);
          var coneMin = typeof guard.cone.minTiles === 'number' ? guard.cone.minTiles : 0;
          var coneD = tileDist(e, p);
          if (coneD + 1e-6 >= coneMin && coneD <= coneReach + 1e-6) {
            resolveCone(G, p, guard.cone, e);
            e.coneCd = guard.cone.everySec || 4;
          }
        }
      }
      if (e.campaignKey === 'spiderQueen' && queenSpec && queenSpec.web) {
        if (!cdReady(e, 'webCd', dt)) continue;
        if ((p.webbed || 0) > 0) continue;
        if (tileDist(e, p) <= inchesToTiles(queenSpec.web.range) + 1e-6) {
          launchShot(G, e, p, 'queenweb', { stuckSec: queenSpec.web.stuckSec || 2, col: '#e8e0d0', spd: 6.5 });
          e.webCd = queenSpec.web.cooldownSec || 6;
        }
      }
    }
  }

  function resolveWeb(G, target, shot) {
    if (!target || target.dead) return { saved: false, stuck: 0 };
    var stuck = (shot && shot.stuckSec) || 2;
    var save = eng('savingThrow');
    var ok = !!(save && save(target, 'spell'));
    if (!ok) {
      target.webbed = Math.max(target.webbed || 0, stuck);
      target.dest = null;
      target.moving = 0;
      if (eng('ftext')) eng('ftext')(target.x, target.y, 'webbed', '#e8e0d0');
    }
    return { saved: ok, stuck: ok ? 0 : stuck };
  }

  function resolveCone(G, target, cone, from) {
    if (!target || target.dead) return { dmg: 0, saved: false };
    var dice = (cone && cone.damage) || '2d6';
    var host = hostOf(G);
    var roll = (typeof host.rollExpr === 'function') ? host.rollExpr(dice) : rollHpExpr(dice, Math.random, 1);
    var scale = host.scale || 4;
    var raw = Math.round((roll || 0) * scale);
    var saved = saveVs(G, target, 'breath');
    var dmg = saved ? Math.floor(raw / 2) : raw;
    if (eng('damage')) eng('damage')(target, dmg, '#ff334a', from || null);
    else target.hp = Math.max(0, (target.hp || 0) - dmg);
    return { dmg: dmg, roll: roll, saved: saved, raw: raw };
  }

  function resolveShard(G, target, shot) {
    if (!target || target.dead) return { dmg: 0 };
    var dice = (shot && shot.dice) || '1d6';
    var host = hostOf(G);
    var roll = (typeof host.rollExpr === 'function') ? host.rollExpr(dice) : rollHpExpr(dice, Math.random, 1);
    var scale = host.scale || 4;
    var dmg = Math.max(1, Math.round((roll || 1) * scale));
    if (eng('damage')) eng('damage')(target, dmg, '#ff334a', (shot && shot.from) || null);
    else target.hp = Math.max(0, (target.hp || 0) - dmg);
    return { dmg: dmg, roll: roll };
  }

  function diceExpr(raw) {
    if (raw == null || typeof raw === 'number') return null;
    var s = String(raw);
    if (/^\d+d\d+/i.test(s)) return s;
    var span = s.match(/^(\d+)\s*-\s*(\d+)$/);
    if (!span) return null;
    var lo = +span[1];
    var hi = +span[2];
    var sides = hi - lo + 1;
    if (sides < 1) return null;
    if (lo === 1) return '1d' + sides;
    return '1d' + sides + '+' + (lo - 1);
  }

  function rollQty(G, raw) {
    if (typeof raw === 'number') return raw;
    var expr = diceExpr(raw);
    if (!expr) return 0;
    return rollHpExpr(expr, hostRng(G), 1);
  }

  function chanceTakes(G, chance) {
    if (typeof chance !== 'number') return false;
    return roll100(G) <= chance;
  }

  function rollCoinLine(G, row, bag, key) {
    if (!row || !chanceTakes(G, row.chance)) return;
    var n = rollQty(G, row.dice || row.count) * (row.times || 1);
    if (n) bag[key] = (bag[key] || 0) + n;
  }

  function openLairChest(G, chest) {
    var spec = G && G.lvl && G.lvl.campaignSpec;
    var lair = spec && spec.data && spec.data.LOOT && spec.data.LOOT.lair;
    if (!lair || !chest || chest.gone) return null;
    chest.gone = 1;
    var coins = {};
    var gems = 0;
    var jew = 0;
    var magN = 0;
    var potions = 0;
    var C = lair.C || {};
    rollCoinLine(G, C.cp, coins, 'cp');
    rollCoinLine(G, C.sp, coins, 'sp');
    rollCoinLine(G, C.ep, coins, 'ep');
    rollCoinLine(G, C.gp, coins, 'gp');
    rollCoinLine(G, C.pp, coins, 'pp');
    if (C.gems && chanceTakes(G, C.gems.chance)) gems += rollQty(G, C.gems.dice);
    if (C.jewelry && chanceTakes(G, C.jewelry.chance)) jew += rollQty(G, C.jewelry.dice);
    if (C.magic && chanceTakes(G, C.magic.chance)) magN += rollQty(G, C.magic.count);
    var O = lair.O || {};
    rollCoinLine(G, O.cp, coins, 'cp');
    rollCoinLine(G, O.sp, coins, 'sp');
    var Q = lair.Q || {};
    var times = Q.times || lair.qTimes || 0;
    for (var i = 0; i < times; i++) {
      if (Q.gems && chanceTakes(G, Q.gems.chance)) gems += rollQty(G, Q.gems.dice);
    }
    var S = lair.S || {};
    if (chanceTakes(G, S.chance)) potions += rollQty(G, S.count);
    var hoard = { coins: coins, gems: gems, jew: jew, magN: magN, potions: potions };
    chest.hoard = hoard;
    if (eng('convertHoard')) eng('convertHoard')(coins, gems, jew, magN, (C.magic && C.magic.kind) || 'any');
    if (eng('say')) eng('say')('The lair chest opens.', '#ffd27a');
    return hoard;
  }

  function markCampaignClear(G) {
    var spec = G.lvl && G.lvl.campaignSpec;
    var cur = (spec && spec.level) || (G.campaignLevel | 0) || 1;
    G.cleared = G.cleared || {};
    G.cleared[cur] = 1;
    var nxt = nextLevel(cur);
    if (nxt) G.unlocked = Math.max(G.unlocked || 1, nxt);
    return cur;
  }

  function enterNext(G) {
    if (!G) return;
    var cur = markCampaignClear(G);
    var nxt = nextLevel(cur);
    if (nxt && LIVE[nxt]) {
      G.campaignLevel = nxt;
      var shell = shellChapter(nxt);
      if (eng('startChapter')) eng('startChapter')(shell);
      return;
    }
    /* The next campaign level stays stored on unlocked. Camp gates it. */
    G.campaignLevel = cur;
    if (eng('endChapter')) eng('endChapter')();
    else G.scene = 'camp';
  }

  function releaseOgress(G, spec) {
    var flags = G.lvl.flags || (G.lvl.flags = {});
    var cave = spec.map && spec.map.ogreCave;
    if (!cave) return;
    var ents = G.ents || [];
    var her = null;
    for (var i = 0; i < ents.length; i++) {
      var e = ents[i];
      if (e && e.campaignKey === 'ogress' && !e.dead && !e.vanished) her = e;
    }
    if (!her || her.fleeTo || her._fleeing) return;
    flags.ogressFled = 1;
    her._fleeing = 1;
    her.sealed = 0;
    her.glanceBack = 0.9;
    var path = (cave.fleePath || []).map(function (p) { return { x: p.x, y: p.y }; });
    if (path.length && near(her, path[0], 1.2)) path.shift();
    var exit = cave.exitTile || { x: 28, y: 76 };
    if (!path.length) path = [{ x: exit.x, y: exit.y }];
    her.fleePath = path;
    her.fleeTo = her.fleePath.shift();
    her.onArrive = function () {
      if (her.fleePath && her.fleePath.length) return;
      her.hidden = 1;
      her.vanished = 1;
      her.dead = 1;
      her.campaignXp = null;
      if (!flags.ogressXp) {
        flags.ogressXp = 1;
        var xp = (spec.data && spec.data.XP && spec.data.XP.ogress) || 185;
        if (eng('awardPartyXp')) eng('awardPartyXp')(xp, 'Ogress');
      }
      if (eng('say')) eng('say')('The ogress looks back once and is gone.', '#d8c49a');
    };
  }

  function tickOgreCave(G, dt) {
    var spec = G.lvl && G.lvl.campaignSpec;
    var cave = spec && spec.map && spec.map.ogreCave;
    if (!cave) return false;
    var p = hero(G);
    if (!p) return false;
    var props = G.props || [];
    var seals = [];
    var i;
    for (i = 0; i < props.length; i++) {
      if (props[i] && props[i].campaign === 'ogre-seal' && !props[i].gone) seals.push(props[i]);
    }
    if (!seals.length) {
      releaseOgress(G, spec);
    } else if (G._ogreClear) {
      var active = G._ogreClear;
      var rock = null;
      for (i = 0; i < seals.length; i++) {
        if (seals[i] === active.rock) rock = seals[i];
      }
      if (!rock || !near(p, rock, 1.7)) G._ogreClear = null;
      else {
        active.t += dt || 0;
        var need = rock.seconds || 10;
        if (eng('hint')) eng('hint')('Clearing the boulder.', 0.4);
        if (active.t >= need) {
          rock.gone = 1;
          G._ogreClear = null;
          if (eng('say')) eng('say')('A boulder rolls clear.', '#d8c49a');
          var still = false;
          for (i = 0; i < seals.length; i++) if (seals[i] !== rock && !seals[i].gone) still = true;
          if (!still) releaseOgress(G, spec);
        }
      }
      if (G._ogreClear) return true;
    }
    if (seals.length && !G._ogreClear && eng('interact')) {
      var nearRock = null;
      for (i = 0; i < seals.length; i++) if (!seals[i].gone && near(p, seals[i], 1.6)) nearRock = seals[i];
      if (nearRock) {
        eng('interact')('Clear the boulder', function () {
          G._ogreClear = { rock: nearRock, t: 0 };
        });
        return true;
      }
    }
    if (!seals.length && eng('interact')) {
      for (i = 0; i < props.length; i++) {
        var egg = props[i];
        if (!egg || egg.gone || egg.campaign !== 'golden-egg') continue;
        if (!near(p, egg, 1.3)) continue;
        eng('interact')('Take the golden egg', function () {
          if (egg.gone) return;
          egg.gone = 1;
          var it = {
            id: 'golden_egg', n: 'Golden Egg', k: 'egg', cat: 'Quest',
            quest: 1, noAuto: 1,
            d: 'One battle. Armor improves by 4. Only one egg works at a time.'
          };
          if (eng('stowPackItem')) eng('stowPackItem')(it);
          if (eng('say')) eng('say')('Macar takes a golden egg.', '#ffe08a');
        });
        return true;
      }
    }
    return false;
  }

  function dieFace(G, n) {
    var host = hostOf(G);
    if (typeof host.ri === 'function') return host.ri(1, n) | 0;
    return 1 + Math.floor(hostRng(G)() * n);
  }

  function wanderEverySec(spec) {
    var check = spec && spec.map && spec.map.wander && spec.map.wander.check;
    if (!check) return 0;
    var m = String(check.every || '').match(/(\d+(?:\.\d+)?)\s*s\b/);
    if (!m) return 0;
    return +m[1];
  }

  function tickWander(G, dt) {
    if (!G || G.scene !== 'play' || G.fightOn) return;
    var spec = G.lvl && G.lvl.campaignSpec;
    var every = wanderEverySec(spec);
    if (!(every > 0)) return;
    var p = hero(G);
    if (!p || p.dead) return;
    G._wanderT = (G._wanderT || 0) + (dt || 0);
    if (G._wanderT + 1e-9 < every) return;
    G._wanderT -= every;
    var chk = { roll: dieFace(G, 6), hit: false };
    if (eng('wearingElvenkind') && eng('wearingElvenkind')(p)) chk.silent = 1;
    else chk.hit = chk.roll === 1;
    G._wanderLast = chk;
    if (!chk.hit) return;
    var names = spawnWander(G, p, G._campaignFoe);
    if (eng('logWanderCheck')) eng('logWanderCheck')(chk, names);
  }

  function hideSpec(G) {
    var data = G && G.lvl && G.lvl.campaignSpec && G.lvl.campaignSpec.data;
    var hide = data && data.LOOT && data.LOOT.components && data.LOOT.components.hide;
    if (hide && hide.pelts) return hide;
    var l4 = levelData(4);
    hide = l4 && l4.LOOT && l4.LOOT.components && l4.LOOT.components.hide;
    return hide || { pelts: 3, sec: 10, ac: 6, weight: 30, slot: 'body' };
  }

  function peltCount(G) {
    var magic = (G && G.packs && G.packs.macar && G.packs.macar.magic) || [];
    var n = 0;
    for (var i = 0; i < magic.length; i++) {
      var it = magic[i];
      if (it && (it.id === 'worg_pelt' || it.k === 'pelt')) n += it.qty || 1;
    }
    return n;
  }

  function consumePelts(G, n) {
    var magic = G && G.packs && G.packs.macar && G.packs.macar.magic;
    if (!magic) return false;
    var left = n | 0;
    for (var i = magic.length - 1; i >= 0 && left > 0; i--) {
      var it = magic[i];
      if (!it || (it.id !== 'worg_pelt' && it.k !== 'pelt')) continue;
      var q = it.qty || 1;
      if (q <= left) { magic.splice(i, 1); left -= q; }
      else { it.qty = q - left; left = 0; }
    }
    return left === 0;
  }

  function hideArmorItem(spec) {
    spec = spec || {};
    return {
      id: 'hide_armor',
      n: 'Hide Armor',
      k: 'armor',
      cat: 'Armor/Shield',
      slot: 'chest',
      body: 1,
      ac: spec.ac || 6,
      weight: spec.weight || 30,
      armorType: 'hide',
      d: 'Worg hide. AC 6. Weight 30. Worn on the body.'
    };
  }

  function beginHideCraft(G) {
    var spec = hideSpec(G);
    var need = spec.pelts || 3;
    if (peltCount(G) < need) return { ok: false, reason: 'pelts', need: need };
    if (G._hideCraft) return { ok: false, reason: 'working', sec: spec.sec || 10 };
    G._hideCraft = { t: 0, need: spec.sec || 10, pelts: need };
    return { ok: true, sec: G._hideCraft.need };
  }

  function tickHideCraft(G, dt) {
    var job = G && G._hideCraft;
    if (!job) return null;
    if (G.scene && G.scene !== 'camp') return null;
    job.t += dt || 0;
    if (job.t + 1e-9 < job.need) return null;
    var spec = hideSpec(G);
    if (!consumePelts(G, job.pelts || spec.pelts || 3)) {
      G._hideCraft = null;
      return { ok: false, reason: 'pelts' };
    }
    var item = hideArmorItem(spec);
    if (eng('giveMagic')) eng('giveMagic')(item, true);
    else {
      G.packs = G.packs || {};
      G.packs.macar = G.packs.macar || { magic: [] };
      G.packs.macar.magic = G.packs.macar.magic || [];
      G.packs.macar.magic.push(item);
    }
    G._hideCraft = null;
    if (eng('say')) eng('say')('Hide armor. AC 6, weight 30.', '#d2bd63');
    return { ok: true, item: item };
  }

  function hallData(G) {
    var data = G && G.lvl && G.lvl.campaignSpec && G.lvl.campaignSpec.data;
    return (data && data.HALL) || null;
  }

  function isHallMember(e) {
    if (!e || e.room !== 'hall-of-names') return false;
    if (e.campaignKey === 'orcChief' || e.campaignKey === 'orcShaman') return true;
    if (e.campaignKey === 'orcLeader' && e.campaignRole === 'leader') return true;
    if (e.campaignKey === 'orcGuard' && e.campaignRole === 'guard') return true;
    return false;
  }

  function hallMembers(G) {
    return (G.ents || []).filter(isHallMember);
  }

  /* The carved hall is an ellipse. Notice uses the short radius.
     Joining the fight uses the long one, measured from the hall center,
     so a guard who started in the back can cross to the door. */
  function hallDisk(spec) {
    var rooms = (spec && spec.map && spec.map.layout && spec.map.layout.rooms) || [];
    var room = null;
    var i;
    for (i = 0; i < rooms.length; i++) if (rooms[i] && rooms[i].id === 'hall-of-names') room = rooms[i];
    var rw = room ? (room.rw || (room.kind === 'rect' ? 11 : 4)) : 11;
    var rh = room ? (room.rh || (room.kind === 'rect' ? 7.2 : 3)) : 7.2;
    return {
      x: room && room.x != null ? room.x : 46,
      y: room && room.y != null ? room.y : 20,
      notice: Math.min(rw, rh),
      reach: Math.max(rw, rh)
    };
  }

  function releaseHallReserves(G, reserves) {
    var disk = hallDisk(G.lvl.campaignSpec);
    reserves.forEach(function (e) {
      e.hallReserve = 0;
      e.hallJoin = 1;
      e.homeX = disk.x;
      e.homeY = disk.y;
      e.leash = disk.reach;
      e.aggro = disk.reach;
      e.engaged = 1;
      e.npc = 0;
      e.sleeping = 0;
      e.intent = null;
      e.intentAge = 0;
    });
    G.lvl.flags.hallWaveOut = 1;
    G.lvl.flags.hallWave = 2;
  }

  /* A starter is aggroing once the live AI has engaged him, or he is
     inside his own aggro of Macar. Reserves do not start the clock. */
  function hallAggroing(e, p) {
    if (!e || e.hallReserve || e.dead || e.hp <= 0) return false;
    if (e.engaged) return true;
    if (!p) return false;
    var reach = typeof e.aggro === 'number' ? e.aggro : 0;
    return reach > 0 && tileDist(e, p) <= reach + 1e-6;
  }

  /* Back-room guards step in at 10 s after the first hall foe aggros,
     or when the first foe drops, whichever comes first. */
  function tickHallWave(G, dt) {
    var L = G && G.lvl;
    var hall = hallData(G);
    if (!L || !L.flags || !hall || (L.campaignSpec.level | 0) !== 4) return;
    var reserves = hallMembers(G).filter(function (e) { return e.hallReserve && !(e.dead || e.hp <= 0); });
    if (L.flags.hallWaveOut) {
      if (reserves.length) releaseHallReserves(G, reserves);
      return;
    }
    if (!reserves.length) { L.flags.hallWaveOut = 1; L.flags.hallWave = 2; return; }
    var starters = hallMembers(G).filter(function (e) { return !e.hallReserve; });
    var fighting = false;
    var dropped = false;
    var p = hero(G);
    var i;
    for (i = 0; i < starters.length; i++) {
      if (starters[i].dead || starters[i].hp <= 0) dropped = true;
      if (hallAggroing(starters[i], p)) fighting = true;
    }
    if (!L.flags.hallWaveOn) {
      if (!fighting && !dropped) return;
      L.flags.hallWaveOn = 1;
      L.flags.hallWave = 1;
    }
    L.flags.hallWaveT = (L.flags.hallWaveT || 0) + (dt || 0);
    var sec = (hall.wave && hall.wave.sec) || 10;
    if (!(L.flags.hallWaveT >= sec - 1e-6 || dropped)) return;
    releaseHallReserves(G, reserves);
  }

  function ogreDest(G) {
    var cave = (G.lvl.campaignSpec.map && G.lvl.campaignSpec.map.ogreCave) || {};
    return { x: cave.x != null ? cave.x : 32, y: cave.y != null ? cave.y : 50 };
  }

  function hallMoraleSubjects(G) {
    return hallMembers(G).filter(function (e) {
      if (e.dead || e.hp <= 0) return false;
      return e.campaignKey === 'orcGuard' || e.campaignKey === 'orcLeader';
    });
  }

  function applyHallMorale(G, holdOn) {
    var dest = ogreDest(G);
    hallMoraleSubjects(G).forEach(function (e) {
      var roll = roll100(G);
      e.hallMoraleRoll = roll;
      if (roll <= holdOn) {
        e.hallMoraleHold = 1;
        e.fleeTo = null;
        e.fleePath = null;
      } else {
        e.hallMoraleHold = 0;
        e.fleeTo = { x: dest.x, y: dest.y };
      }
    });
  }

  /* Guards and the leader roll on the chief's death, and once more at half the hall. */
  function tickHallMorale(G) {
    var L = G && G.lvl;
    var hall = hallData(G);
    if (!L || !L.flags || !hall || (L.campaignSpec.level | 0) !== 4) return;
    var members = hallMembers(G);
    if (!members.length) return;
    var chiefDead = false;
    var deadN = 0;
    var i;
    for (i = 0; i < members.length; i++) {
      if (!(members[i].dead || members[i].hp <= 0)) continue;
      deadN++;
      if (members[i].campaignKey === 'orcChief') chiefDead = true;
    }
    if (chiefDead && !L.flags.hallMoraleChief) {
      L.flags.hallMoraleChief = 1;
      var hold = (hall.moraleOnChiefDeath && hall.moraleOnChiefDeath.holdOnOrUnder);
      if (typeof hold !== 'number') hold = 50;
      applyHallMorale(G, hold);
    }
    var half = Math.ceil(members.length / 2);
    if (deadN >= half && !L.flags.hallMoraleHalf) {
      L.flags.hallMoraleHalf = 1;
      var holdHalf = (hall.moraleOnHalfFallen && hall.moraleOnHalfFallen.holdOnOrUnder);
      if (typeof holdHalf !== 'number') holdHalf = 50;
      applyHallMorale(G, holdHalf);
    }
  }

  function tick(G, dt) {
    var L = G && G.lvl;
    if (!L || !L.flags || !L.flags.campaign || !L.campaignSpec) return;
    dt = dt || 0;
    syncFever(G);
    syncGates(G);
    if (tickOgreCave(G, dt)) return;
    tickKing(G, dt);
    tickHallWave(G, dt);
    tickHallMorale(G);
    tickCasters(G, dt);
    tickBarks(G, dt);
    tickTimers(G, dt);
    tickWander(G, dt);
    tickHideCraft(G, dt);
    tickQueen(G);
    tickPixie(G, dt);
    tickRanged(G, dt);
    var p = hero(G);
    if (!p || !eng('interact')) return;
    var spec = L.campaignSpec;
    var chestList = G.props || [];
    for (var ci = 0; ci < chestList.length; ci++) {
      var chest = chestList[ci];
      if (!chest || chest.gone || chest.campaign !== 'lair-chest') continue;
      if (!near(p, chest, 1.6)) continue;
      eng('interact')('Open the lair chest', function () { openLairChest(G, chest); });
      return;
    }
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
    noteChapter: noteChapter,
    keepsBook: keepsBook,
    clearedName: clearedName,
    campGoDeeper: campGoDeeper,
    poisonHit: poisonHit,
    applyPoison: applyPoison,
    dustMoveMul: dustMoveMul,
    dustCdMul: dustCdMul,
    armDust: armDust,
    clearDust: clearDust,
    noteFight: noteFight,
    noteFightEnd: noteFightEnd,
    noteDeath: noteDeath,
    armEgg: armEgg,
    stackMagic: stackMagic,
    sellEgg: sellEgg,
    eggPrice: eggPrice,
    resaveHold: resaveHold,
    beginHideCraft: beginHideCraft,
    tickHideCraft: tickHideCraft,
    peltCount: peltCount,
    hideArmorItem: hideArmorItem,
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
    inchesToTiles: inchesToTiles,
    resolveWeb: resolveWeb,
    resolveShard: resolveShard,
    resolveCone: resolveCone,
    openLairChest: openLairChest,
    rangeTiles: rangeTiles,
    barkRect: barkRect,
    goblinLines: goblinLines,
    tickBarks: tickBarks
  };

  root.CampaignRuntime = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
