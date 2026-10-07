'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
const start=html.indexOf('function makeChapter'),three=html.slice(html.indexOf('  if(n===3){',start),html.indexOf('  if(n===4){',start)),five=html.slice(html.indexOf('  if(n===5){',start),html.indexOf('function spawnLairGroup'));
for(const kind of ['beholder','warden','drowMage','drowElite','hookedhorror','drider','umberhulk','roper','otyugh','wraith','minotaur','troll','cloaker','basilisk','cockatrice']){
assert(!three.includes("'"+kind+"'")&&!three.includes('FOE.'+kind+'()'),kind+' removed from Level 3');assert(five.includes("'"+kind+"'"),kind+' appears later');}
const c={G:{ents:[{kind:'beholder',team:'foe',x:3,y:4},{kind:'warden',team:'foe',x:5,y:6},{kind:'beholder',team:'party',x:2,y:2}]},FOE:{orc:()=>({kind:'orc',hp:20}),construct:()=>({kind:'construct',hp:30})}};
vm.createContext(c);vm.runInContext(html.match(/function easeLevelThreeEncounters\([\s\S]*?\n\}/)[0],c);c.easeLevelThreeEncounters({n:3});assert.equal(c.G.ents[0].kind,'orc');assert.equal(c.G.ents[1].kind,'construct');assert.equal(c.G.ents[0].x,3);assert.equal(c.G.ents[2].kind,'beholder','party retained');
console.log('Heavy Level 3 species moved to Level 5, lighter guardian and old-save migration passed');
