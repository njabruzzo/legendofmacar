'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const {readRgba}=require('../qa/pngRgba');
const root=path.join(__dirname,'../..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const fn=name=>html.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}'))[0];
const bindings=vm.runInNewContext('('+html.match(/const MACAR_ONMODEL=(\{[\s\S]*?\n\});/)[1]+')');
bindings.macar_atk=bindings.macar_atk_contact='assets/creatures/dwarf_macar_atk_contact.png';
for(const d of ['se','ne'])for(const frame of [1,2])bindings['macar_'+d+'_w'+frame]=bindings['macar_e_w'+frame];
const SPR={};
for(const [key,file] of Object.entries(bindings)){
 const png=readRgba(path.join(root,file));
 assert(png.w>0&&png.h>0,key+' is shipped art');
 SPR[key]={width:png.w,height:png.h,_id:{ok:true,metal:0,hair:.86,warm:.96}};
}
const ctx={SPR,TW:116,TH:58,Math,SPRITE_PAINTED_LEFT:{},sprReady:k=>!!SPR[k],performance:{now:()=>10000},clamp:(v,a,b)=>Math.min(b,Math.max(a,v)),
 player:()=>ctx.hero,wieldsShadowCleaver:()=>ctx.weapon==='axe',wieldsCrossbow:()=>ctx.weapon==='crossbow'};
ctx.entAnimKey=e=>ctx.livingMacarAnimKey(e);
vm.createContext(ctx);
const names=['isLivingMacarKey','livingMacarIdleKey','partyFrameFitOk','samePaintedFamily','partyCrownMatches','sheetCrownId','partySheetMatchesIdle','matchingPartyAtkReady','restoredMacarMotionKey','partyAnimKeyReady','pickReadyPartyKey','livingMacarBlitKey','walkCycleKey','attackProgress','wantsMeleePose','wantsMeleeRecover','nowMs','wantsBowPose','expireBowPose','wantsMacarWindup','wantsLivingMacarStrike','livingMacarStandKey','macarStrikeDirKey','livingMacarAnimKey','faceVec','screenOctant','moveHeadingSX','wantsSpriteFlip'];
vm.runInContext(html.match(/const LIVING_MACAR_KEYS=\{[\s\S]*?\n\};/)[0]+'\nconst MACAR_MAUL_CONTACT_T=.45;\n'+names.map(fn).join('\n'),ctx);
let cases=0,asserts=0;const check=(v,m)=>{asserts++;assert(v,m);};
const dirs=['e','se','s','sw','w','nw','n','ne'];
for(const weapon of ['maul','axe','crossbow'])for(const state of ['idle','walk1','walk2','windup','hit','recover','ranged'])for(let i=0;i<8;i++){
 cases++;ctx.weapon=weapon;const stem=weapon==='axe'?'macar_axe':weapon==='crossbow'?'macar_xbow':'macar';
 const a=i*Math.PI/4,sx=Math.cos(a)/(ctx.TW/2),sy=Math.sin(a)/(ctx.TH/2),m=Math.hypot(sx+sy,sy-sx);
 const hero=ctx.hero={hero:1,team:'party',kind:'dwarf',x:0,y:0,fdx:(sx+sy)/m,fdy:(sy-sx)/m,atk:0,atkMax:1,atkKind:'melee',moving:state.startsWith('walk')?1:0,gait:state==='walk2'?.75:.25};
 hero.ix=hero.fdx;hero.iy=hero.fdy;
 let expected=stem;
 if(state==='windup'||state==='hit'||state==='recover')hero.atk=state==='windup'?.82:state==='hit'?.4:.1;
 if(state==='ranged'){hero.atkKind='bow';hero.bowPoseUntil=10400;expected='macar_xbow_atk';}
 else if(state==='windup'||state==='hit')expected=stem==='macar'?(i===6?'macar_atk_n':i===2?'macar_atk_s':i===5||i===7?'macar_atk_ne':i===1||i===3?'macar_atk_se':state==='hit'?'macar_atk_contact':'macar_atk'):stem+'_atk';
 else if(state.startsWith('walk'))expected=(stem==='macar'?(i===6?'macar_back':i===0||i===4?'macar_e':i===1||i===3?'macar_se':i===5||i===7?'macar_ne':stem):stem)+(state==='walk2'?'_w2':'_w1');
 const key=ctx.livingMacarAnimKey(hero);
 check(ctx.screenOctant(hero)===dirs[i],'supported facing '+dirs[i]);
 check(key===expected,weapon+' '+state+' '+dirs[i]+': '+key+' expected '+expected);
 check(ctx.livingMacarBlitKey(key)===key,'chosen pose survives final blit');
 check(ctx.wantsSpriteFlip(hero)===(i>=3&&i<=5),'mirrors screen-left only');
}
for(const weapon of ['axe','crossbow','maul','axe','maul']){
 cases++;ctx.weapon=weapon;ctx.hero.moving=0;ctx.hero.atkKind='bow';ctx.hero.atk=.9;ctx.hero.bowPoseUntil=9999;ctx.hero.bowPoseT=.2;
 check(ctx.livingMacarAnimKey(ctx.hero)===(weapon==='axe'?'macar_axe':weapon==='crossbow'?'macar_xbow':'macar'),'expired ranged pose returns to switched equipment '+weapon);
}
for(const weapon of ['axe','crossbow','maul','axe','maul'])for(const state of ['idle','walk','strike','bow']){
 cases++;ctx.weapon=weapon;Object.assign(ctx.hero,{moving:state==='walk'?1:0,atk:state==='strike'?.4:0,atkMax:1,atkKind:state==='bow'?'bow':'melee',bowPoseUntil:state==='bow'?10400:0,bowPoseT:0});
 const stem=weapon==='axe'?'macar_axe':weapon==='crossbow'?'macar_xbow':'macar';
 const key=ctx.livingMacarAnimKey(ctx.hero);
 check(state==='bow'?key==='macar_xbow_atk':state==='strike'?key.startsWith(stem+'_atk'):state==='walk'?key.startsWith(stem)&&/_w[12]$/.test(key):key===stem,'equipment switch '+weapon+' '+state+' got '+key);
 check(ctx.livingMacarBlitKey(key)===key,'switch survives blit '+weapon+' '+state);
}
console.log('COUNTS cases='+cases+' asserts='+asserts);
