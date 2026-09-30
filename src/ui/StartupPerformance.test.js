'use strict';
/**
 * Startup performance: keep the first playable frame small, then trickle the rest.
 * Run: node src/ui/StartupPerformance.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

const firstBlock=(html.match(/const first=\[[\s\S]*?\];/)||[''])[0];
assert(/let GFX_MODE = 'auto'/.test(html), 'graphics starts in adaptive mode on every platform');
assert(/if\(GFX_MODE!=='auto'\) return;/.test(html), 'adaptive frame pacing is not disabled on desktop');
assert(/const critical=\[\];/.test(html) && /const background=\[\];/.test(html),
  'sprite loading is split into critical and background queues');
assert(/Object\.keys\(WORLD_ART_KEYS\)[\s\S]*add\(critical,k\)/.test(html),
  'every world-art gate key is pulled into the critical queue');
assert(/const BACKGROUND_MAX=2/.test(html), 'background sprite loading is capped at two concurrent requests');
assert(/requestIdleCallback/.test(html) && /scheduleIdle\(pumpBackground\)/.test(html),
  'background sprites are scheduled during idle time');
assert(/done\(\);\s*scheduleIdle\(pumpBackground\)/.test(html),
  'boot callback fires after the critical wave, before background loading');
assert(/img\.decode\(\)/.test(html), 'loaded images are decoded before becoming ready sprites');
assert(/function loadSpriteKeyNow\(k, cb\)/.test(html) && /SPRITE_LOADING/.test(html),
  'single sprites can be requested immediately without duplicating active loads');
assert(/function requestMacarEquipmentArt\(\)/.test(html)
  && /macar_axe','macar_axe_w1','macar_axe_w2','macar_axe_atk/.test(html)
  && /macar_xbow','macar_xbow_w1','macar_xbow_w2','macar_xbow_atk/.test(html),
  'equipped Macar axe and crossbow art can bypass the idle background queue');
assert(firstBlock && !/pordoom_ghost_nw_w1/.test(firstBlock) && !/spider_giant_dead/.test(firstBlock),
  'non-opening ghost and monster sheets stay out of the first wave');
assert(firstBlock && /'floor_mine','wall_worked','wall_face'/.test(firstBlock),
  'Chapter I mine tiles remain in the first wave');
const worldBlock=(html.match(/const WORLD_ART_KEYS=\{[\s\S]*?\};/)||[''])[0];
['macar_e_w1','macar_e_w2','macar_se_w1','macar_se_w2','macar_ne_w1','macar_ne_w2','macar_back_w1','macar_back_w2',
 'macar_atk_n','macar_atk_s','macar_atk_ne','macar_atk_se'].forEach(k=>{
  assert(worldBlock && new RegExp("'"+k+"'").test(worldBlock), k+' is ready before play starts');
});

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nstartup performance checks passed');
