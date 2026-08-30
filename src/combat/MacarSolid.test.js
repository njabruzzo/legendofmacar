'use strict';
/**
 * Limner blit: living Macar is a binary-alpha dwarf, never a gold/red outline.
 * Run: node src/combat/MacarSolid.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

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

assert(!/macar_atk:1\.29/.test(html), 'maul swing is not scaled 1.29 vs idle');
assert(!/macar_axe_atk:1\.18/.test(html), 'axe swing is not scaled 1.18 vs idle');
assert(!/macar_atk:1\.11/.test(html), 'idle-height strike does not need a 1.11 FIT bandage');
assert(/function heroFigureFit\(/.test(html), 'inset recover/back frames match idle height');
assert(/function figurePersonFrac\(/.test(html), 'fit uses helmet-to-boot, not the weapon box');
assert(/personY0/.test(html), 'spriteBounds records the foot-column crown');
assert(/function blitLivingMacar\(/.test(html), 'one blitLivingMacar pipe bakes living Macar');
assert(/function solidMacarSprite\(/.test(html) && /return blitLivingMacar\(img\)/.test(html),
  'solidMacarSprite is the same pipe (HUD face)');
assert(/Living Macar and living party paint after grain/.test(html)
  || /Living Macar is drawn solid after the light multiply/.test(html),
  'Macar is skipped in the washed world pass');
assert(/Living Macar after multiply \/ haze \/ grain/.test(html)
  && /drawLivingMacar\(g,mac\)/.test(html.match(/if\(DIAG\.grain && inWorld[\s\S]*?drawHUD/)[0]),
  'living Macar is a single source-over blit after lighting, haze, and grain');
assert(/function drawLivingMacar\(/.test(html), 'dedicated living-Macar blit exists');
assert(/function livingMacarAnimKey\(/.test(html), 'living Macar has a fringe-safe anim key');
assert(/macar_axe:1/.test(html) && /macar_axe_atk:1/.test(html)
  && /macar_axe_w1:1/.test(html) && /macar_axe_atk_recover:1/.test(html),
  'living Macar whitelist includes punched axe idle / walk / atk / recover');
assert(/function livingMacarImg\(/.test(html) && /function isLivingMacarKey\(/.test(html),
  'whitelist key gate feeds the blit pipe');

const bake=extractFn('blitLivingMacar');
assert(/if\(a<=40\)/.test(bake) && /d\[i\+3\]=0/.test(bake), 'bake: a≤40 fringe is punched to 0');
assert(/d\[i\+3\]=255/.test(bake), 'bake: a>40 silhouette is 255');
assert(/255\/a/.test(bake), 'bake un-premultiplies RGB before forcing a=255');
assert(/catch\(_\)\{[\s\S]*SPR\.macar/.test(bake) && !/out=img/.test(bake),
  'getImageData fail blits idle Macar, never the raw fringe sheet');

const liveKey=extractFn('livingMacarAnimKey');
assert(/walkCycleKey\(e, stem\)/.test(liveKey) && /stem\+'_atk'/.test(liveKey)
  && /stem\+'_atk_recover'/.test(liveKey),
  'living Macar uses front walkCycleKey plus atk / recover');
assert(!/QUALITY/.test(liveKey), 'living Macar walk is not QUALITY-gated');
assert(/e\.moving && !e\.defending/.test(liveKey), 'living Macar walk only while moving');
assert(!/macar_e/.test(liveKey) && !/macar_s/.test(liveKey) && !/macar_back/.test(liveKey)
  && !/macar_ne/.test(liveKey) && !/macar_se/.test(liveKey) && !/macar_title/.test(liveKey),
  'living Macar does not bind washed directional / title stems');
assert(/macar_axe/.test(liveKey) && /wieldsShadowCleaver/.test(liveKey),
  'living Macar binds punched axe sheets when the cleaver is wielded');
assert(/stem\+'_atk_recover'/.test(liveKey) || /macar_axe_atk_recover/.test(liveKey),
  'axe recover is on the living-Macar key path');
assert(/img=livingMacarImg\(livingMacarAnimKey\(e\)\)/.test(extractFn('drawLivingMacar')),
  'dungeon blit goes through the whitelist img gate');
assert(/if\(e\.hero && !e\.dead && !e\.ghost\)\{[\s\S]*livingMacarImg\(livingMacarAnimKey\(e\)\)/.test(html),
  'billboard safety net uses the same whitelist, not a raw sheet bake');

const liveBlit=extractFn('drawLivingMacar');
assert(/globalCompositeOperation='source-over'/.test(liveBlit)
  && /globalAlpha=1/.test(liveBlit),
  'living blit is source-over at alpha 1');
assert(/softShadow\(/.test(liveBlit), 'floor contact is softShadow only');
assert(!/ellipse\(0,0,18\*/.test(liveBlit) && !/createRadialGradient/.test(liveBlit),
  'living blit has no gold foot ellipse or radial disc');
