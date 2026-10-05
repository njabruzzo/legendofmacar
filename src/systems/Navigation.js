/**
 * MAC-07 Batch D — party navigation library, extended to leader and followers.
 *
 * Routes on a quarter-cell lattice through actor-specific canStand
 * (canBe(x,y,actor.r,actor)). Conventional tile-center A* is unsuitable:
 * WALL_FACE_CLEAR ≈ 0.72 rejects many tile centers.
 *
 * Topology 4 only (no untested diagonal corner cutting).
 * Blocked endpoints fail closed. Expansion is counted and capped — not a
 * time budget. Failure waits; this module never assigns e.x / e.y.
 *
 * Movement stays on the host steerWalk / move / wornMoveMul path. Boots
 * already multiply in moveStep — do not apply them here.
 *
 * A* is vendored rot.js (BSD-3-Clause) commit
 * 46782e248c2db9d379a5e4f13bb8323f18dff04b via src/vendor/rotjs/rot-path.js.
 *
 * Flag: Navigation.FLAG default ON.
 * Rollback: Navigation.FLAG=false or load with ?nav=0 (legacy trail/form).
 *
 * Follow routes every uncommanded kin, ghosts included, toward its own
 * breadcrumb goal. The host also uses tickRoute for Macar's click destinations.
 * Ghosts ignore PartyOrders and stay on automatic Follow. Hold / Regroup /
 * Focus command living kin only; a null order does not intercept Follow.
 *
 * Noz / fleeTo / story-controlled entities stay on the host flee path.
 * Internal roster key is pordoom (display PORDUM).
 */
