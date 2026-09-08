'use strict';
/**
 * Macar melee: strike window blits matching _atk + source-over swipe;
 * recover plants idle (or a signed _atk_recover). Manual / auto / maul /
 * Shadow Cleaver share one key helper.
 * Run: node src/combat/MacarMeleeStrike.test.js
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

const liveKey=extractFn('livingMacarAnimKey');
assert(/if\(wantsLivingMacarStrike\(e\)\)\{/.test(liveKey), 'strike includes the post-hit hold');
assert(/if\(wantsMeleeRecover\(e\)\)\{/.test(liveKey), 'recover is its own window');
assert(/matchingPartyAtkReady\(atk, idle\)/.test(liveKey),
  'crown/family cannot plant idle during the strike window');
assert(/matchingPartyAtkReady\(rec, idle\)/.test(liveKey),
  'a signed recover sheet can still bind when present');
assert(!/wantsMeleePose\(e\)\|\|wantsMeleeRecover\(e\)/.test(liveKey),
  'living Macar no longer holds _atk through recover');

const swipe=extractFn('drawHeroMeleeArc');
assert(/if\(!wantsMeleePose\(e\)\) return/.test(swipe), 'swipe dies when recover starts');
assert(/globalCompositeOperation='source-over'/.test(swipe), 'swipe is source-over');
assert(/wantsSpriteFlip/.test(swipe), 'swipe flips with heading');
assert(!/if\(wantsMeleePose\(mac\)\)/.test(html)
  || !/drawHeroMeleeArc\(g,mac/.test(html),
  'after-grain living Macar has no gold swipe over the mid-swing sheet');
assert(/e\.ghost && wantsMeleePose\(e\)/.test(html), 'ghost swipe is strike-only');
assert(!/drawHeroMeleeArc/.test(extractFn('drawLivingMacar')),
  'living blit itself still has no swipe / lighter');

assert(/e\.hero && !e\.ghost\) return t>=0 && t<0\.84/.test(extractFn('wantsMeleePose')),
  'living Macar strike is t 0–0.84 so Attack press is already mid-swing');
assert(/t>=0\.08 && t<0\.72/.test(extractFn('wantsMeleePose')),
  'kin / foe strike window stays t 0.08–0.72');
assert(/e\.hero && !e\.ghost\) return t>=0\.84 && t<=0\.96/.test(extractFn('wantsMeleeRecover')),
  'living Macar recover is t 0.84–0.96');
assert(/t>=0\.72 && t<=0\.96/.test(extractFn('wantsMeleeRecover')),
  'kin / foe recover window stays t 0.72–0.96');
assert(/t\/Math\.max\(0\.01,0\.84\)/.test(swipe)
  && /\(t-0\.08\)\/Math\.max\(0\.01,0\.64\)/.test(swipe),
  'swipe rematches living 0–0.84 and kin 0.08–0.72');
assert(/function livingMacarBlitKey\(/.test(html)
  && /matchingPartyAtkReady\(key, idle\)\) return key/.test(extractFn('livingMacarBlitKey')),
  'ready atk blit key skips pickReadyPartyKey idle plant');
assert(/window\.MacarStrikeQA=MacarStrikeQA/.test(html)
  && /lastKey:null/.test(html) && /holdProgress:0/.test(html)
  && /strikeHold:0/.test(html) && /swung:false/.test(html),
  'MacarStrikeQA exposes lastKey / holdProgress / strikeHold for live proof');
assert(/const MACAR_STRIKE_HOLD=0\.36/.test(html)
  && /function wantsLivingMacarStrike\(/.test(html)
  && /function armLivingMacarStrike\(/.test(html),
  'living Macar holds mid-swing 0.36s after the blow, then idle carry');
assert(/const MACAR_BOW_POSE_S=0\.40/.test(html) && /function wantsBowPose\(/.test(html)
  && /bowPoseUntil/.test(html) && /function expireBowPose\(/.test(html),
  'Shoot pose is render-time bowPoseUntil, then expire plants idle');
assert(!/attackProgress\(e\)<MACAR_BOW_POSE/.test(html)
  && !/attackProgress\(e\)<0\.45/.test(extractFn('wantsBowPose')),
  'wantsBowPose has no attackProgress fallback');
assert(/MacarStrikeQA\.hold/.test(html) && /atkKind!=='bow'/.test(html),
  'melee QA hold does not freeze the bow atk timer');
assert(/expireBowPose/.test(liveKey) && /wantsBowPose/.test(liveKey),
  'livingMacarAnimKey gates the cocked xbow sheet on wantsBowPose');
assert(/bowPoseUntil:0/.test(html) && /MacarStrikeQA\.bowPoseUntil=/.test(html)
  && /MacarStrikeQA\.bowPoseT=/.test(html) && /MacarStrikeQA\.blitKey=/.test(html),
  'MacarStrikeQA exposes bowPoseT / bowPoseUntil / blitKey');

const keysDecl=html.match(/const LIVING_MACAR_KEYS=\{[\s\S]*?\};/);
const SPR={
  macar:{width:470, height:512, _id:{ok:true, metal:0, hair:0.86, warm:0.96}},
  macar_w1:{width:470, height:512},
  macar_w2:{width:470, height:512}
};
const ctx={
  SPR,
  sprReady(k){ return !!(k && SPR[k] && SPR[k].width); },
  wieldsShadowCleaver(){ return !!ctx._axe; },
  wieldsCrossbow(){ return !!ctx._xbow; },
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
  +'const MACAR_STRIKE_HOLD=0.36;'
  +extractFn('armLivingMacarStrike')
  +extractFn('wantsLivingMacarStrike')
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

function keysAcrossSwing(readyAtk, expectStrike, expectRecover){
  const seen=[];
  for(let t=0; t<=1.001; t+=0.02){
    const e=macar({atk:1-t, atkMax:1});
    const key=ctx.livingMacarAnimKey(e);
    const pose=ctx.wantsMeleePose(e);
    const rec=ctx.wantsMeleeRecover(e);
    if(pose) assert(key===expectStrike, 't='+t.toFixed(2)+' strike key is '+expectStrike+' (got '+key+')');
    if(rec) assert(key===expectRecover, 't='+t.toFixed(2)+' recover key is '+expectRecover+' (got '+key+')');
    seen.push({t:+t.toFixed(2), key, pose, rec});
  }
  return seen;
}

ctx._axe=false;
SPR.macar_atk={width:470, height:512};
const maul=keysAcrossSwing('macar_atk', 'macar_atk', 'macar');
assert(maul.some(s=>s.pose && s.key==='macar_atk'), 'maul strike samples include macar_atk');
assert(maul.some(s=>s.rec && s.key==='macar'), 'maul recover samples include planted idle');
assert(maul.filter(s=>s.pose).every(s=>s.key==='macar_atk'), 'every maul strike sample is atk');
assert(maul.filter(s=>s.rec).every(s=>s.key==='macar'), 'every maul recover sample is idle');

SPR.macar_atk={width:400, height:512, _id:{ok:true, metal:0.55, hair:0.20, warm:0.30}};
assert(ctx.partySheetMatchesIdle(SPR.macar_atk, SPR.macar, 'macar_atk')===false,
  'mismatched crop still fails identity');
assert(ctx.livingMacarAnimKey(macar({atk:0.7, atkMax:1}))==='macar_atk',
  'manual / auto strike still blits atk when crown would plant idle');
assert(ctx.livingMacarBlitKey('macar_atk')==='macar_atk',
  'blit key still honors ready atk when crown would plant idle');
assert(ctx.livingMacarAnimKey(macar({atk:0.10, atkMax:1}))==='macar',
  'same crown miss cannot hold the wind-up through recover');
delete SPR.macar_atk;

SPR.macar_axe={width:470, height:512, _id:{ok:true, metal:0, hair:0.86, warm:0.96}};
SPR.macar_axe_atk={width:470, height:512};
SPR.macar_axe_w1={width:470, height:512};
SPR.macar_axe_w2={width:470, height:512};
ctx._axe=true;
const cleaver=keysAcrossSwing('macar_axe_atk', 'macar_axe_atk', 'macar_axe');
assert(cleaver.filter(s=>s.pose).every(s=>s.key==='macar_axe_atk'),
  'every Shadow Cleaver strike sample is axe_atk');
assert(cleaver.filter(s=>s.rec).every(s=>s.key==='macar_axe'),
  'every Shadow Cleaver recover sample is axe idle');
assert(ctx.livingMacarAnimKey(macar({moving:1, gait:0.12}))==='macar_axe_w1',
  'cleaver walk is unchanged beside the melee split');

SPR.macar_xbow={width:470, height:512, _id:{ok:true, metal:0, hair:0.86, warm:0.96}};
SPR.macar_xbow_atk={width:470, height:512};
SPR.macar_xbow_w1={width:470, height:512};
SPR.macar_xbow_w2={width:470, height:512};
ctx._axe=false;
ctx._xbow=true;
const xbow=keysAcrossSwing('macar_xbow_atk', 'macar_xbow_atk', 'macar_xbow');
assert(xbow.filter(s=>s.pose).every(s=>s.key==='macar_xbow_atk'),
  'every crossbow strike sample is xbow_atk');
assert(xbow.filter(s=>s.rec).every(s=>s.key==='macar_xbow'),
  'every crossbow recover sample is xbow idle');
assert(ctx.livingMacarAnimKey(macar({moving:1, gait:0.12}))==='macar_xbow_w1',
  'crossbow walk is unchanged beside the melee split');

assert(ctx.livingMacarAnimKey(macar({atk:0.90, atkMax:1, atkKind:'bow', bowPoseUntil:ctx._now+400}))==='macar_xbow_atk',
  'until in the future blits macar_xbow_atk');
const expiredHigh=macar({atk:0.90, atkMax:1, atkKind:'bow', bowPoseUntil:ctx._now-1, bowPoseT:0.20});
assert(ctx.livingMacarAnimKey(expiredHigh)==='macar_xbow',
  'until expired + atk still high plants xbow idle');
assert(expiredHigh.atk===0 && expiredHigh.atkKind==='melee',
  'expired Shoot clears atk / atkKind so no path can force xbow_atk');
ctx.MacarStrikeQA.hold=true;
const holdExp=macar({atk:0.60, atkMax:1, atkKind:'bow', bowPoseUntil:ctx._now-50});
assert(ctx.livingMacarAnimKey(holdExp)==='macar_xbow',
  'MacarStrikeQA.hold + until expired plants xbow idle');
ctx.MacarStrikeQA.hold=false;
assert(ctx.livingMacarAnimKey(macar({atk:0.90, atkMax:1, atkKind:'bow', bowPoseT:0.20}))==='macar_xbow_atk',
  'optional bowPoseT still shows the loose when until is unset');
assert(ctx.livingMacarAnimKey(macar({atk:0.90, atkMax:1, atkKind:'bow'}))==='macar_xbow',
  'Shoot with no until / bowPoseT plants idle — no progress fallback');
ctx._xbow=false;
ctx._axe=true;

function fireManual(p){
  if(p.defending) return false;
  p.moving=0; p.ix=0; p.iy=0; p.atkKind='melee';
  if(p.atk<=0){
    p.atk=p.atkMax;
    if((p.ct||0)<=0){ p.ct=p.cd||1; p.swung=0; }
    else p.swung=1;
  }
  return true;
}
const manual=macar({atk:0, atkMax:0.78, ct:0, cd:1, defending:0, swung:0});
assert(fireManual(manual)===true, 'manual Attack starts a melee timer');
assert(ctx.livingMacarAnimKey(Object.assign({}, manual, {atk:manual.atkMax*0.70}))==='macar_axe_atk',
  'manual Attack mid-timer is the cleaver strike sheet');
assert(ctx.wantsMeleePose(Object.assign({}, manual, {atk:manual.atkMax*0.35}))===true
  && ctx.livingMacarAnimKey(Object.assign({}, manual, {atk:manual.atkMax*0.35}))==='macar_axe_atk',
  'manual Attack late swing t≈0.65 still holds the mid-swing sheet');
assert(ctx.livingMacarAnimKey(Object.assign({}, manual, {atk:manual.atkMax*0.10}))==='macar_axe',
  'manual Attack recover plants axe idle');
assert(ctx.wantsMeleePose(Object.assign({}, manual, {atk:manual.atkMax}))===true
  && ctx.livingMacarAnimKey(Object.assign({}, manual, {atk:manual.atkMax}))==='macar_axe_atk',
  'manual Attack press (t=0) is already the mid-swing sheet');

const auto=macar({atk:0.78*0.70, atkMax:0.78, atkKind:'melee', moving:0});
assert(ctx.wantsMeleePose(auto)===true && ctx.livingMacarAnimKey(auto)==='macar_axe_atk',
  'standing auto-melee uses the same strike key');
const autoLate=macar({atk:0.78*0.35, atkMax:0.78, atkKind:'melee', moving:0});
assert(ctx.wantsMeleePose(autoLate)===true && ctx.livingMacarAnimKey(autoLate)==='macar_axe_atk',
  'standing auto-melee late swing still holds the mid-swing sheet');
const autoRec=macar({atk:0.78*0.10, atkMax:0.78, atkKind:'melee', moving:0});
assert(ctx.wantsMeleeRecover(autoRec)===true && ctx.livingMacarAnimKey(autoRec)==='macar_axe',
  'standing auto-melee recover plants idle');
const afterHit=macar({atk:0, atkMax:0.78, atkKind:'melee', moving:0, swung:0, macarStrikeHold:0.36});
assert(ctx.wantsLivingMacarStrike(afterHit)===true
  && ctx.livingMacarAnimKey(afterHit)==='macar_axe_atk',
  'short post-swung hold still blits mid-swing after the atk timer dies');
const afterHitMaul=macar({atk:0.78*0.10, atkMax:0.78, atkKind:'melee', moving:0, macarStrikeHold:0.30});
ctx._axe=false;
SPR.macar_atk={width:470, height:512};
assert(ctx.wantsMeleeRecover(afterHitMaul)===true
  && ctx.wantsLivingMacarStrike(afterHitMaul)===true
  && ctx.livingMacarAnimKey(afterHitMaul)==='macar_atk',
  'maul recover t still holds macar_atk while the short strikeHold is running');
delete SPR.macar_atk;
ctx._axe=true;
const afterHold=macar({atk:0, atkMax:0.78, atkKind:'melee', moving:0, swung:0, macarStrikeHold:0});
assert(ctx.wantsLivingMacarStrike(afterHold)===false
  && ctx.livingMacarAnimKey(afterHold)==='macar_axe',
  'cleaver returns to idle carry once strikeHold expires');
ctx._axe=false;
SPR.macar_atk={width:470, height:512};
const afterHoldMaul=macar({atk:0, atkMax:0.78, atkKind:'melee', moving:0, swung:0, macarStrikeHold:0});
assert(ctx.livingMacarAnimKey(afterHoldMaul)==='macar',
  'maul returns to idle carry once strikeHold expires');
delete SPR.macar_atk;
ctx._axe=true;
const autoPress=macar({atk:0.78, atkMax:0.78, atkKind:'melee', moving:0});
assert(ctx.wantsMeleePose(autoPress)===true && ctx.livingMacarAnimKey(autoPress)==='macar_axe_atk',
  'standing auto-melee press is already the mid-swing sheet');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nMacar melee strike / recover checks passed');
