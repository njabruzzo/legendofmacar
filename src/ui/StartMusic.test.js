'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
const fn=html.match(/function enterTitleMenu\(\)\{[\s\S]*?\n\}/)[0];
for(const playing of [false,true]){
 const calls=[],ctx={G:{scene:'title'},unlockMusic:()=>calls.push('unlock'),musicIsPlaying:()=>playing,bgm:{play:(id,opts)=>calls.push({id,opts})}};
 vm.createContext(ctx);vm.runInContext(fn+';enterTitleMenu()',ctx);
 assert.equal(ctx.G.scene,'title_menu');assert.equal(calls[0],'unlock');
 assert.equal(calls.length,playing?1:2,'already playing music is not restarted');
 if(!playing){assert.equal(calls[1].id,'title');assert.equal(calls[1].opts.force,true);}
}
console.log('Start unlocks audio, retries stopped title music, and preserves playing music');
