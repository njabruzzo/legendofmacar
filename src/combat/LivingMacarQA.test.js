'use strict';
/**
 * Living Macar regression gate — walk flip, binary alpha, axe sheets, combat
 * facing. Fails the build if any of those silently return.
 * Run: node src/combat/LivingMacarQA.test.js
 */
const fs=require('fs');
const path=require('path');
const zlib=require('zlib');
const vm=require('vm');
const {readRgba}=require('../qa/pngRgba');

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
  if(!m) throw new Error('missing '+name+' in index.html');
  return m[0];
}

/* --- PNG alpha: only 0 or 255 on every sheet living Macar will blit. --- */
function readChunkedPng(buf){
  if(buf.slice(0,8).toString('binary')!=='\x89PNG\r\n\x1a\n') throw new Error('not png');
  let pos=8, w=0, h=0, bit=0, ctype=0, idat=[];
  while(pos<buf.length){
    const ln=buf.readUInt32BE(pos);
    const typ=buf.slice(pos+4, pos+8).toString('ascii');
    const chunk=buf.slice(pos+8, pos+8+ln);
    pos+=12+ln;
    if(typ==='IHDR'){
      w=chunk.readUInt32BE(0); h=chunk.readUInt32BE(4);
      bit=chunk[8]; ctype=chunk[9];
    } else if(typ==='IDAT') idat.push(chunk);
    else if(typ==='IEND') break;
  }
  return {w,h,bit,ctype, raw:zlib.inflateSync(Buffer.concat(idat))};
}
function paeth(a,b,c){
  const p=a+b-c, pa=Math.abs(p-a), pb=Math.abs(p-b), pc=Math.abs(p-c);
  if(pa<=pb && pa<=pc) return a;
  if(pb<=pc) return b;
  return c;
}
function pngAlphaHist(filePath){
  const {w,h,bit,ctype,raw}=readChunkedPng(fs.readFileSync(filePath));
  if(bit!==8) return {ok:false, err:'bit '+bit};
  if(ctype===2) return {ok:true, mid:0, unique:1, note:'rgb-opaque'};
  if(ctype!==6) return {ok:false, err:'ctype '+ctype};
  const bpp=4, stride=w*bpp;
  let i=0;
  const prev=Buffer.alloc(stride);
  const midVals=new Set();
  let mid=0, a0=0, a255=0;
  for(let y=0;y<h;y++){
    const f=raw[i++]; const row=Buffer.from(raw.slice(i, i+stride)); i+=stride;
    if(f===1){ for(let x=0;x<stride;x++) row[x]=(row[x]+(x>=bpp?row[x-bpp]:0))&255; }
    else if(f===2){ for(let x=0;x<stride;x++) row[x]=(row[x]+prev[x])&255; }
    else if(f===3){ for(let x=0;x<stride;x++) row[x]=(row[x]+(((x>=bpp?row[x-bpp]:0)+prev[x])>>1))&255; }
    else if(f===4){
      for(let x=0;x<stride;x++){
        const a=x>=bpp?row[x-bpp]:0, b=prev[x], c=x>=bpp?prev[x-bpp]:0;
        row[x]=(row[x]+paeth(a,b,c))&255;
      }
    } else if(f!==0) return {ok:false, err:'filter '+f};
    row.copy(prev);
    for(let x=3;x<stride;x+=4){
      const a=row[x];
      if(a===0) a0++;
      else if(a===255) a255++;
      else { mid++; midVals.add(a); }
    }
  }
  return {ok:true, w, h, mid, a0, a255, unique:midVals.size+(a0?1:0)+(a255?1:0)};
}

const BLIT_KEYS=['macar','macar_w1','macar_w2','macar_atk','macar_atk_contact','macar_axe','macar_axe_w1','macar_axe_w2','macar_axe_atk',
  'macar_xbow','macar_xbow_w1','macar_xbow_w2','macar_xbow_atk'];
const KEY_FILE={
  macar:'dwarf_macar.png',
  macar_w1:'dwarf_macar_w1.png',
  macar_w2:'dwarf_macar_w2.png',
  macar_atk:'dwarf_macar_atk.png',
  macar_atk_contact:'dwarf_macar_atk_contact.png',
  macar_axe:'dwarf_macar_axe.png',
  macar_axe_w1:'dwarf_macar_axe_w1.png',
  macar_axe_w2:'dwarf_macar_axe_w2.png',
  macar_axe_atk:'dwarf_macar_axe_atk.png',
  macar_xbow:'dwarf_macar_xbow.png',
  macar_xbow_w1:'dwarf_macar_xbow_w1.png',
  macar_xbow_w2:'dwarf_macar_xbow_w2.png',
  macar_xbow_atk:'dwarf_macar_xbow_atk.png'
};
/* Axe and xbow carry stay hard-alpha on disk. Maul freearm v11 (front
   two-hand carry) keeps a thin AA rim on the signed 1100×920 sheets — not a
   cel wash. Maul combat (Cel soft-note) has a semi-opaque rim.
   punchLivingMacarCanvas bakes 0/255 at blit time. */
const HARD_ALPHA_KEYS=['macar_axe','macar_axe_w1','macar_axe_w2','macar_axe_atk',
  'macar_xbow','macar_xbow_w1','macar_xbow_w2','macar_xbow_atk'];

const keysDecl=html.match(/const LIVING_MACAR_KEYS=\{[\s\S]*?\};/);
assert(!!keysDecl, 'LIVING_MACAR_KEYS is in index.html');
BLIT_KEYS.forEach(k=>{
  assert(new RegExp(k+':1').test(keysDecl[0]), 'whitelist includes '+k);
});
assert(/macar_e_w1:1/.test(keysDecl[0]) && /macar_e_w2:1/.test(keysDecl[0])
  && /macar_se_w1:1/.test(keysDecl[0]) && /macar_se_w2:1/.test(keysDecl[0])
  && /macar_ne_w1:1/.test(keysDecl[0]) && /macar_ne_w2:1/.test(keysDecl[0])
  && /macar_back_w1:1/.test(keysDecl[0]) && /macar_back_w2:1/.test(keysDecl[0]),
  'whitelist binds restored original compass walks (e / se / ne / back)');
