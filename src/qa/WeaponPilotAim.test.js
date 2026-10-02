const assert=require('node:assert/strict');const{flight}=require('./WeaponPilotAim');
for(const dy of [-35,35])for(const sign of [-1,1])for(const dt of [1/60,.05]){
 const rear={x:180,y:130},muzzle={x:180+sign*80,y:130+dy};const shot=flight(muzzle,rear,180);
 assert.deepEqual(shot.at(0),muzzle);
 for(let t=0;t<=1;t+=dt){const p=shot.at(t);assert(Math.abs((p.x-muzzle.x)*dy-(p.y-muzzle.y)*sign*80)<1e-8);assert(Math.sign(p.x-muzzle.x||sign)===sign);assert.equal(shot.angle,Math.atan2(dy,sign*80));}
 assert(Math.abs(Math.hypot(shot.at(1).x-muzzle.x,shot.at(1).y-muzzle.y)-180)<1e-8);
}
assert.throws(()=>flight({x:0,y:0},{x:0,y:0},10));console.log('Crossbow preview rail alignment passes in all four directions at normal and 50ms frames');
