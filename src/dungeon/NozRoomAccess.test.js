'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
const source=['isNozDoorVoid','sealNozDoorBeyond','positionNozDoor','walk'].map(n=>html.match(new RegExp('function '+n+'\\([^]*?\\n\\}'))[0]).join('\n');
const L={n:2,w:90,h:40,grid:Array.from({length:40},()=>Array(90).fill(1))};
for(let y=12;y<=20;y++)for(let x=68;x<=78;x++)L.grid[y][x]=4;
for(let y=15;y<=17;y++)L.grid[y][67]=4;
const c={G:{lvl:L,props:[]},startCaveInBlocks:()=>false};vm.createContext(c);vm.runInContext(source,c);
c.positionNozDoor(L);
for(const kind of ['dwarf','gnome']){
 for(let y=12;y<=20;y++)for(let x=68;x<=78;x++)assert(c.walk(x+.5,y+.5,{kind}),kind+' room access');
 for(let y=15;y<=17;y++)assert(c.walk(67.5,y+.5,{kind}),kind+' passage access');
 assert(!c.walk(62.5,8.5,{kind}),'door void stays sealed');
 assert(!c.walk(62.5,10.5,{kind}),'north door wall stays solid');
}
assert.equal(L.grid[14][67],1,'masonry beside passage retained');
c.positionNozDoor(L);assert.equal(L.grid[16][67],0,'saved-floor repair is repeatable');
console.log('Noz neighboring room and passage are walkable for dwarves; sealed door remains blocked');
