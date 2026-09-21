'use strict';
/**
 * Title-law Macar dungeon blit: crisp sampling, magenta punch, no sliver,
 * attack plants the live idle, leftover Macar art is gone.
 * Run: node src/combat/MacarDungeonBlit.test.js
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

assert(/function isMagentaMatte\(/.test(html) && /function punchLivingAlpha\(/.test(html),
  'magenta punch helpers exist');
assert(/const LO=40/.test(html) && /a<=LO \|\| isMagentaMatte/.test(html)
  && /isBlackMatte/.test(html),
  'a<=40 or magenta / black export matte punches to 0');
assert(/function punchLivingMacarCanvas\(/.test(html)
  && /punchLivingMacarCanvas\(out\)/.test(extractFn('blitLivingMacar'))
  && /punchBlackExportSlab\(idat\.data, c\.width, c\.height\)/.test(extractFn('punchLivingMacarCanvas')),
  'living Macar bake runs the magenta / binary-alpha punch and black-slab flood');
assert(/imageSmoothingEnabled=false/.test(extractFn('blitFacing')),
  'party blit can disable bilinear smoothing');
assert(/imageSmoothingEnabled=false/.test(extractFn('flippedSprite'))
  && /punchLivingMacarCanvas\(c\)/.test(extractFn('flippedSprite')),
  'west mirror is crisp and re-punched');
assert(/!out\|\|!out\.width\|\|!out\.height/.test(extractFn('blitLivingMacar')),
  '0-size bake falls back instead of flashing a sliver');
assert(/MACAR_FOOT_WIDEN=1\.24/.test(html), 'extra mass is a width scale');
assert(/livingMacarPlantFit\(e, blitKey\|\|key, img\)/.test(extractFn('drawLivingMacar'))
  && /entSpriteH\(e,z\)\*plantFit/.test(extractFn('drawLivingMacar')),
  'dungeon height stays kin entSpriteH times the idle plant');
assert(/return heroFigureFit\(e, idle\)/.test(extractFn('livingMacarPlantFit'))
  && !/frameH\/idleH/.test(extractFn('livingMacarPlantFit')),
  'plantFit ignores frame canvas height so 540 cannot grow blitH');
assert(/\*MACAR_FOOT_WIDEN/.test(extractFn('drawLivingMacar')),
  'living Macar blit applies the width scale');
assert(/blitFacing\(g,img,dx,dy,W,H,flip,true\)/.test(extractFn('drawLivingMacar')),
  'dungeon Macar blit is crisp');

const keysDecl=html.match(/const LIVING_MACAR_KEYS=\{[\s\S]*?\};/);
assert(!!keysDecl && /macar:1/.test(keysDecl[0]) && /macar_w1:1/.test(keysDecl[0])
  && /macar_w2:1/.test(keysDecl[0]) && /macar_atk:1/.test(keysDecl[0])
  && /macar_atk_contact:1/.test(keysDecl[0])
  && /macar_axe:1/.test(keysDecl[0]) && /macar_axe_atk:1/.test(keysDecl[0])
  && /macar_xbow:1/.test(keysDecl[0]) && /macar_xbow_atk:1/.test(keysDecl[0]),
  'whitelist is maul set + contact + Shadow Cleaver + crossbow carry/atk');

['dwarf_macar.png','dwarf_macar_w1.png','dwarf_macar_w2.png','dwarf_macar_atk.png',
 'dwarf_macar_atk_contact.png',
 'dwarf_macar_axe.png','dwarf_macar_axe_w1.png','dwarf_macar_axe_w2.png','dwarf_macar_axe_atk.png',
 'dwarf_macar_xbow.png','dwarf_macar_xbow_w1.png','dwarf_macar_xbow_w2.png','dwarf_macar_xbow_atk.png'].forEach(f=>{
  assert(fs.existsSync(path.join(root,'assets/creatures',f)), f+' live sheet remains');
});
['dwarf_macar_atk_recover.png','dwarf_macar_e_atk.png',
 'dwarf_macar_title.png','dwarf_macar_sleep.png',
 'dwarf_macar_back.png','dwarf_macar_w3.png'].forEach(f=>{
  assert(!fs.existsSync(path.join(root,'assets/creatures',f)), f+' leftover Macar art is gone');
  assert(!html.includes('assets/creatures/'+f), f+' is unwired from the registry');
});

const start=html.indexOf('const SPRITE_FILES={');
const end=html.indexOf('const ICON_SPR={');
const registry=new Function(html.slice(start, end)+'\nreturn SPRITE_FILES;')();
assert(registry.macar && registry.macar_w1 && registry.macar_w2 && registry.macar_atk
  && registry.macar_atk_contact
  && registry.macar_axe && registry.macar_axe_w1 && registry.macar_axe_w2 && registry.macar_axe_atk
  && registry.macar_xbow && registry.macar_xbow_w1 && registry.macar_xbow_w2 && registry.macar_xbow_atk, 'live Macar + contact + axe + xbow keys stay registered');
Object.keys(registry).forEach(k=>{
  if(k==='macar' || k==='macar_w1' || k==='macar_w2' || k==='macar_atk' || k==='macar_atk_contact'
     || k==='macar_axe' || k==='macar_axe_w1' || k==='macar_axe_w2' || k==='macar_axe_atk'
     || k==='macar_xbow' || k==='macar_xbow_w1' || k==='macar_xbow_w2' || k==='macar_xbow_atk') return;
  assert(!/^macar(_|$)/.test(k), 'registry has no leftover Macar key '+k);
});

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
  +'const MACAR_STRIKE_HOLD=0.12;'
  +'const MACAR_MAUL_CONTACT_T=0.45;'
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

ctx._axe=false;
assert(ctx.livingMacarIdleKey()==='macar', 'idle key is title-law maul when cleaver is off');
assert(ctx.livingMacarAnimKey(macar())==='macar', 'idle blits the live idle');
assert(ctx.livingMacarAnimKey(macar({moving:1, gait:0.12}))==='macar_w1', 'ready w1 is used');
assert(ctx.livingMacarAnimKey(macar({moving:1, gait:0.62}))==='macar_w2', 'ready w2 is used');
assert(ctx.livingMacarAnimKey(macar({atk:0.7, atkMax:1}))==='macar', 'attack plants idle until a matching atk sheet is ready');
assert(ctx.livingMacarAnimKey(macar({atk:0.10, atkMax:1}))==='macar', 'recover plants idle until a matching atk sheet is ready');
SPR.macar_atk={width:470, height:540};
SPR.macar_atk_contact={width:893, height:540};
assert(ctx.livingMacarAnimKey(macar({atk:0.7, atkMax:1}))==='macar_atk', 'freearm windup 470x540 is used');
assert(ctx.livingMacarAnimKey(macar({atk:1, atkMax:1}))==='macar_atk',
  'Attack press t=0 already holds the windup sheet');
assert(ctx.livingMacarBlitKey('macar_atk')==='macar_atk', 'blit key does not re-plant idle over ready atk');
assert(ctx.livingMacarAnimKey(macar({atk:0.32, atkMax:1}))==='macar_atk_contact',
  'late swing t≈0.68 holds the contact sheet');
assert(ctx.livingMacarBlitKey('macar_atk_contact')==='macar_atk_contact',
  'blit key does not re-plant idle over ready contact');
assert(ctx.livingMacarAnimKey(macar({atk:0.10, atkMax:1}))==='macar',
  'recover plants idle even when the wind-up atk sheet is ready');
delete SPR.macar_atk;
delete SPR.macar_atk_contact;

SPR.macar_axe={width:470, height:512};
SPR.macar_axe_atk={width:470, height:512};
ctx._axe=true;
assert(ctx.livingMacarIdleKey()==='macar_axe', 'cleaver idle is macar_axe');
assert(ctx.livingMacarAnimKey(macar())==='macar_axe', 'cleaver idle blits macar_axe');
SPR.macar_axe_w1={width:470, height:512}; SPR.macar_axe_w2={width:470, height:512};
assert(ctx.livingMacarAnimKey(macar({moving:1, gait:0.12}))==='macar_axe_w1', 'cleaver walk binds axe_w1');
delete SPR.macar_axe_w1; delete SPR.macar_axe_w2;
assert(ctx.livingMacarAnimKey(macar({moving:1, gait:0.12}))==='macar_axe', 'cleaver walk plants axe idle without walks');
assert(ctx.livingMacarAnimKey(macar({atk:0.7, atkMax:1}))==='macar_axe_atk', 'cleaver melee uses axe atk');
assert(ctx.livingMacarAnimKey(macar({atk:0.10, atkMax:1}))==='macar_axe',
  'cleaver recover plants axe idle — does not hold axe_atk');
delete SPR.macar_axe; delete SPR.macar_axe_atk;
ctx._axe=false;

SPR.macar_xbow={width:470, height:512};
SPR.macar_xbow_atk={width:470, height:512};
ctx._xbow=true;
assert(ctx.livingMacarIdleKey()==='macar_xbow', 'crossbow idle is macar_xbow');
assert(ctx.livingMacarAnimKey(macar())==='macar_xbow', 'crossbow idle blits macar_xbow');
SPR.macar_xbow_w1={width:470, height:512}; SPR.macar_xbow_w2={width:470, height:512};
assert(ctx.livingMacarAnimKey(macar({moving:1, gait:0.12}))==='macar_xbow_w1', 'crossbow walk binds xbow_w1');
delete SPR.macar_xbow_w1; delete SPR.macar_xbow_w2;
assert(ctx.livingMacarAnimKey(macar({moving:1, gait:0.12}))==='macar_xbow', 'crossbow walk plants xbow idle without walks');
assert(ctx.livingMacarAnimKey(macar({atk:0.7, atkMax:1}))==='macar_xbow_atk', 'crossbow melee uses xbow atk');
assert(ctx.livingMacarAnimKey(macar({atk:0.10, atkMax:1}))==='macar_xbow',
  'crossbow recover plants xbow idle — does not hold xbow_atk');
assert(ctx.livingMacarAnimKey(macar({atk:0.90, atkMax:1, atkKind:'bow', bowPoseUntil:ctx._now+400}))==='macar_xbow_atk',
  'until in the future uses macar_xbow_atk');
assert(ctx.livingMacarAnimKey(macar({atk:0.90, atkMax:1, atkKind:'bow', bowPoseUntil:ctx._now-1}))==='macar_xbow',
  'until expired + atk still high plants macar_xbow idle');
ctx.MacarStrikeQA.hold=true;
assert(ctx.livingMacarAnimKey(macar({atk:0.60, atkMax:1, atkKind:'bow', bowPoseUntil:ctx._now-50}))==='macar_xbow',
  'hold + until expired plants idle, not macar_xbow_atk');
ctx.MacarStrikeQA.hold=false;
delete SPR.macar_xbow; delete SPR.macar_xbow_atk;
ctx._xbow=false;

SPR.macar_w1={width:8, height:512};
SPR.macar_w2={width:8, height:512};
assert(ctx.partyFrameFitOk(SPR.macar_w1, SPR.macar)===false, '8x512 walk is a sliver');
assert(ctx.livingMacarAnimKey(macar({moving:1, gait:0.12}))==='macar',
  'sliver walk falls back to the live idle');
assert(ctx.livingMacarAnimKey(macar({moving:1, gait:0.62}))==='macar',
  'sliver opposite-plant also falls back to idle');

delete SPR.macar_w1;
delete SPR.macar_w2;
assert(ctx.livingMacarAnimKey(macar({moving:1, gait:0.12}))==='macar',
  'missing walk falls back to the live idle');

SPR.macar_atk={width:409, height:512, _id:{ok:true, metal:0.19, hair:0.46, warm:0.55}};
assert(ctx.partySheetMatchesIdle(SPR.macar_atk, SPR.macar, 'macar_atk')===false,
  'old helmeted atk crop fails identity vs the 470x512 idle');
assert(ctx.pickReadyPartyKey('macar_atk', 'macar')==='macar_atk',
  'matching equipped atk still blits when ready — leftover helmeted file is gone');
SPR.macar_atk={width:8, height:512};
assert(ctx.partyFrameFitOk(SPR.macar_atk, SPR.macar)===false
  && ctx.pickReadyPartyKey('macar_atk', 'macar')==='macar',
  'sliver atk still plants the live idle');

SPR.pordoom={width:485, height:512};
SPR.pordoom_w1={width:8, height:512};
assert(ctx.partyFrameFitOk(SPR.pordoom_w1, SPR.pordoom)===false,
  'kin sliver walk fails the same fit check');
assert(ctx.pickReadyPartyKey('pordoom_w1', 'pordoom')==='pordoom',
  'kin sliver walk falls back to that kin idle, never a wrong sheet');

assert(ctx.isMagentaMatte?true:typeof ctx.isMagentaMatte==='undefined', 'magenta helper is extractable');
vm.runInContext(extractFn('isMagentaMatte')+extractFn('isBlackMatte')+extractFn('punchLivingAlpha'), ctx);
const d=new Uint8ClampedArray([255,0,255,255, 80,50,30,30, 40,30,20,80, 10,200,10,200, 0,0,0,255]);
ctx.punchLivingAlpha(d, 5);
assert(d[0]===0 && d[3]===0, 'magenta pixel is punched to 0');
assert(d[4]===0 && d[7]===0, 'a<=40 fringe is punched to 0');
assert(d[11]===255, 'a>40 is forced opaque');
assert(d[16]===0 && d[19]===0, 'black export matte is punched to 0');
assert(/const MACAR_BLACK_SLAB_T=8/.test(html), 'black-slab flood uses max-channel T=8, not sum≤16');
vm.runInContext('const MACAR_BLACK_SLAB_T=8;'+extractFn('punchBlackExportSlab'), ctx);
const slab=new Uint8ClampedArray(4*16);
for(let i=0;i<16;i++){ slab[i*4]=4; slab[i*4+1]=4; slab[i*4+2]=4; slab[i*4+3]=255; }
slab[5*4]=80; slab[5*4+1]=50; slab[5*4+2]=30; slab[5*4+3]=255;
slab[6*4]=22; slab[6*4+1]=14; slab[6*4+2]=10; slab[6*4+3]=255;
ctx.punchBlackExportSlab(slab, 4, 4);
assert(slab[3]===0 && slab[4*4+3]===0, 'edge-connected near-black slab is punched');
assert(slab[5*4]===80 && slab[5*4+3]===255, 'interior figure pixel survives the slab flood');
assert(slab[6*4]===22 && slab[6*4+3]===255, 'dark painted chroma (boot/hair AA) is not slab-eaten');

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
  +extractFn('figurePersonFrac')+extractFn('heroFigureFit')+extractFn('livingMacarPlantFit'), fitCtx);
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
  'idle/w1/w2/atk/contact blitH match (idle '+idleBH.toFixed(3)
  +' atk '+atkBH.toFixed(3)+' contact '+hitBH.toFixed(3)+')');
assert(atkBH<=idleBH+1e-6 && hitBH<=idleBH+1e-6,
  'frameH 540 cannot increase blitH vs idle 512');
fitCtx._idle='macar_axe';
const axeBH=blitHOf('macar_axe');
const axeAtkBH=blitHOf('macar_axe_atk');
assert(Math.abs(axeAtkBH-axeBH)/axeBH<0.02 && axeAtkBH<=axeBH+1e-6,
  'axe strike blitH matches axe idle');
fitCtx._idle='macar_xbow';
const xbowBH=blitHOf('macar_xbow');
const xbowAtkBH=blitHOf('macar_xbow_atk');
assert(Math.abs(xbowAtkBH-xbowBH)/xbowBH<0.02 && xbowAtkBH<=xbowBH+1e-6,
  'xbow strike blitH matches xbow idle');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nMacar dungeon blit / leftover-art checks passed');
