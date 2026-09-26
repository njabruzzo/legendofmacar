'use strict';
/**
 * Ground coin piles blit one sprite slot. The gold disc is only the
 * undecoded fallback baked into that slot.
 * Run: node src/loot/CoinPileSlot.test.js
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

assert(/loot_coins:'assets\/props\/loot_coins\.png'/.test(html),
  'coin pile slot is assets/props/loot_coins.png');
assert(fs.existsSync(path.join(__dirname,'../../assets/props/loot_coins.png')),
  'the current coin pile painting is already in that slot');
const draw=extractFn('drawLoot');
assert(/coinPileSprite\(/.test(draw), 'drawLoot blits the coin pile slot');
assert(!/ellipse\(/.test(draw), 'drawLoot does not paint a coin circle');
assert(!/SPR\.sack/.test(draw), 'a missing coin sheet does not swap to the sack');

const ellipses=[];
const ctx={
  SPR:{},
  TAU:Math.PI*2,
  COIN_PILE_FALLBACK:null,
  document:{
    createElement(){
      const c={width:0, height:0};
      c.getContext=()=>({
        fillStyle:'',
        beginPath(){},
        ellipse(x,y,rx,ry){ ellipses.push([x,y,rx,ry]); },
        fill(){ c.width=64; c.height=40; }
      });
      return c;
    }
  }
};
vm.createContext(ctx);
vm.runInContext(extractFn('coinPileSprite')+'\nthis.coinPileSprite=coinPileSprite;', ctx);
const painted=ctx.SPR.loot_coins={width:128, height:96};
assert(ctx.coinPileSprite()===painted && ellipses.length===0,
  'a ready loot_coins image is the pile, with no disc');
ctx.SPR.loot_coins=null;
const fallback=ctx.coinPileSprite();
assert(fallback && fallback.width===64 && ellipses.length===1,
  'a missing sheet bakes the gold disc once into the slot');
assert(ctx.coinPileSprite()===fallback && ellipses.length===1,
  'the fallback disc is reused, not redrawn');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\ncoin pile slot checks passed');
