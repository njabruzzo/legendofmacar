'use strict';
/**
 * MAC-01 world save: reload equivalence, migration, and write recovery.
 * Run: node src/saves/GameSaveWorld.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
const src=fs.readFileSync(path.join(__dirname,'GameSave.js'),'utf8');

function loadGS(){
  const ctx={ globalThis:{} };
  ctx.globalThis=ctx;
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return ctx.GameSave;
}

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

function memStore(init){
  const s=Object.assign({}, init||{});
  return {
    data:s,
    setItem(k,v){
      if(this._quota && this._quota.test && this._quota.test(k)){
        const err=new Error('QuotaExceededError');
        err.name='QuotaExceededError';
        throw err;
      }
      if(this._interrupt && this._interrupt.test && this._interrupt.test(k)){
        this.data[k]='{"truncated":';
        const err=new Error('interrupted');
        throw err;
      }
      this.data[k]=String(v);
    },
    getItem(k){ return Object.prototype.hasOwnProperty.call(this.data,k) ? this.data[k] : null; },
    removeItem(k){ delete this.data[k]; }
  };
}

function freshWorld(){
  const grid=[
    [1,1,1,1,1,1],
    [1,0,0,0,1,1],
    [1,0,1,0,1,1],
    [1,0,0,0,1,1],
    [1,1,1,1,1,1]
  ];
  const seen=[
    [0,0,0,0,0,0],
    [0,1,1,0,0,0],
    [0,1,0,0,0,0],
    [0,0,0,0,0,0],
    [0,0,0,0,0,0]
  ];
  const hero={
    id:1, kind:'dwarf', team:'party', hero:1, col:{key:'macar'},
    name:'MACAR', x:1.5, y:1.5, hp:40, maxhp:48, dead:false
  };
  const kin={
    id:2, kind:'dwarf', team:'party', col:{key:'pordoom'},
    name:'PORDOOM', x:1.4, y:2.2, hp:0, maxhp:36, dead:1, crushed:1, corpse:1
  };
  const gob={
    id:10, kind:'goblin', team:'foe', name:'Goblin', sprite:'goblin',
    x:3.2, y:1.8, hp:9, maxhp:22, dead:false, aggro:4, glow:'#6a8a4a'
  };
  const corpse={
    id:11, kind:'rat', team:'foe', name:'Cave Rat', sprite:'rat',
    x:2.4, y:2.6, hp:0, maxhp:14, dead:1, corpse:1, looted:0
  };
  const loot={
    id:20, x:2.4, y:2.6, kind:'coins', coins:{cp:8}, gems:0, jew:0,
    potions:[], items:[], label:'Cave Rat', glow:'#ffd27a', _corpse:11
  };
  return {
    scene:'play', ch:1, unlocked:1, cleared:{},
    coin:{cp:8,sp:0,ep:0,gp:0,pp:0}, res:{}, packs:{macar:{ammo:4}},
    equipped:{}, charXp:{}, abil:{}, ghostAllies:{}, borrowed:[], taught:{},
    day:1, dayClock:0, pordoomGiftDay:0, macarGearReady:0, gnomeGift:false,
    bombs:1, ales:1, kills:1,
    ents:[hero, kin, gob, corpse],
    props:[
      {x:1.2,y:1.1,k:'lantern'},
      {x:3.5,y:2.5,k:'crate',taken:1,gone:1,craft:1},
      {x:2.0,y:1.8,k:'timber',s:0.9},
      {x:27.8,y:24.6,k:'trap',trap:'trap_pit'},
      {x:32.4,y:16.8,k:'trap',trap:'trap_runes'},
      {x:15.08,y:18.72,k:'timber',fallen:1,s:0.70,seed:72,cover:1},
      {x:14.22,y:16.4,k:'cavein',s:1.12,seed:960,backwall:1},
      {x:14.38,y:16.8,k:'dust',s:0.70,seed:940,backwall:1},
      {x:15.15,y:19.85,k:'rubble',spr:'rubble2',s:0.38,seed:1100,scatter:1}
    ],
    loot:[loot],
    lvl:{
      n:1, w:6, h:5, grid, seen,
      flags:{broke:1, touched:1},
      secrets:[{i:3,j:2,kind:'treasure',open:1,hinted:1}],
      wallHP:{'2,2':{hp:40,max:120}},
      objs:[{t:'Wake the fallen',d:1},{t:'Touch the ruby door',d:1}],
      warrenSeed:11, dressSeed:22,
      spawn:{x:1.5,y:1.5}
    }
  };
}

const GS=loadGS();

/* ---------- capture / reload equivalence ---------- */
{
  const G=freshWorld();
  const play=GS.captureWorld(G, {nextEid:21});
  assert(!!play && play.n===1 && play.w===6 && play.h===5, 'captureWorld records chapter identity');
  assert(play.ents.length===2 && play.ents[0].id===10 && play.ents[0].sid==='goblin#10', 'world ents keep numeric EID and stable sid');
  assert(play.party.length===2 && play.party[0].key==='macar' && play.party[1].crushed===true, 'roster party is separate from world ents');
  assert(play.loot[0]._corpse===11 && play.loot[0].id===20, 'loot keeps corpse EID reference');
  assert(play.grid[2][2]==='1' && play.seen[1].slice(1,3)==='11', 'grid and explored cells are packed');
  assert(play.wallHP['2,2'].hp===40, 'wall HP is captured');
  assert(play.props[1].gone===1 && play.props[1].taken===1, 'scavenged props are captured');
  {
    const pit=play.props.find(p=>p.k==='trap'&&p.trap==='trap_pit');
    const rune=play.props.find(p=>p.k==='trap'&&p.trap==='trap_runes');
    const fallen=play.props.find(p=>p.k==='timber'&&p.fallen===1);
    const cavein=play.props.find(p=>p.k==='cavein'&&p.backwall===1);
    const dust=play.props.find(p=>p.k==='dust'&&p.backwall===1);
    const scatter=play.props.find(p=>p.k==='rubble'&&p.scatter===1);
    assert(!!pit && !!rune, 'captureWorld keeps pit and rune trap types');
    assert(!!fallen && fallen.cover===1, 'captureWorld keeps fallen timber identity');
    assert(!!cavein && !!dust, 'captureWorld keeps backwall cavein and dust identity');
    assert(!!scatter && scatter.spr==='rubble2', 'captureWorld keeps scatter rubble identity');
  }
  assert(play.kills===1 && play.nextEid===21, 'kill count and next EID are captured');

  const mutated=freshWorld();
  mutated.ents=[{id:99,kind:'dwarf',team:'party',hero:1,col:{key:'macar'},x:4,y:4,hp:1,maxhp:48}];
  mutated.props=[{x:0,y:0,k:'lantern'}];
  mutated.loot=[];
  mutated.kills=0;
  mutated.lvl.grid=mutated.lvl.grid.map(r=>r.map(()=>1));
  mutated.lvl.seen=mutated.lvl.seen.map(r=>r.map(()=>0));
  mutated.lvl.wallHP={};
  mutated.lvl.objs=[{t:'Wake the fallen',d:0},{t:'Touch the ruby door',d:0}];

  const applied=GS.applyWorld(mutated, play);
  assert(applied.grid && applied.seen && applied.wallHP && applied.ents && applied.loot && applied.props, 'applyWorld restores every audited world field');
  assert(mutated.lvl.grid[1][1]===0 && mutated.lvl.grid[2][2]===1, 'terrain reload matches the snapshot');
  assert(mutated.lvl.seen[1][1]===1 && mutated.lvl.seen[1][2]===1 && mutated.lvl.seen[3][3]===0, 'explored cells reload');
  assert(mutated.lvl.wallHP['2,2'].hp===40, 'wall HP reload');
  const gob=mutated.ents.find(e=>e.kind==='goblin');
  const rat=mutated.ents.find(e=>e.kind==='rat');
  assert(gob && gob.id===10 && gob.hp===9 && gob.x===3.2, 'living foe identity and HP reload');
  assert(rat && rat.id===11 && rat.dead===true && rat.corpse===true, 'corpse identity reloads');
  assert(mutated.loot[0]._corpse===11 && mutated.loot[0].id===20, 'corpse loot still points at the same EID');
  assert(mutated.props[1].k==='crate' && mutated.props[1].gone===1, 'taken prop stays gone');
  {
    const pit=mutated.props.find(p=>p.k==='trap'&&p.trap==='trap_pit');
    const rune=mutated.props.find(p=>p.k==='trap'&&p.trap==='trap_runes');
    const fallen=mutated.props.find(p=>p.k==='timber'&&p.fallen===1);
    const cavein=mutated.props.find(p=>p.k==='cavein'&&p.backwall===1);
    const dust=mutated.props.find(p=>p.k==='dust'&&p.backwall===1);
    const scatter=mutated.props.find(p=>p.k==='rubble'&&p.scatter===1);
    assert(!!pit && pit.trap!==undefined, 'Continue keeps trap_pit (does not fall back to spikes)');
    assert(!!rune && rune.trap==='trap_runes', 'Continue keeps trap_runes');
    assert(!!fallen && fallen.fallen===1, 'Continue keeps fallen timber');
    assert(!!cavein && cavein.backwall===1 && !!dust && dust.backwall===1, 'Continue keeps backwall cavein and dust');
    assert(!!scatter && scatter.scatter===1, 'Continue keeps scatter rubble');
    assert(!mutated.props.some(p=>p.k==='trap'&&p.trap==null), 'no trap reloads with a stripped type');
  }
  assert(mutated.kills===1 && mutated.lvl.objs[0].d===true, 'kills and objective bits reload');
  const macar=mutated.ents.find(e=>e.col&&e.col.key==='macar');
  assert(macar && macar.x===1.5 && macar.hp===40, 'party overlay restores Macar');
}

