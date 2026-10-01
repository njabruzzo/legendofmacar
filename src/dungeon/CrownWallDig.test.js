'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
require('../systems/Interaction.js');
const Interaction=globalThis.Interaction;
function fn(name){
 const start=html.indexOf('function '+name+'(');assert(start>=0,name+' exists');
 let depth=0;for(let i=html.indexOf('{',start);i<html.length;i++){
  if(html[i]==='{')depth++;else if(html[i]==='}'&&!--depth)return html.slice(start,i+1);
 }throw Error('unclosed '+name);
}
function level(){return {n:1,w:132,h:90,grid:Array.from({length:90},()=>Array(132).fill(1)),secrets:[{i:105,j:15,w:3,h:1,kind:'teeth',open:0},{i:90,j:15,w:3,h:1,kind:'treasure',open:0}]};}
let opened=0,broken=0,learned=0,spent=0;
const c={G:{lvl:level(),digging:1,digBoost:1},Interaction,
 openSecret(sec){opened++;sec.open=1;for(let i=sec.i;i<sec.i+sec.w;i++)c.G.lvl.grid[sec.j][i]=0;},
 breakRock(){broken++;},learn(k,n){assert.equal(k,'mining');learned+=n;},say(){},hint(){},
 digTerrainAt(){return 'packed';},digTerrainTurns(){return 3;},advanceDungeonTurns(n,noise){assert.equal(noise,'noisy');spent+=n;}};
vm.createContext(c);vm.runInContext(['ch1CrownWallAt','diggable','digTarget','completeDigSquare'].map(fn).join('\n'),c);
for(const i of [105,106,107]){
 c.G.lvl=level();const sec=c.G.lvl.secrets[0];
 assert.equal(c.diggable(c.G.lvl,i,15),false,'generic damage protects crown entrance');
 assert.equal(c.diggable(c.G.lvl,i,15,true),true,'shovel can dig each entrance cell');
 assert.equal(c.digTarget({x:i+.5,y:16.55,fdx:0,fdy:-1}).i,i);
 assert.equal(c.digTarget({x:i+.5,y:16.55,fdx:0,fdy:-1},false),null,'weapon dig cannot bypass entrance');
 c.G.dig={i,j:15};c.G.digging=1;c.G.digBoost=1;
 assert.equal(c.completeDigSquare(c.G.lvl),3);
 assert.equal(sec.open,1);assert(c.G.lvl.grid[15].slice(105,108).every(v=>v===0));
 assert.equal(c.G.dig,null);assert.equal(c.G.digging,0);assert.equal(c.G.digBoost,0);
 assert.equal(c.completeDigSquare(c.G.lvl),0,'cleared timer cannot reopen room');
}
assert.equal(opened,3);assert.equal(broken,0);assert.equal(learned,9);assert.equal(spent,9);
c.G.lvl=level();
assert.equal(c.diggable(c.G.lvl,90,15,true),false,'other closed secrets remain protected');
assert.equal(c.diggable(c.G.lvl,10,15,true),false,'west seal remains protected');
assert.equal(c.diggable(c.G.lvl,36,21,true),false,'lift remains protected');
assert.equal(c.diggable(c.G.lvl,80,20,true),true,'ordinary mining remains available');
c.G.dig={i:80,j:20};c.G.digging=1;c.G.digBoost=0;c.completeDigSquare(c.G.lvl);
assert.equal(broken,1);assert.equal(opened,3);assert.equal(c.G.digging,1,'ordinary mining keeps its toggle');
assert.equal(c.ch1CrownWallAt({n:1},105,15),null,'incomplete level is safe');
assert.equal(c.ch1CrownWallAt({...level(),n:2},105,15),null,'exception is Chapter I only');
console.log('crown wall shovel regression checks passed');
