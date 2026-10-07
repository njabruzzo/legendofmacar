'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
const fn=n=>html.match(new RegExp('function '+n+'\\([\\s\\S]*?\\n\\}'))[0];
const c={G:{lvl:null,props:[]},rect:(g,x,y,w,h,t)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)g[j][i]=t;},hint(){},floorTravelReady:()=>false,endChapter(){c.G.scene='camp';}};vm.createContext(c);vm.runInContext(['openDescentLanding','ensureChapterDescents','useChapterDescent'].map(fn).join('\n'),c);
for(const n of [2,3,4]){
 c.G.lvl={n,w:150,h:120,grid:Array.from({length:120},()=>Array(150).fill(1)),flags:{},objs:[]};c.G.props=[];c.ensureChapterDescents();const L=c.G.lvl,p=c.G.props.find(p=>p.chapterDescent);assert(p&&p.k==='stairs');for(let y=-4;y<=4;y++)for(let x=-4;x<=4;x++)assert.equal(L.grid[Math.floor(p.y)+y][Math.floor(p.x)+x],3,'clear descent landing');
 assert.equal(c.useChapterDescent(),false,'ruby seal blocks exit');c.floorTravelReady=()=>true;if(n>2)assert.equal(c.useChapterDescent(),false,'guardian blocks exit');L.flags.done=1;assert.equal(c.useChapterDescent(),true);assert.equal(c.G.scene,'camp');c.floorTravelReady=()=>false;
 const old=p;c.ensureChapterDescents();assert.equal(c.G.props.filter(p=>p.chapterDescent).length,1,'load repairs without duplicating stairs');assert.equal(c.G.props.find(p=>p.chapterDescent),old);
}
assert(html.includes('tickChapterDescent();'));assert(html.includes('useChapterDescent();return;'));assert(html.includes('bronzeDoorPlaneY(p)'));assert(!/setTimeout\(\(\)=>\{ if\(G.scene==='play'\) endChapter\(\); \},1400\)/.test(html));
console.log('Descent pads, old-save repair, ruby/guardian gating, explicit stairs, and bronze wall-plane rendering passed');

const stairFallback=html.match(/function drawStairWell\([\s\S]*?\n\}/)[0];assert(!/ellipse|arc\(/.test(stairFallback),'stair fallback has no circular pit');assert(!html.includes("if(p.k==='stairs') drawStairWell(g,z,p);"),'loaded stairs have no circular overlay');
