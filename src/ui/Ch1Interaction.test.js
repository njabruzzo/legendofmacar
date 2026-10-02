'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
function fn(name){
 const begin=html.indexOf('function '+name+'(');assert(begin>=0,name);
 let i=html.indexOf('{',begin),depth=0;
 for(;i<html.length;i++){if(html[i]==='{')depth++;else if(html[i]==='}'&&!--depth)return html.slice(begin,i+1);}
 throw new Error('unclosed '+name);
}
const c={G:{lvl:{n:1,flags:{},rubyDoor:{x:36.5,y:7.28}},props:[{k:'pillar',x:36.5,y:21.5}]},SPR:{},ZOOM:1,TW:116,TH:58,
 NPC_TALK:Object.fromEntries(['ruby_door_look','ruby_door','ch1_lift_lever_look','ch1_lift_lever_thrown_look','ch1_lift_pull','ch1_lift_pull_spent','rubypillar_look','rubypillar_look_armed','rubypillar_touch_locked','rubypillar_touch','ch1_lift_ride','cavein_behind_look'].map(k=>[k,{}])),
 startTalk(key){c.G.talk={key};},pillarRubyLocalY(){return -98*c.ZOOM;},ch1LiftLeverSheet(){return c.lever||null;},
 rubyDoorHalf(){return 1.5;},rubyDoorPlaneY(){return 6.58;},rubyDoorH(){return 200*c.ZOOM;},
 w2s(x,y){return {x:(x-y)*c.TW*.5*c.ZOOM+123,y:(x+y)*c.TH*.5*c.ZOOM-345};}};
vm.createContext(c);
for(const name of ['ch1CenterPillar','ch1HubAnchor','ch1LeverAnchor','ch1LeverShownThrown','ch1PillarLookKey','ch1ScreenLookHit','openCh1QuillLook'])vm.runInContext(fn(name),c);
function opens(key,expected,flags){c.G.talk=null;c.G.lvl.flags=flags;c.openCh1QuillLook(key);assert.equal(c.G.talk.key,expected);}
opens('ruby_door_look','ruby_door',{});
opens('ch1_lift_lever_look','ch1_lift_lever_look',{touched:1});
opens('ch1_lift_lever_look','ch1_lift_pull',{touched:1,cleared:1});
opens('rubypillar_look','rubypillar_touch_locked',{touched:1,cleared:1});
opens('rubypillar_look_armed','rubypillar_touch',{touched:1,cleared:1,leverThrown:1});
opens('ch1_lift_lever_thrown_look','ch1_lift_pull',{touched:1,cleared:1,leverThrown:1});
opens('ch1_lift_lever_thrown_look','ch1_lift_ride',{touched:1,cleared:1,leverThrown:1,elevReady:1});
opens('ch1_lift_ride','ch1_lift_ride',{touched:1,cleared:1,leverThrown:1,elevReady:1});
opens('cavein_behind_look','cavein_behind_look',{});
// Screen hits follow zoom, camera offset, isometric aspect, and both art paths.
for(const size of [[116,58],[66,34]])for(const z of [.65,1,2])for(const loaded of [false,true]){
 [c.TW,c.TH]=size;c.ZOOM=z;c.lever=loaded?{width:200,height:500}:null;c.SPR.ch1_pillar_ruby=loaded?{width:300,height:420}:null;
 const s=c.w2s(36.5,21.5);c.G.lvl.flags={touched:1,cleared:1};
 let hit=c.ch1ScreenLookHit({x:s.x+26*z,y:s.y-25*z});assert.equal(hit.key,'ch1_lift_lever_look');assert.equal(hit.x,37.15);
 hit=c.ch1ScreenLookHit({x:s.x,y:s.y-110*z});assert.equal(hit.key,'rubypillar_look');
 c.G.lvl.flags.elevReady=1;assert.equal(c.ch1ScreenLookHit({x:s.x,y:s.y-110*z}).key,'ch1_lift_ride');
 c.G.lvl.flags={};const d=c.w2s(36.5,6.58);hit=c.ch1ScreenLookHit({x:d.x,y:d.y-100*z});assert.equal(hit.key,'ruby_door_look');
 assert.equal(c.ch1ScreenLookHit({x:d.x,y:d.y-201*z}),null);
 assert.equal(c.ch1ScreenLookHit({x:-900,y:-900}),null);
}
c.G.lvl.n=2;assert.equal(c.ch1ScreenLookHit({x:0,y:0}),null);
console.log('Chapter I actionable clicks, guardian gates, spent/ready states, and 12 screen geometry combinations passed');
