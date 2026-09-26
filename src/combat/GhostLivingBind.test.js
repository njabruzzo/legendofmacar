'use strict';
/**
 * Ghost idle fronts and front walk w1/w2 are Nick-GOOD icy spectral
 * (soft-eye walk v7). Idle backs stay color-true. Atk / atk_recover
 * stay living-color α168. Remaining cyan/teal angled/compass/w3/back_w
 * sheets stay on disk for Limner redo — never paint them; plant the
 * signed spectral idle instead.
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
const SPECTRAL_WALK=['_w1','_w2'];
const LIVING_SUF=['_atk','_atk_recover'];
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
assert(/\(\?:pordoom\|fendur\|orbo\|talpor\)_ghost\(\?:_w\[12\]\)\?\$/.test(extractFn('sheetLivingColors'))
  && /img\._live=true; return true;/.test(extractFn('sheetLivingColors')),
  'Nick spectral idle and front walk bind before the cyan warm-gate');
assert(/nickSpectralGhostSheet\(img\)\) return img/.test(extractFn('solidDwarfSprite'))
  && /return liftGhostSpirit\(img\)/.test(extractFn('solidDwarfSprite')),
  'spectral idle and front walk blit as painted; atk/back still lift');
assert(/img===SPR\.pordoom_ghost\|\|img===SPR\.fendur_ghost\|\|img===SPR\.orbo_ghost/.test(extractFn('nickSpectralGhostSheet'))
  && /pordoom_ghost_w1/.test(extractFn('nickSpectralGhostSheet'))
  && !/SPR\.talpor_ghost/.test(extractFn('nickSpectralGhostSheet'))
  && /dwarf_talpor_ghost\.png/.test(extractFn('nickSpectralGhostSheet'))
  && !/ghost_atk/.test(extractFn('nickSpectralGhostSheet'))
  && !/ghost_back/.test(extractFn('nickSpectralGhostSheet')),
  'painted spectral skip is Pordoom/Fendur/Orbo; Talpor lifts until the drop-in file is repainted');
assert(/_ghost_w\[12\]\$/.test(extractFn('partyGhostKeyReady')),
  'front ghost walk skips the idle crop match so stride overhang stays bound');
assert(/talporInterimGhostKey\(key\)\) return true/.test(extractFn('partyGhostKeyReady'))
  && /dwarf_talpor_ghost\.png/.test(extractFn('talporInterimGhostKey'))
  && /dwarf_talpor_ghost_w1\.png/.test(extractFn('talporInterimGhostKey'))
  && /dwarf_talpor_ghost_atk\.png/.test(extractFn('talporInterimGhostKey'))
  && /dwarf_talpor_ghost_back\.png/.test(extractFn('talporInterimGhostKey')),
  'Talpor idle, walk, attack, and back each keep one repaint slot and bind before the crop match');
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
  const idleSt=ctx.livingColorStats(idle.data);
  assert(!idleSt.living && idleSt.cyanR>=0.70 && idleSt.warmR<0.02,
    k+' ghost idle is Nick spectral (icy cyan, not the warm α168 gate)');
  assert(ctx.livingColorStats(back.data).living, k+' ghost back is living-color — keep');
  assert(!ctx.ghostKeyLooksUnsigned(k+'_ghost') && !ctx.ghostKeyLooksUnsigned(k+'_ghost_back'),
    k+' idle front/back are the signed ghost identity');
  SPECTRAL_WALK.concat(LIVING_SUF).forEach(suf=>{
    assert(!ctx.ghostKeyLooksUnsigned(k+'_ghost'+suf),
      k+' ghost'+suf+' is bind-ready, not unsigned');
  });
  SPECTRAL_WALK.forEach(suf=>{
    const file='dwarf_'+k+'_ghost'+suf+'.png';
    const full=path.join(creatures, file);
    assert(fs.existsSync(full), file+' on disk');
    const st=ctx.livingColorStats(readRgba(full).data);
    assert(!st.living && st.cyanR>=0.70 && st.warmR<0.02,
      file+' is Nick spectral walk (icy cyan, not the warm α168 gate)');
  });
  LIVING_SUF.forEach(suf=>{
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
assert(KIN.length*(SPECTRAL_WALK.length+LIVING_SUF.length)===16,
  'front motion is 8 spectral walks plus 8 living atk sheets');

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
  +extractFn('restoredMacarMotionKey')+extractFn('partyAnimKeyReady')
  +extractFn('pickReadyPartyKey')
  +extractFn('ghostKeyLooksUnsigned')
  +extractFn('livingColorStats')
  +extractFn('sampleLivingColors')
  +extractFn('sheetLivingColors')
  +extractFn('ghostIdleKey')
  +extractFn('talporInterimGhostKey')
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
  +'const MACAR_STRIKE_HOLD=0.12;'
  +'const MACAR_MAUL_CONTACT_T=0.45;'
  +extractFn('armLivingMacarStrike')
  +extractFn('wantsLivingMacarStrike')
  +extractFn('faceVec')
  +extractFn('screenOctant')
  +extractFn('screenCardinal')
  +extractFn('wantsBackView')
  +extractFn('dwarfAngleKey')
  +extractFn('ghostAnimKey')
  +extractFn('entSpriteKey')
  +extractFn('singlePoseLocked')
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
    k+' ghost walk binds spectral w1');
  assert(run.entAnimKey(ghost(k,{moving:1, ix:0.7, iy:-0.7, fdx:0.7, fdy:-0.7, gait:0.62}))===k+'_ghost_w2',
    k+' ghost late gait binds spectral w2');
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
  assert(run.entAnimKey(ghost(k,{moving:1, ix:0.7, iy:-0.7, fdx:0.7, fdy:-0.7, gait:0.12}))===k+'_ghost_w1',
    k+' spectral walk binds even if a stale _live=false was cached');
  const heldW1=SPR[k+'_ghost_w1'], heldW2=SPR[k+'_ghost_w2'];
  delete SPR[k+'_ghost_w1']; delete SPR[k+'_ghost_w2'];
  assert(run.entAnimKey(ghost(k,{moving:1, ix:0.7, iy:-0.7, fdx:0.7, fdy:-0.7, gait:0.12}))===k+'_ghost',
    k+' ghost walk plants idle when front sheets are missing');
  SPR[k+'_ghost_w1']=heldW1; SPR[k+'_ghost_w2']=heldW2;
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

const walkImg={width:470, height:512};
assert(run.sheetLivingColors(walkImg, 'pordoom_ghost_w1')===true,
  'spectral front w1 binds before the warm gate');
assert(walkImg._live===true, 'spectral front w1 stamps _live');
const walk2={width:692, height:512, _live:false};
assert(run.sheetLivingColors(walk2, 'pordoom_ghost_w2')===true && walk2._live===true,
  'stale _live=false on spectral w2 is cleared by the key bypass');
const unsamp={width:120, height:120};
assert(run.sheetLivingColors(unsamp, 'pordoom_ghost_atk')===true,
  'failed sample allows living-color front atk (does not plant idle)');
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

function sized(key, w, h){
  SPR[key]={width:w, height:h, _live:true};
}
sized('pordoom_ghost', 470, 512);
sized('pordoom_ghost_w1', 470, 512);
sized('pordoom_ghost_w2', 692, 512);
assert(run.entAnimKey(ghost('pordoom',{moving:1, ix:0.7, iy:-0.7, fdx:0.7, fdy:-0.7, gait:0.12}))==='pordoom_ghost_w1',
  'pordoom spectral w1 binds at the signed 470×512 canvas');
assert(run.entAnimKey(ghost('pordoom',{moving:1, ix:0.7, iy:-0.7, fdx:0.7, fdy:-0.7, gait:0.62}))==='pordoom_ghost_w2',
  'pordoom spectral w2 binds even though 692×512 fails samePaintedFamily');
sized('fendur_ghost', 470, 512);
sized('fendur_ghost_w1', 593, 512);
sized('fendur_ghost_w2', 527, 512);
assert(run.entAnimKey(ghost('fendur',{moving:1, ix:0.7, iy:-0.7, fdx:0.7, fdy:-0.7, gait:0.12}))==='fendur_ghost_w1',
  'fendur spectral w1 binds at 593×512');
assert(run.entAnimKey(ghost('fendur',{moving:1, ix:0.7, iy:-0.7, fdx:0.7, fdy:-0.7, gait:0.62}))==='fendur_ghost_w2',
  'fendur spectral w2 binds at 527×512');
sized('talpor_ghost', 674, 512);
sized('talpor_ghost_w1', 589, 512);
sized('talpor_ghost_w2', 504, 512);
sized('talpor_ghost_atk', 504, 512);
sized('talpor_ghost_atk_recover', 504, 512);
sized('talpor_ghost_back', 504, 512);
assert(run.entAnimKey(ghost('talpor',{moving:1, ix:0.7, iy:-0.7, fdx:0.7, fdy:-0.7, gait:0.12}))==='talpor_ghost_w1',
  'talpor walk binds at 589×512 so the spectral lift covers the teal stride');
assert(run.entAnimKey(ghost('talpor',{atk:0.7, atkMax:1}))==='talpor_ghost_atk',
  'talpor brown attack binds so the spectral lift covers the strike');
assert(run.entAnimKey(ghost('talpor',{atk:0.20, atkMax:1}))==='talpor_ghost_atk_recover',
  'talpor brown recover binds with the attack state');
assert(run.entAnimKey(ghost('talpor',{fdx:-0.7, fdy:-0.7}))==='talpor_ghost_back',
  'talpor brown back binds even though 504×512 fails the idle family match');
assert(run.partySheetMatchesIdle(SPR.talpor_ghost_back, SPR.talpor_ghost, 'talpor_ghost_back')===false,
  'talpor back still fails the generic crop match — the interim key is what binds it');
assert(run.partySheetMatchesIdle(SPR.pordoom_ghost_w2, SPR.pordoom_ghost, 'pordoom_ghost_w2')===false,
  'wide spectral w2 still fails the generic crop match — the walk bypass is what binds it');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nghost living-color bind checks passed');
console.log('Limner must still replace '+replaceList.length+' unsigned sheets:');
replaceList.forEach(f=>console.log('  '+f));
