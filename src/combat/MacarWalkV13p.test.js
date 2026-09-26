'use strict';
/**
 * Preview bind: Macar's maul walk is the v0.13q solid-pommel re-render,
 * 8 painted directions × 12 frames, still keyed as macar_v13p_. Idle and
 * attack stay on the signed sheets. W / NW / SW are not mirrors.
 * Canvases are the export size — not normalised to one box.
 * Run: node src/combat/MacarWalkV13p.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const {readRgba}=require('../qa/pngRgba');

const root=path.join(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const creatures=path.join(root,'assets/creatures');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

const DIRS=['s','sw','w','nw','n','ne','e','se'];
const files=[];
DIRS.forEach(dir=>{
  for(let i=0;i<12;i++){
    const nn=(i<10?'0':'')+i;
    files.push('dwarf_macar_v13p_'+dir+'_'+nn+'.png');
  }
});
assert(files.length===96, '8 directions × 12 frames');
files.forEach(f=>{
  assert(fs.existsSync(path.join(creatures,f)), f+' on disk');
});

/* Export sizes differ on purpose (per-direction stature lock). */
const expectSize={s:678, sw:683, w:660, nw:660, n:673, ne:674, e:674, se:677};
DIRS.forEach(dir=>{
  const img=readRgba(path.join(creatures,'dwarf_macar_v13p_'+dir+'_00.png'));
  assert(img.w===expectSize[dir] && img.h===expectSize[dir],
    dir+' f00 stays '+expectSize[dir]+' (got '+img.w+'x'+img.h+')');
});

['dwarf_macar.png','dwarf_macar_atk.png','dwarf_macar_atk_contact.png',
 'dwarf_macar_w1.png','dwarf_macar_w2.png'].forEach(f=>{
  assert(fs.existsSync(path.join(creatures,f)), 'signed '+f+' stays');
});

const start=html.indexOf('const SPRITE_FILES={');
const end=html.indexOf('const ICON_SPR={');
const registry=new Function(html.slice(start, end)+'\nreturn {files:SPRITE_FILES, walk:MACAR_V13P_WALK};')();
files.forEach(f=>{
  const key=f.replace(/^dwarf_/,'').replace(/\.png$/,'');
  assert(registry.files[key] && registry.files[key].endsWith(f), key+' is registered');
  assert(!registry.files[key+'_w1'] && !registry.files[key+'_atk'],
    key+' does not spawn a derived sibling');
});
DIRS.forEach(dir=>{
  assert(registry.walk[dir] && registry.walk[dir].length===12, dir+' lists 12 frames');
});
assert(registry.files.macar==='assets/creatures/dwarf_macar.png', 'idle sheet unchanged');
assert(registry.files.macar_atk==='assets/creatures/dwarf_macar_atk.png', 'attack sheet unchanged');

function extractFn(name){
  const re=new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}');
  const m=html.match(re);
  if(!m) throw new Error('missing '+name);
  return m[0];
}

const SPR={};
DIRS.forEach(dir=>{
  registry.walk[dir].forEach(k=>{ SPR[k]={width:660, height:660}; });
});
SPR.macar={width:1100, height:920};
SPR.macar_w1={width:1100, height:920};
SPR.macar_w2={width:1100, height:920};
SPR.macar_e_w3={width:341, height:512};
SPR.macar_se_w3={width:341, height:512};
SPR.macar_ne_w2={width:384, height:512};
SPR.macar_ne_w3={width:341, height:512};
SPR.macar_back_w1={width:341, height:512};
SPR.macar_back_w2={width:341, height:512};

const ctx={
  SPR,
  MACAR_V13P_WALK:registry.walk,
  LIVING_MACAR_KEYS:{},
  sprReady(k){ return !!(k && SPR[k] && SPR[k].width); },
  isLivingMacarKey(k){ return !!(k && (ctx.LIVING_MACAR_KEYS[k] || /^macar_v13p_/.test(k))); },
  clamp:(v,a,b)=>v<a?a:v>b?b:v,
  TAU:Math.PI*2,
  TW:64, TH:32,
  wieldsShadowCleaver(){ return false; },
  wieldsCrossbow(){ return false; },
  player(){ return null; }
};
Object.keys(SPR).forEach(k=>{ ctx.LIVING_MACAR_KEYS[k]=1; });
vm.createContext(ctx);
vm.runInContext(
  extractFn('screenOctant')
  +'function faceVec(e){ if(!e) return {dx:0,dy:0};'
  +' if(e.moving && ((e.ix||0)||(e.iy||0))) return {dx:e.ix||0, dy:e.iy||0};'
  +' return {dx:e.fdx||0, dy:e.fdy||0}; }'
  +extractFn('macarV13pWalkKey'),
  ctx
);

function walk(ix, iy, gait){
  return {hero:1, moving:1, defending:0, dead:0, ghost:0, ix, iy, fdx:ix, fdy:iy, gait:gait||0};
}
const headings=[
  ['e', 0.707, -0.707],
  ['se', 1, 0],
  ['s', 0.707, 0.707],
  ['sw', 0, 1],
  ['w', -0.707, 0.707],
  ['nw', -1, 0],
  ['n', -0.707, -0.707],
  ['ne', 0, -1]
];
headings.forEach(([oct, ix, iy])=>{
  const k0=ctx.macarV13pWalkKey(walk(ix, iy, 0));
  const k6=ctx.macarV13pWalkKey(walk(ix, iy, 0.5));
  const k11=ctx.macarV13pWalkKey(walk(ix, iy, 0.99));
  assert(k0==='macar_v13p_'+oct+'_00', oct+' gait 0 is frame 00 ('+k0+')');
  assert(k6==='macar_v13p_'+oct+'_06', oct+' gait 0.5 is frame 06 ('+k6+')');
  assert(k11==='macar_v13p_'+oct+'_11', oct+' gait 0.99 is frame 11 ('+k11+')');
});
assert(ctx.macarV13pWalkKey({moving:0, ix:0.7, iy:-0.7, fdx:0.7, fdy:-0.7})===null,
  'standing does not take a v0.13p frame');
assert(ctx.macarV13pWalkKey({moving:1, defending:1, ix:-0.7, iy:0.7, fdx:-0.7, fdy:0.7})===null,
  'defend does not take a v0.13p frame');

/* West walk key is the painted west sheet, and wantsSpriteFlip leaves it. */
const flipSrc=extractFn('wantsSpriteFlip');
assert(/macar_v13p_/.test(flipSrc) && /return false/.test(flipSrc),
  'wantsSpriteFlip refuses to mirror a v0.13p sheet');
vm.runInContext(
  'function entAnimKey(e){ return e.animKey||""; }'
  +'function moveHeadingSX(e){ return (e.ix||0)-(e.iy||0); }'
  +flipSrc,
  ctx
);
assert(ctx.wantsSpriteFlip({hero:1, animKey:'macar_v13p_w_03', ix:-0.707, iy:0.707})===false,
  'painted west walk is not mirrored');
assert(ctx.wantsSpriteFlip({hero:1, animKey:'macar_v13p_nw_00', ix:-1, iy:0})===false,
  'painted northwest walk is not mirrored');
assert(ctx.wantsSpriteFlip({hero:1, animKey:'macar_v13p_sw_00', ix:0, iy:1})===false,
  'painted southwest walk is not mirrored');
assert(ctx.wantsSpriteFlip({hero:1, animKey:'macar_e_w3', ix:-0.707, iy:0.707})===true,
  'standing west still flips the signed east idle sheet');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nv0.13p walk bind checks passed');