(function (root) {
  'use strict';

  var FLAG = true;
  var STEP = 0.25;
  var TOPOLOGY = 4;
  var MAX_EXPAND = 5000;
  var REPATH_DT = 0.28;
  var REPATH_GOAL = 0.55;
  var WAYPOINT_R = 0.20;
  var FOLLOW_R = 0.38;
  var SNAP_R = 1.75;
  var ROSTER_KEY = 'pordoom';
  var DISPLAY_NAME = 'PORDUM';

  var cache = Object.create(null);

  function use() {
    if (!FLAG) return false;
    try {
      if (typeof location !== 'undefined' && location.search &&
          /(?:^|[?&])nav=0(?:&|$)/.test(location.search)) {
        return false;
      }
    } catch (err) { /* node / missing location */ }
    return true;
  }

  function canStand(x, y, actor, canBeFn) {
    if (typeof canBeFn !== 'function' || !actor) return false;
    var r = actor.r;
    if (r == null) r = 0.36;
    return !!canBeFn(x, y, r, actor);
  }

  function worldToLattice(x, y) {
    return { i: Math.round(x / STEP), j: Math.round(y / STEP) };
  }

  function latticeToWorld(i, j) {
    return { x: i * STEP, y: j * STEP };
  }

  function fail(reason, expansions) {
    return { ok: false, path: [], expansions: expansions || 0, reason: reason };
  }

  function snapStand(x, y, actor, canBeFn, maxR) {
    var best = null;
    var bestMan = 1e9;
    var bestEu = 1e9;
    var origin = worldToLattice(x, y);
    var span = Math.ceil((maxR == null ? SNAP_R : maxR) / STEP);
    var i, j, w, man, eu;
    for (j = -span; j <= span; j++) {
      for (i = -span; i <= span; i++) {
        w = latticeToWorld(origin.i + i, origin.j + j);
        if (!canStand(w.x, w.y, actor, canBeFn)) continue;
        man = Math.abs(i) + Math.abs(j);
        eu = Math.hypot(w.x - x, w.y - y);
        if (man < bestMan || (man === bestMan && eu < bestEu)) {
          bestMan = man;
          bestEu = eu;
          best = { x: w.x, y: w.y, i: origin.i + i, j: origin.j + j };
        }
      }
    }
    return best;
  }

  /**
   * rot.js neighbors / heuristic with a counted expansion cap (fail closed).
   * A stable heap avoids linear insertion and shifting for every open node.
   * Expansion is a node visit, not elapsed wall time.
   */
  function boundedCompute(astar, fromX, fromY, maxExpand, callback) {
    var expansions = 0;
    var capped = false;
    var item, id, neighbors, i, neighbor;
    astar._todo = [];
    astar._done = {};
    astar._fromX = fromX;
    astar._fromY = fromY;
    var heap = [], best = Object.create(null), serial = 0;
    function before(a,b){
      var af=a.g+a.h,bf=b.g+b.h;
      return af<bf || (af===bf && (a.h<b.h || (a.h===b.h && a.serial<b.serial)));
    }
    function add(x,y,prev){
      var key=x+','+y,g=prev?prev.g+1:0;
      if(key in best && best[key]<=g) return;
      best[key]=g;
      var node={x:x,y:y,g:g,h:astar._distance(x,y),prev:prev,serial:serial++};
      var at=heap.length;heap.push(node);
      while(at>0){
        var parent=(at-1)>>1;
        if(!before(node,heap[parent])) break;
        heap[at]=heap[parent];at=parent;
      }
      heap[at]=node;
    }
    function pop(){
      var first=heap[0],last=heap.pop();
      if(heap.length){
        var at=0;
        while(at*2+1<heap.length){
          var child=at*2+1;
          if(child+1<heap.length && before(heap[child+1],heap[child])) child++;
          if(!before(heap[child],last)) break;
          heap[at]=heap[child];at=child;
        }
        heap[at]=last;
      }
      return first;
    }
    add(astar._toX, astar._toY, null);
    while (heap.length) {
      if (expansions >= maxExpand) {
        capped = true;
        break;
      }
      item = pop();
      id = item.x + ',' + item.y;
      if (id in astar._done) continue;
      astar._done[id] = item;
      expansions++;
      if (item.x == fromX && item.y == fromY) break;
      neighbors = astar._getNeighbors(item.x, item.y);
      for (i = 0; i < neighbors.length; i++) {
        neighbor = neighbors[i];
        id = neighbor[0] + ',' + neighbor[1];
        if (id in astar._done) continue;
        add(neighbor[0], neighbor[1], item);
      }
    }
    astar._expandCount = expansions;
    astar._capped = capped;
    item = astar._done[fromX + ',' + fromY];
    if (!item) return { expansions: expansions, capped: capped, found: false };
    while (item) {
      callback(item.x, item.y);
      item = item.prev;
    }
    return { expansions: expansions, capped: capped, found: true };
  }

  function planRoute(from, to, actor, opts) {
    opts = opts || {};
    var canBeFn = opts.canBe;
    var maxExpand = opts.maxExpand != null ? +opts.maxExpand : MAX_EXPAND;
    if (maxExpand < 1) maxExpand = 1;
    if (!from || !to || !actor || typeof canBeFn !== 'function') {
      return fail('bad-args');
    }
    if (typeof ROT === 'undefined' || !ROT.Path || !ROT.Path.AStar) {
      return fail('no-rot');
    }

    var start = snapStand(from.x, from.y, actor, canBeFn, SNAP_R);
    var goal = snapStand(to.x, to.y, actor, canBeFn, SNAP_R);
    if (!start) return fail('blocked-start');
    if (!goal) return fail('blocked-end');

    if (start.i === goal.i && start.j === goal.j) {
      return { ok: true, path: [{ x: start.x, y: start.y }], expansions: 0, reason: 'already' };
    }

    // Terrain and party positions are fixed during one synchronous plan.
    // Avoid repeating costly body/rock checks for the same lattice cell.
    var standable=Object.create(null);
    function passable(i, j) {
      var key=i+','+j;
      if(key in standable) return standable[key];
      var w = latticeToWorld(i, j);
      return standable[key]=canStand(w.x, w.y, actor, canBeFn);
    }

    var astar = new ROT.Path.AStar(goal.i, goal.j, passable, { topology: TOPOLOGY });
    var cells = [];
    var run = boundedCompute(astar, start.i, start.j, maxExpand, function (i, j) {
      cells.push(latticeToWorld(i, j));
    });

    if (!run.found || !cells.length) {
      return fail(run.capped ? 'expand-limit' : 'no-path', run.expansions);
    }
    return { ok: true, path: cells, expansions: run.expansions, reason: 'ok' };
  }

  function isStoryLocked(e) {
    if (!e) return true;
    if (e.fleeTo || (e.fleePath && e.fleePath.length)) return true;
    if (e.noz || e.nozCamp) return true;
    if (e.kind === 'gnome') return true;
    if (e.name && /^noz$/i.test(String(e.name))) return true;
    return false;
  }

  function livingKin(ents) {
    var out = [];
    var i, e;
    ents = ents || [];
    for (i = 0; i < ents.length; i++) {
      e = ents[i];
      if (!e || e.hero || e.dead || e.crushed || e.sleeping || e.tied || e.hidden) continue;
      if (e.team !== 'party') continue;
      if (!e.col || !e.col.key) continue;
      if (isStoryLocked(e)) continue;
      out.push(e);
    }
    return out;
  }

  function pickPilot(ents) {
    var kin = livingKin(ents);
    var i;
    for (i = 0; i < kin.length; i++) {
      if (kin[i].col.key === ROSTER_KEY) return kin[i];
    }
    return kin[0] || null;
  }

  function isPilot(e, ents) {
    var p = pickPilot(ents);
    return !!(p && e && p === e);
  }

  function actorKey(e) {
    if (e && e.col && e.col.key) return String(e.col.key);
    if (e && e.id != null) return 'id:' + e.id;
    return '';
  }

  function clearCache(key) {
    if (!key) {
      cache = Object.create(null);
      return;
    }
    delete cache[key];
  }

  function invalidate(info) {
    cache = Object.create(null);
    return info || null;
  }

  function followGoal(e, leader, host) {
    if(host.goal) return host.goal;
    var form = null;
    if (typeof host.partyForm === 'function') {
      try { form = host.partyForm(1, leader); } catch (err) { form = null; }
    }
    var goal = form || { x: leader.x, y: leader.y };
    if (!canStand(goal.x, goal.y, e, host.canBe)) {
      goal = { x: leader.x, y: leader.y };
    }
    return goal;
  }

  function tickFollower(e, leader, dt, host) {
    host = host || {};
    if (!use() || !e || !leader) return { handled: false };
    return tickRoute(e, followGoal(e, leader, host), dt, host);
  }

  function segmentClear(from, to, actor, canBeFn) {
    var n=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)/(STEP/2)));
    for(var i=1;i<=n;i++){
      var t=i/n;
      if(!canStand(from.x+(to.x-from.x)*t,from.y+(to.y-from.y)*t,actor,canBeFn)) return false;
    }
    return true;
  }

  function tickRoute(e, goal, dt, host) {
    host = host || {};
    if (!use() || !e || !goal) return { handled: false };
    if (isStoryLocked(e)) return { handled: false };
    if (typeof host.canBe !== 'function' || typeof host.steerWalk !== 'function') {
      return { handled: false };
    }

    var distFn = typeof host.dist === 'function'
      ? host.dist
      : function (a, b) { return Math.hypot(a.x - b.x, a.y - b.y); };
    var dLead = distFn(e, goal);
    var key = actorKey(e);
    if (dLead <= (host.arriveRadius==null?FOLLOW_R:host.arriveRadius)) {
      e.ix = 0;
      e.iy = 0;
      e.moving = 0;
      clearCache(key);
      return { handled: true, waiting: false, reason: 'arrived' };
    }

    var levelId = host.levelId || '';
    var topologyRev = host.topologyRev || 0;
    var st = cache[key] || (cache[key] = {});
    var need = !st.path || !st.path.length
      || st.levelId !== levelId
      || st.topologyRev !== topologyRev
      || (st.goal && Math.hypot(st.goal.x - goal.x, st.goal.y - goal.y) > REPATH_GOAL)
      || ((st.age || 0) >= REPATH_DT && st.path && st.path.length &&
          !segmentClear(e,st.path[0],e,host.canBe))
      || st.stuck > 0.55;

    st.age = (st.age || 0) + (dt || 0);

    if(st.failed && st.age<REPATH_DT && st.levelId===levelId && st.topologyRev===topologyRev &&
      st.goal && Math.hypot(st.goal.x-goal.x,st.goal.y-goal.y)<=REPATH_GOAL){
      e.ix=0;e.iy=0;e.moving=0;
      return {handled:true,waiting:true,reason:'retry-wait'};
    }

    if (need) {
      var plan = segmentClear(e,goal,e,host.canBe)
        ? {ok:true,path:[{x:goal.x,y:goal.y}],expansions:0}
        : planRoute({ x: e.x, y: e.y }, goal, e, {
        canBe: host.canBe,
        maxExpand: host.maxExpand != null ? host.maxExpand : MAX_EXPAND
      });
      st.levelId = levelId;
      st.topologyRev = topologyRev;
      st.goal = { x: goal.x, y: goal.y };
      st.age = 0;
      st.stuck = 0;
      if (!plan.ok) {
        st.failed=true;
        st.path = [];
        e.ix = 0;
        e.iy = 0;
        e.moving = 0;
        return {
          handled: true,
          waiting: true,
          reason: plan.reason,
          expansions: plan.expansions
        };
      }
      st.failed=false;
      st.path = plan.path.slice();
    }

    // A near waypoint may be a corner: skip it only when the next segment
    // is clear for this actor. This prevents diagonal shortcuts into rock.
    while (st.path && st.path.length && distFn(e, st.path[0]) < WAYPOINT_R &&
      (st.path.length===1 || segmentClear(e,st.path[1],e,host.canBe))) {
      st.path.shift();
    }
    if (!st.path || !st.path.length) {
      e.ix = 0;
      e.iy = 0;
      e.moving = 0;
      return { handled: true, waiting: false, reason: 'path-empty' };
    }

    var wp = st.path[0];
    var go = (e.sp || 4) * ((e.slowT || 0) > 0 ? 0.4 : 1) * ((e.webbed || 0) > 0 ? 0 : 1);
    if (go <= 0) {
      e.ix = 0;
      e.iy = 0;
      e.moving = 0;
      return { handled: true, waiting: true, reason: 'no-speed' };
    }
    var moved = host.steerWalk(e, wp.x - e.x, wp.y - e.y, go, dt);
    if (!(moved > 0.002)) {
      st.stuck = (st.stuck || 0) + (dt || 0);
      if (st.stuck > 0.55) st.path = null;
    } else {
      st.stuck = 0;
    }
    return { handled: true, waiting: false, reason: 'steer', waypoint: wp };
  }

  var api = {
    ROSTER_KEY: ROSTER_KEY,
    DISPLAY_NAME: DISPLAY_NAME,
    STEP: STEP,
    TOPOLOGY: TOPOLOGY,
    MAX_EXPAND: MAX_EXPAND,
    get FLAG() { return FLAG; },
    set FLAG(v) { FLAG = !!v; },
    use: use,
    canStand: canStand,
    worldToLattice: worldToLattice,
    latticeToWorld: latticeToWorld,
    snapStand: snapStand,
    planRoute: planRoute,
    tickRoute: tickRoute,
    clearRoute: function(e){clearCache(actorKey(e));},
    segmentClear: segmentClear,
    isStoryLocked: isStoryLocked,
    pickPilot: pickPilot,
    isPilot: isPilot,
    tickFollower: tickFollower,
    invalidate: invalidate,
    _cache: function () { return cache; }
  };

  root.Navigation = api;
  if (root.SystemsReady && typeof root.SystemsReady.declare === 'function') {
    root.SystemsReady.declare('Navigation', api);
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
