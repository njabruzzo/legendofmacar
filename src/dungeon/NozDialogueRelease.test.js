'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
const c={G:{lvl:{n:2,flags:{}},ents:[]},isMonsterTalkKey:()=>false,isToyTalkKey:()=>false,NPC_TALK:{noz_bell:{line:'trade'},noz_trade_again:{line:'trade again'},noz_untie:{line:'released'}},startTalkObj:p=>c.opened=p.key};
vm.createContext(c);vm.runInContext(['nozDoorDialogueReady','startTalk'].map(n=>html.match(new RegExp('function '+n+'\\([^]*?\\n\\}'))[0]).join('\n'),c);
function blocked(){for(const key of ['noz_bell','noz_trade_again']){c.opened=null;c.startTalk(key);assert.equal(c.opened,null,key+' unavailable');}}
blocked();c.G.lvl.flags.freed=1;blocked();
c.G.lvl.flags.home=1;c.G.ents=[{name:'Noz',tied:1}];blocked();
c.G.ents=[{name:'Noz',team:'party'}];blocked();
c.G.ents=[{name:'Noz',dead:1}];blocked();
c.G.ents=[{name:'Noz',hidden:1,team:'neutral'}];
for(const key of ['noz_bell','noz_trade_again']){c.startTalk(key);assert.equal(c.opened,key);}
c.G.lvl.flags={};c.startTalk('noz_untie');assert.equal(c.opened,'noz_untie','rescue dialogue retained');
assert(html.includes("if(nozDoorDialogueReady(L)&&(dist(p,L.bell)"),'prompt gated');
assert(html.includes('if(!nozDoorDialogueReady(L))return;'),'stale prompt callback gated');
console.log('Noz door dialogue waits for release and return; rescue dialogue stays available');
