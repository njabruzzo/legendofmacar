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
assert(onDisk.length===1 && onDisk[0]===MacarAnchor.ANCHOR,
  'the anchor is the only Macar sheet on disk (found: '+onDisk.join(', ')+')');
assert(!fs.existsSync(path.join(root,'assets/macar_headings_axe.png')) && !fs.existsSync(path.join(root,'assets/macar_headings_maul.png')),
  'the helmeted-plate heading boards are gone');
assert(/const MACAR_ANCHOR_SRC='assets\/creatures\/dwarf_macar_atk_contact\.png';/.test(html),
  'index.html names the anchor');
const lock=html.indexOf('const MACAR_ANCHOR_SRC=');
const after=html.slice(lock);
assert(/if\(\/\^macar\(_\|\$\)\/\.test\(k\)\) SPRITE_FILES\[k\]=MACAR_ANCHOR_SRC;/.test(after.slice(0,400)),
  'every macar* sprite key is pointed at the anchor');
const laterMacar=after.slice(400).match(/SPRITE_FILES\.macar[a-z0-9_]*\s*=\s*'[^']+'/g)||[];
assert(!laterMacar.length, 'nothing re-registers an off-model Macar sheet after the lock ('+laterMacar.join('; ')+')');
assert(!/SPRITE_FILES\.dwarf_macar_crowned=/.test(html), 'no crowned sheet: the bone crown is drawn as the worn prop');
const cats=['macar','macar_w1','macar_w2','macar_atk','macar_atk_contact'];
const wa=html.match(/const WORLD_ART_KEYS=\{[\s\S]*?\n\};/);
assert(wa && cats.every(k=>new RegExp("'"+k+"'").test(wa[0])),
  'world-ready keys still name the Macar slots the loader waits for (all served by the anchor)');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nMacar anchor lock checks passed');