assert(!/emit\(/.test(liveBlit) && !/drawHeroMeleeArc/.test(liveBlit)
  && !/lighter/.test(liveBlit) && !/multiply/.test(liveBlit) && !/overlay/.test(liveBlit),
  'living blit never uses emit, melee arc, lighter, multiply, or overlay');

const drawEnt=extractFn('drawEnt');
assert(/e\.hero && !e\.dead && !e\.ghost\) return/.test(drawEnt),
  'drawEnt does not paint living Macar (after-grain blit only)');
assert(!/if\(!e\.dead&&e\.hero\)\{/.test(html)
  && !/rgba\(255,214,140,0\.55\)/.test(html),
  'gold foot ellipse under the hero is gone');

const cavern=html.match(/function drawTitleCavern\(g\)\{[\s\S]*?\n\}/)[0];
assert(/blitLivingMacar\(SPR\[livingMacarIdleKey\(\)\]\|\|SPR\.macar\)/.test(cavern)
  && !/macar_title/.test(cavern) && !/macar_back/.test(cavern),
  'title fallback blits idle through blitLivingMacar, never title/back stills');
assert(/globalAlpha=1/.test(cavern) && /globalCompositeOperation='source-over'/.test(cavern),
  'title Macar blit is source-over at alpha 1');
const doll=html.match(/function drawEquipDoll\(g, x, y, w, h\)\{[\s\S]*?\nfunction drawPack/)[0];
assert(/blitLivingMacar\(SPR\[livingMacarIdleKey\(\)\]\|\|SPR\.macar\)/.test(doll),
  'pack doll uses the blitLivingMacar idle key (axe when the cleaver is on)');
const faceFn=extractFn('face');
assert(/solidMacarSprite\(SPR\[livingMacarIdleKey\(\)\]\|\|SPR\.macar\)/.test(faceFn),
  'HUD face bakes living Macar through solidMacarSprite of the idle key');
assert(!/c&&SPR\[c\.key\]/.test(faceFn) || /c\.key!=='macar'\?SPR\[c\.key\]/.test(faceFn),
  'HUD face never blits raw SPR.macar for living Macar');
assert(/e\.ghost && !e\.dead\) g\.globalAlpha=0\.84/.test(html), 'kin ghosts stay translucent');
assert(!/if\(e\.hero && !e\.dead && !e\.ghost\) img=solidMacarSprite\(img\)/.test(html),
  'no living-Macar blit bakes a raw un-gated sheet');

const ctx={
  clamp:(v,a,b)=>v<a?a:v>b?b:v,
  MACAR_IDLE_FRAC:0.986,
  spriteBounds:(img)=>img&&img._b
};
vm.createContext(ctx);
vm.runInContext('const MACAR_IDLE_FRAC=0.986;', ctx);
vm.runInContext(extractFn('figurePersonFrac'), ctx);
vm.runInContext(extractFn('heroFigureFit'), ctx);

const idle={_b:{ok:true,y0:4/512,y1:509/512,personY0:4/512}};
const atk={_b:{ok:true,y0:3/512,y1:508/512,personY0:4/512}};
const leftover={_b:{ok:true,y0:3/512,y1:508/512,personY0:52/512}};
const recover={_b:{ok:true,y0:4/512,y1:508/512,personY0:4/512}};
const back={_b:{ok:true,y0:40/512,y1:502/512,personY0:40/512}};
const mac={hero:1,dead:0,ghost:0};
const ghost={hero:0,dead:0,ghost:1};

assert(Math.abs(ctx.heroFigureFit(mac,idle)-1)<0.02, 'idle figure fit is ~1');
assert(Math.abs(ctx.heroFigureFit(mac,atk)-ctx.heroFigureFit(mac,idle))<0.02,
  'swing figure fit matches idle — no attack pop');
assert(Math.abs(ctx.heroFigureFit(mac,recover)-1)<0.03, 'redrawn recover matches idle height');
assert(ctx.heroFigureFit(mac,leftover)>1.08 && ctx.heroFigureFit(mac,leftover)<1.16,
  'a shorter painted crown scales by idle_crown/new_crown');
const bootMiss={_b:{ok:true,y0:4/512,y1:508/512,personY0:500/512}};
assert(Math.abs(ctx.heroFigureFit(mac,bootMiss)-1)<0.03,
  'a foot-column miss does not scale the strike');
assert(ctx.heroFigureFit(mac,back)>1.05, 'inset back pose is scaled up to idle height');
assert(ctx.heroFigureFit(ghost,recover)===1, 'ghost kin are not hero-fitted');
assert(ctx.heroFigureFit({hero:1,dead:0,ghost:1},atk)===1, 'a ghost Macar is not flattened-fit');

['dwarf_macar.png','dwarf_macar_atk.png','dwarf_macar_atk_recover.png','dwarf_macar_e_atk.png',
 'dwarf_macar_axe.png','dwarf_macar_axe_atk.png','dwarf_macar_axe_atk_recover.png',
 'dwarf_macar_axe_e_atk.png','dwarf_macar_back.png','dwarf_macar_title.png'].forEach(f=>{
  assert(fs.existsSync(path.join(__dirname,'../../assets/creatures/'+f)), f+' on disk');
});

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nMacar solid / Limner blit checks passed');
