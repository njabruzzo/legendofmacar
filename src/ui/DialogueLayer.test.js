'use strict';
/**
 * Dialogue, speech, hint, and inspect plates are the highest UI layer:
 * they paint after walls / terrain, and sit at the top of the screen.
 * Run: node src/ui/DialogueLayer.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

assert(/function beginUiLayer\(g\)\{/.test(html), 'beginUiLayer resets transform and composite');
assert(/g\.setTransform\(DPR,0,0,DPR,0,0\)/.test(html.match(/function beginUiLayer\(g\)\{[\s\S]*?\n\}/)[0]),
  'UI layer starts in screen space, not camera space');
assert(/globalCompositeOperation='source-over'/.test(html.match(/function beginUiLayer\(g\)\{[\s\S]*?\n\}/)[0]),
  'UI layer does not inherit a multiply / clip from masonry');

assert(/function drawPlayPlates\(g\)\{/.test(html), 'drawPlayPlates is the post-terrain UI pass');
const plates=html.match(/function drawPlayPlates\(g\)\{[\s\S]*?\n\}/)[0];
assert(/drawTalk\(g\)/.test(plates) && /drawHint\(g,s\)/.test(plates) &&
  /drawInspect\(g,s\)/.test(plates) && /drawPromptBtn\(g,s\)/.test(plates) &&
  /drawLog\(g,s\)/.test(plates),
  'talk, hint, inspect, prompt, and combat log all ride the post-terrain pass');

const hud=html.match(/function drawHUD\(g\)\{[\s\S]*?\n\}/)[0];
assert(!/drawTalk/.test(hud) && !/drawHint/.test(hud) && !/drawInspect/.test(hud) &&
  !/drawPromptBtn/.test(hud),
  'HUD chrome no longer paints dialogue under a later wall pass');

const render=html.slice(html.indexOf('function render(){'), html.indexOf('function drawWorld('));
const order=['drawWorld(','drawBeyondMask(','drawCrushCover(','drawHUD(','drawPlayPlates('];
let last=-1;
order.forEach(name=>{
  const i=render.indexOf(name);
  assert(i>=0, 'render still calls '+name.replace('(',''));
  assert(i>last, name.replace('(','')+' paints after the previous world/UI pass');
  last=i;
});
assert(/drawPlayPlates\(g\);\n  \}catch/.test(html),
  'play plates are the last paint in the frame, after pause and masonry');
assert(!/if\(G\.scene==='pack'\)\{ drawPack\(g\); drawTalk\(g\); \}/.test(html),
  'pack talk is not a second, earlier draw');

const talk=html.match(/function drawTalk\(g\)\{[\s\S]*?\n\}/)[0];
assert(/y=Math\.max\(10\*s, \(inset\.t\|\|0\)\+10\*s\)/.test(talk),
  'talk plate is pinned to the top of the screen');
assert(!/y=VH\*0\.18/.test(talk), 'talk plate is not parked in the masonry band');
assert(/fillStyle='#0a0705'/.test(talk) && /carveFrame\(g,x,y,w,h,8,1\)/.test(talk),
  'talk plate is an opaque slab so masonry cannot show through');
assert(/G\.talk=null/.test(html.match(/function startChapter\(n\)\{[\s\S]*?G\.lvl=makeChapter/)[0]),
  'a new chapter drops any leftover talk plate');

const hint=html.match(/function drawHint\(g,s\)\{[\s\S]*?\n\}/)[0];
assert(/y=Math\.max\(10\*s, \(UI\.pad&&UI\.pad\.t\|\|0\)\+10\*s\)/.test(hint),
  'hint plate is pinned to the top of the screen');
assert(!/PORT\?VH\*0\.30:VH\*0\.16/.test(hint), 'hint is not parked mid-viewport behind walls');
assert(/if\(PORT\)/.test(hint) && /partyPortraitFrame\(/.test(hint) && /miniRect\(/.test(hint),
  'phone portrait parks the hint under the party cards, clear of the corner');

const vm=require('vm');
const campLine='Macar camps. Rations ran short; 2 went unhealed. The book is marked.';
const phone={
  VW:390, VH:844, PORT:true,
  UI:{pad:{t:0}, hudTop:620},
  G:{hint:{t:campLine, life:4, max:5}},
  clamp:(v,a,b)=>v<a?a:v>b?b:v,
  plate(g,x,y,w){ phone.box={x,y,w}; }
};
const g={
  globalAlpha:1, font:'', textAlign:'left', fillStyle:'',
  drawn:'',
  measureText(t){
    const px=parseFloat(String(g.font).match(/([0-9.]+)px/)[1]);
    return {width:t.length*px*0.62};
  },
  fillText(t){ g.drawn=t; }
};
vm.createContext(phone);
vm.runInContext(hint+'\nthis.drawHint=drawHint;', phone);
phone.drawHint(g, 1);
assert(phone.box && phone.box.w<=phone.VW-16, 'phone hint box stays within VW-16 (got '+((phone.box&&phone.box.w)||'none')+')');
assert(phone.box.x>=0 && phone.box.x+phone.box.w<=phone.VW, 'phone hint box stays on the 390-wide screen');
assert(g.drawn===campLine, 'the short-rations camp line is drawn unchanged');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nDialogue layer checks passed');
