'use strict';
/**
 * MAC-09 discovery journal: stable ids, idempotent notes, save, markers.
 * Run: node src/systems/Discovery.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.join(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const src=fs.readFileSync(path.join(__dirname,'Discovery.js'),'utf8');
const gsSrc=fs.readFileSync(path.join(root,'src/saves/GameSave.js'),'utf8');

require('./SystemsReady.js');
require('./Discovery.js');
const D=globalThis.Discovery;
const SR=globalThis.SystemsReady;

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

assert(!!D && typeof D.note==='function' && typeof D.serialize==='function',
  'Discovery exports note / serialize');
assert(D.FLAG===true, 'FLAG default is ON (rollback: FLAG=false or ?discover=0)');
assert(D.use()===true, 'use() is true when FLAG is on');
assert(SR.has('Discovery') && SR.get('Discovery')===D,
  'Discovery declares on SystemsReady');
assert(/src="src\/systems\/Discovery\.js"/.test(html),
  'Discovery is a classic sync tag');
assert(!/type\s*=\s*["']module["']/.test(html), 'index.html still has no type=module');
assert(/ASSET_VER='94'/.test(html), 'ASSET_VER is unchanged');

D.reset();
assert(D.note('not-an-id','seen')===null, 'malformed id is rejected');
assert(D.note('ch1.weak_seam','SEEN')===null, 'malformed fact is rejected');
assert(D.list().length===0, 'rejected notes are not stored');

const a=D.note('ch1.weak_seam','seen',{x:45.3,y:54.1});
assert(a && a.facts[0]==='seen' && a.x===45.3, 'first seen fact is stored with location');
const again=D.note('ch1.weak_seam','seen',{x:1,y:1});
assert(again.facts.filter(f=>f==='seen').length===1 && again.x===45.3,
  'same fact is idempotent and does not move the marker');
assert(D.markers().length===1 && D.markers()[0].id==='ch1.weak_seam',
  'unresolved encountered location gets a marker');

D.note('ch1.weak_seam','opened');
assert(D.has('ch1.weak_seam','opened')===true, 'opened fact is recorded');
assert(D.get('ch1.weak_seam').resolved===true, 'opened resolves the discovery');
assert(D.markers().length===0, 'resolved locations do not keep a solution marker');

D.note('ch1.noisy_cache','taken',{x:26.4,y:80.1});
assert(D.list().every(r=>r.facts.length), 'list only contains actually discovered facts');
assert(!D.has('ch1.guarded_alcove'), 'undiscovered rooms are not invented');

const snap=D.serialize();
assert(Array.isArray(snap) && snap.length===2, 'serialize dumps discovered rows');
D.reset();
assert(D.list().length===0, 'reset clears the journal');
D.restore(snap);
assert(D.has('ch1.weak_seam','opened') && D.has('ch1.noisy_cache','taken'),
  'restore reloads facts');
assert(D.get('ch1.weak_seam').x===45.3, 'restore keeps encounter position');

D.FLAG=false;
assert(D.use()===false, 'FLAG=false rolls the journal off');
assert(D.note('ch1.guarded_alcove','seen')===null, 'flag-off does not record new facts');
assert(D.markers().length===0, 'flag-off hides markers');
assert(D.has('ch1.weak_seam','opened'), 'flag-off does not wipe already-restored facts');
D.FLAG=true;

/* ---- save optional field ---- */
{
  const ctx={ globalThis:{} };
  ctx.globalThis=ctx;
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  vm.runInContext(gsSrc, ctx);
  const GS=ctx.GameSave;
  const Disc=ctx.Discovery;
  Disc.note('ch1.alcove.clue','clue',{x:11,y:61.5});
  const G={
    scene:'play', ch:1,
    ents:[{id:1,kind:'dwarf',team:'party',hero:1,col:{key:'macar'},x:20.5,y:22,hp:40,maxhp:48}],
    props:[], loot:[],
    lvl:{n:1,w:6,h:5,grid:[[1,1,1,1,1,1],[1,0,0,0,1,1],[1,0,1,0,1,1],[1,0,0,0,1,1],[1,1,1,1,1,1]],
      seen:[[0,0,0,0,0,0],[0,1,1,0,0,0],[0,1,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0]],
      flags:{}, secrets:[], wallHP:{}, objs:[]}
  };
  G.ents[0].hero=1;
  const play=GS.captureWorld(G,{nextEid:2});
  assert(play.discoveries && play.discoveries[0].id==='ch1.alcove.clue',
    'captureWorld writes optional play.discoveries');
  Disc.reset();
  GS.applyWorld(G, play);
  assert(Disc.has('ch1.alcove.clue','clue'), 'applyWorld restores discoveries');

  Disc.reset();
  const bare=GS.captureWorld({
    ents:[{id:1,kind:'dwarf',team:'party',hero:1,col:{key:'macar'},x:1,y:1,hp:1,maxhp:1}],
    props:[], loot:[],
    lvl:{n:1,w:6,h:5,grid:G.lvl.grid,seen:G.lvl.seen,flags:{},secrets:[],wallHP:{},objs:[]}
  },{nextEid:2});
  assert(!bare.discoveries || bare.discoveries.length===0,
    'empty journal omits or empties discoveries (old readers stay valid)');
}

assert(/'interact'/.test(fs.readFileSync(path.join(root,'src/saves/GameSave.js'),'utf8')),
  'PROP_COPY allowlists interact so room tags survive reload');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\ndiscovery checks passed');
