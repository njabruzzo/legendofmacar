'use strict';
/**
 * MAC-09 Batch F: three Chapter I room interactions + resolveInteraction.
 * Run: node src/systems/Interaction.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.join(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const ixSrc=fs.readFileSync(path.join(__dirname,'Interaction.js'),'utf8');
const discSrc=fs.readFileSync(path.join(__dirname,'Discovery.js'),'utf8');
const gsSrc=fs.readFileSync(path.join(root,'src/saves/GameSave.js'),'utf8');

require('./SystemsReady.js');
require('./Discovery.js');
require('./Interaction.js');
const IX=globalThis.Interaction;
const D=globalThis.Discovery;
const SR=globalThis.SystemsReady;

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

assert(!!IX && typeof IX.resolveInteraction==='function' && typeof IX.installChapterI==='function',
  'Interaction exports resolveInteraction / installChapterI');
assert(IX.FLAG===true, 'FLAG default is ON (rollback: FLAG=false or ?interact=0)');
assert(IX.use()===true, 'use() is true when FLAG is on');
assert(SR.has('Interaction') && SR.get('Interaction')===IX,
  'Interaction declares on SystemsReady');
assert(SR.SHIPPED.indexOf('Interaction')>=0 && SR.SHIPPED.indexOf('Discovery')>=0,
  'Interaction and Discovery are shipped optional modules');
assert(/src="src\/systems\/Interaction\.js"/.test(html),
  'Interaction is a classic sync tag');
assert(!/type\s*=\s*["']module["']/.test(html), 'index.html still has no type=module');
assert(/ASSET_VER='101'/.test(html), 'ASSET_VER is 101');
assert(/function tryFindSecret\(p, mode\)\{/.test(html) &&
  /key==='search'/.test(html) && /key==='secret'/.test(html),
  'dual SEARCH (F herbs / T doors) is unchanged');

const head=html.slice(0, html.indexOf('<script>\n"use strict";'));
const intentI=head.indexOf('src="src/systems/EnemyIntent.js"');
const ixI=head.indexOf('src="src/systems/Interaction.js"');
const discI=head.indexOf('src="src/systems/Discovery.js"');
const inlineI=html.indexOf('<script>\n"use strict";');
assert(intentI>=0 && ixI>intentI && discI>ixI && discI<inlineI,
  'load order: EnemyIntent → Interaction → Discovery → inline');

assert(/Interaction\.installChapterI/.test(html), 'host installs Chapter I rooms');
assert(/Interaction\.resolveInteraction/.test(html), 'host commits through resolveInteraction');
assert(/Interaction\.isProtectedCell/.test(html), 'diggable consults protected cells');
assert(/function interactHost\(/.test(html), 'interactHost supplies breakRock / openSecret / FX');
assert(/bumpTopology\('weak-seam'\)/.test(html) || /afterBreakRock/.test(html),
  'terrain changes still hit topology invalidation');

/* ---- isolated modules ---- */
function loadIso(){
  const ctx={ globalThis:{} };
  ctx.globalThis=ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'SystemsReady.js'),'utf8'), ctx);
  vm.runInContext(discSrc, ctx);
  vm.runInContext(ixSrc, ctx);
  return ctx;
}

function freshLvl(){
  const w=114, h=90;
  const grid=[];
  for(let j=0;j<h;j++){
    const row=new Array(w);
    for(let i=0;i<w;i++) row[i]=1;
    grid.push(row);
  }
  function rect(x,y,rw,rh,t){
    for(let j=y;j<y+rh;j++) for(let i=x;i<x+rw;i++) if(grid[j]&&grid[j][i]!==undefined) grid[j][i]=t;
  }
  rect(14,14,18,16,0);
  rect(24,7,28,28,0);
  rect(22,52,18,14,0);
  rect(54,44,16,12,0);
  rect(20,76,22,12,0);
  rect(4,58,14,12,0);
  /* alternate route: north corridor south-store → mid hall */
  rect(28,35,5,18,0);
  rect(40,33,20,5,0);
  rect(54,35,5,12,0);
  return {
    n:1, w, h, grid, wallHP:{},
    secrets:[{i:35,j:35,w:3,h:1,open:0,kind:'treasure'}],
    crush:{
      pordoom:{x:19.15,y:20.35},
      fendur:{x:17.55,y:21.20}
    },
    flags:{}
  };
}

