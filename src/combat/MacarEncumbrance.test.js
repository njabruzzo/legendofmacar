'use strict';
/**
 * Macar's step is not reduced by carried weight or pack items.
 * Run: node src/combat/MacarEncumbrance.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}
function extractFn(name){
  const start=html.indexOf('function '+name+'(');
  if(start<0) throw new Error('missing '+name);
  let i=html.indexOf('{', start), depth=0;
  for(;i<html.length;i++){
    if(html[i]==='{') depth++;
    else if(html[i]==='}'){ depth--; if(depth===0) return html.slice(start, i+1); }
  }
  throw new Error('unclosed '+name);
}

assert(!/encumbered/i.test(html), 'no encumbered status, text, or icon');
assert(/function macarCarryMoveMul\(/.test(html) && /return 1;/.test(extractFn('macarCarryMoveMul')),
  'carried weight does not scale Macar');
assert(/macarCarryMoveMul\(e\)/.test(extractFn('wornMoveMul')),
  'the step multiplier includes the carry rule');

const heavy=[];
for(let i=0;i<40;i++) heavy.push({n:'Plate Mail', k:'armor', wt:450, gp:400});
const ctx={
  G:{
    equipped:{boots:null, chest:heavy[0], primary:{n:'Maul', k:'weapon', wt:100}},
    packs:{macar:{magic:heavy, potions:[], gems:[], herbs:{}}},
    coin:{cp:0, sp:0, ep:0, gp:80000, pp:200}
  },
  electrumMoveMul(){ return 1; }
};
vm.createContext(ctx);
vm.runInContext(extractFn('macarCarryMoveMul')+';'+extractFn('wornMoveMul')+';', ctx);
const mac={hero:1, col:{key:'macar'}, sp:4, baseSp:4};
const light=ctx.wornMoveMul(mac);
ctx.G.packs.macar.magic=heavy.concat(heavy);
const loaded=ctx.wornMoveMul(mac);
assert(ctx.macarCarryMoveMul(mac)===1, 'a stuffed pack still has carry mul 1');
assert(loaded===light && loaded===1, 'heavy items leave the step multiplier unchanged');
assert(mac.sp===4 && mac.baseSp===4, 'heavy items do not rewrite e.sp');
const step=extractFn('moveStep');
assert(/wornMoveMul/.test(step) && !/pack/.test(step) && !/weight/.test(step),
  'moveStep does not apply a pack or weight penalty of its own');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nMacar encumbrance checks passed');
