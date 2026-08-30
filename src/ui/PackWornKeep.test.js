'use strict';
/**
 * Worn pack rows stay equipped on first tap. Break never deletes them.
 * Run: node src/ui/PackWornKeep.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

function extractFn(name){
  const re=new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}');
  const m=html.match(re);
  if(!m) throw new Error('missing '+name);
  return m[0];
}

const use=extractFn('usePackRow');
assert(/if\(wornSlotOf\(it\)\)\{/.test(use), 'worn tap has its own branch');
assert(/if\(G\.packSel===it\)\{/.test(use) && /unequipPackSlot\(wornSlotOf\(it\)\)/.test(use),
  'second tap on a worn row unequips to pack');
assert(/G\.packSel=it/.test(use.match(/if\(wornSlotOf\(it\)\)\{[\s\S]*?return;/)[0]),
  'first tap on a worn row only selects');
assert(!/G\.packSel=it;\s*if\(G\.packWho==='macar'[\s\S]*if\(wornSlotOf\(it\)\)\{\s*const slot=wornSlotOf\(it\);\s*if\(G\.packSel===it && slot\) unequipPackSlot/.test(use),
  'first tap no longer unequips because packSel was assigned first');

const toggle=extractFn('togglePackSlot');
assert(/if\(G\.packSel===worn\)\{/.test(toggle) && /unequipPackSlot\(slot\)/.test(toggle),
  'doll slot unequips only on a second tap of the worn piece');
assert(/G\.packSel=worn/.test(toggle), 'first doll-slot tap highlights the worn item');

const lock=extractFn('packBreakLock');
assert(/if\(it && wornSlotOf\(it\)\) return 'Take it off first\.'/.test(lock),
  'packBreakLock refuses worn kit before magic / salvage');
assert(/if\(it && wornSlotOf\(it\)\) return null/.test(extractFn('takeOnePackRow')),
  'takeOnePackRow will not pull a worn row into salvage');
assert(/wornSlotOf\(packRowItem\(r\)\)/.test(extractFn('breakDownPackRow')),
  'breakDownPackRow double-checks worn before takeOnePackRow');

const pack=html.match(/function drawPack\(g\)\{[\s\S]*?\nfunction wareCostGp/)[0];
assert(/if\(!locked\) menuHits\.push\(\{x:brkX/.test(pack),
  'locked / worn Break chip has no hit');
assert(/drawChip\(g,dropX,dropY,dropW,dropH,'Drop'/.test(pack),
  'Drop stays on worn rows and still goes to the floor');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\npack worn-keep checks passed');
