'use strict';
/**
 * Ghost / living kin stand still while Macar stands, face his heading while
 * walking with him, stand in their idle sheet, and paint behind the foes
 * they fight. Run: node src/combat/KinFollowIdle.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
let failed=0;
function assert(c,m){ if(!c){ failed++; console.error('FAIL  '+m); } else console.log('ok    '+m); }
function extractFn(name){
  const start=html.indexOf('\nfunction '+name+'(');
  if(start<0) throw new Error('missing '+name);
  const open=html.indexOf('{', html.indexOf(')', start));
  let depth=0;
  for(let i=open;i<html.length;i++){ const c=html[i];
    if(c==='{') depth++; else if(c==='}'){ depth--; if(!depth) return html.slice(start,i+1); } }
  throw new Error('unbalanced '+name);
}

assert(/if\(!p\.moving\)\{\s*e\.moving=0; e\.ix=0; e\.iy=0; e\.dest=null;\s*e\.fdx=p\.fdx; e\.fdy=p\.fdy;/.test(html),
  'a following kin stands still, facing Macar\'s way, while Macar stands');
assert(/tgt=trailSlot\(idx<0\?0:idx\)\|\|followBearingSlot\(e, p, idx<0\?0:idx\)/.test(html),
  'with no trail yet, kin close on Macar along their own bearing (no swing round a rotated slot)');
const face=extractFn('faceVec');
assert(/lead && lead\.moving/.test(face) && /\(hx\*\(e\.ix\|\|0\)\+hy\*\(e\.iy\|\|0\)\)>0/.test(face),
  'kin walking with Macar take his heading; walking against him keeps own travel (no moonwalk)');
assert(/if\(!moving && e\.ghost && !\(idle && sprReady\(idle\)\) && sprReady\(k\)\) return k;/.test(html),
  'a stopped ghost uses its standing sheet, not a mid-stride walk frame');

const ctx={Math, PARTY_SEP_LEAD:2.15, walk:()=>true, partyForm:(i,p)=>({x:p.x-2,y:p.y,form:1})};
vm.createContext(ctx);
vm.runInContext(extractFn('followBearingSlot'), ctx);
const p={x:10,y:10,fdx:1,fdy:0};
const near={x:11.5,y:10};
const s1=ctx.followBearingSlot(near, p, 0);
assert(s1.x===near.x && s1.y===near.y, 'a kin already within its gap stays put — never walks away from Macar');
const far={x:16,y:10};
const s2=ctx.followBearingSlot(far, p, 0);
assert(s2.x<far.x && s2.x>p.x && Math.abs(s2.y-10)<1e-9, 'a kin beyond its gap closes straight toward Macar');
const s3=ctx.followBearingSlot({x:10,y:10}, p, 1);
assert(s3.form===1, 'a kin on top of Macar falls back to the formation slot');

const pass=html.match(/Living Macar after multiply[\s\S]*?drawHUD/)[0];
const gi=pass.indexOf('for(const e of ghostFightFoes())'), ghi=pass.indexOf("if(!lateKin(e) || !e.ghost) continue;"), mi=pass.indexOf('drawLivingMacar(g,mac)');
assert(ghi>=0 && gi>ghi && mi>gi, 'late pass paints ghosts, then the foes they fight, then Macar');
assert(/if\(ghostFoes\.has\(e\)\) continue;/.test(html), 'foes fighting a ghost are not painted twice');
assert(/const GHOST_FIGHT_R=2\.6;/.test(html) && /dist\(gh,f\)<=GHOST_FIGHT_R/.test(extractFn('ghostFightFoes')),
  'a foe within melee reach of a ghost counts as fighting it');

/* Rejoin: a lost kin always paths back, even while Macar stands. */
const iRejoin=html.indexOf('if(tickRejoin(e, p, dt)){'), iIdle=html.indexOf('if(!p.moving){\n          e.moving=0; e.ix=0; e.iy=0; e.dest=null;');
assert(iRejoin>0 && iIdle>iRejoin && iIdle-iRejoin<200, 'rejoin runs right before the stand-when-Macar-stands rule');
const rj=extractFn('tickRejoin');
assert(/Navigation\.planRoute\(\{x:e\.x,y:e\.y\}, goal, e, \{canBe:partyRouteCanBe, maxExpand:REJOIN_EXPAND\}\)/.test(rj),
  'a lost kin plans an A* route to Macar (canBe-aware lattice)');
assert(!/e\.x=|e\.y=/.test(rj), 'rejoin walks the route; it never teleports');
assert(/d<=REJOIN_DONE && sees/.test(rj)&&/dist\(e,goal\)<=.38/.test(rj), 'rejoin hands back near Macar or at its own rank goal');
const lost=extractFn('kinLost');
assert(/Math.max\(REJOIN_LEASH/.test(lost) && /!hasLOS\(e\.x, e\.y, p\.x, p\.y\)/.test(lost) && /followStuck/.test(lost),
  'lost means beyond the leash, out of sight, or stuck against rock');
assert(/if\(form\) e\.followStuck=\(stepped>0\.002\)\?0:/.test(html), 'a follower pushing against rock builds up followStuck');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nkin follow / idle / fight-layer checks passed');
