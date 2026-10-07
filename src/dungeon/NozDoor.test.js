'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(require('path').join(__dirname,'../../index.html'),'utf8');
const fn=n=>html.match(new RegExp('function '+n+'\\([\\s\\S]*?\\n\\}'))[0];
const door={k:'bronzedoor',x:66.48,y:16.05},bell={k:'bell',x:66.48,y:17.42};
const c={G:{props:[door,bell]}};vm.createContext(c);vm.runInContext(fn('isNozDoorVoid')+'\n'+fn('sealNozDoorBeyond')+'\n'+fn('positionNozDoor')+'\n'+fn('bronzeDoorPlaneY'),c);
const L={n:2,grid:Array.from({length:30},()=>Array(80).fill(1))};c.positionNozDoor(L);
assert.equal(door.x,62.5);assert.equal(door.y,11);assert.equal(bell.y,12.2);
for(let x=60;x<=65;x++){assert.equal(L.grid[10][x],1);for(let y=11;y<=13;y++)assert.equal(L.grid[y][x],0);}
assert.equal(c.bronzeDoorPlaneY(door),11);
assert(html.includes('drawIsoPlaneImg(g,img,p.x-1.5,plane,p.x+1.5,plane,'),'door paints along north wall');
assert(html.includes('positionNozDoor(G.lvl);'),'old saves migrate door, bell and backing wall');
console.log('Noz north-wall door, reachable south approach, bell placement and save migration passed');

for(let y=7;y<10;y++)for(let x=60;x<66;x++){assert.equal(L.grid[y][x],2);assert(c.isNozDoorVoid(L,x,y));}
assert(!c.isNozDoorVoid(L,62,11),'door approach remains visible');
