'use strict';
/**
 * Ghost fronts/backs stay title-law living color. Cyan walk/atk/compass
 * sheets stay on disk but must not paint. Walk and combat fall back to
 * the matching living kin w1/w2/atk pair.
 * Run: node src/combat/GhostLivingBind.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const {readRgba}=require('../qa/pngRgba');

const root=path.join(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const creatures=path.join(root,'assets/creatures');
const KIN=['pordoom','fendur','orbo','talpor'];

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

function extractFn(name){
  const re=new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}');
  const m=html.match(re);
  if(!m) throw new Error('missing '+name);
  return m[0];
}

assert(/function livingColorStats\(/.test(html) && /function ghostAnimKey\(/.test(html),
  'living-color ghost bind helpers exist');
assert(/function ghostLiveTwin\(/.test(html) && /function pickReadyGhostKey\(/.test(html),
  'ghost keys fall back to living kin twins');
assert(/e\.kind==='dwarf' && e\.ghost && !e\.dead\) key=ghostAnimKey/.test(html),
  'entAnimKey routes risen kin through ghostAnimKey');
assert(/walkCycleKey\(e, k\)/.test(extractFn('entAnimKey')),
  'living kin still cycle w1/w2 when a directional sheet fails fit');

const ctx={};
vm.createContext(ctx);
vm.runInContext(extractFn('livingColorStats')+extractFn('ghostKeyLooksUnsigned')
  +extractFn('ghostLiveTwin'), ctx);

KIN.forEach(k=>{
  const idle=readRgba(path.join(creatures,'dwarf_'+k+'_ghost.png'));
  const back=readRgba(path.join(creatures,'dwarf_'+k+'_ghost_back.png'));
  const w1=readRgba(path.join(creatures,'dwarf_'+k+'_ghost_w1.png'));
  const atk=readRgba(path.join(creatures,'dwarf_'+k+'_ghost_atk.png'));
  const liveW1=readRgba(path.join(creatures,'dwarf_'+k+'_w1.png'));
  const liveAtk=readRgba(path.join(creatures,'dwarf_'+k+'_atk.png'));
  assert(ctx.livingColorStats(idle.data).living, k+' ghost idle is living-color');
  assert(ctx.livingColorStats(back.data).living, k+' ghost back is living-color');
  assert(!ctx.livingColorStats(w1.data).living, k+' ghost_w1 is cyan — do not bind');
  assert(!ctx.livingColorStats(atk.data).living, k+' ghost_atk is cyan — do not bind');
  assert(ctx.livingColorStats(liveW1.data).living, k+' living w1 is the walk fallback');
  assert(ctx.livingColorStats(liveAtk.data).living, k+' living atk is the strike fallback');
  assert(ctx.ghostLiveTwin(k+'_ghost_e_w1')===k+'_w1', k+' ghost east walk twins living w1');
  assert(ctx.ghostLiveTwin(k+'_ghost_atk')===k+'_atk', k+' ghost atk twins living atk');
  assert(ctx.ghostLiveTwin(k+'_ghost_atk_recover')===k+'_atk_recover', k+' recover twins living recover');
  assert(ctx.ghostLiveTwin(k+'_ghost_back')===k+'_back', k+' ghost back twins living back (may be missing)');
  assert(ctx.ghostKeyLooksUnsigned(k+'_ghost_e_w1') && ctx.ghostKeyLooksUnsigned(k+'_ghost_w1'),
    k+' unsigned ghost walk suffixes are flagged');
  assert(!ctx.ghostKeyLooksUnsigned(k+'_ghost') && !ctx.ghostKeyLooksUnsigned(k+'_ghost_back'),
    k+' idle front/back are the signed ghost identity');
});

const SPR={};
function ready(k, live){
  SPR[k]={width:8, height:8, _live:live!==false};
}
KIN.forEach(k=>{
  ready(k, true);
  ready(k+'_w1', true); ready(k+'_w2', true);
  ready(k+'_e_w1', true); ready(k+'_e_w2', true);
  ready(k+'_atk', true); ready(k+'_atk_recover', true);
  ready(k+'_ghost', true); ready(k+'_ghost_back', true);
  ready(k+'_ghost_w1', false); ready(k+'_ghost_w2', false);
  ready(k+'_ghost_atk', false); ready(k+'_ghost_atk_recover', false);
  ready(k+'_ghost_e_w1', false); ready(k+'_ghost_e_w2', false);
  ready(k+'_ghost_back_w1', false); ready(k+'_ghost_back_w2', false);
});
ready('macar', true); ready('macar_w1', true); ready('macar_w2', true); ready('macar_atk', true);

const run={
  SPR,
  sprReady(k){ return !!(k && SPR[k] && SPR[k].width); },
  player(){ return run._lead||null; },
  wieldsShadowCleaver(){ return false; },
  kinCanAutoFight(e){ return !!(e && !e.hero && !e.dead && !e.crushed); },
  TAU:Math.PI*2, TW:64, TH:32,
  clamp:(v,a,b)=>v<a?a:v>b?b:v
};
vm.createContext(run);
vm.runInContext(
  html.match(/const LIVING_MACAR_KEYS=\{[\s\S]*?\};/)[0]
  +extractFn('isLivingMacarKey')
  +extractFn('livingMacarIdleKey')
  +extractFn('partyFrameFitOk')
  +extractFn('samePaintedFamily')
  +extractFn('partyCrownMatches')
  +extractFn('sheetCrownId')
  +extractFn('partySheetMatchesIdle')
  +extractFn('partyAnimKeyReady')
  +extractFn('pickReadyPartyKey')
  +extractFn('ghostKeyLooksUnsigned')
  +extractFn('livingColorStats')
  +extractFn('sampleLivingColors')
  +extractFn('sheetLivingColors')
  +extractFn('ghostLiveTwin')
  +extractFn('partyGhostKeyReady')
  +extractFn('pickReadyGhostKey')
  +extractFn('walkCycleKey')
  +extractFn('walkCycleLivingKey')
  +extractFn('attackProgress')
  +extractFn('wantsMeleePose')
  +extractFn('wantsMeleeRecover')
  +extractFn('faceVec')
  +extractFn('screenOctant')
  +extractFn('screenCardinal')
  +extractFn('wantsBackView')
  +extractFn('dwarfAngleKey')
  +extractFn('ghostAnimKey')
  +extractFn('entSpriteKey')
  +extractFn('livingMacarAnimKey')
  +extractFn('entAnimKey'),
  run
);

function ghost(k, extra){
  return Object.assign({
    kind:'dwarf', team:'party', hero:0, ghost:1, dead:0, crushed:0,
    col:{key:k}, defending:0, moving:0, atk:0, atkMax:1, atkKind:'melee',
    gait:0.12, x:20, y:22, ix:0, iy:0, fdx:1, fdy:0
  }, extra||{});
}
function live(k, extra){
  return Object.assign({
    kind:'dwarf', team:'party', hero:0, ghost:0, dead:0, crushed:0,
    col:{key:k}, defending:0, moving:0, atk:0, atkMax:1, atkKind:'melee',
    gait:0.12, x:20, y:22, ix:0, iy:0, fdx:1, fdy:0
  }, extra||{});
}

KIN.forEach(k=>{
  assert(run.entAnimKey(ghost(k))===k+'_ghost', k+' idle ghost uses the color-true front');
  assert(run.entAnimKey(ghost(k,{moving:1, ix:0.7, iy:-0.7, fdx:0.7, fdy:-0.7, gait:0.12}))===k+'_w1',
    k+' ghost walk plant A uses living w1, not cyan ghost_e_w1');
  assert(run.entAnimKey(ghost(k,{moving:1, ix:0.7, iy:-0.7, fdx:0.7, fdy:-0.7, gait:0.62}))===k+'_w2',
    k+' ghost walk plant B uses living w2');
  assert(run.entAnimKey(ghost(k,{atk:0.7, atkMax:1}))===k+'_atk',
    k+' ghost strike uses living atk, not cyan ghost_atk');
  assert(run.entAnimKey(ghost(k,{atk:0.3, atkMax:1}))===k+'_atk_recover',
    k+' ghost recover uses living recover');
  assert(run.entAnimKey(ghost(k,{fdx:-0.7, fdy:-0.7}))===k+'_ghost_back',
    k+' ghost north plants the color-true back');
  const east=live(k,{moving:1, gait:0.12, ix:0.7, iy:-0.7, fdx:0.7, fdy:-0.7});
  const se=live(k,{moving:1, gait:0.12, ix:1, iy:0, fdx:1, fdy:0});
  assert(run.entAnimKey(east)===k+'_e_w1' || run.entAnimKey(east)===k+'_w1',
    k+' living east walk cycles a w1 plant');
  assert(run.entAnimKey(se)===k+'_w1',
    k+' living SE walk falls back to front w1 (no se sheet)');
});

assert(run.entAnimKey({
  hero:1, kind:'dwarf', ghost:0, dead:0, crushed:0, defending:0,
  moving:1, gait:0.12, ix:0.7, iy:-0.7, fdx:0.7, fdy:-0.7
})==='macar_w1', 'living Macar walk stays on the title-law maul pair');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nghost living-color bind checks passed');