/* ---------- write / read v2 + compatible v1 mirror ---------- */
{
  const G=freshWorld();
  const play=GS.captureWorld(G, {nextEid:21});
  const snap=GS.snapshot(G, {scene:'play', play});
  const store=memStore();
  store.data[GS.KEY_V1]=JSON.stringify({v:1, ch:1, at:1, play:{x:0,y:0}, coin:{gp:1}});
  assert(GS.write(store, snap)===true, 'v2 write commits');
  const got=GS.read(store);
  assert(got && got.v===2 && got.schemaVersion===2 && got.play.ents[0].id===10, 'read returns schema v2 world');
  {
    const pit=got.play.props.find(p=>p.k==='trap'&&p.trap==='trap_pit');
    const rune=got.play.props.find(p=>p.k==='trap'&&p.trap==='trap_runes');
    const fallen=got.play.props.find(p=>p.fallen===1);
    const backwall=got.play.props.find(p=>p.backwall===1);
    const scatter=got.play.props.find(p=>p.scatter===1);
    assert(!!pit && !!rune && !!fallen && !!backwall && !!scatter,
      'Continue slot roundtrips pit/rune/fallen/backwall/scatter');
  }
  assert(store.data[GS.KEY_V1], 'legacy v1 key is still present after v2 commit');
  const v1=JSON.parse(store.data[GS.KEY_V1]);
  assert(v1.v===1 && !v1.play.ents && !v1.play.grid, 'v1 mirror is a compatible old-reader snapshot');
  assert(v1.play.x===1.5 && v1.play.party[0].key==='macar', 'v1 mirror keeps old play fields');
  assert(!store.data[GS.KEY_PENDING], 'pending scratch is cleared after commit');
  assert(store.data[GS.KEY_GOOD], 'last-known-good is written after commit');
}