function walkFill(L, sx, sy){
  const seen=Object.create(null);
  const q=[[sx|0,sy|0]];
  let n=0;
  while(q.length){
    const [i,j]=q.pop();
    const k=i+','+j;
    if(seen[k]) continue;
    if(i<0||j<0||i>=L.w||j>=L.h) continue;
    const t=L.grid[j][i];
    if(t!==0 && t!==3 && t!==4) continue;
    seen[k]=1; n++;
    q.push([i+1,j],[i-1,j],[i,j+1],[i,j-1]);
  }
  return {n, has:(x,y)=>!!seen[(x|0)+','+(y|0)]};
}

function mockHost(L, G, extra){
  extra=extra||{};
  const broke=[];
  const gains={};
  const coins={};
  const says=[];
  let topology=0;
  let sleeper=null;
  let alerts=0;
  let wakes=0;
  const host={
    G, L, lvl:L, Discovery:extra.Discovery||D,
    searching:!!extra.searching,
    breakRock(lvl,i,j){
      if(!lvl.grid[j] || lvl.grid[j][i]!==1) return false;
      if(IX.isProtectedCell(lvl,i,j)) return false;
      lvl.grid[j][i]=0;
      delete lvl.wallHP[i+','+j];
      broke.push([i,j]);
      this.gain('ironstone',1);
      this.learn('mining',3);
      topology++;
      IX.afterBreakRock(lvl,i,j,this);
      return true;
    },
    openSecret(sec){ if(sec) sec.open=1; topology++; },
    bumpTopology(){ topology++; },
    burst(){}, shake(){}, playSfx(){},
    say(t){ says.push(t); },
    hint(){},
    gain(r,n){ gains[r]=(gains[r]||0)+n; },
    gainCoin(k,n){ coins[k]=(coins[k]||0)+n; },
    learn(){},
    isSearching(){ return !!this.searching; },
    hasTool(){ return false; },
    alertNearby(){ alerts++; return 1; },
    wakeSleeper(){ wakes++; if(sleeper) sleeper.sleeping=0; return 1; },
    spawnSleeper(spec){
      if(!spec) return sleeper;
      if(sleeper) return sleeper;
      sleeper={kind:spec.kind,x:spec.x,y:spec.y,sleeping:1,team:'foe'};
      G.ents=G.ents||[]; G.ents.push(sleeper);
      return sleeper;
    },
    _broke:broke, _gains:gains, _coins:coins, _says:says,
    _topology(){ return topology; },
    _sleeper(){ return sleeper; },
    _alerts(){ return alerts; },
    _wakes(){ return wakes; }
  };
  return host;
}

/* ---- install / no softlock ---- */
{
  const iso=loadIso();
  const I=iso.Interaction;
  const L=freshLvl();
  const G={props:[],ents:[]};
  const host=mockHost(L,G,{Discovery:iso.Discovery});
  const inst=I.installChapterI(L,G,host);
  assert(inst.ok===true, 'installChapterI places the three rooms');
  assert(I.seamOpen(L)===false, 'weak plug starts as rock');
  assert(L.wallHP['46,53'] && L.wallHP['46,53'].hp===I.WEAK_HP,
    'plug cells are weakened (low wallHP)');
  assert(L.grid[53][40]===0 && L.grid[53][48]===0 && L.grid[53][46]===1,
    'approaches are carved; the 2-tile plug stays rock');

  const walk=walkFill(L,20,22);
  assert(walk.has(36,21) && walk.has(36,8),
    'main hall / lift / ruby approach stay walkable without mining');
  assert(walk.has(32,58) && walk.has(62,50),
    'alternate south-store → mid-hall corridor stays open with the plug intact');
  assert(!walk.has(46,53), 'shortcut cells are not required for the main or alternate route');

  I.FLAG=false;
  const L2=freshLvl();
  const skip=I.installChapterI(L2,{props:[]},{});
  assert(skip.ok===false, 'flag-off does not author rooms');
  I.FLAG=true;
}