assert(!/macar_e_w3:1/.test(keysDecl[0]) && !/macar_se_w3:1/.test(keysDecl[0])
  && !/macar_ne_w3:1/.test(keysDecl[0]) && !/macar_w3:1/.test(keysDecl[0])
  && !/macar_back:1/.test(keysDecl[0]) && !/macar_title:1/.test(keysDecl[0]),
  'whitelist does not bind helmeted e_w3 / se_w3 / ne_w3 / front w3 / title');

BLIT_KEYS.forEach(k=>{
  const file=path.join(root,'assets/creatures', KEY_FILE[k]);
  assert(fs.existsSync(file), KEY_FILE[k]+' on disk');
  const hist=pngAlphaHist(file);
  assert(hist.ok, KEY_FILE[k]+' decodes'+(hist.ok?'':' ('+hist.err+')'));
  if(HARD_ALPHA_KEYS.indexOf(k)>=0){
    assert(hist.ok && hist.mid===0,
      KEY_FILE[k]+' alpha is 0/255 only'+(hist.ok?' (mid='+hist.mid+')':' ('+hist.err+')'));
  }
});
{
  const hist=pngAlphaHist(path.join(root,'assets/creatures', KEY_FILE.macar));
  assert(hist.ok && hist.w===1100 && hist.h===920,
    'dwarf_macar.png idle stays the original 1100×920 front-carry canvas');
  assert(hist.ok && hist.mid>0 && hist.a255>0 && hist.mid<hist.a255*0.06,
    'idle keeps a thin AA rim, not a cel wash'
    +(hist.ok?' (mid='+hist.mid+' opaque='+hist.a255+')':''));
}
['macar_w1','macar_w2'].forEach(k=>{
  const hist=pngAlphaHist(path.join(root,'assets/creatures', KEY_FILE[k]));
  assert(hist.ok && hist.w===470 && hist.h===512,
    KEY_FILE[k]+' is the restored original 470×512 front walk');
});
const windupHist=pngAlphaHist(path.join(root,'assets/creatures', KEY_FILE.macar_atk));
const contactHist=pngAlphaHist(path.join(root,'assets/creatures', KEY_FILE.macar_atk_contact));
assert(windupHist.ok && windupHist.w===470 && windupHist.h===512,
  'restored maul windup canvas is 470×512');
assert(contactHist.ok && contactHist.w===893 && contactHist.h===540,
  'maul contact stays main\'s 893×540 sheet');