/* ---------- flag-off stays on v1 ---------- */
{
  const GS2=loadGS();
  GS2.setWorldSchema(false);
  const G=freshWorld();
  const play=GS2.captureWorld(G, {nextEid:21});
  const snap=GS2.snapshot(G, {scene:'play', play});
  assert(snap.v===1 && snap.schemaVersion===1 && !snap.play.ents, 'flag-off snapshot is legacy-shaped');
  const store=memStore();
  store.data[GS2.KEY]=JSON.stringify({v:2, schemaVersion:2, ch:9, play:{x:99,y:99,ents:[{id:1}]}});
  store.data[GS2.KEY_V1]=JSON.stringify({v:1, ch:2, play:{x:4,y:5}, at:2});
  assert(GS2.write(store, snap)===true, 'flag-off writes the v1 key');
  const got=GS2.read(store);
  assert(got && got.v===1 && got.ch===1 && got.play.x===1.5, 'flag-off reads v1 only');
  assert(JSON.parse(store.data[GS2.KEY]).ch===9, 'flag-off does not touch the v2 slot');
}

/* ---------- migrate v1; never delete it ---------- */
{
  const store=memStore();
  const legacy={
    v:1, at:50, scene:'play', ch:2, unlocked:2,
    coin:{gp:12}, packs:{macar:{ammo:3}},
    play:{x:40.2,y:32.1,hp:20,maxhp:48,flags:{placed:1},secrets:[],loot:[],party:[{key:'macar',x:40.2,y:32.1,hp:20}]}
  };
  store.setItem(GS.KEY_V1, JSON.stringify(legacy));
  const got=GS.read(store);
  assert(got && got.v===2 && got.schemaVersion===2 && got.migratedFrom===1, 'v1 migrates to schema v2 in memory');
  assert(got.play.x===40.2 && got.play.ents==null, 'migrated play keeps old fields and omits missing world state');
  assert(store.data[GS.KEY_V1], 'migration does not delete the v1 save');
  assert(!store.data[GS.KEY], 'migration does not invent a v2 slot');
}

