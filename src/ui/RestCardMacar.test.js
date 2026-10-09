'use strict';
/**
 * Camp rest card uses its own sheets: bare-head vB, crowned vA2 when the
 * bone crown is worn. Neither sheet is the shared Macar atlas.
 * Run: node src/ui/RestCardMacar.test.js
 */
const crypto=require('crypto');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const {readRgba}=require('../qa/pngRgba');

const root=path.join(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const SHEETS=[
  {key:'restCardMacar', rel:'assets/ui/rest_card_macar_vB.png',
    sha:'cc9bb737bcbfedcb61d99f210c714d4b5a6e7f4702010e8c8954e78e498e7ff4'},
  {key:'restCardMacarCrown', rel:'assets/ui/rest_card_macar_vA2.png',
    sha:'9b6333bcc8b2e506587aa912673943042edbd38d5f3e36366caeb2ae3936faa6'}
];

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

assert(/const ASSET_VER='131'/.test(html), 'ASSET_VER is 131');
const manifest=fs.readFileSync(path.join(root,'src/assets/asset-manifest.js'),'utf8');
const first=(html.match(/const first=\[[\s\S]*?\];/)||[''])[0];
const atlasAt=html.indexOf('MacarSharedAtlas.register(MACAR_ONMODEL)');
for(const sheet of SHEETS){
  const file=path.join(root, sheet.rel);
  assert(fs.existsSync(file), sheet.key+' file exists');
  const sha=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  assert(sha===sheet.sha, sheet.key+' file is the approved bytes');
  const png=readRgba(file);
  assert(png.w===896 && png.h===896, sheet.key+' canvas is 896×896 ('+png.w+'×'+png.h+')');
  const assign="SPRITE_FILES."+sheet.key+"='"+sheet.rel+"'";
  assert(html.includes(assign), assign);
  assert(html.indexOf(assign)>atlasAt && atlasAt>0, sheet.key+' is registered after the shared-atlas rebind');
  assert(manifest.includes(JSON.stringify(sheet.rel)+':1'), 'the 404 manifest lists '+sheet.rel);
  assert(new RegExp("'"+sheet.key+"'").test(first), sheet.key+' is in the sprite preload list');
}

const pick=html.match(/function restCardMacarImage\(\)\{[\s\S]*?\n\}/);
assert(!!pick, 'restCardMacarImage is intact');
const pickSrc=pick?pick[0]:'';
assert(/wearingBoneCrown\(\)/.test(pickSrc), 'the crown check is wearingBoneCrown()');
assert(/crowned\?'restCardMacarCrown':'restCardMacar'/.test(pickSrc),
  'the bone crown selects vA2');
assert(/crowned\?'restCardMacar':'restCardMacarCrown'/.test(pickSrc),
  'the other variant is the fallback sheet');
assert(/sprReady\(primary\)/.test(pickSrc) && /sprReady\(other\)/.test(pickSrc),
  'a missing chosen sheet falls through to the other variant');

const rest=html.match(/function drawSleepRest\(g\)\{[\s\S]*?\nfunction darken/)[0];
assert(!!rest, 'drawSleepRest is intact');
assert(/restCardMacarImage\(\)\|\|blitLivingMacar\(SPR\[livingMacarIdleKey\(\)\]\|\|SPR\.macar\)/.test(rest),
  'drawSleepRest uses the rest-card image, then the living idle blit');
assert(/Math\.min\(VW\*0\.86, 640\*s\)/.test(rest) && /VH\*0\.68/.test(rest) && /VH\*0\.10/.test(rest),
  'size and position math is unchanged');
assert(/Macar decides to camp to rest and heal\./.test(rest), 'caption is unchanged');
assert(!/livingMacarIdleKey\(\)/.test(rest.split('blitLivingMacar')[0]),
  'the rest card does not pick a weapon-kit idle before the fallback');

function runPick(crown, ready){
  const ctx={
    SPRITE_FILES:{restCardMacar:'vB', restCardMacarCrown:'vA2'},
    SPR:{
      restCardMacar: ready.bare?{width:896, tag:'vB'}:null,
      restCardMacarCrown: ready.crown?{width:896, tag:'vA2'}:null
    },
    SPRITE_LOADING:{},
    loads:[],
    wearingBoneCrown(){ return crown; },
    sprReady(k){ const im=ctx.SPR[k]; return !!(im&&im.width); },
    loadSpriteKeyNow(k){ ctx.loads.push(k); }
  };
  vm.createContext(ctx);
  vm.runInContext(pickSrc+'\nresult=restCardMacarImage();', ctx);
  return ctx;
}
{
  const bare=runPick(false, {bare:true, crown:true});
  assert(bare.result && bare.result.tag==='vB', 'no crown draws vB');
  const crowned=runPick(true, {bare:true, crown:true});
  assert(crowned.result && crowned.result.tag==='vA2', 'bone crown draws vA2');
  const crownWait=runPick(true, {bare:true, crown:false});
  assert(crownWait.result && crownWait.result.tag==='vB',
    'a crowned rest whose vA2 has not loaded draws vB');
  assert(crownWait.loads.indexOf('restCardMacarCrown')>=0, 'the missing crowned sheet is requested');
  const bareWait=runPick(false, {bare:false, crown:true});
  assert(bareWait.result && bareWait.result.tag==='vA2',
    'a bare rest whose vB has not loaded draws vA2');
  const none=runPick(false, {bare:false, crown:false});
  assert(none.result===null, 'both sheets missing leaves the living-blit fallback');
  const noneCrown=runPick(true, {bare:false, crown:false});
  assert(noneCrown.result===null, 'both sheets missing while crowned leaves the living-blit fallback');
}

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
vm.runInContext(manifest, ctx);
const start=html.indexOf('const SPRITE_FILES={');
const end=html.indexOf('const ICON_SPR={');
const files=vm.runInContext(html.slice(start,end)+'\nSPRITE_FILES;', ctx, {filename:'sprite-registry.js'});
assert(files.restCardMacar==='assets/ui/rest_card_macar_vB.png',
  'registered restCardMacar survives filtering as the vB file');
assert(files.restCardMacarCrown==='assets/ui/rest_card_macar_vA2.png',
  'registered restCardMacarCrown survives filtering as the vA2 file');
for(const key of ['restCardMacar','restCardMacarCrown']){
  assert(!files[key+'_w1'] && !files[key+'_atk'] && !files[key+'_dead'],
    key+' does not spawn walk, attack, or dead siblings');
}
assert(files.macar && /macar-body-v1\.png$/.test(files.macar),
  'the world macar key stays on the shared body atlas');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nrest card macar checks passed');