assert(/punchLivingMacarCanvas\(out\)/.test(extractFn('blitLivingMacar'))
  && /function punchBlackExportSlab\(/.test(html),
  'combat soft rim and walk black slab rely on the existing living bake/punch');
assert(/const MACAR_MAUL_CONTACT_T=0\.45/.test(html),
  'maul contact takes over at the hit (t≥0.45)');
assert(/const MACAR_MAUL_WINDUP_T=0\.18/.test(html)
  && /const MACAR_MAUL_HIT_HOLD_T=0\.60/.test(html)
  && /const MACAR_MAUL_WINDUP_MIN_S=0\.28/.test(html),
  'QA windup / contact holds are distinct; first Attack keeps a readable windup beat');
assert(/function armLivingMacarWindup\(/.test(html) && /function wantsMacarWindup\(/.test(html),
  'first Attack arms a min-read windup so a fat dt cannot skip to carry');
assert(/p\.atk=p\.atkMax\*0\.40/.test(extractFn('macarStrikeHoldMid'))
  && /mid-contact under countdown progress/.test(extractFn('macarStrikeHoldMid')),
  'holdMid sets atk=atkMax*0.40 (t=0.60) — not atkMax*0.60 (t=0.40 windup)');
assert(/macarStrikeHoldAt\(MACAR_MAUL_WINDUP_T\)/.test(html),
  'holdWindup freezes the raise');
const worldArt=html.match(/const WORLD_ART_KEYS=\{[\s\S]*?\};/);
assert(!!worldArt && /macar_atk/.test(worldArt[0]) && /macar_atk_contact/.test(worldArt[0])
  && /macar_w1/.test(worldArt[0]) && /macar_w2/.test(worldArt[0]),
  'first play frame waits on walk + windup + contact so Attack cannot plant idle carry');

/* --- Source: living Macar is title idle + front w1/w2. Attack plants idle. --- */
const liveKey=extractFn('livingMacarAnimKey');
assert(/forceWindup/.test(liveKey) && /wantsMacarWindup/.test(liveKey),
  'livingMacarAnimKey can hold windup past CONTACT_T for the min-read beat');
assert(/macar_atk_contact/.test(liveKey) && /MACAR_MAUL_CONTACT_T/.test(liveKey),
  'livingMacarAnimKey binds windup then contact — never _atk_recover');
assert(/macar_axe/.test(liveKey) && /livingMacarIdleKey/.test(liveKey),
  'livingMacarAnimKey binds axe via livingMacarIdleKey when cleaver is on');
assert(/macar_xbow/.test(liveKey) && /macar_xbow_atk/.test(liveKey),
  'livingMacarAnimKey binds xbow via livingMacarIdleKey when the shooting loadout is on');
assert(/wieldsShadowCleaver/.test(extractFn('livingMacarIdleKey')),
  'livingMacarIdleKey gates on wieldsShadowCleaver');
assert(/wieldsCrossbow/.test(extractFn('livingMacarIdleKey')),
  'livingMacarIdleKey gates on wieldsCrossbow');
assert(/macar_e_w1/.test(liveKey) && /macar_se_w1/.test(liveKey)
  && /macar_ne_w1/.test(liveKey) && /macar_back_w1/.test(liveKey),
  'livingMacarAnimKey binds restored compass sheets from the move octant');
assert(!/macar_title/.test(liveKey) && !/macar_e_w3/.test(liveKey),
  'livingMacarAnimKey does not bind title or the helmeted east w3');
assert(/walkCycleKey\(e, idle\)/.test(liveKey), 'south walk uses the front w1/w2 pair of the live idle');
assert(/macar_axe_atk/.test(liveKey) && (/pickReadyPartyKey\(atk, idle\)/.test(liveKey)
  || /pickReadyPartyKey\('macar_atk', idle\)/.test(liveKey)
  || /matchingPartyAtkReady\(atk, idle\)/.test(liveKey)),
  'attack uses matching atk for equipped idle (maul or axe)');
assert(/function livingMacarBlitKey\(/.test(html)
  && /matchingPartyAtkReady\(key, idle\)\) return key/.test(extractFn('livingMacarBlitKey')),
  'livingMacarImg cannot re-pick idle over a ready matching atk');
assert(/window\.MacarStrikeQA=MacarStrikeQA/.test(html) && /holdProgress:0/.test(html),
  'MacarStrikeQA lastKey / holdProgress is wired for live proof');
assert(/matchingPartyAtkReady\(atk, idle\)/.test(liveKey),
  'matching equipped atk skips crown/family so a parked crown cannot plant idle');
assert(/if\(wantsLivingMacarStrike\(e\)\)\{/.test(liveKey) && /if\(wantsMeleeRecover\(e\)\)\{/.test(liveKey),
  'strike and recover are separate key windows');
assert(/wantsBowPose/.test(liveKey) && /bowPoseUntil/.test(html) && /expireBowPose/.test(liveKey),
  'Shoot uses render-time bowPoseUntil then plants idle');
assert(/const MACAR_STRIKE_HOLD=0\.12/.test(html) && /strikeHold:0/.test(html),
  'post-hit strikeHold is a 0.12s leftover; recover returns idle carry');
assert(/macar_atk_recover/.test(liveKey) && /return idle/.test(liveKey),
  'recover plants idle unless a signed _atk_recover is ready');

assert(/function livingMacarIdleKey\(/.test(html), 'idle key helper exists for doll / HUD / title');
assert(/SPR\[livingMacarIdleKey\(\)\]/.test(html), 'doll / HUD / title idle go through livingMacarIdleKey');

const doll=html.match(/function drawEquipDoll\(g, x, y, w, h\)\{[\s\S]*?\nfunction drawPack/)[0];
assert(/livingMacarIdleKey\(\)/.test(doll) && /blitLivingMacar\(SPR\[livingMacarIdleKey\(\)\]/.test(doll),
  'pack doll blits the live title-law idle');
const faceFn=extractFn('face');
assert(/livingMacarIdleKey\(\)/.test(faceFn), 'HUD face uses the same idle key');

/* --- Flip helper: title-law sheets travel screen-right. Flip ONLY left. --- */
assert(/e\.hero && !e\.ghost\) return moveHeadingSX\(e\) < -0\.02/.test(extractFn('wantsSpriteFlip')),
  'living Macar flips only for screen-left (sx < -0.02)');
assert(/return moveHeadingSX\(e\) < -0\.02/.test(extractFn('wantsSpriteFlip')),
  'party kin keep the shared heading flip (sx < -0.02)');
assert(!/moveHeadingSX\(e\) > 0\.02/.test(extractFn('wantsSpriteFlip')),
  'invert leftover (sx > +0.02) is gone');

const SPR={
  macar:{width:8}, macar_w1:{width:8}, macar_w2:{width:8}
};
const ctx={
  SPR,
  clamp:(v,a,b)=>v<a?a:v>b?b:v,
  sprReady(k){ return !!(k && SPR[k] && SPR[k].width); },
  wieldsShadowCleaver(){ return !!ctx._axe; },
  wieldsCrossbow(){ return !!ctx._xbow; },
  MacarStrikeQA:{hold:false, blitKey:null, bowPoseT:0, bowPoseUntil:0},
  TW:64, TH:32,
  _now:10000,
  performance:{now(){ return ctx._now; }},
  player(){ return ctx._player||null; },
  kinCanAutoFight(e){ return !!(e && !e.hero && !e.dead); },
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
  +extractFn('restoredMacarMotionKey')+extractFn('partyAnimKeyReady')
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
  +extractFn('livingMacarAnimKey')
  +extractFn('entAnimKey')
  +extractFn('faceVec')
  +extractFn('screenOctant')
  +extractFn('moveHeadingSX')
  +extractFn('wantsSpriteFlip'),
  ctx
);

function macar(extra){
  return Object.assign({
    hero:1, team:'party', dead:0, ghost:0, crushed:0, defending:0,
    moving:0, atk:0, atkMax:1, atkKind:'melee', gait:0.12,
    x:10, y:10, ix:0, iy:0, fdx:0, fdy:0
  }, extra||{});
}

ctx._axe=false;
assert(ctx.livingMacarAnimKey(macar())==='macar', 'idle maul key is macar');
assert(ctx.livingMacarAnimKey(macar({moving:1, gait:0.12}))==='macar_w1', 'walk plant A is macar_w1');
assert(ctx.livingMacarAnimKey(macar({moving:1, gait:0.62}))==='macar_w2', 'walk plant B is macar_w2');
assert(ctx.livingMacarAnimKey(macar({atk:0.7, atkMax:1}))==='macar', 'maul strike plants the live idle until atk ready');
assert(ctx.livingMacarAnimKey(macar({atk:0.10, atkMax:1}))==='macar', 'maul recover plants the live idle until atk ready');
assert(ctx.entAnimKey(macar())==='macar', 'entAnimKey idle is macar');
SPR.macar_atk={width:8};
SPR.macar_atk_contact={width:8};
assert(ctx.livingMacarAnimKey(macar({atk:0.7, atkMax:1}))==='macar_atk', 'maul windup uses macar_atk when ready');
assert(ctx.livingMacarAnimKey(macar({atk:0.54, atkMax:1}))==='macar_atk_contact',
  'maul hit t≈0.46 blits macar_atk_contact');
assert(ctx.livingMacarAnimKey(macar({atk:0.32, atkMax:1}))==='macar_atk_contact',
  'maul late swing t≈0.68 still holds macar_atk_contact');
assert(ctx.livingMacarBlitKey('macar_atk')==='macar_atk',
  'blit key holds macar_atk when the sheet is ready');
assert(ctx.livingMacarBlitKey('macar_atk_contact')==='macar_atk_contact',
  'blit key holds macar_atk_contact when the sheet is ready');
assert(ctx.livingMacarAnimKey(macar({atk:1, atkMax:1}))==='macar_atk',
  'Attack press t=0 already blits the windup sheet');
const holdWind=macar({atk:0.82, atkMax:1});
assert(ctx.livingMacarAnimKey(holdWind)==='macar_atk',
  'QA windup sample t=0.18 is macar_atk');
const holdHit=macar({atk:0.40, atkMax:1});
assert(ctx.livingMacarAnimKey(holdHit)==='macar_atk_contact',
  'QA contact hold t=0.60 is macar_atk_contact — not idle carry');
ctx._player=macar({atk:0, atkMax:0.78});
assert(ctx.macarStrikeHoldMid()===true
  && Math.abs(ctx._player.atk-ctx._player.atkMax*0.40)<1e-9
  && ctx.attackProgress(ctx._player)>=0.45
  && Math.abs(ctx.attackProgress(ctx._player)-0.60)<1e-9
  && ctx.livingMacarAnimKey(ctx._player)==='macar_atk_contact'
  && ctx.livingMacarBlitKey('macar_atk_contact')==='macar_atk_contact',
  'holdMid() with CONTACT_T=0.45 blits macar_atk_contact (countdown t=0.60)');
const fatDt=macar({atk:0.50, atkMax:1, macarWindupUntil:ctx._now+200});
assert(ctx.wantsMacarWindup(fatDt)===true
  && ctx.livingMacarAnimKey(fatDt)==='macar_atk',
  'min-read windup keeps macar_atk even when t already passed the hit');
const fatDone=macar({atk:0.50, atkMax:1, macarWindupUntil:ctx._now-1});
assert(ctx.livingMacarAnimKey(fatDone)==='macar_atk_contact',
  'expired min-read windup yields contact at the hit');
assert(ctx.livingMacarAnimKey(macar({atk:0.10, atkMax:1}))==='macar',
  'maul recover plants idle when atk is ready — not the wind-up sheet');
delete SPR.macar_atk;
delete SPR.macar_atk_contact;
SPR.macar_atk={width:8};
assert(ctx.livingMacarAnimKey(macar({atk:0.32, atkMax:1}))==='macar_atk',
  'late swing holds windup when contact is not ready');
delete SPR.macar_atk;

SPR.macar_axe={width:8};
SPR.macar_axe_atk={width:8};
ctx._axe=true;
assert(ctx.livingMacarIdleKey()==='macar_axe', 'cleaver swaps idle to macar_axe when sheet ready');
assert(ctx.livingMacarAnimKey(macar())==='macar_axe', 'idle is macar_axe when the cleaver is on');
SPR.macar_axe_w1={width:8}; SPR.macar_axe_w2={width:8};
assert(ctx.livingMacarAnimKey(macar({moving:1, gait:0.12}))==='macar_axe_w1', 'cleaver walk binds axe_w1 when ready');
delete SPR.macar_axe_w1; delete SPR.macar_axe_w2;
assert(ctx.livingMacarAnimKey(macar({moving:1, gait:0.12}))==='macar_axe', 'cleaver walk plants axe idle without axe_w1/w2');
assert(ctx.livingMacarAnimKey(macar({atk:0.7, atkMax:1}))==='macar_axe_atk', 'cleaver strike uses macar_axe_atk');
assert(ctx.livingMacarAnimKey(macar({atk:0.32, atkMax:1}))==='macar_axe_atk',
  'cleaver late swing t≈0.68 still holds macar_axe_atk');
assert(ctx.livingMacarAnimKey(macar({atk:0.10, atkMax:1}))==='macar_axe',
  'cleaver recover plants axe idle when axe_atk is ready');
assert(ctx.entAnimKey(macar())==='macar_axe', 'entAnimKey idle is macar_axe with the cleaver');
assert(ctx.entAnimKey(macar({atk:0.7, atkMax:1}))==='macar_axe_atk', 'entAnimKey strike is macar_axe_atk');
assert(ctx.entAnimKey(macar({atk:0.10, atkMax:1}))==='macar_axe', 'entAnimKey recover is axe idle');
delete SPR.macar_axe; delete SPR.macar_axe_atk;
ctx._axe=false;

SPR.macar_xbow={width:8};
SPR.macar_xbow_atk={width:8};
ctx._xbow=true;
assert(ctx.livingMacarIdleKey()==='macar_xbow', 'crossbow swaps idle to macar_xbow when sheet ready');
assert(ctx.livingMacarAnimKey(macar())==='macar_xbow', 'idle is macar_xbow when the shooting loadout is on');
SPR.macar_xbow_w1={width:8}; SPR.macar_xbow_w2={width:8};
assert(ctx.livingMacarAnimKey(macar({moving:1, gait:0.12}))==='macar_xbow_w1', 'xbow walk binds xbow_w1 when ready');
delete SPR.macar_xbow_w1; delete SPR.macar_xbow_w2;
assert(ctx.livingMacarAnimKey(macar({moving:1, gait:0.12}))==='macar_xbow', 'xbow walk plants xbow idle without xbow_w1/w2');
assert(ctx.livingMacarAnimKey(macar({atk:0.7, atkMax:1}))==='macar_xbow_atk', 'xbow strike uses macar_xbow_atk');
assert(ctx.livingMacarAnimKey(macar({atk:0.32, atkMax:1}))==='macar_xbow_atk',
  'xbow late swing t≈0.68 still holds macar_xbow_atk');
assert(ctx.livingMacarAnimKey(macar({atk:0.10, atkMax:1}))==='macar_xbow',
  'xbow recover plants xbow idle when xbow_atk is ready');
assert(ctx.livingMacarAnimKey(macar({atk:0.90, atkMax:1, atkKind:'bow', bowPoseUntil:ctx._now+400}))==='macar_xbow_atk',
  'until in the future uses macar_xbow_atk');
assert(ctx.livingMacarAnimKey(macar({atk:0.90, atkMax:1, atkKind:'bow', bowPoseUntil:ctx._now-1}))==='macar_xbow',
  'until expired + atk still high plants macar_xbow idle');
ctx.MacarStrikeQA.hold=true;
assert(ctx.livingMacarAnimKey(macar({atk:0.60, atkMax:1, atkKind:'bow', bowPoseUntil:ctx._now-50}))==='macar_xbow',
  'hold + until expired plants xbow idle — cannot stay aimed');
ctx.MacarStrikeQA.hold=false;
assert(ctx.entAnimKey(macar())==='macar_xbow', 'entAnimKey idle is macar_xbow with the crossbow');
assert(ctx.entAnimKey(macar({atk:0.7, atkMax:1}))==='macar_xbow_atk', 'entAnimKey strike is macar_xbow_atk');
assert(ctx.entAnimKey(macar({atk:0.10, atkMax:1}))==='macar_xbow', 'entAnimKey recover is xbow idle');
delete SPR.macar_xbow; delete SPR.macar_xbow_atk;
ctx._xbow=false;

/* Identity (family + crown) must not hide a ready matching swing sheet.
   400×512 fails samePaintedFamily vs 470×512; a helmeted crown fails the
   unhelmeted idle. Hits still land on the atk/ct/swung timer. */
SPR.macar={width:470, height:512, _id:{ok:true, metal:0, hair:0.86, warm:0.96}};
SPR.macar_atk={width:400, height:512, _id:{ok:true, metal:0.55, hair:0.20, warm:0.30}};
assert(ctx.partySheetMatchesIdle(SPR.macar_atk, SPR.macar, 'macar_atk')===false,
  'mismatched maul atk crop fails identity vs the 470×512 idle');
assert(ctx.matchingPartyAtkReady('macar_atk', 'macar')===true,
  'matching maul atk is still ready when the sheet fits');
assert(ctx.livingMacarAnimKey(macar({atk:0.7, atkMax:1}))==='macar_atk',
  'maul windup blits macar_atk even when crown/family would plant idle');
SPR.macar_atk_contact={width:893, height:540, _id:{ok:true, metal:0.55, hair:0.20, warm:0.30}};
assert(ctx.matchingPartyAtkReady('macar_atk_contact', 'macar')===true,
  'wide contact sheet is still the idle\'s own strike key');
assert(ctx.livingMacarAnimKey(macar({atk:0.32, atkMax:1}))==='macar_atk_contact',
  'maul contact blits even when crown/family would plant idle');
delete SPR.macar_atk_contact;
assert(ctx.livingMacarAnimKey(macar({atk:0.10, atkMax:1, macarStrikeHold:0.12}))==='macar',
  'recover plants maul idle even while a leftover strikeHold is set');
assert(ctx.livingMacarAnimKey(macar({atk:0, atkMax:1, macarStrikeHold:0}))==='macar',
  'timer-end plants maul idle carry');
delete SPR.macar_atk;
SPR.macar={width:8};

SPR.macar_axe={width:470, height:512, _id:{ok:true, metal:0, hair:0.86, warm:0.96}};
SPR.macar_axe_atk={width:400, height:512, _id:{ok:true, metal:0.55, hair:0.20, warm:0.30}};
ctx._axe=true;
assert(ctx.partySheetMatchesIdle(SPR.macar_axe_atk, SPR.macar_axe, 'macar_axe_atk')===false,
  'mismatched cleaver atk crop fails identity vs axe idle');
assert(ctx.livingMacarAnimKey(macar({atk:0.7, atkMax:1}))==='macar_axe_atk',
  'cleaver strike blits macar_axe_atk even when crown/family would plant idle');
delete SPR.macar_axe; delete SPR.macar_axe_atk;
ctx._axe=false;

SPR.macar_xbow={width:470, height:512, _id:{ok:true, metal:0, hair:0.86, warm:0.96}};
SPR.macar_xbow_atk={width:400, height:512, _id:{ok:true, metal:0.55, hair:0.20, warm:0.30}};
ctx._xbow=true;
assert(ctx.partySheetMatchesIdle(SPR.macar_xbow_atk, SPR.macar_xbow, 'macar_xbow_atk')===false,
  'mismatched xbow atk crop fails identity vs xbow idle');
assert(ctx.livingMacarAnimKey(macar({atk:0.7, atkMax:1}))==='macar_xbow_atk',
  'xbow strike blits macar_xbow_atk even when crown/family would plant idle');
delete SPR.macar_xbow; delete SPR.macar_xbow_atk;
ctx._xbow=false;

function tickMelee(e, dt){
  if(!(e.atk>0)) return 'idle';
  if(e.defending){ e.atk=0; e.swung=0; return 'cancel'; }
  e.atk-=dt;
  if(!e.swung && e.atk<e.atkMax*0.55){ e.swung=1; return 'hit'; }
  if(e.atk<=0){ e.swung=0; return 'done'; }
  return 'wind';
}
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
const swing=macar({atk:0, atkMax:0.78, ct:0, cd:1, defending:0, swung:0});
assert(fireManual(swing)===true && swing.swung===0 && swing.atk===0.78,
  'manual Attack with Defend down starts a swung=0 timer');
let landed=0;
for(let t=0;t<1.2;t+=0.05){ if(tickMelee(swing, 0.05)==='hit') landed++; }
assert(landed===1, 'swung/ct path lands exactly one hit on the manual timer');
const auto=macar({atk:0, atkMax:0.78, ct:0, cd:1, defending:0, swung:0, moving:0});
auto.atkKind='melee'; auto.atk=auto.atkMax; auto.ct=auto.cd; auto.swung=0;
landed=0;
for(let t=0;t<1.2;t+=0.05){ if(tickMelee(auto, 0.05)==='hit') landed++; }
assert(landed===1, 'standing auto-melee lands on the same swung/ct path');
const shielded=macar({atk:0, atkMax:0.78, ct:0, defending:1, swung:0});
assert(fireManual(shielded)===false && shielded.atk===0,
  'manual Attack is refused while Defend is up');
const poseOnly=macar({atk:0, atkMax:0.78, ct:0.4, cd:1, defending:0, swung:0});
assert(fireManual(poseOnly)===true && poseOnly.swung===1,
  'Attack during cooldown is pose-only (swung already 1 — no second hit)');
landed=0;
for(let t=0;t<1.2;t+=0.05){ if(tickMelee(poseOnly, 0.05)==='hit') landed++; }
assert(landed===0, 'pose-only cooldown swing never fires the hit tick');

/* Compass sheets travel screen-right. D stays unflipped; A flips the
   same east sheet. South keeps the signed front pair. */
['macar_e_w1','macar_e_w2','macar_se_w1','macar_se_w2','macar_ne_w1','macar_ne_w2','macar_back_w1','macar_back_w2'].forEach(k=>{
  SPR[k]={width:8, height:32};
});
const eastWalk=macar({moving:1, ix:0.707, iy:-0.707, fdx:0.707, fdy:-0.707, gait:0.12});
const westWalk=macar({moving:1, ix:-0.707, iy:0.707, fdx:-0.707, fdy:0.707, gait:0.12});
assert(ctx.moveHeadingSX(eastWalk)>0.02, 'east heading has positive screen-x');
assert(ctx.moveHeadingSX(westWalk)<-0.02, 'west heading has negative screen-x');
assert(ctx.wantsSpriteFlip(eastWalk)===false, 'walk-right (D / gold-right) stays unflipped');
assert(ctx.wantsSpriteFlip(westWalk)===true, 'walk-left (A / gold-left) flips the painted-right sheet');
assert(ctx.livingMacarAnimKey(eastWalk)==='macar_e_w1'
  && ctx.livingMacarAnimKey(westWalk)==='macar_e_w1',
  'east and west walks share the restored east sheet (flip is blit-only)');
assert(ctx.livingMacarAnimKey(macar({moving:1, ix:1, iy:0, fdx:1, fdy:0, gait:0.12}))==='macar_se_w1',
  'southeast uses the restored se sheet');
assert(ctx.livingMacarAnimKey(macar({moving:1, ix:0, iy:1, fdx:0, fdy:1, gait:0.12}))==='macar_se_w1',
  'southwest uses the se sheet (flip is blit-only)');
assert(ctx.livingMacarAnimKey(macar({moving:1, ix:0, iy:-1, fdx:0, fdy:-1, gait:0.12}))==='macar_ne_w1'
  && ctx.livingMacarAnimKey(macar({moving:1, ix:0, iy:-1, fdx:0, fdy:-1, gait:0.62}))==='macar_ne_w2',
  'northeast cycles restored ne w1 / w2');
assert(ctx.livingMacarAnimKey(macar({moving:1, ix:-1, iy:0, fdx:-1, fdy:0, gait:0.12}))==='macar_ne_w1'
  && ctx.livingMacarAnimKey(macar({moving:1, ix:-1, iy:0, fdx:-1, fdy:0, gait:0.62}))==='macar_ne_w2',
  'northwest cycles the same ne sheets (flip is blit-only)');
assert(ctx.livingMacarAnimKey(macar({moving:1, ix:-0.707, iy:-0.707, fdx:-0.707, fdy:-0.707, gait:0.12}))==='macar_back_w1'
  && ctx.livingMacarAnimKey(macar({moving:1, ix:-0.707, iy:-0.707, fdx:-0.707, fdy:-0.707, gait:0.62}))==='macar_back_w2',
  'north cycles the back walk');
assert(ctx.livingMacarAnimKey(macar({moving:1, ix:0.707, iy:0.707, fdx:0.707, fdy:0.707, gait:0.12}))==='macar_w1',
  'south keeps the signed front walk');
assert(ctx.livingMacarAnimKey(macar({moving:0, ix:0, iy:0, fdx:0.707, fdy:-0.707}))==='macar',
  'standing idle stays the front original, not a side walk sheet');
const eastIdle=macar({fdx:0.707, fdy:-0.707});
const westIdle=macar({fdx:-0.707, fdy:0.707});
assert(ctx.wantsSpriteFlip(eastIdle)===false, 'idle facing east is unflipped');
assert(ctx.wantsSpriteFlip(westIdle)===true, 'idle facing west flips living Macar');

/* Combat facing: a foe as aim wins over leftover walk heading. */
const foeLeft={team:'foe', dead:0, x:9, y:11};
const foeRight={team:'foe', dead:0, x:11, y:9};
const closing=macar({
  moving:1, ix:0.707, iy:-0.707, fdx:0.707, fdy:-0.707,
  aim:foeLeft, atk:0
});
const vClose=ctx.faceVec(closing);
assert(vClose.dx<0 && vClose.dy>0,
  'closing on a screen-left foe faces the foe, not leftover walk-right');
assert(ctx.wantsSpriteFlip(closing)===true,
  'closing on a screen-left foe flips the painted-right sheet');
const swinging=macar({
  moving:0, ix:0, iy:0, fdx:-0.707, fdy:0.707,
  aim:foeRight, atk:0.5, atkMax:1
});
const vSwing=ctx.faceVec(swinging);
assert(vSwing.dx>0 && vSwing.dy<0,
  'swinging at a screen-right foe faces the foe, not leftover walk-left');
assert(ctx.wantsSpriteFlip(swinging)===false,
  'swinging at a screen-right foe stays unflipped');
const kinClose={
  hero:0, team:'party', dead:0, ghost:1, defending:0, atk:0,
  x:10, y:10, ix:0.7, iy:-0.7, fdx:0.7, fdy:-0.7,
  aim:foeLeft
};
const vKin=ctx.faceVec(kinClose);
assert(vKin.dx<0 && vKin.dy>0, 'party kin closing on a foe face the foe, not Macar walk');

/* Opaque blit: no invert leftover, no ramped edge, no empty-canvas flash. */
const flipBake=extractFn('flippedSprite');
assert(/imageSmoothingEnabled=false/.test(flipBake), 'mirror bake is nearest-neighbor');
assert(/punch!==false/.test(flipBake) && /if\(doPunch\) punchLivingMacarCanvas\(c\)/.test(flipBake),
  'mirror bake re-punches living sheets and can skip punch for ghost mid-alpha');
assert(/globalAlpha=1/.test(flipBake) && /globalCompositeOperation='source-over'/.test(flipBake),
  'mirror bake is source-over at alpha 1');
const bake=extractFn('blitLivingMacar');
assert(/!out\|\|!out\.width\|\|!out\.height/.test(bake), 'empty bake is never cached');
assert(!/out=img/.test(bake), 'failed repair does not ship the raw fringe sheet');
assert(/d\[p\+3\]=255/.test(extractFn('repairSpriteSheet')),
  'repair forces every silhouette pixel opaque');
assert(/w:\s*\{flip:1/.test(html) && /e:\s*\{flip:0/.test(html),
  'MACAR_PLAN west flips, east stays unflipped — agrees with wantsSpriteFlip');
assert(/const flip=wantsSpriteFlip\(e\)/.test(extractFn('macarPose')),
  'macarPose flip is wantsSpriteFlip, not a stale dir.flip');
assert(/if\(wantsMeleePose\(e\)\)\{/.test(extractFn('macarPose')),
  'macarPose strike is wantsMeleePose only — recover is not the wind-up sheet');

const swipe=extractFn('drawHeroMeleeArc');
assert(/if\(!wantsMeleePose\(e\)\) return/.test(swipe),
  'melee swipe is strike-window only');
assert(/globalCompositeOperation='source-over'/.test(swipe),
  'melee swipe stays source-over (no lighter flash)');
assert(/wantsSpriteFlip/.test(swipe),
  'melee swipe mirrors with heading so west is a forward blow');
assert(!/drawHeroMeleeArc\(g,mac/.test(html),
  'after-grain living Macar has no gold swipe covering the maul head');

SPR.macar={width:8};
SPR.macar_atk_recover={width:8};
assert(ctx.matchingPartyAtkReady('macar_atk_recover', 'macar')===true,
  'a signed recover sheet is recognized as the idle\'s own recover');
assert(ctx.livingMacarAnimKey(macar({atk:0.10, atkMax:1}))==='macar_atk_recover',
  'recover binds _atk_recover when Limner signs one');
delete SPR.macar_atk_recover;

/* Title splash: image moves down, gold type stays high. */
const titleFn=html.match(/function drawTitle\(g\)\{[\s\S]*?\nfunction drawTitleMenu/)[0];
assert(/zoom:1\.11/.test(titleFn), 'title splash scales ~1.11× to enlarge the tunnel');
assert(/nudgeY:VH\*0\.16/.test(titleFn), 'title splash shifts down 16% of canvas height');
assert(!/nudgeY:0/.test(titleFn) && !/ay:0\.56/.test(titleFn),
  'old flush-top splash blit is gone');
assert(/function layoutHighPlate\(/.test(html) && /ceilK: port\?0\.048:0\.038/.test(html),
  'gold title stays on the high-stack near the top');
assert(/#0a0706/.test(titleFn) && /splash\.height\*0\.14/.test(titleFn),
  'new top strip is filled from dark cave, not empty black');

const plantSrc=extractFn('livingMacarPlantFit');
assert(/const idleFit=heroFigureFit\(e, idle\)/.test(plantSrc)
  && /idleFit\*\(idleBody\/liveBody\)/.test(plantSrc)
  && /livingSheetStature\(idle\)/.test(plantSrc)
  && /livingSheetStature\(live\)/.test(plantSrc)
  && !/frameH\/idleH/.test(plantSrc),
  'livingMacarPlantFit locks crown-to-boots via stature, not frameH/idleH');
assert(/function livingStatureFromRGBA\(/.test(html)
  && /livingStatureFromRGBA\(d, w, h\)/.test(extractFn('measureLivingStature'))
  && /img\._stature>0/.test(extractFn('livingSheetStature')),
  'attack stature is measured from the sheet and cached');
const b={ok:true, y0:0.016, y1:0.990, personY0:0.016};
const fitSPR={
  macar:{width:470, height:512, _b:b},
  macar_w1:{width:470, height:512, _b:b},
  macar_w2:{width:470, height:512, _b:b},
  macar_atk:{width:470, height:540, _b:b},
  macar_atk_contact:{width:893, height:540, _b:b},
  macar_axe:{width:470, height:512, _b:b},
  macar_axe_atk:{width:470, height:540, _b:b},
  macar_xbow:{width:470, height:512, _b:b},
  macar_xbow_atk:{width:893, height:540, _b:b}
};
const fitCtx={
  SPR:fitSPR,
  clamp:(v,a,b2)=>v<a?a:v>b2?b2:v,
  spriteBounds:(img)=>img&&img._b,
  livingMacarIdleKey(){ return fitCtx._idle||'macar'; },
  frameFit(e,img){ return fitCtx.heroFigureFit(e,img); }
};
vm.createContext(fitCtx);
vm.runInContext('const MACAR_IDLE_FRAC=0.986;'
  +extractFn('figurePersonFrac')+extractFn('heroFigureFit')
  +extractFn('livingStatureFromRGBA')+extractFn('measureLivingStature')
  +extractFn('livingSheetStature')+extractFn('livingMacarPlantFit'), fitCtx);
const fitMac={hero:1, dead:0, ghost:0};
function blitHOf(key){
  return 78*fitCtx.livingMacarPlantFit(fitMac, key, fitSPR[key]);
}
const idleBH=blitHOf('macar');
const w1BH=blitHOf('macar_w1');
const w2BH=blitHOf('macar_w2');
const atkBH=blitHOf('macar_atk');
const hitBH=blitHOf('macar_atk_contact');
assert(Math.abs(w1BH-idleBH)/idleBH<0.02 && Math.abs(w2BH-idleBH)/idleBH<0.02
  && Math.abs(atkBH-idleBH)/idleBH<0.02 && Math.abs(hitBH-idleBH)/idleBH<0.02,
  'idle/w1/w2/atk/contact blitH stay within 2% (idle '+idleBH.toFixed(3)
  +' wind '+atkBH.toFixed(3)+' contact '+hitBH.toFixed(3)+')');
assert(atkBH<=idleBH+1e-6 && hitBH<=idleBH+1e-6,
  'frameH 540 cannot increase blitH vs idle 512');
fitCtx._idle='macar_axe';
assert(Math.abs(blitHOf('macar_axe_atk')-blitHOf('macar_axe'))/blitHOf('macar_axe')<0.02
  && blitHOf('macar_axe_atk')<=blitHOf('macar_axe')+1e-6,
  'axe strike blitH matches axe idle');
fitCtx._idle='macar_xbow';
assert(Math.abs(blitHOf('macar_xbow_atk')-blitHOf('macar_xbow'))/blitHOf('macar_xbow')<0.02
  && blitHOf('macar_xbow_atk')<=blitHOf('macar_xbow')+1e-6,
  'xbow strike blitH matches xbow idle');
fitCtx._idle='macar';

/* Real sheets: windup and contact paint a shorter body in a 540 canvas.
   Figure height (dest H × body fraction) matches idle; canvas blitH may grow. */
function sheetStature(file){
  const rgba=readRgba(path.join(root,'assets/creatures',file));
  return fitCtx.livingStatureFromRGBA(rgba.data, rgba.w, rgba.h);
}
const idleBody=sheetStature('dwarf_macar.png');
const atkBody=sheetStature('dwarf_macar_atk.png');
const hitBody=sheetStature('dwarf_macar_atk_contact.png');
assert(idleBody>0.94 && idleBody<0.995,
  'idle crown-to-boots fills the sheet (frac '+idleBody.toFixed(3)+')');
assert(atkBody>0.55 && atkBody<0.68,
  'restored windup keeps the maul above the helm (frac '+atkBody.toFixed(3)+')');
assert(hitBody>0.84 && hitBody<0.93,
  'main contact crown is the helm (frac '+hitBody.toFixed(3)+')');
assert(hitBody>atkBody+0.08,
  'contact body fills more of its canvas than windup (wind '+atkBody.toFixed(3)
  +' contact '+hitBody.toFixed(3)+')');
fitSPR.macar._stature=idleBody;
fitSPR.macar_w1._stature=idleBody;
fitSPR.macar_w2._stature=idleBody;
fitSPR.macar_atk._stature=atkBody;
fitSPR.macar_atk_contact._stature=hitBody;
function figureHOf(key){ return blitHOf(key)*fitSPR[key]._stature; }
const idleFig=figureHOf('macar');
const w1Fig=figureHOf('macar_w1');
const atkFig=figureHOf('macar_atk');
const hitFig=figureHOf('macar_atk_contact');
assert(Math.abs(w1Fig-idleFig)/idleFig<0.02,
  'walk keeps the idle figure height (idle '+idleFig.toFixed(3)+' w1 '+w1Fig.toFixed(3)+')');
assert(Math.abs(atkFig-idleFig)/idleFig<0.02 && Math.abs(hitFig-idleFig)/idleFig<0.02,
  'crown-to-boots figure height matches idle vs atk vs contact (idle '
  +idleFig.toFixed(3)+' wind '+atkFig.toFixed(3)+' contact '+hitFig.toFixed(3)+')');
const windScale=blitHOf('macar_atk')/blitHOf('macar');
const hitScale=blitHOf('macar_atk_contact')/blitHOf('macar');
assert(windScale>1.45 && windScale<1.70,
  'windup dest H grows for the shorter helm-to-boot body (scale '+windScale.toFixed(3)+')');
assert(hitScale>1.02 && hitScale<1.22,
  'contact dest H matches the helm and does not overshoot idle (scale '+hitScale.toFixed(3)+')');
const widthRatio=893/470;
assert((blitHOf('macar_atk_contact')/blitHOf('macar'))<widthRatio*0.75,
  'contact body scale is not the 893 sheet width');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nliving Macar QA checks passed');