/* ---- resolveInteraction: mine once, topology, ore ---- */
{
  D.reset();
  const L=freshLvl();
  const G={props:[],ents:[]};
  const host=mockHost(L,G);
  IX.installChapterI(L,G,host);
  const actor={x:45.2,y:54.1,dead:0};
  const prop=G.props.find(p=>p.interact==='weak_seam');
  const r1=IX.resolveInteraction(actor,prop,'mine',host);
  assert(r1.ok && r1.committed && r1.topology, 'mine commits and flags topology');
  assert(host._broke.length===4, 'mine routes every plug cell through breakRock');
  assert(IX.seamOpen(L)===true, 'plug is floor after mine');
  assert(prop.taken===1 && prop.gone===1, 'seam props are spent');
  assert(host._gains.ironstone>=4, 'breakRock ore drops are preserved');
  assert(host._topology()>=1, 'nav topology is invalidated');
  assert(D.has('ch1.weak_seam','opened'), 'opening is discovered once');

  const r2=IX.resolveInteraction(actor,prop,'mine',host);
  assert(r2.ok===false && r2.reason==='spent', 'second mine is rejected (one-time)');
  const other=G.props.filter(p=>p.interact==='weak_seam');
  assert(other.every(p=>p.taken===1), 'paired seam prop is also spent');

  const walk=walkFill(L,32,58);
  assert(walk.has(62,50) && walk.has(46,53),
    'after mining, both the shortcut and the long corridor are walkable');
}

/* ---- generic dig / bomb also opens the seam once ---- */
{
  D.reset();
  const L=freshLvl();
  const G={props:[],ents:[]};
  const host=mockHost(L,G);
  IX.installChapterI(L,G,host);
  WEAK_DIG();
  function WEAK_DIG(){
    IX.WEAK_CELLS.forEach(([i,j])=>host.breakRock(L,i,j));
  }
  assert(IX.seamOpen(L)===true, 'generic breakRock opens the authored plug');
  assert(G.props.filter(p=>p.interact==='weak_seam').every(p=>p.taken===1),
    'generic mining spends the seam props (no leftover interact loot)');
  assert(D.has('ch1.weak_seam','opened'), 'generic mining still records the discovery');
}

/* ---- noisy cache: take vs SEARCH, one-time ---- */
{
  D.reset();
  const L=freshLvl();
  const G={props:[],ents:[],res:{},coin:{}};
  const host=mockHost(L,G);
  IX.installChapterI(L,G,host);
  const actor={x:26.4,y:80.1,dead:0};
  const crate=G.props.find(p=>p.interact==='noisy_cache');
  const noisy=IX.resolveInteraction(actor,crate,'take',host);
  assert(noisy.ok && noisy.quiet===false && host._alerts()===1,
    'immediate take is noisy and alerts a bounded nearby response');
  assert(crate.taken===1, 'cache is spent');
  assert(host._gains.ironstone>=3 && host._coins.cp>=14, 'one-time cache reward is granted');
  assert(IX.resolveInteraction(actor,crate,'take',host).reason==='spent',
    'cache cannot be taken twice');
  assert(D.has('ch1.noisy_cache','taken') && D.has('ch1.noisy_cache','noisy'),
    'noisy take records taken + noisy facts only');

  D.reset();
  const Lq=freshLvl();
  const Gq={props:[],ents:[]};
  const hq=mockHost(Lq,Gq);
  hq.searching=1;
  IX.installChapterI(Lq,Gq,hq);
  const crateQ=Gq.props.find(p=>p.interact==='noisy_cache');
  const quiet=IX.resolveInteraction(actor,crateQ,'search',hq);
  assert(quiet.ok && quiet.quiet===true && hq._alerts()===0,
    'SEARCH / careful action takes the cache without an alert');
  assert(D.has('ch1.noisy_cache','quiet') && !D.has('ch1.noisy_cache','noisy'),
    'quiet take does not invent a noisy fact');
}

