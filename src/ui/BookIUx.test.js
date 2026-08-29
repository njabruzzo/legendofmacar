'use strict';
/**
 * Book I HUD verbs, save-trust hooks, and combat-log feedback.
 * Run: node src/ui/BookIUx.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

const hud=html.match(/const HUDSKILLS=\[[\s\S]*?\];/);
assert(!!hud, 'HUDSKILLS is in index.html');
const block=hud?hud[0]:'';
const labels=[...block.matchAll(/label:'([^']+)'/g)].map(m=>m[1]);
assert(labels.filter(n=>n==='SEARCH').length===2, 'herb-search and secret-search both read SEARCH');
assert(labels.includes('SEARCH'), 'HUD uses SEARCH for both search verbs');
assert(!labels.includes('Herbs') && !labels.includes('Seams') && !labels.includes('Rally'),
  'Herbs, Seams, and Rally labels are gone from the bar');
assert(!/key:'rally'/.test(block), 'Rally is not a HUD skill');
assert(/HUD_OVERFLOW=\{\}/.test(html), 'HUD overflow tray has no Rally icon');
assert(/HUD_TAP=44/.test(html), 'mobile tap target floor is 44px');
assert(/key:'more'/.test(html) && /label:'More'/.test(html), 'mobile overflow More control exists');

assert(/drawLog\(g,s\)/.test(html.match(/function drawPlayPlates\(g\)\{[\s\S]*?\n\}/)[0]),
  'combat log paints on the post-terrain UI layer');
assert(!/drawLog/.test(html.match(/function drawHUD\(g\)\{[\s\S]*?\n\}/)[0]),
  'HUD chrome does not park the combat log in the play field');
assert(/say\(line, hit\?'#ff6a5a':'#9a8a78', 'combat'\)/.test(html), 'to-hit lines go to the combat log');
assert(/ftext\(def\.x,def\.y,'MISS'/.test(html), 'miss numbers are a distinct MISS floater');
assert(/ftext\(e\.x,e\.y,'-'\+amt[\s\S]*?'dmg'\)/.test(html), 'damage numbers are tagged dmg');
assert(/t\.kind==='dmg'\?32/.test(html), 'damage floaters draw larger than miss/to-hit');
assert(/e\.team==='foe' && \(e\.atk>0 || \(e\.engaged && e\.ct>0 && e\.ct<0\.4\)\)/.test(html), 'foes telegraph with a wind-up ring while e.atk is up');

assert(/atForge/.test(html) && /nearestCraftStation\(player\(\),1\.7\)/.test(html), 'Craft dims unless Macar is at the station');
assert(!/fillText\('ANVIL'/.test(html), 'Craft slot does not write ANVIL on top of the icon');
assert(/\{key:'craft', ico:'craft', label:'Craft'\}/.test(html), 'Craft uses the same above-icon title pattern as SEARCH');
assert(/b\.y-R-7\*s/.test(html.match(/function drawSlot\(g,b,s\)\{[\s\S]*?\nfunction drawButtons/)[0]),
  'HUD titles paint above the slot, not on the art');
assert(/G\.craftGuide/.test(html) && /G\.craftGuideT/.test(html), 'Craft far from the anvil points a guide arrow');
assert(!/5 Rally/.test(html) && /F SEARCH/.test(html) && /T SEARCH/.test(html),
  'pause key list has two SEARCH verbs and no Rally icon note');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nBook I UX checks passed');
