'use strict';
/**
 * Chapter maps grew ~30–50% more walkable rooms than main at this work.
 * Scripted rooms stay on the old tiles.
 * Run: node src/dungeon/ChapterScale.test.js
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

function sliceBetween(a,b){
  const start=html.indexOf(a);
  const end=html.indexOf(b, start+a.length);
  if(start<0||end<0) throw new Error('slice fail '+a);
  return html.slice(start,end);
}
function chapterBlock(n){
  const start=html.indexOf('if(n==='+n+'){');
  const end=n<5?html.indexOf('if(n==='+(n+1)+'){', start+1):html.indexOf('sealOuter(L.grid);', start);
  return html.slice(start,end);
}
function carveOnly(block){
  return block.split('\n').filter(line=>{
    return /L\.w=|L\.h=|const g=newGrid|L\.grid=g|rect\(|corridor\(|caveDisk\(|carvePath\(|for\(let j=12|if\(g\[|dressRuinBuildings|L\.dressSeed/.test(line)
      || /g\[j\]\[67\]|g\[16\]|g\[17\]|g\[15\]|g\[40\]|g\[39\]/.test(line);
  }).join('\n');
}

const hashes='function h2(x,y){ let n=(x|0)*374761393+(y|0)*668265263; n=(n^(n>>13))*1274126177; return ((n^(n>>16))>>>0)/4294967295; }\n'
  +'function h3(x,y,s){ let n=(x|0)*374761393+(y|0)*668265263+(s|0)*1442695041; n=(n^(n>>13))*1274126177; return ((n^(n>>16))>>>0)/4294967295; }\n';
const grid=sliceBetween('function newGrid(w,h,f){','function isWalkTile(t){')
  + sliceBetween('function rect(g,x,y,w,h,t){','function paintSeenWalls(L){')
  + sliceBetween('function corridor(g,x1,y1,x2,y2,wd,t){','/* ==========================================================================');
const ruin=sliceBetween('function dressRuinBuildings(L){','function tryFindSecret(p, mode){');
const prelude=hashes+grid+ruin+`
function countFloors(g){ let n=0; for(let y=0;y<g.length;y++) for(let x=0;x<g[y].length;x++){ const t=g[y][x]; if(t===0||t===3||t===4) n++; } return n; }
`;

function floors(n){
  const ctx={ G:{props:[],ents:[]}, Math, Object, console };
  vm.createContext(ctx);
  vm.runInContext(prelude, ctx);
  const src=`
    var L={n:${n},w:0,h:0,grid:null,lights:[],secrets:[]};
    G.props=[];
    ${carveOnly(chapterBlock(n))}
    sealOuter(L.grid);
    ({n:${n},w:L.w,h:L.h,walk:countFloors(L.grid)})
  `;
  return vm.runInContext(src, ctx);
}

/* Walkable tiles on main before this expansion. */
const MAIN_WALK={1:2063, 2:2254, 3:5269, 4:3163, 5:2335};

const SIZE={
  1:{w:114,h:90},
  2:{w:144,h:118},
  3:{w:140,h:114},
  4:{w:132,h:106},
  5:{w:108,h:98}
};

[1,2,3,4,5].forEach(n=>{
  const got=floors(n);
  assert(got.w===SIZE[n].w && got.h===SIZE[n].h, 'Ch '+n+' canvas is '+SIZE[n].w+'×'+SIZE[n].h);
  assert(got.walk>MAIN_WALK[n], 'Ch '+n+' has more floor tiles than main ('+got.walk+' > '+MAIN_WALK[n]+')');
  const gain=got.walk/MAIN_WALK[n];
  assert(gain>=1.28, 'Ch '+n+' walkable area grew ~30%+ ('+got.walk+' / '+MAIN_WALK[n]+' = '+gain.toFixed(2)+')');
  assert(gain<=1.85, 'Ch '+n+' did not balloon into a new generator ('+gain.toFixed(2)+')');
});

const ch1=chapterBlock(1);
assert(/rect\(g,14,14,18,16,0\)/.test(ch1) && /rect\(g,24,7,28,28,0\)/.test(ch1),
  'Ch I start rooms stay on the old tiles');
assert(/L\.rubyDoor=\{x:36\.5,y:7\.28\}/.test(ch1) && /k:'lift'/.test(ch1),
  'ruby door and lift stay findable');
assert(/WINDUP_TOY/.test(ch1) || /winduptoy/.test(ch1), 'Froren toy still sits in Ch I');

const ch2=chapterBlock(2);
assert(/L\.spawn=\{x:40\.15,y:8\.55\}/.test(ch2), 'Ch II drop stays');
assert(/L\.door=\{x:66\.48,y:16\.05\}/.test(ch2) && /k:'bronzedoor'/.test(ch2),
  'bronze door stays');
assert(/L\.stair=\{x:40\.1,y:54\.15\}/.test(ch2), 'south stair stays');
assert(/L\.camp=\{x:40,y:32\}/.test(ch2), 'four-way camp stays');
assert(/kind:'warrens',face:'n'/.test(ch2), 'warren secret stays north');

const ch3=chapterBlock(3);
assert(/L\.spawn=\{x:8,y:28\}/.test(ch3), 'Ch III spawn stays');
assert(/k:'names'/.test(ch3) && /spawnLairGroup\(46,16/.test(ch3),
  'Hall of Names stays');
assert(/FOE\.warden\(\)/.test(ch3) && /b\.x=48;b\.y=39/.test(ch3),
  'Ruby Warden stays the Ch III boss, not a Book I side pack');

const ch4=chapterBlock(4);
assert(/L\.spawn=\{x:8,y:28\}/.test(ch4), 'Ch IV spawn stays');
assert(/FOE\.elderbrain\(\)/.test(ch4) && /b\.x=52; b\.y=42/.test(ch4),
  'Elder Brain stays on the old dais');

const ch5=chapterBlock(5);
assert(/k:'altar'/.test(ch5) && /k:'throne'/.test(ch5), 'altar and throne stay');
assert(/FOE\.king\(\)/.test(ch5) && /k\.x=29;k\.y=16/.test(ch5),
  'Undying King stays on the old tile');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nchapter scale checks passed');
