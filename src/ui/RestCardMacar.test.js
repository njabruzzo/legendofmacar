'use strict';
/**
 * Camp rest card uses its own bare-head sheet (vB), not the shared Macar atlas.
 * Run: node src/ui/RestCardMacar.test.js
 */
const crypto=require('crypto');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const {readRgba}=require('../qa/pngRgba');

const root=path.join(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const fileRel='assets/ui/rest_card_macar_vB.png';
const file=path.join(root,fileRel);
const EXPECT_SHA='cc9bb737bcbfedcb61d99f210c714d4b5a6e7f4702010e8c8954e78e498e7ff4';

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

assert(fs.existsSync(file), 'rest card file exists');
const sha=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
assert(sha===EXPECT_SHA, 'rest card file is the approved vB bytes');
const png=readRgba(file);
assert(png.w===896 && png.h===896, 'rest card canvas is 896×896 ('+png.w+'×'+png.h+')');

assert(/const ASSET_VER='131'/.test(html), 'ASSET_VER is 131');
assert(/SPRITE_FILES\.restCardMacar='assets\/ui\/rest_card_macar_vB\.png'/.test(html),
  'SPRITE_FILES.restCardMacar points at the vB sheet');
const regAt=html.indexOf("SPRITE_FILES.restCardMacar='assets/ui/rest_card_macar_vB.png'");
const atlasAt=html.indexOf('MacarSharedAtlas.register(MACAR_ONMODEL)');
assert(regAt>atlasAt && atlasAt>0, 'the rest-card key is registered after the shared-atlas rebind');
assert(/"assets\/ui\/rest_card_macar_vB\.png":1/.test(
  fs.readFileSync(path.join(root,'src/assets/asset-manifest.js'),'utf8')),
  'the 404 manifest lists the rest card');
const first=(html.match(/const first=\[[\s\S]*?\];/)||[''])[0];
assert(/'restCardMacar'/.test(first), 'the rest card is in the sprite preload list');

const rest=html.match(/function drawSleepRest\(g\)\{[\s\S]*?\nfunction darken/)[0];
assert(!!rest, 'drawSleepRest is intact');
assert(/SPR\.restCardMacar/.test(rest) && /restCardMacar/.test(rest),
  'drawSleepRest draws the rest-card key');
assert(/wearingBoneCrown\(\)/.test(rest) && /restCardMacarCrown/.test(rest),
  'wearingBoneCrown() can select the unbound crowned sheet');
assert(!/SPRITE_FILES\.restCardMacarCrown=/.test(html) && !/rest_card_macar_vA/.test(html),
  'vA is not bound');
assert(/card\|\|blitLivingMacar\(SPR\[livingMacarIdleKey\(\)\]\|\|SPR\.macar\)/.test(rest),
  'a missing rest-card image falls back to the living idle blit');
assert(/Math\.min\(VW\*0\.86, 640\*s\)/.test(rest) && /VH\*0\.68/.test(rest) && /VH\*0\.10/.test(rest),
  'size and position math is unchanged');
assert(/Macar decides to camp to rest and heal\./.test(rest), 'caption is unchanged');
assert(!/livingMacarIdleKey\(\)/.test(rest.split('blitLivingMacar')[0]),
  'the rest card does not pick a weapon-kit idle before the fallback');

const doll=html.match(/function drawEquipDoll\(g, x, y, w, h\)\{[\s\S]*?\nfunction drawPack/)[0];
const cavern=html.match(/function drawTitleCavern\(g\)\{[\s\S]*?\nfunction chapterSplashImg/)[0];
assert(/blitLivingMacar\(SPR\[livingMacarIdleKey\(\)\]\|\|SPR\.macar\)/.test(doll) && !/restCardMacar/.test(doll),
  'the pack doll still blits the living idle');
assert(/blitLivingMacar\(SPR\[livingMacarIdleKey\(\)\]\|\|SPR\.macar\)/.test(cavern) && !/restCardMacar/.test(cavern),
  'the party line-up still blits the living idle');

const shared=fs.readFileSync(path.join(root,'src/combat/MacarSharedAtlas.js'),'utf8');
assert(/macar-body-v1\.png/.test(shared) && /macar-weapons-v1\.png/.test(shared) && !/rest_card/.test(shared),
  'MacarSharedAtlas still composites the shared body and weapons');

const ATLASES=[
  'src/combat/DwarfWalkLegs.js',
  'src/combat/MacarIdleAtlas.js',
  'src/combat/MacarMotionAtlas.js',
  'src/combat/MacarSharedAtlas.js',
  'src/combat/MacarWeaponShaft.js',
  'src/combat/NpcDirectionalAtlas.js'
];
const ctx={console};
ctx.globalThis=ctx;
vm.createContext(ctx);
for(const rel of ATLASES){
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'), ctx, {filename:rel});
}
vm.runInContext(fs.readFileSync(path.join(root,'src/assets/asset-manifest.js'),'utf8'), ctx);
const start=html.indexOf('const SPRITE_FILES={');
const end=html.indexOf('const ICON_SPR={');
const files=vm.runInContext(html.slice(start,end)+'\nSPRITE_FILES;', ctx, {filename:'sprite-registry.js'});
assert(files.restCardMacar===fileRel, 'registered restCardMacar survives filtering as the vB file');
assert(!files.restCardMacar_w1 && !files.restCardMacar_atk && !files.restCardMacar_dead,
  'the rest card does not spawn walk, attack, or dead siblings');
assert(files.macar && /macar-body-v1\.png$/.test(files.macar),
  'the world macar key stays on the shared body atlas');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nrest card macar checks passed');
