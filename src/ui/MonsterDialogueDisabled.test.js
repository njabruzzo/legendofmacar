'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
const fn=n=>html.match(new RegExp('function '+n+'\\([\\s\\S]*?\\n\\}'))[0];
const c={G:{},NPC_TALK:{},isToyTalkKey:k=>k.startsWith('toy_')};
vm.createContext(c);vm.runInContext(['isMajorTalkKey','isMonsterTalkKey','majorTalkKey','startTalkObj','startTalk','maybeShamanTalks','maybeGoblinMercy'].map(fn).join('\n'),c);
for(const key of ['spider_lord','goblin_king','goblin_warlord','goblin_chieftain','goblin_boss','kobold_chief','shaman_steel','shaman_hail','shaman_chant','shaman_blood','goblin_mercy','goblin_yield','web_skeleton']){
 c.NPC_TALK[key]={line:'blocked'};c.startTalk(key);assert(!c.G.talk,key);
}
for(const key of ['toy_find','toy_wind','noz_untie','noz_bell','noz_trade_again']){
 c.NPC_TALK[key]={line:'kept'};c.startTalk(key);assert.equal(c.G.talk.key,key);c.G.talk=null;
}
assert.equal(c.majorTalkKey({name:'Goblin King'}),'');
c.maybeShamanTalks({},1);c.maybeGoblinMercy({});assert(!c.G.talk);
assert(!html.includes("interact('Talk to the bones'"));
console.log('Monster dialogue disabled; toy and Noz dialogue preserved');
