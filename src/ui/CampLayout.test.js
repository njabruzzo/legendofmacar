'use strict';
/**
 * Camp is a rest screen: short rows, tabs, spelled stores, title high.
 * Run: node src/ui/CampLayout.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

const camp=html.match(/function drawCamp\(g\)\{[\s\S]*?\nfunction drawDead/)[0];
assert(!!camp, 'drawCamp block found');
assert(/goldTitleLine\(g,'CAMP'/.test(camp), 'camp title is CAMP, high, gold');
assert(/cleared/.test(camp) && !/CAMP  ·/.test(camp), 'cleared chapter is a subtitle, not jammed into CAMP');
assert(/id:'repair'/.test(camp) && /id:'improve'/.test(camp) && /id:'craft'/.test(camp) && /id:'other'/.test(camp),
  'actions are tabbed Repair / Improve / Craft / Other');
assert(/campActionName\(a\)/.test(camp), 'rows use a short name');
assert(/costText\(a\.cost\)/.test(camp), 'rows show the spelled cost');
assert(!/a\.grp/.test(camp) || !/fillText\(a\.grp/.test(camp), 'group label is not stacked on the title');
assert(!/fillText\(a\.info/.test(camp), 'info is not stacked on the row');
assert(!/CRAFT SKILLS/.test(camp), 'full skill grid is not the default camp chrome');
assert(/G\.campSkills/.test(camp), 'skills sit behind a Skills affordance');
assert(/'Go deeper'/.test(camp) && /'Save'/.test(camp), 'Save and Go deeper stay');
assert(/Math\.max\(PORT\?50:48/.test(camp), 'Save / Go deeper stay at least 50px on phone');
assert(/menuHits\.unshift\.apply\(menuHits, footHits\)/.test(camp), 'Save hit is tested before camp rows');
assert(/y\+h>footY-6\*s/.test(camp), 'action rows stay above the footer');
assert(/campSaveFlash/.test(camp) && /The book is marked/.test(camp), 'Save shows a visible camp confirmation');
assert(!/Hammer T/.test(camp) && !/Bombs /.test(camp), 'footer does not repeat kit status');

assert(/function campActionTab\(/.test(html) && /tab:'repair'/.test(html) && /tab:'improve'/.test(html),
  'camp actions carry tabs without changing costs');
assert(/cost:\{ironstone:3,deepsilver:1\}/.test(html) && /cost:\{ironstone:2\}/.test(html),
  'hammer improve and repair costs are unchanged');
assert(/\(G\.res\[r\]\|\|0\)>0 \|\| \(extra&&extra\[r\]\)/.test(html), 'stock strip hides zeros and can show the selected cost');
assert(/have\+' '\+m\.n/.test(html) || /have\+' \/ '\+need\+' '\+m\.n/.test(html),
  'stores spell the resource name, no two-letter codes');
assert(!/have\+' '\+m\.s/.test(html), 'stock strip no longer prints letter codes');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\ncamp layout checks passed');
