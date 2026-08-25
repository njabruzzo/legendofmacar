'use strict';
/**
 * Chapter I opening: fallen kin under a ceiling collapse, sparse logical dressing.
 * Run: node src/dungeon/ChapterOneOpening.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

assert(/const spot=CRUSH_SPOTS\[r\.key\]/.test(html), 'crush coordinates live on the spot object');
assert(/const crush=n===1 && !hero && !!spot && !raised/.test(html),
  'crush flag is a boolean; it does not boolean-and the spot away');
assert(/crush\?spot\.x/.test(html) && /crush\?spot\.y/.test(html),
  'fallen-kin spawn reads x/y from the spot, not from the flag');

assert(/p\.tall\?120:52/.test(html) && /spill:1/.test(html) && /backwall:1/.test(html),
  'west collapse spills into the entry and can draw tall rubble');
assert(/function drawCaveinFace\(/.test(html), 'cave-in wall has a jagged rock face, not masonry coping');
assert(fs.existsSync(path.join(__dirname,'../../assets/props/prop_cavein_wall.png')), 'cave-in wall texture on disk');
assert(/L\.spawn=\{x:18\.4,y:21\.8\}/.test(html), 'Macar starts beside the fallen kin');

const ch1=html.match(/if\(n===1\)\{[\s\S]*?if\(n===2\)\{/);
assert(!!ch1, 'chapter I block found');
assert(/14\.62,y:17\.05,k:'timber'/.test(ch1[0]) && /14\.55,y:26\.85,k:'timber'/.test(ch1[0]),
  'broken timbers brace the collapse, not the walkway');
assert(/24\.15,y:15\.25,k:'timber'/.test(ch1[0]) && /24\.35,y:28\.85,k:'timber'/.test(ch1[0]),
  'hall-mouth timbers stay on the north and south lips');
assert(/35\.5,y:12\.5,k:'pillar'/.test(ch1[0]) && /35\.5,y:29\.5,k:'pillar'/.test(ch1[0]),
  'hall colonnade pillars sit on the north and south walls');
assert(!/16\.2,y:16\.65,k:'timber'/.test(ch1[0]), 'start-room walkway is clear of random posts');

assert(/L\.n===1\?4:/.test(html), 'chapter I random dress is sparse');
assert(/1:\[\['rubble',5\],\['orepile',2\],\['bones',2\]/.test(html),
  'chapter I dress table has no random timber, lanterns, or pillars');
assert(/1:\[\['orepile',1\],\['pickpile',1\],\['bones',1\]\]/.test(html),
  'chapter I craft caches stay on the walls and are few');

assert(/pordoom_dead/.test(html) && /macar_back\|\|SPR\.macar/.test(html),
  'title fallback shows Macar standing over the fallen kin');
assert(fs.existsSync(path.join(__dirname,'../../assets/ui/title_splash.jpg')), 'title splash on disk');
assert(fs.existsSync(path.join(__dirname,'../../assets/ui/intro_ch1.jpg')), 'chapter I intro on disk');
assert(fs.existsSync(path.join(__dirname,'../../assets/ui/intro_cavein.jpg')), 'intro cave-in fallback on disk');
assert(/ASSET_VER='56'/.test(html), 'asset version bumped for new splash art');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nchapter I opening checks passed');
