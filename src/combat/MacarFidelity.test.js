'use strict';
/**
 * Code-side living-Macar fidelity + maul phase read.
 * Punch/repair must not smear hard-alpha sheets; canvas DPR is integer 2
 * on a 1.5+ display; Attack windup→contact is a distinct pair, never carry.
 * Run: node src/combat/MacarFidelity.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.join(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

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

assert(/ASSET_VER='102'/.test(html) && !/ASSET_VER='103'/.test(html),
  'ASSET_VER stays 102 — no painted-sheet swap');

assert(/function pickPlayDpr\(/.test(html) && /function gfxDprCap\(/.test(html),
  'integer play DPR helper exists');
assert(/PHONE_GFX\) return 1/.test(extractFn('gfxDprCap'))
  && /return 2/.test(extractFn('gfxDprCap')),
  'desktop cap is 2; phones stay 1×');
assert(/raw>=1\.5\) return 2/.test(extractFn('pickPlayDpr'))
  && /return 1/.test(extractFn('pickPlayDpr')),
  'pickPlayDpr is integer 2 on a 1.5+ display, never 1.25 mush');
assert(/const nDPR = pickPlayDpr\(\)/.test(html),
  'resize uses pickPlayDpr, not min(devicePixelRatio, 1)');

const repair=extractFn('repairSpriteSheet');
assert(/const LO=40/.test(repair), 'repair fringe matches living punch (a≤40)');
assert(/if\(mid>0\)\{/.test(html) && /pass<3/.test(html) && /n>=18/.test(html),
  'speckle knit is mid-alpha only and three conservative passes');
assert(/Hard-alpha/.test(html) || /hard-alpha/.test(html),
  'repair documents the hard-alpha early-out');
assert(/Math\.min\(1\.25, 255\/a\)/.test(repair),
  'un-premultiply is capped at 1.25 so faint edges do not blow white');

assert(/const MACAR_BLACK_SLAB_T=8/.test(html)
  && /mx<=T && \(r\+g2\+b\)<=T\*2/.test(extractFn('punchBlackExportSlab')),
  'slab flood is max-channel T=8, not sum≤16');

assert(/const MACAR_MAUL_CONTACT_T=0\.45/.test(html),
  'contact still takes over at the hit');
assert(/const MACAR_MAUL_WINDUP_T=0\.18/.test(html)
  && /const MACAR_MAUL_HIT_HOLD_T=0\.60/.test(html)
  && /const MACAR_MAUL_WINDUP_MIN_S=0\.28/.test(html)
  && /p\.atk=p\.atkMax\*0\.40/.test(extractFn('macarStrikeHoldMid')),
  'windup sample, holdMid atkMax*0.40 (t=0.60), and min-read beat are wired');
assert(/function armLivingMacarWindup\(/.test(html)
  && /function wantsMacarWindup\(/.test(html)
  && /armLivingMacarWindup\(p\)/.test(html),
  'Attack press and standing auto-melee arm the min-read windup');
assert(/e\.atk=e\.atkMax\*\(1-u\)/.test(html)
  && /MacarStrikeQA\.holdT/.test(html)
  && !/e\.atk=e\.atkMax\*0\.60/.test(html),
  'MacarStrikeQA.hold freezes at holdT (windup or contact), not a single t=0.40');

const worldArt=html.match(/const WORLD_ART_KEYS=\{[\s\S]*?\};/);
assert(!!worldArt && /macar_atk_contact/.test(worldArt[0]) && /macar_w1/.test(worldArt[0]),
  'worldArtReady waits on living walk + combat sheets');

const keysDecl=html.match(/const LIVING_MACAR_KEYS=\{[\s\S]*?\};/);
const SPR={
  macar:{width:470, height:512, _id:{ok:true, metal:0, hair:0.86, warm:0.96}},
  macar_w1:{width:470, height:512},
  macar_w2:{width:470, height:512},
  macar_atk:{width:470, height:540},
  macar_atk_contact:{width:893, height:540}
};
const ctx={
  SPR,
  sprReady(k){ return !!(k && SPR[k] && SPR[k].width); },
  wieldsShadowCleaver(){ return false; },
  wieldsCrossbow(){ return false; },
  MacarStrikeQA:{hold:false, blitKey:null, bowPoseT:0, bowPoseUntil:0},
  _now:10000,
  performance:{now(){ return ctx._now; }},
  player(){ return ctx._player||null; },
  clamp:(v,a,b)=>v<a?a:v>b?b:v,
  TAU:Math.PI*2
};
vm.createContext(ctx);
vm.runInContext(
  keysDecl[0]
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
  +extractFn('livingMacarBlitKey')
  +extractFn('walkCycleKey')
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
  +'const MACAR_MAUL_WINDUP_T=0.18;'
  +'const MACAR_MAUL_HIT_HOLD_T=0.60;'
  +'const MACAR_MAUL_WINDUP_MIN_S=0.28;'
  +extractFn('armLivingMacarStrike')
  +extractFn('armLivingMacarWindup')
  +extractFn('wantsMacarWindup')
  +extractFn('wantsLivingMacarStrike')
  +extractFn('macarStrikeHoldAt')
  +extractFn('macarStrikeHoldMid')
  +extractFn('livingMacarAnimKey'),
  ctx
);

function macar(extra){
  return Object.assign({
    hero:1, team:'party', dead:0, ghost:0, crushed:0, defending:0,
    moving:0, atk:0, atkMax:1, atkKind:'melee', gait:0.12,
    x:10, y:10, ix:0, iy:0, fdx:0, fdy:0
  }, extra||{});
}

assert(ctx.livingMacarAnimKey(macar())==='macar', 'idle is carry');
assert(ctx.livingMacarAnimKey(macar({moving:1, gait:0.12}))==='macar_w1', 'walk A is w1');
assert(ctx.livingMacarAnimKey(macar({atk:1-0.18, atkMax:1}))==='macar_atk',
  't=0.18 windup is macar_atk');
assert(ctx.livingMacarAnimKey(macar({atk:1-0.44, atkMax:1}))==='macar_atk',
  't=0.44 still windup — contact is the hit, not early');
assert(ctx.livingMacarAnimKey(macar({atk:0.54, atkMax:1}))==='macar_atk_contact',
  't≈0.46 (the hit) is contact');
assert(ctx.livingMacarAnimKey(macar({atk:1-0.60, atkMax:1}))==='macar_atk_contact',
  't=0.60 QA hold is contact');
ctx._player=macar({atk:0, atkMax:0.78});
assert(ctx.macarStrikeHoldMid()===true
  && Math.abs(ctx._player.atk-0.78*0.40)<1e-9
  && ctx.attackProgress(ctx._player)>=0.45
  && ctx.livingMacarAnimKey(ctx._player)==='macar_atk_contact',
  'holdMid() hook blits macar_atk_contact when CONTACT_T is 0.45');
assert(ctx.livingMacarAnimKey(macar({atk:1-0.84, atkMax:1}))==='macar',
  't=0.84 recover plants idle carry');
assert(ctx.livingMacarBlitKey('macar_atk')==='macar_atk'
  && ctx.livingMacarBlitKey('macar_atk_contact')==='macar_atk_contact',
  'blit key cannot re-plant idle over a ready strike sheet');

const armed=macar({atk:1-0.50, atkMax:1});
ctx.armLivingMacarWindup(armed);
assert(armed.macarWindupUntil>ctx._now
  && ctx.wantsMacarWindup(armed)===true
  && ctx.livingMacarAnimKey(armed)==='macar_atk',
  'armed min-read windup wins over t=0.50 contact');
armed.macarWindupUntil=ctx._now-1;
assert(ctx.livingMacarAnimKey(armed)==='macar_atk_contact',
  'expired min-read returns contact');

vm.runInContext(extractFn('isMagentaMatte')+extractFn('isBlackMatte')+extractFn('punchLivingAlpha'), ctx);
const d=new Uint8ClampedArray([
  255,0,255,255,
  80,50,30,30,
  40,30,20,80,
  22,14,10,255,
  0,0,0,255
]);
ctx.punchLivingAlpha(d, 5);
assert(d[0]===0 && d[3]===0, 'magenta matte punches');
assert(d[4]===0 && d[7]===0, 'a≤40 fringe punches');
assert(d[11]===255, 'a>40 painted rim is forced opaque');
assert(d[12]===22 && d[15]===255, 'dark boot/hair chroma is not black-matte');
assert(d[16]===0 && d[19]===0, 'exact RGB 0 export matte punches');

const dpr={
  PHONE_GFX:false,
  DIAG:{dpr2:0},
  window:{devicePixelRatio:2}
};
vm.createContext(dpr);
vm.runInContext(extractFn('gfxDprCap')+extractFn('pickPlayDpr'), dpr);
assert(dpr.pickPlayDpr()===2, '2× display uses integer DPR 2');
dpr.window.devicePixelRatio=1.25;
assert(dpr.pickPlayDpr()===1, '1.25 display stays integer 1 (no fractional seams)');
dpr.window.devicePixelRatio=1;
assert(dpr.pickPlayDpr()===1, '1× display stays 1');
dpr.PHONE_GFX=true;
dpr.window.devicePixelRatio=3;
assert(dpr.gfxDprCap()===1 && dpr.pickPlayDpr()===1, 'phones stay 1×');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nMacar fidelity / attack-phase checks passed');
