const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(require('path').join(__dirname,'../../index.html'),'utf8');
const names=['needsWallFaceClear','wallFaceClearAt','wallFaceClear','canBe'];
const grid=Array.from({length:8},()=>Array(8).fill(0));grid[4][3]=1;
const ctx={G:{lvl:{grid}},Math,walk:(x,y)=>grid[Math.floor(y)]?.[Math.floor(x)]===0};vm.createContext(ctx);
vm.runInContext('const WALL_FACE_CLEAR=.72;'+names.map(n=>html.match(new RegExp('function '+n+'\\([\\s\\S]*?\\n\\}'))[0]).join('\n'),ctx);
const actor={hero:true,r:.36,x:3.5,y:3.6};
assert(ctx.wallFaceClearAt(actor.x,actor.y,actor),'visible floor within body clearance is usable');
assert(ctx.wallFaceClear(3.5,3.55,actor),'retreat toward open floor allowed');
assert(ctx.wallFaceClear(3.5,3.63,actor),'approach wall while body still fits');
assert(ctx.canBe(3.5,3.55,actor.r,actor),'escape also passes physical radius checks');
assert(!ctx.canBe(3.5,3.8,actor.r,actor),'physical wall radius remains blocked');
actor.y=3.2;assert(ctx.canBe(3.5,3.6,actor.r,actor),'cross former invisible boundary from open floor');
assert(!ctx.canBe(3.5,3.66,actor.r,actor),'body cannot cross visible masonry');
for(const flip of [false,true]){
 grid[4][3]=0;grid[3][flip?2:4]=1;
 const x=flip?3.38:3.62;
 assert(ctx.canBe(x,3.5,actor.r,actor),'east/west wall approach follows body clearance');
 grid[3][flip?2:4]=0;
}
console.log('Visible floor wall clearance and solid masonry collision passed');
