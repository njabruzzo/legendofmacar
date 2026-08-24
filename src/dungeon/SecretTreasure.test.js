'use strict';
/**
 * Every chapter has a SEARCH secret that opens a DMG hoard vault.
 * Run: node src/dungeon/SecretTreasure.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

function chapterBlock(n){
  const start=html.indexOf('if(n==='+n+'){');
  const next=html.indexOf('if(n==='+(n+1)+'){', start+1);
  const end=html.indexOf('sealOuter(L.grid);', start);
  const cut=next>0&&(end<0||next<end)?next:(end>0?end:html.length);
  return start>=0?html.slice(start, cut):'';
}

[1,2,3,4,5].forEach(n=>{
  const block=chapterBlock(n);
  assert(block.length>80, 'chapter '+n+' block found');
  assert(/kind:'treasure'/.test(block) || /addSecretDoor\(L,\{[^}]*kind:'treasure'/.test(block),
    'chapter '+n+' registers a treasure secret door');
});

assert(/function addSecretDoor\(/.test(html), 'addSecretDoor helper');
assert(/function buildSecretTreasureRoom\(/.test(html), 'buildSecretTreasureRoom helper');
assert(/function secretHoardLetter\(/.test(html), 'secretHoardLetter picks a DMG type');
assert(/function placeSecretHoard\(/.test(html), 'placeSecretHoard rolls the hoard onto the floor');
assert(/if\(sec\.kind==='treasure'\)/.test(html), 'openSecret branches to the treasure vault');
assert(/rollLair\(letter\)/.test(html) && /hoardToPile\(hoard\)/.test(html),
  'hidden vault uses DMG lair tables');
assert(/tables=\{1:\['B','C'\],2:\['C','D'\],3:\['D','E'\],4:\['E','F','I'\],5:\['F','G'\]\}/.test(html),
  'secret types scale by chapter from DMG A–I lair letters');
assert(/Hidden hoard \(type /.test(html), 'loot pile is labeled with the rolled type');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nsecret treasure checks passed');