/* ---- guarded alcove: clue before commit ---- */
{
  D.reset();
  const L=freshLvl();
  const G={props:[],ents:[]};
  const host=mockHost(L,G);
  IX.installChapterI(L,G,host);
  assert(host._sleeper() && host._sleeper().sleeping===1, 'alcove watch starts asleep');
  const bones=G.props.find(p=>p.interact==='alcove_clue');
  const crate=G.props.find(p=>p.interact==='guarded_alcove');
  const actor={x:11,y:61.6,dead:0};
  const clue=IX.resolveInteraction(actor,bones,'read',host);
  assert(clue.ok && clue.committed===false, 'reading the clue does not take the crate');
  assert(!crate.taken, 'crate is still there after the clue');
  assert(D.has('ch1.guarded_alcove','clue') && !D.has('ch1.guarded_alcove','taken'),
    'clue is a discovered fact; taking is not invented');
  assert(host._sleeper().sleeping===1, 'reading does not wake the watch');
  const take=IX.resolveInteraction(actor,crate,'take',host);
  assert(take.ok && take.committed && host._wakes()===1, 'taking wakes the watch');
  assert(host._sleeper().sleeping===0, 'sleeper is awake after commit');
  assert(crate.taken===1 && IX.resolveInteraction(actor,crate,'take',host).reason==='spent',
    'alcove supply is one-time');
}

/* ---- protected cells / props ---- */
{
  const L=freshLvl();
  assert(IX.isProtectedCell(L,36,7)===true, 'ruby door cells are protected');
  assert(IX.isProtectedCell(L,43,7)===true, 'dwarf-mouth cells are protected');
  assert(IX.isProtectedCell(L,36,21)===true, 'lift cells are protected');
  assert(IX.isProtectedCell(L,19,20)===true, 'crush-spot rock is protected');
  assert(IX.isProtectedCell(L,35,35)===true, 'closed secret cells are protected');
  assert(IX.isProtectedCell(L,10,22)===true, 'Chapter I west seal (i<14) stays protected');
  assert(IX.isProtectedCell(L,46,53)===false, 'authored weak-seam cells stay mineable');
  assert(IX.isProtectedProp({k:'rubydoor'})===true, 'ruby door prop is protected');
  assert(IX.isProtectedProp({k:'lift'})===true, 'lift prop is protected');
  assert(IX.isProtectedProp({pin:1,k:'boulder'})===true, 'pin boulders are protected');
  const actor={x:36.5,y:8,dead:0};
  const door={x:36.5,y:7.28,k:'rubydoor',interact:'weak_seam'};
  const blocked=IX.resolveInteraction(actor,door,'mine',mockHost(L,{props:[]}));
  assert(blocked.ok===false && blocked.reason==='protected',
    'resolveInteraction will not mine a progression-critical prop');
}

/* ---- validate / flag ---- */
{
  const L=freshLvl();
  const G={props:[]};
  const host=mockHost(L,G);
  IX.installChapterI(L,G,host);
  const crate=G.props.find(p=>p.interact==='noisy_cache');
  assert(IX.resolveInteraction(null,crate,'take',host).reason==='no-actor', 'missing actor is rejected');
  assert(IX.resolveInteraction({dead:1},crate,'take',host).reason==='no-actor', 'dead actor is rejected');
  assert(IX.resolveInteraction({x:1,y:1},crate,'eat',host).reason==='bad-action', 'unknown action is rejected');
  IX.FLAG=false;
  assert(IX.resolveInteraction({x:1,y:1},crate,'take',host).reason==='flag-off',
    'flag-off rolls back to no authored commit');
  IX.FLAG=true;
}

