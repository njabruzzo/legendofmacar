'use strict';
/**
 * Ghost idle fronts/backs are color-true. Priority-16 front motion
 * (w1/w2/atk/atk_recover ×4 kin) is living-color bind-ready.
 * Remaining cyan/teal angled/compass/w3/back_w sheets stay on disk
 * for Limner redo — never paint them; plant signed idle instead.
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
const BIND_READY_SUF=['_w1','_w2','_atk','_atk_recover'];
const UNSIGNED_SUF=[
  '_w3',
  '_back_w1','_back_w2',
  '_e_w1','_e_w2','_s_w1','_s_w2',
  '_nw_w1','_nw_w2','_ne_w1','_ne_w2','_se_w1','_se_w2'
];

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
assert(/function pickReadyGhostKey\(/.test(html) && /plant the signed idle/.test(html),
  'failed ghost walk/atk plants signed idle, not cyan and not a living twin');
assert(/_ghost_\(\?:e_\|s_\|nw_\|ne_\|se_\|w3\|back_w\)/.test(html),
  'unsigned ghost keys are compass / w3 / back_w only — not front w1/w2/atk');
assert(/Do not cache a guess/.test(html) && /if\(ghostKeyLooksUnsigned\(key\)\) return false/.test(extractFn('sheetLivingColors')),
  'failed living-color sample does not stamp _live=false on bind-ready front motion');
assert(/punch!==false/.test(extractFn('flippedSprite'))
  && /Ghost sheets[\s\S]*solid/.test(extractFn('flippedSprite')),
  'ghost flips skip the living a=255 punch');
assert(/const punch=!e\.ghost/.test(html)
  && /blitFacing\(g,img,dx,dy,W,H,flip,party,punch\)/.test(html),
  'ghost billboard passes punch=false into blitFacing');
assert(/Mid-alpha ghost \+ lighter/.test(html)
  && /g\.strokeStyle='rgba\(170,220,255,0\.95\)'/.test(html)
  && /g\.globalAlpha=clamp\(e\.flash\*1\.2,0,0\.34\)/.test(html),
  'ghost hit feedback is a source-over rim, not lighter flash*3');
assert(!/function ghostLiveTwin\(/.test(html),
  'living-kin twin fallback is gone — cyan mono is not a stand-in');
assert(/e\.kind==='dwarf' && e\.ghost && !e\.dead\) key=ghostAnimKey/.test(html),
  'entAnimKey routes risen kin through ghostAnimKey');
assert(/walkCycleKey\(e, k\)/.test(extractFn('entAnimKey')),
  'living kin still cycle w1/w2 when a directional sheet fails fit');

const ctx={};
vm.createContext(ctx);
vm.runInContext(extractFn('livingColorStats')+extractFn('ghostKeyLooksUnsigned'), ctx);

const replaceList=[];
KIN.forEach(k=>{
  const idle=readRgba(path.join(creatures,'dwarf_'+k+'_ghost.png'));
  const back=readRgba(path.join(creatures,'dwarf_'+k+'_ghost_back.png'));
  assert(ctx.livingColorStats(idle.data).living, k+' ghost idle is living-color — keep');
  assert(ctx.livingColorStats(back.data).living, k+' ghost back is living-color — keep');
  assert(!ctx.ghostKeyLooksUnsigned(k+'_ghost') && !ctx.ghostKeyLooksUnsigned(k+'_ghost_back'),
    k+' idle front/back are the signed ghost identity');
  BIND_READY_SUF.forEach(suf=>{
    assert(!ctx.ghostKeyLooksUnsigned(k+'_ghost'+suf),
      k+' ghost'+suf+' is bind-ready, not unsigned');
  });
  BIND_READY_SUF.forEach(suf=>{
    const file='dwarf_'+k+'_ghost'+suf+'.png';
    const full=path.join(creatures, file);
    assert(fs.existsSync(full), file+' on disk');
    const st=ctx.livingColorStats(readRgba(full).data);
    assert(st.living, file+' is living-color — bind-ready');
  });
  UNSIGNED_SUF.forEach(suf=>{
    const file='dwarf_'+k+'_ghost'+suf+'.png';
    const full=path.join(creatures, file);
    assert(fs.existsSync(full), file+' on disk for Limner redo');
    const st=ctx.livingColorStats(readRgba(full).data);
    assert(!st.living, file+' is cyan/teal mono — do not bind');
    assert(ctx.ghostKeyLooksUnsigned(k+'_ghost'+suf), file+' is flagged unsigned');
    replaceList.push(file);
  });
});
assert(replaceList.length===KIN.length*UNSIGNED_SUF.length,
  'Limner replace list is every remaining unsigned ghost walk/atk/compass sheet');
assert(KIN.length*BIND_READY_SUF.length===16,
  'Priority-16 front motion sheets are living bind-ready');

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
  ready(k+'_ghost_w1', true); ready(k+'_ghost_w2', true);
  ready(k+'_ghost_atk', true); ready(k+'_ghost_atk_recover', true);
  ready(k+'_ghost_e_w1', false); ready(k+'_ghost_e_w2', false);
  ready(k+'_ghost_back_w1', false); ready(k+'_ghost_back_w2', false);
});
ready('macar', true); ready('macar_w1', true); ready('macar_w2', true); ready('macar_atk', true);

const run={
  SPR,
  sprReady(k){ return !!(k && SPR[k] && SPR[k].width); },
  player(){ return run._lead||null; },
  _now:10000,
  performance:{now(){ return run._now; }},
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
  +extractFn('matchingPartyAtkReady')
  +extractFn('partyAnimKeyReady')
  +extractFn('pickReadyPartyKey')
  +extractFn('ghostKeyLooksUnsigned')
  +extractFn('livingColorStats')
  +extractFn('sampleLivingColors')
  +extractFn('sheetLivingColors')
  +extractFn('ghostIdleKey')
  +extractFn('partyGhostKeyReady')
  +extractFn('pickReadyGhostKey')
  +extractFn('walkCycleKey')
  +extractFn('walkCycleGhostKey')
  +extractFn('attackProgress')
  +extractFn('wantsMeleePose')
  +extractFn('wantsMeleeRecover')
  +'const MACAR_BOW_POSE_S=0.40;'
  +extractFn('nowMs')
  +extractFn('armBowPose')
  +extractFn('wantsBowPose')
  +extractFn('expireBowPose')
  +'const MACAR_STRIKE_HOLD=0.36;'
  +extractFn('armLivingMacarStrike')
  +extractFn('wantsLivingMacarStrike')
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
  assert(run.entAnimKey(ghost(k,{moving:1, ix:0.7, iy:-0.7, fdx:0.7, fdy:-0.7, gait:0.12}))===k+'_ghost_w1',
    k+' ghost walk binds living-color w1');
  assert(run.entAnimKey(ghost(k,{moving:1, ix:0.7, iy:-0.7, fdx:0.7, fdy:-0.7, gait:0.62}))===k+'_ghost_w2',
    k+' ghost late gait binds living-color w2');
  assert(run.entAnimKey(ghost(k,{atk:0.7, atkMax:1}))===k+'_ghost_atk',
    k+' ghost strike binds living-color atk');
  assert(run.entAnimKey(ghost(k,{atk:0.20, atkMax:1}))===k+'_ghost_atk_recover',
    k+' ghost recover binds living-color atk_recover');
  assert(run.entAnimKey(ghost(k,{fdx:-0.7, fdy:-0.7}))===k+'_ghost_back',
    k+' ghost north plants the color-true back');
  // Compass still unsigned — plants idle even if a fake e_w1 exists unbound
  assert(run.entAnimKey(ghost(k,{moving:1, ix:1, iy:0, fdx:1, fdy:0, gait:0.12}))===k+'_ghost_w1'
      || run.entAnimKey(ghost(k,{moving:1, ix:1, iy:0, fdx:1, fdy:0, gait:0.12}))===k+'_ghost',
    k+' ghost east prefers front walk / idle — cyan e_w stays unbound');
  SPR[k+'_ghost_w1']._live=false;
  SPR[k+'_ghost_w2']._live=false;
  assert(run.entAnimKey(ghost(k,{moving:1, ix:0.7, iy:-0.7, fdx:0.7, fdy:-0.7, gait:0.12}))===k+'_ghost',
    k+' ghost walk plants idle when front w1 fails color');
  SPR[k+'_ghost_w1']._live=true;
  SPR[k+'_ghost_w2']._live=true;
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

const unsamp={width:120, height:120};
assert(run.sheetLivingColors(unsamp, 'pordoom_ghost_w1')===true,
  'failed sample allows Priority-16 front w1 (does not plant idle)');
assert(unsamp._live==null, 'failed sample does not cache _live');
assert(run.sheetLivingColors({width:120, height:120}, 'pordoom_ghost_e_w1')===false,
  'failed sample still refuses unsigned cyan e_w');
assert(run.sheetLivingColors({width:120, height:120}, 'pordoom_ghost_atk')===true,
  'failed sample allows living-color front atk');

SPR.pordoom_ghost={width:485, height:512, _live:true, _id:{ok:true, metal:0, hair:0.90, warm:0.95}};
SPR.pordoom_ghost_atk={width:400, height:512, _live:true, _id:{ok:true, metal:0.62, hair:0.12, warm:0.20}};
SPR.pordoom_ghost_atk_recover={width:400, height:512, _live:true, _id:{ok:true, metal:0.62, hair:0.12, warm:0.20}};
assert(run.partySheetMatchesIdle(SPR.pordoom_ghost_atk, SPR.pordoom_ghost, 'pordoom_ghost_atk')===false,
  'mismatched ghost atk crop fails identity');
assert(run.entAnimKey(ghost('pordoom',{atk:0.7, atkMax:1}))==='pordoom_ghost_atk',
  'ghost strike still binds the living-color atk when ready');
assert(run.entAnimKey(ghost('pordoom',{atk:0.20, atkMax:1}))==='pordoom_ghost_atk_recover',
  'ghost recover still binds the living-color recover when ready');
ready('pordoom_ghost', true);
ready('pordoom_ghost_atk', true);
ready('pordoom_ghost_atk_recover', true);

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nghost living-color bind checks passed');
console.log('Limner must still replace '+replaceList.length+' unsigned sheets:');
replaceList.forEach(f=>console.log('  '+f));
