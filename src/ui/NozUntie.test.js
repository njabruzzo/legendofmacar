'use strict';
/**
 * Untie Noz: camp four-way only, prompt above the HUD, tap the gnome.
 * Run: node src/ui/NozUntie.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

const ch2=html.slice(html.indexOf('if(n===2){'), html.indexOf('if(n===3){'));
assert(/e\.nozCamp=1/.test(ch2), 'camp four-way goblins are tagged nozCamp');
assert(/e\.nozCamp&&e\.team==='foe'&&!e\.dead/.test(ch2), 'fought waits only on the camp pack');
assert(!/!G\.ents\.some\(e=>e\.kind==='goblin'&&e\.team==='foe'&&!e\.dead\)/.test(ch2),
  'east and south goblins no longer block Untie');
assert(/dist\(p,noz\)<2\.2/.test(ch2), 'Untie range is 2.2 for the stick');
assert(/interact\('Untie Noz'/.test(ch2) && /startTalk\('noz_untie'\)/.test(ch2),
  'freeing still opens the existing Noz talk, not a new quest');
assert(/noz\.tied=0; noz\.sleeping=0/.test(ch2), 'ropes come off and he wakes');

assert(/if\(o\.tied \|\| o\.name==='Noz'\) return false/.test(html),
  'tied Noz is not a lootable corpse');

const onDown=html.match(/function onDown\([\s\S]*?\nfunction onMove/)[0];
assert(/promptBtn&&x>=promptBtn\.x/.test(onDown), 'Untie plate is hit before HUD buttons');
assert(/if\(promptBtn&&x>=promptBtn\.x[\s\S]*?fire\('use'\)[\s\S]*?const b=btnAt/.test(onDown),
  'prompt fires use before Attack / Heal / Throw');

const prompt=html.match(/function drawPromptBtn\([\s\S]*?\n\}/)[0];
assert(/Math\.max\(PORT\?44:40/.test(prompt), 'prompt plate is at least 44px on phone');
assert(/PORT\?Math\.max\(56,56\*s\):Math\.max\(16,16\*s\)/.test(prompt),
  'prompt sits ≥56px above the bar on phone, ≥16px on laptop');

const taps=html.match(/function resolveTaps\([\s\S]*?\n\}/)[0];
assert(/e\.name==='Noz'&&e\.tied/.test(taps) && /fire\('use'\)/.test(taps),
  'tapping bound Noz is Untie, not loot or walk');
assert(taps.indexOf('e.tied') < taps.indexOf('isLootableBody'),
  'tied Noz wins over goblin corpses and piles');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nNoz untie checks passed');
