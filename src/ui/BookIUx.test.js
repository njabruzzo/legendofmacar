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
assert(labels.includes('Herbs') && labels.includes('Seams'), 'herb-search and secret-search have unique names');
assert(!labels.some((n,i)=>n==='Search'&&labels.indexOf(n)!==i) && !labels.includes('Search'), 'HUD no longer has two Search labels');
assert(new Set(labels).size===labels.length, 'HUD verb labels are unique');
assert(/key:'rally'/.test(block) && /label:'Rally'/.test(block), 'Rally still exists as a HUD skill');
assert(/HUD_OVERFLOW=\{rally:1\}/.test(html), 'Rally is overflow on mobile, not a primary-bar mystery verb');
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
assert(/G\.craftGuide/.test(html) && /G\.craftGuideT/.test(html), 'Craft far from the anvil points a guide arrow');
assert(/5 Rally/.test(html) && /F Herbs/.test(html) && /T Seams/.test(html), 'pause key list matches the bar');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nBook I UX checks passed');
