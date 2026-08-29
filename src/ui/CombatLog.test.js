'use strict';
/**
 * Combat log is a collapsed chip near the top. Click expands details; click again hides them.
 * It paints on the post-terrain UI layer, not as a big box in the play field.
 * Run: node src/ui/CombatLog.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

assert(/showLog:0/.test(html), 'combat log starts collapsed');
assert(/G\.inspect=null; G\.showObjs=0; G\.showLog=0/.test(html),
  'a new chapter starts with the log collapsed');

const log=html.match(/function drawLog\(g,s\)\{[\s\S]*?\n\}/)[0];
assert(/function logStackTop\(s\)\{/.test(html), 'log sits in the top-right stack under the minimap');
assert(/y=logStackTop\(s\)/.test(log), 'log chip uses the top stack, not the play-field floor');
assert(!/UI\.hudTop/.test(log) && !/VH-\(PORT\?96:94\)/.test(log),
  'old bottom-right play-field log box is gone');
assert(/open\?'▾':'▸'/.test(log) && /COMBAT LOG/.test(log),
  'collapsed chip shows COMBAT LOG with a disclosure mark');
assert(/if\(!open\) return/.test(log), 'details are not painted while collapsed');
assert(/lines\.slice\(-6\)/.test(log), 'expanded details still show the recent log lines');
assert(/fillStyle='#0a0705'/.test(log), 'expanded log is an opaque slab above masonry');

assert(/G\.showLog=!G\.showLog/.test(html), 'clicking the chip toggles the log');
assert(/hitRect\(UI\.logHit/.test(html), 'the chip is a click target');
assert(/if\(G\.showLog\)\{ G\.showLog=0/.test(html), 'Escape collapses an open log');

const hud=html.match(/function drawHUD\(g\)\{[\s\S]*?\n\}/)[0];
assert(!/drawLog/.test(hud), 'drawHUD no longer paints the log under later walls');
const plates=html.match(/function drawPlayPlates\(g\)\{[\s\S]*?\n\}/)[0];
assert(/if\(G\.scene==='play'\) drawLog\(g,s\)/.test(plates),
  'log paints in drawPlayPlates after terrain');

const objs=html.match(/function drawObjectives\(g,s\)\{[\s\S]*?\n\}/)[0];
assert(/logLinkH\(s\)\+\(G\.showLog\?logListH\(s\):0\)/.test(objs),
  'objectives sit below the log chip so the expanded list does not cover them');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nCombat log collapse checks passed');
