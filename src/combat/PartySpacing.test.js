'use strict';
/**
 * Followers keep a body-width gap from Macar and from each other.
 * A short trail must not hand every kin the same crumb.
 * Run: node src/combat/PartySpacing.test.js
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
  if(!m) throw new Error('missing '+name);
  return m[0];
}

assert(/return null;/.test(extractFn('trailSlot')),
  'a short trail falls through to partyForm instead of one shared crumb');
assert(/PARTY_SEP_LEAD=2\.15/.test(html) && /PARTY_SEP_KIN=2\.05/.test(html),
  'follower gap is a body-width from Macar and between kin');
assert(/separateParty\(p\)/.test(html), 'the party step enforces the gap after steering');

const ctx={
  PartyFollow:require("./PartyFollow"),
  G:{trail:[], ents:[]},
  canBe(){ return true; },
  dist(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }
};
vm.createContext(ctx);
vm.runInContext(
  'const PARTY_SEP_LEAD=2.15, PARTY_SEP_KIN=2.05;'
  +extractFn('trailSlot')
  +extractFn('nudgeParty')
  +extractFn('separateParty'),
  ctx
);

ctx.G.trail=[
  {x:0,y:0},{x:0.2,y:0.2},{x:0.4,y:0.4},{x:0.5,y:0.5}
];
assert(ctx.trailSlot(0)===null && ctx.trailSlot(2)===null,
  'four close crumbs are not long enough to space three followers');

ctx.G.trail=[];
let x=0, y=0;
for(let i=0;i<40;i++){
  x+=0.4; y+=0.4;
  ctx.G.trail.push({x,y});
}
const a=ctx.trailSlot(0), b=ctx.trailSlot(1);
assert(a && b && Math.hypot(a.x-b.x, a.y-b.y)>1.5,
  'a long trail gives followers distinct crumbs');

const mac={hero:1, team:'party', dead:0, x:10, y:10, fdx:-0.7, fdy:-0.7, r:0.38};
const kin=[
  {team:'party', hero:0, dead:0, x:10.05, y:10.02, r:0.38, name:'PORDUM'},
  {team:'party', hero:0, dead:0, x:10.08, y:10.04, r:0.38, name:'TALPOR'}
];
ctx.G.ents=[mac].concat(kin);
ctx.separateParty(mac);
const dLead=kin.map(e=>Math.hypot(e.x-mac.x, e.y-mac.y));
const dKin=Math.hypot(kin[0].x-kin[1].x, kin[0].y-kin[1].y);
assert(dLead[0]>=2.1 && dLead[1]>=2.1, 'stacked followers are pushed off Macar (got '+dLead.map(n=>n.toFixed(2)).join(', ')+')');
assert(dKin>=2.0, 'stacked followers are pushed apart (got '+dKin.toFixed(2)+')');

if(failed){ console.error(failed+' failed'); process.exit(1); }
console.log('party spacing ok');
