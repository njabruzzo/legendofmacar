'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(require('path').join(__dirname,'../../index.html'),'utf8');
const fn=n=>html.match(new RegExp('function '+n+'\\([\\s\\S]*?\\n\\}'))[0];
const events=[],gained={},painted=[];
const ctx={TAU:Math.PI*2,EID:1,PACK_DROP_HOLD_R:1.6,ZOOM:1,G:{lvl:{flags:{}},talk:null,loot:[],elapsed:0},
 sfx:{explosion(){events.push('boom');}},burst(){},shake(){},say(){},canBe:(x,y)=>x<4.5,
 dist:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),lootLabel:p=>p.label,ensureLoot(){},
 gain:(k,n)=>gained[k]=(gained[k]||0)+n,convertHoard(){},packGainNote(){},
 SPR:Object.fromEntries(['gear','spring','emerald'].map(k=>['loot_'+k,{width:96,kind:k}])),
 w2s:(x,y)=>({x,y}),softShadow(){},emit(){},drawBillboard:(g,img)=>{painted.push(img.kind);return true;}};
vm.createContext(ctx);vm.runInContext(['floorItemSpot','explodeWindupToy','spawnLoot','nearestLoot','takeLoot','drawLoot'].map(fn).join('\n'),ctx);
const spawn=ctx.spawnLoot;ctx.spawnLoot=(...args)=>{events.push('drop');return spawn(...args);};
const toy={x:4,y:5};assert(ctx.explodeWindupToy(toy));assert(!ctx.explodeWindupToy(toy));
const drops=ctx.G.loot;assert.equal(drops.length,3);assert.equal(toy.gone,1);assert(ctx.G.lvl.flags.toyDestroyed);
assert.deepEqual(events,['boom','drop','drop','drop'],'once-only boom precedes the drops');
assert.equal(new Set(drops.map(p=>p.x+','+p.y)).size,3,'three separated floor positions');
assert(drops.every(p=>ctx.canBe(p.x,p.y)&&p.dropHold),'parts are on clear floor and held visible');
assert.deepEqual(Object.assign({},...drops.map(p=>JSON.parse(JSON.stringify(p.res)))),{gear:1,spring:1,emerald:1});
for(const p of drops)ctx.drawLoot({save(){},restore(){},translate(){}},p);
assert.deepEqual(painted,['gear','spring','emerald'],'three part-specific images reach the floor renderer');
assert.equal(ctx.nearestLoot(toy,2),null,'fresh salvage is not instantly autolooted');
ctx.nearestLoot({x:8,y:8},.1);assert(drops.every(p=>!p.dropHold),'walking away releases pickup hold');
for(const p of [...drops]){assert.equal(ctx.nearestLoot(p,.1),p);ctx.takeLoot(p,true);ctx.takeLoot(p,true);}
assert.deepEqual(gained,{gear:1,spring:1,emerald:1},'normal pickups grant exactly one of each crafting resource');
assert.equal(ctx.G.loot.length,0);
require('../crafting/CraftingEngine');const engine=globalThis.CraftingEngine;
const book=JSON.parse(fs.readFileSync(require('path').join(__dirname,'../crafting/recipes.json'),'utf8'));engine.setRecipes(book.recipes);
const r=engine.get('emerald_clockwork_bolts');assert(r);assert.deepEqual(r.ingredients,{spring:1,gear:1,emerald:1});assert.equal(r.output.field,'ammo');
console.log('Once-only boom, three visible clear-floor salvage drops, hold and exact pickups passed');