/* ---------- malformed live → pending → good ---------- */
{
  const G=freshWorld();
  const goodSnap=GS.snapshot(G, {scene:'play', play:GS.captureWorld(G,{nextEid:21})});
  const store=memStore();
  GS.write(store, goodSnap);
  const goodRaw=store.data[GS.KEY];
  store.data[GS.KEY]='{not-json';
  const fromGood=GS.read(store);
  assert(fromGood && fromGood.play.ents[0].id===10, 'corrupt live falls back to last-known-good');

  store.data[GS.KEY]='{not-json';
  delete store.data[GS.KEY_GOOD];
  const newer=GS.clone(goodSnap);
  newer.play.x=9.9;
  store.data[GS.KEY_PENDING]=JSON.stringify(newer);
  const fromPend=GS.read(store);
  assert(fromPend && fromPend.play.x===9.9, 'corrupt live with no good uses a valid pending write');
}

/* ---------- interrupted live write leaves old save, recovers pending if live dies ---------- */
{
  const G=freshWorld();
  const snap=GS.snapshot(G, {scene:'play', play:GS.captureWorld(G,{nextEid:21})});
  const store=memStore();
  GS.write(store, snap);
  const oldLive=store.data[GS.KEY];
  store._interrupt=/legendofmacar\.save\.v2$/;
  const next=GS.clone(snap);
  next.play.x=7.7;
  assert(GS.write(store, next)===false, 'interrupted live write returns false');
  store._interrupt=null;
  assert(store.data[GS.KEY]==='{"truncated":' || store.data[GS.KEY]===oldLive, 'interrupted write does not commit a valid new live slot');
  const recovered=GS.read(store);
  assert(recovered && (recovered.play.x===7.7 || recovered.play.x===1.5), 'read recovers pending or last-known-good after interrupt');
}

/* ---------- quota failure does not clobber last-known-good / v1 ---------- */
{
  const G=freshWorld();
  const snap=GS.snapshot(G, {scene:'play', play:GS.captureWorld(G,{nextEid:21})});
  const store=memStore();
  GS.write(store, snap);
  const v1Before=store.data[GS.KEY_V1];
  const liveBefore=store.data[GS.KEY];
  const goodBefore=store.data[GS.KEY_GOOD];
  store._quota=/legendofmacar\.save\.v2$/;
  const next=GS.clone(snap);
  next.play.x=8.25;
  next.coin={gp:99};
  assert(GS.write(store, next)===false, 'quota on live returns false');
  assert(store.data[GS.KEY]===liveBefore, 'quota failure leaves the live v2 slot intact');
  assert(store.data[GS.KEY_GOOD]===goodBefore, 'quota failure leaves last-known-good intact');
  assert(store.data[GS.KEY_V1]===v1Before, 'quota failure does not delete or rewrite the old v1 save');
}

/* ---------- malformed / wrong version rejected ---------- */
{
  const store=memStore();
  store.setItem(GS.KEY, JSON.stringify({v:99, ch:1, play:{}}));
  store.setItem(GS.KEY_GOOD, 'null');
  store.setItem(GS.KEY_PENDING, JSON.stringify({v:2, play:{ents:'nope'}}));
  assert(GS.read(store)===null, 'malformed and unknown-version slots are rejected');
}

/* ---------- old reader contract on the v1 mirror ---------- */
{
  const G=freshWorld();
  const store=memStore();
  GS.write(store, GS.snapshot(G, {scene:'play', play:GS.captureWorld(G,{nextEid:21})}));
  const raw=store.data[GS.KEY_V1];
  const old=JSON.parse(raw);
  assert(old.v===1, 'old GameSave.read (v===1) accepts the mirror');
  assert(old.play.flags.touched===1 && old.play.party.length===2, 'old applyPlaySave can still read flags and party');
}

/* ---------- host wiring + no forbidden integrations ---------- */
assert(/function remakeSavedEnt\(/.test(html), 'host remakes saved ents through ent()');
assert(/sv\.id!=null\) e\.id=sv\.id/.test(html), 'host preserves numeric EID on remake');
assert(!/TimedEffects/.test(html.match(/function applyPlaySave\([\s\S]*?\nfunction loadSavedGame/)[0]), 'applyPlaySave does not pull in TimedEffects');
assert(!/ASSET_VER/.test(src), 'GameSave.js does not touch ASSET_VER');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nGameSave world checks passed');
