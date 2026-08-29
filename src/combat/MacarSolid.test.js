'use strict';
/**
 * Living Macar: one world size on every pose, solid pixels, drawn after the
 * light multiply. Kin ghosts stay spectral.
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
assert(/function heroFigureFit\(/.test(html), 'inset recover/back frames match idle height');
assert(/function solidMacarSprite\(/.test(html), 'living Macar pixels are flattened opaque');
assert(/Living Macar is drawn solid after the light multiply/.test(html),
  'Macar is skipped in the washed world pass');
assert(/Living Macar after multiply \/ haze \/ grain/.test(html)
  && /drawEnt\(g,mac\)/.test(html.match(/if\(DIAG\.grain && inWorld[\s\S]*?drawHUD/)[0]),
  'living Macar is redrawn after lighting, haze, and grain');
assert(/solidMacarSprite\(spr\)/.test(html.match(/function drawTitleCavern\(g\)\{[\s\S]*?\n\}/)[0]),
  'title fallback blit flattens Macar, not the kin ghosts');
assert(/if\(e\.hero && !e\.dead && !e\.ghost\) img=solidMacarSprite\(img\)/.test(html),
  'idle / walk / attack / recover billboards flatten Macar');
assert(/e\.ghost && !e\.dead\) g\.globalAlpha=0\.84/.test(html), 'kin ghosts stay translucent');

const ctx={
  clamp:(v,a,b)=>v<a?a:v>b?b:v,
  MACAR_IDLE_FRAC:0.986,
  spriteBounds:(img)=>img&&img._b
};
vm.createContext(ctx);
vm.runInContext('const MACAR_IDLE_FRAC=0.986;', ctx);
vm.runInContext(extractFn('heroFigureFit'), ctx);

const idle={_b:{ok:true,y0:4/512,y1:509/512}};
const atk={_b:{ok:true,y0:3/512,y1:508/512}};
const recover={_b:{ok:true,y0:69/512,y1:443/512}};
const back={_b:{ok:true,y0:40/512,y1:502/512}};
const mac={hero:1,dead:0,ghost:0};
const ghost={hero:0,dead:0,ghost:1};

assert(Math.abs(ctx.heroFigureFit(mac,idle)-1)<0.02, 'idle figure fit is ~1');
assert(Math.abs(ctx.heroFigureFit(mac,atk)-ctx.heroFigureFit(mac,idle))<0.02,
  'swing figure fit matches idle — no attack pop');
assert(ctx.heroFigureFit(mac,recover)>1.2, 'inset recover is scaled up to idle height');
assert(ctx.heroFigureFit(mac,back)>1.05, 'inset back pose is scaled up to idle height');
assert(ctx.heroFigureFit(ghost,recover)===1, 'ghost kin are not hero-fitted');
assert(ctx.heroFigureFit({hero:1,dead:0,ghost:1},atk)===1, 'a ghost Macar is not flattened-fit');

['dwarf_macar.png','dwarf_macar_atk.png','dwarf_macar_atk_recover.png','dwarf_macar_e_atk.png',
 'dwarf_macar_axe.png','dwarf_macar_axe_atk.png','dwarf_macar_axe_atk_recover.png',
 'dwarf_macar_axe_e_atk.png','dwarf_macar_back.png','dwarf_macar_title.png'].forEach(f=>{
  assert(fs.existsSync(path.join(__dirname,'../../assets/creatures/'+f)), f+' on disk');
});

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nMacar solid / same-size checks passed');
