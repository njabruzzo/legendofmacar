'use strict';
/**
 * Thin One PAINT v4f bind: 8-direction facing, shared baseline, 149 ms
 * frames, frame-locked bob, and no change to any unbound monster.
 * Run: node src/combat/Monster8Dir.test.js
 */
const fs=require('fs');
const path=require('path');
const zlib=require('zlib');
const vm=require('vm');
const M=require('./Monster8Dir');

const root=path.join(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const src=fs.readFileSync(path.join(__dirname,'Monster8Dir.js'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}
function extractFn(name){
  const start=html.indexOf('function '+name+'(');
  if(start<0) throw new Error('missing '+name);
  let i=html.indexOf('{', start), depth=0;
  for(;i<html.length;i++){
    if(html[i]==='{') depth++;
    else if(html[i]==='}'){ depth--; if(depth===0) return html.slice(start, i+1); }
  }
  throw new Error('unclosed '+name);
}
function paeth(a,b,c){
  const p=a+b-c, pa=Math.abs(p-a), pb=Math.abs(p-b), pc=Math.abs(p-c);
  if(pa<=pb && pa<=pc) return a;
  if(pb<=pc) return b;
  return c;
}
function pngBottom(file){
  const buf=fs.readFileSync(file);
  const w=buf.readUInt32BE(16), h=buf.readUInt32BE(20);
  let off=8; const parts=[];
  while(off<buf.length){
    const len=buf.readUInt32BE(off);
    const type=buf.toString('ascii', off+4, off+8);
    if(type==='IDAT') parts.push(buf.subarray(off+8, off+8+len));
    if(type==='IEND') break;
    off+=12+len;
  }
  const raw=zlib.inflateSync(Buffer.concat(parts));
  const stride=w*4;
  const out=Buffer.alloc(h*stride);
  let s=0;
  for(let y=0;y<h;y++){
    const filter=raw[s++];
    const row=y*stride;
    for(let i=0;i<stride;i++){
      const x=raw[s++];
      const a=i>=4?out[row+i-4]:0;
      const b=y?out[row-stride+i]:0;
      const c=(y&&i>=4)?out[row-stride+i-4]:0;
      let v=x;
      if(filter===1) v=(x+a)&255;
      else if(filter===2) v=(x+b)&255;
      else if(filter===3) v=(x+((a+b)>>1))&255;
      else if(filter===4) v=(x+paeth(a,b,c))&255;
      out[row+i]=v;
    }
  }
  let bot=-1;
  for(let y=h-1;y>=0 && bot<0;y--){
    for(let x=0;x<w;x++){
      if(out[(y*w+x)*4+3]>30){ bot=y; break; }
    }
  }
  return {w:w,h:h,bot:bot};
}

assert(M.FRAME_MS===149, 'walk frame quantum is 149 ms');
assert(Math.abs(M.frameHoldMs(1)-149)<1e-9, 'unscaled hold is 149 ms');
const frameDt=0.25/M.BASE_HZ;
assert(Math.abs(frameDt*1000-149)<0.4, 'base 1.675 Hz puts each of 4 frames at 149 ms ('+(frameDt*1000).toFixed(2)+')');
assert(M.frameIndex(0,4)===0 && M.frameIndex(0.25,4)===1 && M.frameIndex(0.5,4)===2 && M.frameIndex(0.75,4)===3,
  'four-frame index is w1, pass, w2, pass');
assert(M.frameIndex(frameDt*M.BASE_HZ,4)===1, 'one 149 ms tick of the base clock advances one frame');
assert(M.walkPoses(4).join(',')==='w1,pass_a,w2,pass_b', '4-frame walk names');
assert(M.walkPoses(2).join(',')==='w1,w2', 'per-facing count of 2 stays a two-plant walk');
assert(M.plan('thinone').walkFrames.s===4 && M.plan('thinone').walkFrames.e===4
  && M.plan('thinone').walkFrames.back===4, 'Thin One walks 4 frames in every facing, including south');

const plan=M.plan('thinone');
assert(plan.scale===2.065, 'scale 2.065 from STRUCTURE_PASS_L1_L2.md line 40');
assert(plan.paintedLeft===false, 'Thin One flag is per sprite and painted screen-right');
assert(M.paintedLeft('thinone')===false, 'paintedLeft reads the sprite plan, not a kind');
assert(M.paintedLeft('goblin_king')===false && M.bound('goblin_king')===false,
  'an unbound goblin_king sprite does not receive a goblin plan flag');
assert(plan.legShift===false && !/DwarfWalkLegs\.apply/.test(src), 'painted Thin One does not take the code leg shift');
assert(plan.magentaCleanup===false, 'v4f has no fringe, so neither side is punched');
assert(plan.footX===256 && plan.canvasW===512 && plan.baselineRow===399 && plan.canvasH===416,
  'foot x is the canvas centre 256 and the shared baseline row is 399');
const anc=M.anchor(plan);
assert(Math.abs(anc.footX-0.5)<1e-12, 'foot x fraction is W/2');
assert(M.baselineScreenY(180, plan)===0 && M.baselineScreenY(70, plan)===0,
  'the declared baseline lands on one screen y at any draw height');

assert(M.bob(0.05,4,2)===0, 'stride w1 bob is lowest');
assert(M.bob(0.30,4,2)===3.2, 'pass_a bob is highest');
assert(M.bob(0.55,4,2)===0, 'stride w2 bob is lowest');
assert(M.bob(0.80,4,2)===3.2, 'pass_b bob is highest');
assert(M.bob(0.1,2,2)===0 && M.bob(0.7,2,2)===0, 'a 2-frame facing stays low on both stride frames');

const facings=[
  ['e','e',false],['se','se',false],['s','s',false],['ne','ne',false],['n','back',false],
  ['w','e',true],['sw','se',true],['nw','ne',true]
];
facings.forEach(function(row){
  const oct=row[0], view=row[1], mirror=row[2];
  assert(M.paintedView(oct)===view, oct+' paints from '+view);
  assert(M.flips(oct)===mirror, oct+(mirror?' mirrors':' stays'));
  const moving={sprite:'thinone',moving:1,atk:0,dead:0,gait:0.3};
  assert(M.select('thinone', moving, oct)==='thinone_'+view+'_pass_a',
    oct+' mid-walk is '+view+' pass_a');
});
assert(M.select('thinone',{moving:0,atk:0,dead:0,gait:0.3},'e')==='thinone_e_idle', 'standing east is idle');
assert(M.select('thinone',{moving:1,atk:0,dead:0,gait:0.05},'s')==='thinone_s_w1', 'south stride is w1');
assert(M.select('thinone',{moving:1,atk:0,dead:0,gait:0.55},'n')==='thinone_back_w2', 'back stride is w2');
assert(M.select('thinone',{moving:1,atk:1,atkMax:1,atkKind:'melee',dead:0},'w')==='thinone_e_atk',
  'west attack uses the east windup sheet');
assert(M.select('thinone',{moving:1,atk:0.5,atkMax:1,atkKind:'melee',dead:0},'se')==='thinone_se_atk_contact',
  'contact follows windup');
assert(M.select('thinone',{moving:0,atk:0.2,atkMax:1,atkKind:'melee',dead:0},'n')==='thinone_back_atk_recover',
  'recover follows contact');
assert(M.attackPose(0)==='atk' && M.attackPose(0.5)==='atk_contact' && M.attackPose(0.8)==='atk_recover',
  'attack order is windup, contact, recover');
assert(M.select('thinone',{dead:1,moving:1,atk:0.2,atkMax:1},'w')==='thinone_dead', 'dead is the shared sheet, not a mirror');
const keyList=M.keys('thinone');
assert(keyList.length===41, 'Thin One registers 41 keys ('+keyList.length+')');
assert(!keyList.some(function(k){return /wake/.test(k);}), 'no wake pose is registered');
assert(!/thinone_.*wake/.test(html), 'index does not invent a wake key');

const laptop={sp:2.15,tw:116,drawH:70*1.38*2.065,canvasH:416,strideSrc:plan.strideSrc,frameMs:149};
const phone={sp:2.15,tw:66,drawH:70*0.78*2.065,canvasH:416,strideSrc:plan.strideSrc,frameMs:149};
[laptop,phone].forEach(function(opts,i){
  const mul=M.cadenceMul(opts);
  const slide=M.plantedSlideFrac(opts, mul);
  assert(slide<=0.25+1e-9, (i?'phone':'laptop')+' planted slide is '+slide.toFixed(3)+' of the stride');
});
const macar={sp:4.3,tw:116,drawH:78*1.38,canvasH:M.MACAR.canvasH,strideSrc:M.MACAR.strideSrc,frameMs:149};
assert(M.plantedSlideFrac(macar, M.cadenceMul(macar))<=0.25+1e-9, 'Macar planted slide stays within 25%');
assert(M.cadenceMul({sp:1,tw:10,drawH:100,canvasH:100,strideSrc:80,frameMs:149})===1,
  'a short step does not slow the 149 ms clock');

let y0=null, pngN=0;
keyList.forEach(function(key){
  const file=path.join(root,'assets/creatures/mon_'+key.replace(/^thinone/,'thinone')+'.png');
  const rel='assets/creatures/'+path.basename(file);
  assert(fs.existsSync(file), rel+' is on disk');
  const info=pngBottom(file);
  pngN++;
  assert(info.w===512 && info.h===416, rel+' canvas is 512x416');
  assert(info.bot===399, rel+' lowest opaque row is 399 (got '+info.bot+')');
  const y=M.baselineScreenY(info.h, plan);
  if(y0==null) y0=y;
  assert(y===y0, rel+' baseline screen y matches the set');
});
assert(pngN===41 && y0===0, 'all 41 keys share screen y 0 for the baseline');

assert(/const ASSET_VER='132'/.test(html), 'ASSET_VER is 132');
assert(/sprite:'thinone',hp:95,sp:1\.55,dmg:11,range:1\.2,cd:1\.5,scale:2\.065,aggro:99/.test(html),
  'Thin One stats stay, scale is 2.065');
assert(/STRUCTURE_PASS_L1_L2\.md line 40/.test(html), 'scale comment cites the structure pass line');
assert(/Monster8Dir\.anchor\(/.test(extractFn('drawEntBillboard')), 'billboards use the declared anchor');
assert(/-H\*b\.botY/.test(extractFn('drawEntBillboard')), 'unbound billboards still plant on the opaque box');
assert(/Monster8Dir\.bob\(/.test(extractFn('drawEnt')) && /Math\.sin\(\(e\.gait\|\|0\)\*TAU\)\*1\.6\*z/.test(extractFn('drawEnt')),
  'bound bob is frame-locked and unbound bob stays the sine');
assert(/eight && deadImg && drawEntBillboard/.test(extractFn('drawEnt')), 'bound dead uses the monster canvas');
assert(/drawDeadBillboard\(g,e,deadImg,z\)/.test(extractFn('drawEnt')), 'unbound dead still uses the dwarf box');
assert(/monsterCadenceMul/.test(extractFn('gaitAdvance')) && /WALK_CYCLES_PER_SECOND/.test(extractFn('gaitAdvance')),
  'cadence multiplies the existing walk clock');
assert(/scale:\.72/.test(html) && /kind:'beetle',sprite:'beetle'[^}]*scale:1\.0/.test(html),
  'rat and beetle scales are untouched');

const SPR={};
['rat','beetle','goblin','spider','undead','goblin_king'].forEach(function(k){
  SPR[k]={width:8}; SPR[k+'_w1']={width:8}; SPR[k+'_w2']={width:8}; SPR[k+'_atk']={width:8};
});
keyList.forEach(function(k){ SPR[k]={width:512,height:416}; });
const ctx={
  SPR:SPR, TW:116, TH:58, TAU:Math.PI*2, Monster8Dir:M,
  sprReady:function(k){ return !!(k&&SPR[k]&&SPR[k].width); },
  loadSpriteKeyNow:function(){},
  entSpriteKey:function(e){ return e.sprite||e.kind; },
  singlePoseLocked:function(){ return false; },
  player:function(){ return null; }
};
vm.createContext(ctx);
vm.runInContext(
  html.match(/const SPRITE_PAINTED_LEFT=\{[^}]*\};/)[0]+'\n'
  +extractFn('walkCycleKey')+'\n'
  +extractFn('attackProgress')+'\n'
  +extractFn('wantsMeleePose')+'\n'
  +extractFn('wantsMeleeRecover')+'\n'
  +extractFn('faceVec')+'\n'
  +extractFn('moveHeadingSX')+'\n'
  +extractFn('screenOctant')+'\n'
  +extractFn('screenCardinal')+'\n'
  +extractFn('wantsBackView')+'\n'
  +extractFn('wantsSpriteFlip')+'\n'
  +extractFn('dwarfAngleKey')+'\n'
  +extractFn('entAnimKey')+'\n'
  +'this.wantsSpriteFlip=wantsSpriteFlip; this.entAnimKey=entAnimKey; this.screenOctant=screenOctant;',
  ctx
);

function foe(kind, sprite, ix, iy, gait){
  return {kind:kind, sprite:sprite||kind, team:'foe', dead:0, crushed:0, hero:0, ghost:0,
    moving:1, defending:0, atk:0, gait:gait==null?0.12:gait, ix:ix, iy:iy, fdx:ix, fdy:iy};
}
['rat','beetle','goblin','spider','undead'].forEach(function(kind){
  const east=foe(kind, kind, 0.7, -0.7, 0.12);
  const west=foe(kind, kind, -0.7, 0.7, 0.12);
  const east2=foe(kind, kind, 0.7, -0.7, 0.8);
  assert(ctx.entAnimKey(east)===kind+'_w1' && ctx.entAnimKey(east2)===kind+'_w2',
    kind+' still uses the 2-frame stand-in walk');
  const paintedLeft=kind==='rat'||kind==='beetle'||kind==='goblin';
  assert(ctx.wantsSpriteFlip(east)===paintedLeft, kind+' east flip is unchanged');
  assert(ctx.wantsSpriteFlip(west)===!paintedLeft, kind+' west flip is unchanged');
  assert(!M.bound(kind), kind+' is not on the 8-dir plan');
});
const kingE=foe('goblin','goblin_king',0.7,-0.7,0.12);
const kingW=foe('goblin','goblin_king',-0.7,0.7,0.62);
assert(ctx.entAnimKey(kingE)==='goblin_king_w1' && ctx.entAnimKey(kingW)==='goblin_king_w2',
  'goblin king still uses its stand-in walk keys');
assert(ctx.wantsSpriteFlip(kingE)===true && ctx.wantsSpriteFlip(kingW)===false,
  'goblin king mirror is unchanged until its own set is bound');

const thinE=foe('statue','thinone',0.7,-0.7,0.12);
const thinW=foe('statue','thinone',-0.7,0.7,0.12);
const thinS=foe('statue','thinone',0.7,0.7,0.3);
const thinN=foe('statue','thinone',-0.7,-0.7,0.55);
assert(ctx.screenOctant(thinE)==='e' && ctx.entAnimKey(thinE)==='thinone_e_w1', 'Thin One east walk');
assert(ctx.wantsSpriteFlip(thinE)===false, 'Thin One east is unflipped');
assert(ctx.screenOctant(thinW)==='w' && ctx.entAnimKey(thinW)==='thinone_e_w1' && ctx.wantsSpriteFlip(thinW)===true,
  'Thin One west mirrors the east sheet');
assert(ctx.entAnimKey(thinS)==='thinone_s_pass_a' && ctx.wantsSpriteFlip(thinS)===false, 'Thin One south pass');
assert(ctx.entAnimKey(thinN)==='thinone_back_w2' && ctx.wantsSpriteFlip(thinN)===false, 'Thin One back stride');
const kindTrap=foe('goblin','thinone',0.7,-0.7,0.12);
assert(ctx.wantsSpriteFlip(kindTrap)===false, 'Thin One does not inherit a kind painted-left flag');
const atk=foe('statue','thinone',0.7,-0.7,0);
atk.atk=1; atk.atkMax=1; atk.moving=0;
assert(ctx.entAnimKey(atk)==='thinone_e_atk', 'Thin One attack starts on windup');
atk.atk=0.5;
assert(ctx.entAnimKey(atk)==='thinone_e_atk_contact', 'Thin One attack reaches contact');
atk.atk=0.2;
assert(ctx.entAnimKey(atk)==='thinone_e_atk_recover', 'Thin One attack ends on recover');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nmonster 8-dir checks passed');
