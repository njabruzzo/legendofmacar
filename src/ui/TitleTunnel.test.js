'use strict';
/**
 * Book One title splash and Chapter I title card: party-in-tunnel art, no door,
 * fantasy display type, entrance copy without a Rouse lecture.
 * Run: node src/ui/TitleTunnel.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
const root=path.join(__dirname,'../..');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

const titlePath=path.join(root,'assets/ui/title_splash.jpg');
const ch1Path=path.join(root,'assets/ui/intro_ch1.jpg');
assert(fs.existsSync(titlePath) && fs.statSync(titlePath).size>200000, 'title splash painting is in-repo');
assert(fs.statSync(titlePath).size>300000, 'title splash is a full party plate, not a stub');
assert(fs.existsSync(ch1Path) && fs.statSync(ch1Path).size>150000, 'Chapter I plate painting is in-repo');

assert(/FONT_DISPLAY='"Cinzel Decorative"/.test(html), 'display face is Cinzel Decorative');
assert(/FONT_QUOTE='"Cormorant Garamond"/.test(html), 'subtitle face is Cormorant Garamond');
assert(/family=Cinzel\+Decorative/.test(html) && /family=Cormorant\+Garamond/.test(html),
  'title fonts are loaded from Google Fonts');
assert(/function displayTitle\(g,txt,y,size,col\)/.test(html), 'title uses a display-title helper');
assert(/function layoutHighPlate\(/.test(html) && /function paintHighPlate\(/.test(html),
  'title and chapter plates share one high-stack layout');
assert(/function highPlateMetrics\(/.test(html) && /ceilK: port\?0\.048:0\.038/.test(html),
  'plate stack starts near the top');
assert(/titleGap: 28\*s/.test(html) && /titleGapMin: 22\*s/.test(html),
  'gold title keeps a generous, not-huge gap before flavor');
const titleFn=html.match(/function drawTitle\(g\)\{[\s\S]*?\n\}/)[0];
assert(/layoutHighPlate\(g, \{/.test(titleFn) && /label:'B O O K   O N E'/.test(titleFn),
  'title splash uses the high-stack helper');
assert(/title:'THE LEGEND OF MACAR'/.test(titleFn), 'Book One display title is in the compact top stack');
assert(/btnFloor=VH-\(PORT\?118:108\)\*s/.test(titleFn), 'title buttons stay on the bottom band');
assert(!/VH\*\(PORT\?0\.155:0\.162\)/.test(titleFn), 'old mid-high title Y is gone');
assert(!/let qy=VH\*\(PORT\?0\.198:0\.188\)/.test(titleFn), 'quote is not a floating mid-dark percentage');
assert(/midGap=16\*s/.test(html), 'chapter-select cards keep air between gold title and flavor');
assert(/B O O K   O N E/.test(titleFn), 'Book One label stays on the splash');
assert(/From simple beginnings Macar would rise to become a hero among dwarves\./.test(html),
  'title flavor is the rise-to-hero line');
assert(!/He went down a miner\. Something else came back up\./.test(html),
  'old miner-came-back quote is gone');
assert(!/woulld/.test(html), 'title flavor uses would, not woulld');
assert(/Enter the Deep/.test(html.match(/function drawTitle\(g\)\{[\s\S]*?\n\}/)[0]),
  'Enter the Deep remains on the title');
assert(/menuBtn\(g,'Chapters'/.test(html.match(/function drawTitle\(g\)\{[\s\S]*?\n\}/)[0]) &&
  /menuBtn\(g,'Credits'/.test(html.match(/function drawTitle\(g\)\{[\s\S]*?\n\}/)[0]),
  'Chapters and Credits remain on the title');
assert(!/Click the ground to walk/.test(html.match(/function drawTitle\(g\)\{[\s\S]*?\n\}/)[0]),
  'title does not paint WASD control-hint clutter');
assert(!/Click anywhere to hear the music/.test(html.match(/function drawTitle\(g\)\{[\s\S]*?\n\}/)[0]),
  'title does not paint the click-for-music prompt over the layout');

const cavern=html.match(/function drawTitleCavern\(g\)\{[\s\S]*?\n\}/)[0];
assert(!/SPR\.rubydoor/.test(cavern), 'title fallback does not billboard the ruby door');
assert(/orbo','pordoom','macar','fendur','talpor/.test(cavern),
  'title fallback still represents all five dwarves');
assert(/livingMacarImg\('macar'\)/.test(cavern) && !/macar_title/.test(cavern) && !/macar_back/.test(cavern),
  'fallback Macar uses the living-Macar idle gate, not title/back stills');

assert(/Your dwarf brothers were killed in the cave-in\. The tunnel behind you collapsed\. You are alone\./.test(html),
  'Chapter I copy is the exact cave-in message');
assert(!/Walk to each of them and Rouse them/.test(html), 'no Rouse tutorial on the entrance card');
assert(!/ruby door waits on this room/.test(html), 'no ruby-door tutorial on the entrance card');
assert(/The Rubble and the Ruby/.test(html), 'Chapter I still keeps its gold title');
assert(/if\(pack\.ask\)/.test(html) && /wrapLines\(g, pack\.ask/.test(html),
  'empty Chapter I ask is skipped in the title-card layout');
assert(!/You are MACAR/.test(html), 'no chapter plate names the player');
const intro=html.match(/const CH_INTRO=\{[\s\S]*?\n\};/);
assert(intro && !/Left, the gem-bronze door/.test(intro[0]),
  'no chapter plate keeps the Left/bronze-door spoiler');
assert(/drawCopyVeil/.test(html), 'chapter cards use a soft veil instead of a gold box');
assert(/Rouse ':'Loot /.test(html), 'walking up still offers Rouse on crushed kin');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nTitle tunnel and Chapter I card checks passed');
