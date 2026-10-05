const assert=require('node:assert/strict'),cycle=require('./WalkCycle');
for(const dt of [1/60,.05]){const seen=new Set();let t=0;for(let i=0;i<Math.ceil(3/dt);i++){seen.add(cycle.phase(t));t+=dt;}assert.equal(seen.size,4);}
assert.equal(cycle.phase(0),0);assert.equal(cycle.phase(1/6+.0001),1);assert.equal(cycle.phase(2/6+.0001),2);assert.equal(cycle.phase(3/6+.0001),3);assert.equal(cycle.phase(4/6+.0001),0);
assert(cycle.PHASES[0].startsWith('Right'));assert(cycle.PHASES[2].startsWith('Left'));console.log('Walk cycle visits both contacts and both passing poses at normal and 50ms frames');
