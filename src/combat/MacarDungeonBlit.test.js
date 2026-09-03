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
assert(/const LO=40/.test(html) && /a<=LO \|\| isMagentaMatte/.test(html),
  'a<=40 or magenta matte punches to 0');
assert(/function punchLivingMacarCanvas\(/.test(html)
  && /punchLivingMacarCanvas\(out\)/.test(extractFn('blitLivingMacar')),
  'living Macar bake runs the magenta / binary-alpha punch');
assert(/imageSmoothingEnabled=false/.test(extractFn('blitFacing')),
  'party blit can disable bilinear smoothing');
assert(/imageSmoothingEnabled=false/.test(extractFn('flippedSprite'))
  && /punchLivingMacarCanvas\(c\)/.test(extractFn('flippedSprite')),
  'west mirror is crisp and re-punched');
assert(/!out\|\|!out\.width\|\|!out\.height/.test(extractFn('blitLivingMacar')),
  '0-size bake falls back instead of flashing a sliver');
assert(/MACAR_FOOT_WIDEN=1\.24/.test(html), 'extra mass is a width scale');
assert(/entSpriteH\(e,z\)\*frameFit\(e,img\)/.test(extractFn('drawLivingMacar')),
  'dungeon height stays kin entSpriteH — not taller than title law');
assert(/\*MACAR_FOOT_WIDEN/.test(extractFn('drawLivingMacar')),
  'living Macar blit applies the width scale');
assert(/blitFacing\(g,img,dx,dy,W,H,flip,true\)/.test(extractFn('drawLivingMacar')),
  'dungeon Macar blit is crisp');

const keysDecl=html.match(/const LIVING_MACAR_KEYS=\{[\s\S]*?\};/);
assert(!!keysDecl && /macar:1/.test(keysDecl[0]) && /macar_w1:1/.test(keysDecl[0])
  && /macar_w2:1/.test(keysDecl[0]) && /macar_atk:1/.test(keysDecl[0]),
  'whitelist is idle + live walk pair + title-law atk');
assert(!/macar_axe:1/.test(keysDecl[0]),
  'whitelist does not include leftover axe');

['dwarf_macar.png','dwarf_macar_w1.png','dwarf_macar_w2.png','dwarf_macar_atk.png'].forEach(f=>{
  assert(fs.existsSync(path.join(root,'assets/creatures',f)), f+' live sheet remains');
});
['dwarf_macar_atk_recover.png','dwarf_macar_e_atk.png',
 'dwarf_macar_axe.png','dwarf_macar_title.png','dwarf_macar_sleep.png',
 'dwarf_macar_back.png','dwarf_macar_w3.png'].forEach(f=>{
  assert(!fs.existsSync(path.join(root,'assets/creatures',f)), f+' leftover Macar art is gone');
  assert(!html.includes('assets/creatures/'+f), f+' is unwired from the registry');
});

const start=html.indexOf('const SPRITE_FILES={');
const end=html.indexOf('const ICON_SPR={');
const registry=new Function(html.slice(start, end)+'\nreturn SPRITE_FILES;')();
assert(registry.macar && registry.macar_w1 && registry.macar_w2 && registry.macar_atk, 'live Macar keys stay registered');
Object.keys(registry).forEach(k=>{
  if(k==='macar' || k==='macar_w1' || k==='macar_w2' || k==='macar_atk') return;
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
  +extractFn('partyAnimKeyReady')
  +extractFn('pickReadyPartyKey')
  +extractFn('walkCycleKey')
  +extractFn('attackProgress')
  +extractFn('wantsMeleePose')
  +extractFn('wantsMeleeRecover')
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

assert(ctx.livingMacarIdleKey()==='macar', 'idle key is always the title-law idle');
assert(ctx.livingMacarAnimKey(macar())==='macar', 'idle blits the live idle');
assert(ctx.livingMacarAnimKey(macar({moving:1, gait:0.12}))==='macar_w1', 'ready w1 is used');
assert(ctx.livingMacarAnimKey(macar({moving:1, gait:0.62}))==='macar_w2', 'ready w2 is used');
assert(ctx.livingMacarAnimKey(macar({atk:0.7, atkMax:1}))==='macar', 'attack plants idle until a matching atk sheet is ready');
assert(ctx.livingMacarAnimKey(macar({atk:0.3, atkMax:1}))==='macar', 'recover plants idle until a matching atk sheet is ready');
SPR.macar_atk={width:470, height:512};
assert(ctx.livingMacarAnimKey(macar({atk:0.7, atkMax:1}))==='macar_atk', 'title-law 470x512 atk is used');
delete SPR.macar_atk;

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
assert(ctx.pickReadyPartyKey('macar_atk', 'macar')==='macar',
  'helmeted atk is never picked over the live idle');

SPR.pordoom={width:485, height:512};
SPR.pordoom_w1={width:8, height:512};
assert(ctx.partyFrameFitOk(SPR.pordoom_w1, SPR.pordoom)===false,
  'kin sliver walk fails the same fit check');
assert(ctx.pickReadyPartyKey('pordoom_w1', 'pordoom')==='pordoom',
  'kin sliver walk falls back to that kin idle, never a wrong sheet');

assert(ctx.isMagentaMatte?true:typeof ctx.isMagentaMatte==='undefined', 'magenta helper is extractable');
vm.runInContext(extractFn('isMagentaMatte')+extractFn('punchLivingAlpha'), ctx);
const d=new Uint8ClampedArray([255,0,255,255, 80,50,30,30, 40,30,20,80, 10,200,10,200]);
ctx.punchLivingAlpha(d, 4);
assert(d[0]===0 && d[3]===0, 'magenta pixel is punched to 0');
assert(d[4]===0 && d[7]===0, 'a<=40 fringe is punched to 0');
assert(d[11]===255, 'a>40 is forced opaque');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nMacar dungeon blit / leftover-art checks passed');
