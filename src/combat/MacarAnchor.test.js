'use strict';
/**
 * Macar anchor lock (Nick, 2026-09-28): dwarf_macar_atk_contact.png is the
 * one on-model Macar. Off-model sheets stay off disk, every macar* sprite
 * key plays the anchor, and there is no crowned sheet (worn prop crown).
 * When a new on-model frame is painted, register it after the anchor block
 * and take it out of src/qa/MacarAnchor.js REMOVED.
 * Run: node src/combat/MacarAnchor.test.js
 */
const fs=require('fs');
const path=require('path');
const MacarAnchor=require('../qa/MacarAnchor');
const root=path.join(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const creatures=path.join(root,'assets/creatures');
let failed=0;
function assert(c,m){ if(!c){ failed++; console.error('FAIL  '+m); } else console.log('ok    '+m); }

assert(fs.existsSync(path.join(creatures, MacarAnchor.ANCHOR)), 'the anchor '+MacarAnchor.ANCHOR+' is on disk');
MacarAnchor.REMOVED.forEach(f=>assert(!fs.existsSync(path.join(creatures,f)), f+' stays off disk (off-model)'));
const onDisk=fs.readdirSync(creatures).filter(f=>/^dwarf_macar/.test(f));
const allowed=[MacarAnchor.ANCHOR].concat(MacarAnchor.ONMODEL,
  ['dwarf_macar_idle_maul_v2.png','dwarf_macar_idle_axe_v2.png','dwarf_macar_idle_xbow_v2.png']);
assert(onDisk.every(f=>allowed.includes(f)),
  'every Macar sheet on disk is the anchor or an approved on-model frame (found: '+onDisk.join(', ')+')');
MacarAnchor.ONMODEL.forEach(f=>assert(fs.existsSync(path.join(creatures,f)), f+' (approved on-model frame) is on disk'));
assert(!fs.existsSync(path.join(root,'assets/macar_headings_axe.png')) && !fs.existsSync(path.join(root,'assets/macar_headings_maul.png')),
  'the helmeted-plate heading boards are gone');
assert(/const MACAR_ANCHOR_SRC='assets\/creatures\/dwarf_macar_atk_contact\.png';/.test(html),
  'index.html names the anchor');
const lock=html.indexOf('const MACAR_ANCHOR_SRC=');
const after=html.slice(lock);
assert(/if\(\/\^macar\(_\|\$\)\/\.test\(k\)\) SPRITE_FILES\[k\]=MACAR_ANCHOR_SRC;/.test(after.slice(0,400)),
  'every macar* sprite key is pointed at the anchor');
const laterMacar=(after.slice(400).match(/assets\/creatures\/dwarf_macar[a-z0-9_]*\.png/g)||[])
  .map(p=>p.split('/').pop()).filter(f=>!MacarAnchor.ONMODEL.includes(f));
assert(!laterMacar.length, 'nothing after the lock registers an off-model Macar sheet ('+laterMacar.join('; ')+')');
assert(!/SPRITE_FILES\.dwarf_macar_crowned=/.test(html), 'no crowned sheet: the bone crown is drawn as the worn prop');
const cats=['macar','macar_w1','macar_w2','macar_atk','macar_atk_contact'];
const wa=html.match(/const WORLD_ART_KEYS=\{[\s\S]*?\n\};/);
assert(wa && cats.every(k=>new RegExp("'"+k+"'").test(wa[0])),
  'world-ready keys still name the Macar slots the loader waits for (all served by the anchor)');

/* Painting intact: the black-matte key once punched ~60k px of dark paint out
   of the figure (holes showed the floor through Macar). No enclosed
   see-through pocket may remain inside the anchor's silhouette. */
{
  const {readRgba}=require('../qa/pngRgba');
  const {w,h,data}=readRgba(path.join(creatures, MacarAnchor.ANCHOR));
  const clear=new Uint8Array(w*h);
  for(let i=0;i<w*h;i++) clear[i]=data[i*4+3]<128?1:0;
  // flood the transparent region reachable from the canvas edge
  const outside=new Uint8Array(w*h), q=[];
  const push=(x,y)=>{ const k=y*w+x; if(clear[k]&&!outside[k]){ outside[k]=1; q.push(k); } };
  for(let x=0;x<w;x++){ push(x,0); push(x,h-1); }
  for(let y=0;y<h;y++){ push(0,y); push(w-1,y); }
  while(q.length){ const k=q.pop(), x=k%w, y=(k/w)|0;
    if(x>0) push(x-1,y); if(x<w-1) push(x+1,y); if(y>0) push(x,y-1); if(y<h-1) push(x,y+1); }
  let holes=0; for(let i=0;i<w*h;i++) if(clear[i]&&!outside[i]) holes++;
  assert(holes<=40, 'anchor painting has no see-through holes inside the figure ('+holes+' enclosed clear px)');
}

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nMacar anchor lock checks passed');
