'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const Equipment=require('./MacarEquipment'),Atlas=require('./MacarIdleAtlas');
const html=fs.readFileSync(require('path').join(__dirname,'../../index.html'),'utf8');
const fn=n=>html.match(new RegExp('function '+n+'\\([\\s\\S]*?\\n\\}'))[0];
const requests=[],SPR={},axe={id:'iron_axe',k:'weapon'},bow={n:'Light Crossbow'};
const hero={hero:1,atkKind:'melee',bowPoseUntil:0};
const ctx={G:{equipped:{primary:axe,weapon:axe,secondary:bow}},MacarEquipment:Equipment,MacarIdleAtlas:Atlas,
 SPR,player:()=>hero,screenOctant:()=>ctx.facing||'s',sprReady:k=>!!SPR[k],
 loadSpriteKeyNow:k=>requests.push(k),wearingBoneCrown:()=>false,
 wantsBowPose:e=>e.bowPoseUntil>1000,isCrossbowItem:it=>Equipment.kind(it)==='xbow'};
vm.createContext(ctx);
vm.runInContext("let MACAR_EQUIP_ART_SIG='';\n"+['wieldsMacarAxe','wieldsCrossbow','requestMacarEquipmentArt','livingMacarIdleKey'].map(fn).join('\n'),ctx);
assert.equal(ctx.livingMacarIdleKey(),'macar_axe','cold axe retains equipment identity ahead of bow');
assert.equal(requests[0],'macar_axe_idle_s','selected axe standing view is requested first');
for(const key of ['macar_axe','macar_axe_w1','macar_axe_w2','macar_axe_atk',...Atlas.keys('macar_axe')])
 assert(requests.includes(key),'axe family requested immediately: '+key);
// A directional idle can finish before the original carry image.
SPR.macar_axe_idle_s={width:512};
assert.equal(ctx.livingMacarIdleKey(),'macar_axe','ready standing frame is selectable without legacy carry image');
hero.atkKind='bow';
assert.equal(ctx.livingMacarIdleKey(),'macar_axe','stale bow flag cannot change the equipped carry pose');
hero.bowPoseUntil=1100;
assert.equal(ctx.livingMacarIdleKey(),'macar_xbow','active Shoot temporarily displays crossbow');
hero.bowPoseUntil=0;
Equipment.select(ctx.G.equipped,bow);
assert.equal(ctx.livingMacarIdleKey(),'macar_xbow','explicit bow selection is respected');
Equipment.select(ctx.G.equipped,axe);ctx.facing='nw';requests.length=0;
assert.equal(ctx.livingMacarIdleKey(),'macar_axe');
assert.equal(requests[0],'macar_axe_idle_ne','mirrored standing direction is requested first');
requests.forEach(k=>SPR[k]={width:512});requests.length=0;
ctx.requestMacarEquipmentArt();assert.equal(requests.length,0,'ready equipment avoids repeated requests');
console.log('Cold axe, ID-only axe, primary/secondary selection, stale Shoot and directional-first loading passed');
