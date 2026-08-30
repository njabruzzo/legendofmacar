'use strict';
/**
 * Pack / Gear doll is the living Macar painting (axe if Cleaver is on).
 * Run: node src/ui/PackDoll.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

const doll=html.match(/function drawEquipDoll\(g, x, y, w, h\)\{[\s\S]*?\nfunction drawPack/);
assert(!!doll, 'drawEquipDoll exists');
const block=doll?doll[0]:'';

assert(/SPR\.macar/.test(block), 'doll binds SPR.macar');
assert(/macar_axe/.test(block) && /wieldsShadowCleaver\(/.test(block),
  'doll uses the axe sheet when Shadow Cleaver is equipped');
assert(/solidMacarSprite\(/.test(block), 'doll uses the living-Macar binary bake');
assert(/globalAlpha=1/.test(block) && /globalCompositeOperation='source-over'/.test(block),
  'doll blit is source-over at alpha 1');
assert(!/SPR\.icon_doll/.test(block), 'kettle-hat icon_doll is not the pack doll');
assert(!/globalAlpha=0\.92/.test(block), 'old translucent doll alpha is gone');
assert(!/globalCompositeOperation='lighter'/.test(block) && !/createRadialGradient/.test(block),
  'doll has no lighter flash or gold disc');
assert(!/dwarfface|prop_dwarfface/.test(block),
  'this slice does not crop prop_dwarfface');

assert(/function layoutHighPlate\(/.test(html) && /function paintHighPlate\(/.test(html),
  'title high-stack helpers stay on main');
assert(/title:'THE LEGEND OF MACAR'/.test(html), 'title copy is unchanged');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\npack doll identity checks passed');