/* ---- reload: taken props + open grid + discoveries ---- */
{
  const iso=loadIso();
  vm.runInContext(gsSrc, iso);
  const I=iso.Interaction;
  const Disc=iso.Discovery;
  const GS=iso.GameSave;
  Disc.reset();
  const L=freshLvl();
  const hero={id:1,kind:'dwarf',team:'party',hero:1,col:{key:'macar'},x:20.5,y:22,hp:40,maxhp:48};
  const G={ents:[hero],props:[],loot:[],lvl:L,res:{},coin:{cp:0}};
  const host=mockHost(L,G,{Discovery:Disc});
  I.installChapterI(L,G,host);
  const actor={x:45,y:54,dead:0};
  I.resolveInteraction(actor, G.props.find(p=>p.interact==='weak_seam'), 'mine', host);
  I.resolveInteraction({x:26.4,y:80,dead:0}, G.props.find(p=>p.interact==='noisy_cache'), 'take', host);
  const play=GS.captureWorld(G,{nextEid:2});
  assert(play.grid[53][46]==='0', 'opened plug is in the saved grid');
  assert(play.props.filter(p=>p.interact==='weak_seam').every(p=>p.taken===1),
    'spent seam props are saved');
  assert(play.props.find(p=>p.interact==='noisy_cache').taken===1, 'spent cache is saved');
  assert(play.discoveries && play.discoveries.some(d=>d.id==='ch1.weak_seam'),
    'discoveries ride on GameSave v2 as an optional field');

  const L2=freshLvl();
  const G2={
    ents:[{id:1,kind:'dwarf',team:'party',hero:1,col:{key:'macar'},x:1,y:1,hp:40,maxhp:48}],
    props:[], loot:[], lvl:L2
  };
  Disc.reset();
  GS.applyWorld(G2, play);
  assert(L2.grid[53][46]===0, 'reload does not reseal the shortcut');
  assert(G2.props.find(p=>p.interact==='noisy_cache').taken===1,
    'reload does not recreate cache loot');
  assert(Disc.has('ch1.weak_seam','opened') && Disc.has('ch1.noisy_cache','taken'),
    'discoveries restore once and stay idempotent');
  const again=I.resolveInteraction({x:26,y:80}, G2.props.find(p=>p.interact==='noisy_cache'), 'take',
    mockHost(L2,G2,{Discovery:Disc}));
  assert(again.reason==='spent', 'reloaded spent cache still cannot pay out');
}

/* ---- host wiring: SEARCH dual untouched, no ASSET_VER, breakRock path ---- */
assert(/function tryFindSecret\(p, mode\)\{/.test(html), 'tryFindSecret signature is unchanged');
assert(/G\.searching=1; G\.secretSearch=0/.test(html) && /G\.secretSearch=1; G\.searching=0/.test(html),
  'F SEARCH and T SEARCH still toggle separate modes');
assert(/if\(typeof Interaction!=='undefined' && Interaction\.isProtectedCell/.test(html) ||
  /Interaction\.isProtectedCell\(L,i,j\)/.test(html),
  'diggable asks Interaction before generic rock break');
assert(/breakRock\(L,i,j\)/.test(html) && /function breakRock\(L,i,j\)\{/.test(html),
  'host breakRock remains the destruction path');
assert(/function openSecret\(sec\)\{/.test(html), 'host openSecret remains the secret path');
assert(!/ASSET_VER='102'/.test(html), 'ASSET_VER was not bumped past 101');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\ninteraction checks passed');
