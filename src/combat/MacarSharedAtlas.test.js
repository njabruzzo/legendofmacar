'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const atlas=require('./MacarSharedAtlas'),motion=require('./MacarMotionAtlas'),idle=require('./MacarIdleAtlas'),shaft=require('./MacarWeaponShaft');
const bindings={macar:'assets/creatures/dwarf_macar.png',macar_w1:'x',macar_w2:'x',macar_atk:'x',macar_atk_contact:'x',macar_axe:'x',macar_axe_w1:'x',macar_axe_w2:'x',macar_axe_atk:'x'};
idle.register(bindings);motion.register(bindings);shaft.register(bindings);atlas.register(bindings);
const root=path.join(__dirname,'../..');
assert(fs.existsSync(path.join(root,atlas.bodyFile)));assert(fs.existsSync(path.join(root,atlas.weaponFile)));
const dirs=['s','se','e','ne','n','sw','w','nw'];
for(const weapon of ['maul','axe'])for(const dir of dirs){
 const selected=[];
 for(let phase=0;phase<4;phase++){
  const key=atlas.select(weapon,{gait:(phase+.5)/4},dir,'walk'),pose=atlas.pose(key);
  assert.equal(pose.weapon,weapon);assert.equal(pose.dir,({sw:'se',w:'e',nw:'ne'}[dir]||dir));assert.equal(pose.col,phase+1);selected.push(key);
 }
 assert.equal(new Set(selected).size,4,'every heading uses four actual walk frames');
 for(const stage of ['idle','attack'])assert.equal(atlas.pose(atlas.select(weapon,{},dir,stage)).stage,stage);
}
for(const key of Object.keys(bindings))if(atlas.pose(key))assert.equal(bindings[key],atlas.bodyFile,'every live maul/axe legacy fallback shares the same body source');
assert.equal(atlas.pose('macar_xbow'),null);assert.equal(atlas.pose('macar_xbow_cycle_front_0'),null);
const buf=fs.readFileSync(path.join(root,atlas.bodyFile));assert.equal(buf.readUInt32BE(16)%6,0);assert.equal(buf.readUInt32BE(20)%5,0);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert(html.includes('await MacarSharedAtlas.slice(img,k,document)'));assert(html.includes("if(e.moving)gaitAdvance(e, dt)"));
console.log('Shared Macar: all eight directions, four gait phases, shared legacy/weapon bodies, grid bounds, and blocked-gait integration passed');
