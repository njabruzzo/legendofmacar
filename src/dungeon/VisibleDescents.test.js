'use strict';
/**
 * Stairs, lifts, and descent doors sit in expanded rooms so iso walls cannot hide them.
 * Run: node src/dungeon/VisibleDescents.test.js
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

const ch1=chapterBlock(1);
const ch2=chapterBlock(2);
const ch3=chapterBlock(3);
const ch4=chapterBlock(4);

assert(/function bronzeDoorPlaneX\(/.test(html), 'bronze door is an east-wall plane, not a floor billboard');
assert(/function openDescentLanding\(/.test(html), 'descent landings can be recarved to at least 10 by 10');
assert(/if\(k==='stairs'\) return 138\*z/.test(html), 'stair sprites billboard at painted height');
assert(/if\(k==='lift'\) return 118\*z/.test(html), 'lift cage is tall enough to read');
assert(!/k==='gate'\|\|k==='bronzedoor'\|\|k==='altar'\|\|k==='throne'\|\|k==='stairs'/.test(html),
  'stairs are not stretched through arch tileset metrics');
assert(/if\(k==='gate'\|\|k==='bronzedoor'\|\|k==='altar'\|\|k==='throne'\) return pack\.arch/.test(html),
  'bronze door still uses the wall-arch pack');

assert(/L\.lift=\{x:36\.5,y:24\.4\}/.test(ch1), 'chapter I lift sits in the south of the ruby hall');
assert(/k:'lift',s:1\.22/.test(ch1), 'chapter I lift is scaled up');
assert(/rect\(g,32,16,13,16,3\)/.test(ch1), 'chapter I lift pad is a wide south chamber');
assert(/k:'rubypillar'/.test(ch1) && /x:36\.5,y:19\.6/.test(ch1),
  'ruby pillar appears north of the lift, not on the cage');
assert(!/x:36\.5,y:21\.5,k:'lift'/.test(ch1) && !/x:36\.5,y:21\.5,k:'rubypillar'/.test(ch1),
  'lift and pillar no longer share the old hall center');

assert(/caveDisk\(g,40,9,6\.8,5\.6,3\)/.test(ch2), 'chapter II lift landing is a wide north pad');
assert(/L\.lift=\{x:40,y:8\.35\}/.test(ch2) && /k:'lift',s:1\.18/.test(ch2), 'arrival cage is inset from the north wall');
assert(/caveDisk\(g,62,16,6\.4,5\.2,0\)/.test(ch2), 'bronze-door approach is a wide chamber');
assert(/g\[15\]\[67\]=4/.test(ch2) && /g\[16\]\[67\]=4/.test(ch2) && /g\[17\]\[67\]=4/.test(ch2),
  'bronze gap is three tiles high on the east wall');
assert(/rect\(g,32,45,16,16,3\)/.test(ch2) && /caveDisk\(g,40,53,8\.2,6\.6,3\)/.test(ch2),
  'south ruin stair sits in an expanded hall');
assert(/L\.stair=\{x:40\.1,y:51\.6\}/.test(ch2) && /k:'stairs',s:1\.42/.test(ch2),
  'south stairs stand inset from the south wall');

assert(/rect\(g,40,56,16,14,3\)/.test(ch3), 'chapter III south descent is a full hall');
assert(/L\.stair=\{x:48\.1,y:61\.4\}/.test(ch3) && /k:'stairs',s:1\.4/.test(ch3),
  'chapter III stairs sit in that hall, not on the south wall');
assert(/recarve after dressing/.test(ch3) && /rect\(g,40,56,16,14,3\)/.test(ch3),
  'ruin dressing cannot reseal the chapter III descent');
assert(!/setTimeout\(\(\)=>\{ ?if\(G\.scene==='play'\) endChapter/.test(ch3),
  'chapter III no longer auto-ends; the player climbs the stair');
assert(/Climb down to the dead city/.test(ch3) && /The south stair waits/.test(ch3),
  'chapter III stair is visible before the warden falls, usable after');

assert(/L\.h=72/.test(ch4) && /rect\(g,42,56,16,14,3\)/.test(ch4),
  'chapter IV map grew a south stair hall');
assert(/L\.stair=\{x:50\.1,y:61\.2\}/.test(ch4) && /k:'stairs',s:1\.4/.test(ch4),
  'chapter IV stairs sit inset in the new hall');
assert(!/setTimeout\(\(\)=>\{ ?if\(G\.scene==='play'\) endChapter/.test(ch4),
  'chapter IV no longer auto-ends; the player climbs the stair');
assert(/Climb down to the temple/.test(ch4), 'chapter IV stair is the way to the temple');

assert(/caveDisk\(g, last\.x, last\.y, 6\.6, 5\.4, 3\)/.test(html),
  'goblin-king stair den is a wide cave');
assert(/rect\(g, Math\.round\(last\.x-6\), Math\.round\(last\.y-5\), 12, 11, 3\)/.test(html),
  'king-stair den is recarved to a 12 by 11 pad');
assert(/k:'stairs',s:1\.46/.test(html), 'warren stairs are large');
assert(/if\(i===rooms\.length-1\) return/.test(html),
  'the king-stair den stays clear of a lair pack');
assert(/if\(L\.stair\) keep\.push\(\{x:L\.stair\.x,y:L\.stair\.y,r:3\.8\}\)/.test(html),
  'random dress keeps a wide clear ring around stairs');
assert(/if\(L\.lift\) keep\.push\(\{x:L\.lift\.x,y:L\.lift\.y,r:3\.6\}\)/.test(html),
  'random dress keeps a wide clear ring around lifts');
assert(/if\(L\.n===3\|\|L\.n===4\) && !L\.flags\.done/.test(html) ||
      /\(L\.n===3\|\|L\.n===4\) && !L\.flags\.done/.test(html),
  'climb key will not skip the chapter III/IV bosses');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nvisible descent checks passed');
