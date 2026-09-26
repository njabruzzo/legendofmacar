'use strict';
/**
 * Chapter I east-corridor north-wall teeth chapel: secret placement, bone crown take/destroy,
 * 5000 XP, fanged-skeleton stats, one-thrall animate dead.
 * Run: node src/dungeon/Ch1TeethCrown.test.js
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
  const start=html.indexOf('function '+name+'(');
  if(start<0) throw new Error('missing '+name);
  let i=html.indexOf('{', start), depth=0;
  for(;i<html.length;i++){
    if(html[i]==='{') depth++;
    else if(html[i]==='}'){ depth--; if(depth===0) return html.slice(start, i+1); }
  }
  throw new Error('unclosed '+name);
}

const ch1=html.match(/if\(n===1\)\{[\s\S]*?if\(n===2\)\{/)[0];
assert(/L\.w=132/.test(ch1), 'Ch1 canvas grows east for the teeth chapel');
assert(/kind:'teeth'/.test(ch1) && /face:'n'/.test(ch1),
  'teeth secret is on the north wall of the east corridor');
assert(/i:105,j:15,w:3,h:1/.test(ch1),
  'secret seals the north face of the east hall');
assert(/x:106\.5,y:15\.05/.test(ch1), 'SEARCH stand point is on the north wall');
assert(/north wall of the east corridor/.test(ch1),
  'hint names the north wall of the east corridor');
assert(!/far east wall of the drift/.test(ch1),
  'hint no longer points at the far-east dead-end');
assert(!/kind:'teeth'[\s\S]{0,180}face:'s'/.test(ch1),
  'teeth secret is not a south face');
assert(/kind:'treasure'/.test(ch1) && /face:'n'/.test(ch1),
  'north treasure secret stays');

assert(/function buildTeethCrownRoom\(/.test(html), 'teeth chapel builder exists');
assert(/function takeBoneCrown\(/.test(html) && /function destroyBoneCrown\(/.test(html),
  'take and destroy crown paths exist');
assert(/BONE_CROWN_DESTROY_XP=5000/.test(html), 'destroy awards 5000 XP');
assert(/FANGED_SKELETON_HORDE=8/.test(html), 'teeth rise as a horde');
assert(/TEETH_HORDE_STIR=0\.8/.test(html), 'crown horde stirs for 0.8s');
assert(/TEETH_HORDE_MIN_DIST=2\.8/.test(html), 'crown horde stands outside the melee pocket');
assert(!/rad=1\.35\+\(i%3\)/.test(extractFn('riseTeethHorde')),
  'horde no longer rings Macar inside melee range');
assert(/e\.stun=TEETH_HORDE_STIR/.test(extractFn('riseTeethHorde')),
  'each risen skeleton is pinned to the short stir after the fight opens');
assert(/The floor has risen\. They stir\. Fight or run\./.test(extractFn('riseTeethHorde')),
  'hint keeps fight-or-run and names the stir');
assert(/The teeth stand up\. A horde of fanged skeletons\./.test(extractFn('riseTeethHorde')),
  'horde say is unchanged');
assert(/HOUSE: Bone Crown animate dead/.test(html),
  'HOUSE comment records one-thrall animate-dead law');
assert(/one thrall at a time/.test(html) && /Once per corpse/.test(html),
  'HOUSE law is one thrall, once per corpse');
assert(/follow \/ fight nearest foe \/ stay/.test(html),
  'thrall commands are follow, fight nearest foe, stay');
assert(/ASSET_VER='122'/.test(html) && !/ASSET_VER='115'/.test(html),
  'ASSET_VER is 117 — remat Talpor idle bw=344 (Nick CALL)');
assert(/bone_crown:'assets\/props\/prop_bone_crown\.png'/.test(html),
  'bone_crown is registered to the painted prop');
assert(/SPRITE_FILES\.bone_crown_scene='assets\/props\/prop_bone_crown_scene\.png'/.test(html),
  'scene crown is registered for the altar diorama');
assert(/tooth:'assets\/props\/prop_tooth\.png'/.test(html)
  && /tooth_2:'assets\/props\/prop_tooth_2\.png'/.test(html)
  && /tooth_3:'assets\/props\/prop_tooth_3\.png'/.test(html),
  'tooth sprites are registered');
['prop_bone_crown.png','prop_bone_crown_scene.png','prop_tooth.png','prop_tooth_2.png','prop_tooth_3.png'].forEach(n=>{
  assert(fs.existsSync(path.join(__dirname,'../../assets/props/'+n)), n+' on disk');
});
{
  const crownPath=path.join(__dirname,'../../assets/props/prop_bone_crown.png');
  const cbuf=fs.readFileSync(crownPath);
  assert(cbuf.readUInt32BE(16)===682 && cbuf.readUInt32BE(20)===414,
    'TAKE crown is Nick\'s 682×414 sheet');
  const scenePath=path.join(__dirname,'../../assets/props/prop_bone_crown_scene.png');
  const sbuf=fs.readFileSync(scenePath);
  assert(sbuf.readUInt32BE(16)===109 && sbuf.readUInt32BE(20)===66,
    'altar scene crown is the 109×66 Macar-head fit');
}
assert(/function drawProceduralFang\(/.test(html) && /function crownSprite\(/.test(html)
  && /function toothSprite\(/.test(html),
  'crown and tooth share a painted fallback path');
assert(/demon_dwarfface:'assets\/props\/prop_demon_dwarfface\.png'/.test(html)
  && /demonface:'assets\/props\/prop_demon_dwarfface\.png'/.test(html),
  'demon_dwarfface and demonface are registered');
{
  const facePath=path.join(__dirname,'../../assets/props/prop_demon_dwarfface.png');
  assert(fs.existsSync(facePath), 'prop_demon_dwarfface.png on disk');
  const buf=fs.readFileSync(facePath);
  assert(buf[0]===0x89 && buf[1]===0x50 && buf[2]===0x4e && buf[3]===0x47, 'SIGNED face is a PNG');
  const w=buf.readUInt32BE(16), h=buf.readUInt32BE(20);
  assert(w===267 && h===434, 'approved demon face is the 267×434 plate');
}
{
  const emptyPath=path.join(__dirname,'../../assets/props/prop_demon_dwarfface_empty.png');
  assert(fs.existsSync(emptyPath), 'empty-socket demon face is on disk');
  const ebuf=fs.readFileSync(emptyPath);
  assert(ebuf.readUInt32BE(16)===267 && ebuf.readUInt32BE(20)===434,
    'empty socket is the same 267×434 plate');
}
assert(/demonFaceDrawH\(img, p\)/.test(extractFn('demonFaceHalf'))
  && /return clamp\(H\*aspect\/\(2\*perTile\), 0\.70, 2\.40\)/.test(extractFn('demonFaceHalf')),
  'the chapel face quad uses the content-sized height and keeps the plate aspect');
assert(/function vaultDemonFace\(/.test(html)
  && /p\.wall==='e' \|\| p\.toothKind==='bronze'/.test(extractFn('vaultDemonFace'))
  && /if\(!p \|\| vaultDemonFace\(p\)\) return dwarfFaceH\(\)\*1\.08/.test(extractFn('demonFaceDrawH'))
  && /SPR\.demon_dwarfface_vault/.test(extractFn('demonFaceImg'))
  && /return clamp\(H\*aspect\/\(2\*perTile\), 0\.70, 1\.90\)/.test(extractFn('demonFaceHalf')),
  'the hourglass vault face keeps main\'s height and wide-plate cap');
{
  const vault=fs.readFileSync(path.join(__dirname,'../../assets/props/prop_demon_dwarfface_vault.png'));
  assert(vault.readUInt32BE(16)===457 && vault.readUInt32BE(20)===274,
    'vault plate is main\'s 457×274 sheet');
}
assert(!/TODO\(Disney SIGNED\)/.test(html),
  'Disney SIGNED TODO is gone — signed sheet is the file on disk');
assert(/function demonFaceScreen\(/.test(html) && /function demonFacePlaneY\(/.test(html),
  'socket overlay uses the same wall plane as the carving');
assert(!/for\(const sgn of \[-1,1\]\)/.test(extractFn('drawDemonDwarfFace')),
  'cute procedural horns are gone from the demon face');
assert(!/SPR\.dwarfface/.test(extractFn('demonFaceImg')),
  'demon face does not fall back to friendly dwarfface');
assert(/SPR\.bone_crown\|\|SPR\.bone_crown_signed/.test(html)
  || /function crownSprite\(/.test(html),
  'bone crown hooks the painted sheet when it lands');
assert(/k:'altar'/.test(extractFn('buildTeethCrownRoom')) && /k:'bonecrown'/.test(extractFn('buildTeethCrownRoom')),
  'chapel plants the existing altar and a bone crown');
assert(/k:'demonface'/.test(extractFn('buildTeethCrownRoom')),
  'back wall gets a demonic dwarven face');
assert(/const x0=101, y0=2, rw=12, rh=12/.test(extractFn('buildTeethCrownRoom')),
  'chapel is carved north of the east-hall door');
assert(/wall:'n'/.test(extractFn('buildTeethCrownRoom')),
  'demon face sits on the chapel north wall');
assert(/WALL_TEETH_NORTH_SCALE=2\.25/.test(html) && /function teethNorthWallH\(L\)/.test(html),
  'chapel north wall is raised above hall height');
assert(/SPRITE_FILES\.teeth_floor='assets\/tiles\/teeth_floor\.png'/.test(html),
  'tiny fang field is registered');
assert(/SPRITE_FILES\.teeth_floor_atlas='assets\/tiles\/teeth_floor_atlas_8x8\.png'/.test(html),
  'teeth floor atlas is the live chapel bind');
assert(/const n=8, cw=atlas\.width\/n/.test(extractFn('drawTeethTile')),
  'each chapel tile blits one cell of the 8×8 atlas');
assert(/SPRITE_FILES\.altar_teeth='assets\/props\/prop_altar_teeth\.png'/.test(html),
  'chapel platform sheet is registered');
assert(/SPRITE_FILES\.wall_teeth_chapel='assets\/tiles\/tile_wall_teeth_chapel\.png'/.test(html)
  && /SPRITE_FILES\.wall_teeth_chapel_opaque='assets\/tiles\/tile_wall_teeth_chapel_opaque\.png'/.test(html),
  'chapel north masonry sheets are registered');
['teeth_floor.png','teeth_floor_atlas_8x8.png','tile_wall_teeth_chapel.png','tile_wall_teeth_chapel_opaque.png'].forEach(n=>{
  assert(fs.existsSync(path.join(__dirname,'../../assets/tiles/'+n)), n+' on disk');
});
{
  const atlas=fs.readFileSync(path.join(__dirname,'../../assets/tiles/teeth_floor_atlas_8x8.png'));
  assert(atlas.readUInt32BE(16)===1280 && atlas.readUInt32BE(20)===640,
    'teeth floor atlas is 1280×640, eight by eight cells');
}
{
  const altar=fs.readFileSync(path.join(__dirname,'../../assets/props/prop_altar.png'));
  const teeth=fs.readFileSync(path.join(__dirname,'../../assets/props/prop_altar_teeth.png'));
  assert(altar.readUInt32BE(16)===1075 && altar.readUInt32BE(20)===718,
    'prop_altar.png is the v11 platform');
  assert(teeth.readUInt32BE(16)===1075 && teeth.readUInt32BE(20)===718,
    'chapel slab sheet is the same v11 platform');
  assert(altar.equals(teeth), 'chapel slab and prop_altar.png are the same opaque platform');
}
assert(/SPR\.teeth_floor/.test(extractFn('drawTeethTile')),
  'floor teeth use the signed fang field when it is present');
assert(/const TEETH_CARPET_N=26/.test(html) && /function teethCarpetStamp\(/.test(html),
  'chapel floor builds a dense carpet from the existing fang stamps');
assert(/SPR\.tooth,SPR\.tooth_2,SPR\.tooth_3/.test(extractFn('teethCarpetStamp')),
  'carpet tiles the three existing tooth props, no new painted sheet');
assert(/teethCarpetStamp\(x,y\)\|\|field/.test(extractFn('drawTeethTile')),
  'each unrisen chapel cell blits the dense carpet over the fang field');
assert(/for\(let i=0;i<n;i\+\+\)/.test(extractFn('teethCarpetStamp')),
  'carpet stamps TEETH_CARPET_N fangs onto every variant');
assert(/SPR\.wall_teeth_chapel_opaque/.test(extractFn('teethChapelWallImg'))
  && /chapel\|\|faceL/.test(html),
  'chapel north face prefers the opaque masonry sheet');
assert(/function teethAltarSheetActive\(/.test(html)
  && /SPR\.altar_teeth/.test(html)
  && /function sceneCrownSprite\(/.test(html)
  && /sceneCrownSprite\(/.test(extractFn('drawBoneCrownProp'))
  && /crownSprite\(/.test(extractFn('drawWornBoneCrown'))
  && !/if\(teethAltarSheetActive\(\)\) return/.test(extractFn('drawProp')),
  'v11 platform is the altar; the scene crown draws on the slab; wear uses the full crown');
assert(/function solidTeethAltarImg\(/.test(html)
  && /solidifyPunchedCutout\(img, 8\)/.test(html)
  && /solidTeethAltarImg\(\)\|\|teethAltarSheetImg\(\)/.test(extractFn('drawProp')),
  'teeth altar blits a solidified opaque sheet, not the punched stipple');
assert(/function isTeethNwChapelWall\(/.test(html) && /x<105/.test(extractFn('isTeethNwChapelWall'))
  && /isTeethNwChapelWall\(L,x,y\)\?teethChapelWallImg\(\):null/.test(html),
  'chapel mural stays on the northwest wall, off the demon face');
assert(/function isTeethNorthWall\(L,x,y\)/.test(html) && /y===1 && x>=101 && x<113/.test(html),
  'only the teeth-chapel north row is the tall face wall');
assert(/function cellWallH\(L,x,y\)/.test(html)
  && /if\(isTeethNorthWall\(L,x,y\)\) return teethNorthWallH\(L\)/.test(extractFn('cellWallH'))
  && /const faceH=cellWallH\(L,x,y\)/.test(html),
  'drawWallCell uses cellWallH, and the chapel row stays on teethNorthWallH');
assert(/DEMON_FACE_PLATE=\{w:267,h:434,pad:16\}/.test(html)
  && /DEMON_FACE_CONTENT_SCALE=2\.40/.test(html)
  && /WALL_TEETH_FACE_SCALE=3\.15/.test(html)
  && 3.15 > 2.40 / (399/434),
  'the face wall covers the 267×434 plate, horns included, with margin');
assert(/WALL_TEETH_FACE_SCALE=3\.15/.test(html)
  && /x>=105 && x<=109/.test(extractFn('isTeethFaceWall'))
  && /function wallHeightOverride\(/.test(html)
  && /applyTeethFaceWallHeight\(L\)/.test(extractFn('buildTeethCrownRoom')),
  'tiles behind the demon face override to a taller wall');
assert(/if\(isTeethNorthWall\(L,x,y\)\) tall=teethNorthWallH\(L\)/.test(html)
  && /else if\(isTeethFaceWall\(L,x,y\)\) tall=teethFaceWallH\(L\)/.test(html),
  'fog punch grows with the chapel wall, then the taller face segment');
assert(/SPRITE_FILES\.demon_dwarfface_empty='assets\/props\/prop_demon_dwarfface_empty\.png'/.test(html)
  && /hasElectrumToothInPack\(\)/.test(extractFn('demonFaceShowsEmpty'))
  && /SPR\.demon_dwarfface_empty/.test(extractFn('demonFaceImg'))
  && /emptySheet/.test(extractFn('drawDemonDwarfFace')),
  'empty-socket face follows the electrum tooth and skips the ellipse when that plate is loaded');
{
  const room=extractFn('buildTeethCrownRoom');
  assert(/k:'altar',s:1\.55,teethAltar:1/.test(room), 'teeth altar scale is 1.55 so it fits the northwest wall');
  assert(/const altar=\{x:102\.25,y:4\.35\}/.test(room), 'altar stands on the northwest wall');
  assert(/const face=\{x:107\.25,y:2\.48\}/.test(room), 'demon face stays centered on the north wall');
  assert(/k:'bonecrown',s:1\.70/.test(room), 'bone crown scale is 1.70');
  assert(/x:altar\.x,y:altar\.y,k:'bonecrown'/.test(room),
    'crown shares the altar foot so it can sit on the slab');
  assert(!/y:altar\.y-0\.12,k:'bonecrown'/.test(room),
    'crown is not offset into a ring around the pool');
  assert(/s:0\.22\+h2\(i,11\)\*0\.08/.test(room),
    'tooth props are specks on the painted fang field');
}
assert(/if\(k==='altar'\) return 100\*z\*\(p\.s\|\|1\)/.test(html),
  'altar draw height honors the s factor');
assert(/if\(k==='tooth'\) return 10\*z\*\(p\.s\|\|1\)/.test(html),
  'tooth prop height is the small-fang scale');
assert(/function boneCrownSeatY\(/.test(html) && /seat-H/.test(extractFn('drawBoneCrownProp')),
  'bone crown is drawn up on the altar slab');
assert(/\(8\.2\+h2\(i,x\)\*3\.4\)\*z\*sc/.test(extractFn('drawTeethTile'))
  && /\(risen\?4\.0:6\.4\+h2\(i,x\+y\)\*2\.8\)\*z\*sc/.test(extractFn('drawTeethTile')),
  'floor tile fangs are scaled down to a carpet');
assert(!/x0=116, y0=16/.test(extractFn('buildTeethCrownRoom')),
  'old east-of-door chapel coords are gone');
assert(/sec\.kind==='teeth'/.test(html) && /buildTeethCrownRoom\(L, sec\)/.test(html),
  'openSecret branches to the teeth chapel');
assert(/Take the bone crown/.test(html) && /Animate the dead/.test(html),
  'TAKE and animate-dead prompts exist');
assert(/Attack the bone crown/.test(html), 'ATTACK crown prompt exists');
assert(/crownTouched/.test(html) && /teethRisen/.test(html) && /crownDestroyed/.test(html),
  'Sage one-shot flags are crownTouched / teethRisen / crownDestroyed');
assert(/tryStrikeBoneCrown/.test(extractFn('meleeSwing')),
  'ATTACK can smash the crown');

const fang=html.match(/fangedSkeleton:\{[^}]+\}/)[0];
assert(/hd:2/.test(fang), 'fanged skeleton is 2 HD');
assert(/ac:7/.test(fang), 'fanged skeleton AC 7');
assert(/mv:12/.test(fang) && /at:1/.test(fang), 'fanged skeleton MV 12, AT 1');
assert(/tt:'Nil'/.test(fang), 'fanged skeleton tt is Nil (coins-always still applies)');
assert(/dmg:4\.5/.test(fang) && /dice:'1d6\+1'/.test(fang),
  'fanged skeleton damage is d6+1');
assert(/n:'Fanged Skeleton'/.test(fang), 'Nick name is Fanged Skeleton');
assert(/k:'undead'/.test(fang), 'fanged skeleton is undead');
assert(/awardPartyXp\(monsterXpValue\(e\)/.test(html),
  'kills use monsterXpValue (2 HD table)');

let eid=1;
const ctx={
  G:{equipped:{}, ents:[], props:[], lvl:{n:1,flags:{},w:132,h:90,grid:null}, packs:{macar:{magic:[]}}},
  BONE_CROWN_DESTROY_XP:5000,
  FANGED_SKELETON_HORDE:8,
  TEETH_HORDE_STIR:0.8,
  TEETH_HORDE_MIN_DIST:2.8,
  isWalkTile(t){ return t===0||t===3||t===4; },
  FOE:{fangedSkeleton(){ return {id:eid++, kind:'undead', name:'Fanged Skeleton', team:'foe', x:0,y:0, hp:16, maxhp:16, dead:0, hd:2, ac:7, dmg:4.5, dice:'1d6+1'}; }},
  lines:[],
  hints:[],
  xpAwards:[],
  Math,
  Object,
  dist(a,b){ return Math.hypot((a.x||0)-(b.x||0),(a.y||0)-(b.y||0)); },
  say(t){ ctx.lines.push(t); },
  hint(t){ ctx.hints.push(t); },
  burst(){},
  shake(){},
  ftext(){},
  awardPartyXp(n, why, where){ ctx.xpAwards.push({n, why, where}); return n; },
  stowPackItem(it){ ctx.G.packs.macar.magic.push(it); return it; },
  equipPackItem(it){ ctx.G.equipped.helmet=it; return 'helmet'; },
  h2(){ return 0.4; },
  corridor(){},
  carvePath(){},
  rect(){},
  player(){ return (ctx.G.ents||[]).find(e=>e&&e.hero)||ctx.G.ents[0]; }
};
vm.createContext(ctx);
ctx.beginFight=function(){};
[
  'teethBounds','isTeethFloor','makeBoneCrownItem','wearingBoneCrown','nearestBoneCrown',
  'livingThrall','releaseThrall','isAnimateDeadEligible','corpseIsBones','nearestAnimatableCorpse',
  'collapseCrownThrall','setThrallStay','tryAnimateDead',
  'teethHordeBox','teethHordeWalkable','teethHordeSpots','riseTeethHorde','takeBoneCrown','awardCrownDestroyXp',
  'destroyBoneCrown','tryStrikeBoneCrown','smashWornBoneCrown','doffBoneCrownAtCamp',
  'buildTeethCrownRoom','tryTalporTurnThrall'
].forEach(n=>vm.runInContext(extractFn(n)+';', ctx));

const crownItem=ctx.makeBoneCrownItem();
assert(crownItem.boneCrown===1 && crownItem.slot==='helmet', 'crown item is a worn helm');
assert(ctx.wearingBoneCrown({helmet:crownItem})===true, 'wearingBoneCrown reads the item');
assert(ctx.wearingBoneCrown({helmet:{n:'Iron Helm'}})===false, 'iron helm is not the bone crown');

const altarCrown={x:125,y:21,k:'bonecrown',gone:0};
ctx.G.props=[altarCrown];
ctx.G.ents=[{id:1, hero:1, name:'Macar', team:'party', col:{key:'macar'}, x:124, y:21, hp:80, maxhp:80}];
const take=ctx.takeBoneCrown(altarCrown);
assert(take.ok===1 && take.worn===1, 'TAKE seats the crown');
assert(altarCrown.gone===1 && ctx.G.lvl.flags.crownTaken===1, 'taken crown is spent');
assert(ctx.G.lvl.flags.crownTouched===1, 'TAKE sets crownTouched');
assert(ctx.G.equipped.helmet && ctx.G.equipped.helmet.boneCrown, 'crown is on Macar\'s head');
assert(ctx.G.lvl.flags.teethRisen===1, 'TAKE raises the teeth horde');
assert(ctx.G.ents.filter(e=>e.name==='Fanged Skeleton').length===8,
  'TAKE horde is eight fanged skeletons');
assert(ctx.xpAwards.length===0, 'TAKE does not award the destroy XP');

ctx.G.lvl.flags={};
ctx.G.ents=[{id:1, hero:1, name:'Macar', team:'party', col:{key:'macar'}, x:124, y:21, hp:80, maxhp:80}];
ctx.G.equipped={};
ctx.G.props=[];
ctx.xpAwards=[];
const smash={x:125,y:21,k:'bonecrown',gone:0};
const dest=ctx.destroyBoneCrown(smash);
assert(dest.ok===1 && dest.xp===5000, 'ATTACK/DESTROY awards 5000 XP');
assert(smash.gone===1 && smash.destroyed===1, 'destroyed crown is gone');
assert(ctx.G.lvl.flags.crownDestroyed===1, 'destroy flag is set');
assert(ctx.xpAwards[0] && ctx.xpAwards[0].n===5000, 'awardPartyXp got 5000');
assert(/Bone Crown destroyed/.test(ctx.xpAwards[0].why), 'XP reason names the crown');
assert(ctx.G.equipped.helmet==null, 'destroy does not wear the crown');
assert(ctx.G.ents.filter(e=>e.name==='Fanged Skeleton').length===8,
  'DESTROY still raises the same horde');

/* Altar foot, inside the chapel: the old ring (radius 1.35–2.2) was melee.
   Wall cells on the far edge must be skipped. beginFight may lengthen stun;
   the stir is pinned back to the short beat. */
ctx.G.lvl.flags={};
ctx.G.lvl.teethBounds={x0:101,y0:2,x1:113,y1:14};
{
  const grid=[];
  for(let y=0;y<20;y++){
    const row=[];
    for(let x=0;x<130;x++) row.push((x>=101 && x<113 && y>=2 && y<14)?0:1);
    grid.push(row);
  }
  grid[13][112]=1;
  grid[13][107]=1;
  grid[8][107]=1;
  ctx.G.lvl.grid=grid;
  ctx.G.props=[
    {k:'tooth', x:104, y:6, gone:0},
    {k:'tooth', x:108, y:9, gone:0},
    {k:'altar', x:102.25, y:4.35, gone:0}
  ];
  ctx.G.ents=[{id:1, hero:1, name:'Macar', team:'party', col:{key:'macar'}, x:102.4, y:4.6, hp:80, maxhp:80}];
  ctx.lines=[]; ctx.hints=[];
  ctx.beginFight=function(){
    ctx.G.ents.forEach(e=>{ if(e&&e.name==='Fanged Skeleton') e.stun=3.4; });
  };
  const risen=ctx.riseTeethHorde({x:102.25,y:4.35});
  const mac=ctx.G.ents[0];
  const horde=ctx.G.ents.filter(e=>e.name==='Fanged Skeleton');
  assert(risen===8 && horde.length===8, 'chapel still raises eight fanged skeletons');
  const meleePocket=2.2;
  horde.forEach((e,i)=>{
    const d=Math.hypot(e.x-mac.x, e.y-mac.y);
    assert(d>meleePocket, 'horde '+i+' stands outside the melee pocket ('+d.toFixed(2)+')');
    assert(d+1e-9>=ctx.TEETH_HORDE_MIN_DIST, 'horde '+i+' is at least the stir spacing ('+d.toFixed(2)+')');
    assert(e.stun===ctx.TEETH_HORDE_STIR, 'horde '+i+' stirs for '+e.stun+'s');
    assert(e.stun>=0.6 && e.stun<=1.0, 'horde '+i+' stir stays inside 0.6–1.0s');
    assert(e.aggro===9 && e.engaged===1, 'horde '+i+' is still an engaged threat after the stir');
    assert(e.x>=101 && e.x<113 && e.y>=2 && e.y<14, 'horde '+i+' is clamped inside teeth bounds');
    const ix=e.x|0, iy=e.y|0;
    assert(grid[iy] && grid[iy][ix]===0, 'horde '+i+' stands on a walkable chapel tile');
    assert(ix===101||ix===112||iy===2||iy===13, 'horde '+i+' stands on the room-edge ring');
  });
  let nearest=99;
  for(let i=0;i<horde.length;i++) for(let j=i+1;j<horde.length;j++){
    nearest=Math.min(nearest, Math.hypot(horde[i].x-horde[j].x, horde[i].y-horde[j].y));
  }
  assert(nearest>=1.5, 'room-edge horde does not stack on one tile ('+nearest.toFixed(2)+')');
  assert(ctx.G.props.filter(p=>p.k==='tooth').every(p=>p.gone===1), 'risen horde still clears floor teeth');
  assert(ctx.G.props.find(p=>p.k==='altar').gone!==1, 'the altar is not cleared with the floor teeth');
  assert(ctx.lines.some(t=>t==='The teeth stand up. A horde of fanged skeletons.'), 'horde say stays');
  assert(ctx.hints.some(t=>t==='The floor has risen. They stir. Fight or run.'),
    'hint names the stir and still says fight or run');
  ctx.G.lvl.grid=null;
  ctx.beginFight=function(){};
}

const sk=ctx.FOE.fangedSkeleton();
assert(sk.hd===2 && sk.ac===7 && sk.dmg===4.5 && sk.dice==='1d6+1',
  'spawned skeleton carries Nick stats');

ctx.G.thrallId=null;
ctx.G.equipped={helmet:crownItem};
const beetle={id:39, name:'Cave Beetle', kind:'beetle', team:'foe', dead:1, corpse:1, x:125, y:21, hp:0, maxhp:40};
assert(ctx.isAnimateDeadEligible(beetle)===false, 'beetle corpses are not humanoid bones');
assert(ctx.tryAnimateDead(ctx.G.ents[0], beetle).reason==='ineligible', 'beetle is refused');
const body={id:40, name:'Goblin', kind:'goblin', team:'foe', dead:1, corpse:1, x:125, y:21, hp:0, maxhp:22};
ctx.G.ents=[ctx.G.ents[0], body];
const raised=ctx.tryAnimateDead(ctx.G.ents[0], body);
assert(raised.ok===1 && body.thrall===1 && body.team==='party', 'crown raises one thrall');
assert(raised.form==='zombie', 'flesh corpse rises as a zombie');
assert(ctx.G.thrallId===40 && ctx.livingThrall()===body, 'thrall occupies the one slot');
assert(ctx.setThrallStay(1).stay===true && body.thrallStay===1, 'thrall can stay');
assert(ctx.setThrallStay(0).stay===false && !body.thrallStay, 'thrall can follow again');
const body2={id:41, name:'Orc', kind:'orc', team:'foe', dead:1, corpse:1, x:126, y:21, hp:0, maxhp:42};
ctx.G.ents.push(body2);
const blocked=ctx.tryAnimateDead(ctx.G.ents[0], body2);
assert(blocked.ok===0 && blocked.reason==='slot-full', 'second animate is refused');
body.dead=1; body.hp=0;
ctx.releaseThrall(body);
assert(ctx.livingThrall()===null && ctx.G.thrallId==null, 'thrall death frees the slot');
assert(ctx.tryAnimateDead(ctx.G.ents[0], body).reason==='spent',
  'the same corpse cannot be raised twice');
const again=ctx.tryAnimateDead(ctx.G.ents[0], body2);
assert(again.ok===1 && ctx.G.thrallId===41, 'a new corpse can be raised after the slot frees');
assert(ctx.tryAnimateDead(ctx.G.ents[0], {id:9, hero:1, col:{key:'macar'}, dead:1, corpse:1}).reason==='kin',
  'kin corpses are not animated');

ctx.G.equipped={helmet:crownItem};
ctx.G.thrallId=41;
const pet={id:41, name:'Orc', kind:'orc', team:'party', dead:0, thrall:1, x:126, y:21, hp:42, maxhp:42};
ctx.G.ents=[
  {id:1, hero:1, name:'Macar', team:'party', col:{key:'macar'}, x:124, y:21, hp:80, maxhp:80},
  pet,
  {id:7, col:{key:'talpor'}, name:'TALPOR', team:'party', x:126, y:21, dead:0}
];
const turned=ctx.tryTalporTurnThrall();
assert(turned.ok===1 && ctx.G.thrallId==null && pet.dead===1, 'Talpor can turn Macar\'s own crown pet');

ctx.G.equipped={helmet:crownItem};
ctx.G.lvl.flags={crownXp:1};
ctx.xpAwards=[];
const smashWorn=ctx.smashWornBoneCrown();
assert(smashWorn.ok===1, 'worn crown can be shattered');
assert(ctx.xpAwards.length===0, 'destroy XP awards only once');
assert(ctx.G.equipped.helmet==null, 'smash clears the worn helm');

ctx.G.equipped={helmet:crownItem};
ctx.G.thrallId=null;
const skel={id:50, name:'Fanged Skeleton', kind:'undead', team:'foe', dead:1, corpse:1, x:125, y:21, hp:0, maxhp:16};
ctx.G.ents=[ctx.G.ents[0], skel];
const boneRaise=ctx.tryAnimateDead(ctx.G.ents[0], skel);
assert(boneRaise.ok===1 && boneRaise.form==='skeleton', 'bone corpse rises as a skeleton');
ctx.G.packs={macar:{magic:[]}};
const doff=ctx.doffBoneCrownAtCamp();
assert(doff.ok===1 && ctx.G.equipped.helmet==null, 'camp doffs the crown in one turn');
assert(ctx.G.thrallId==null, 'doff collapses the commanded dead');

/* Layout: north-wall seam + chapel carved north, reachable from the east hall. */
function sliceBetween(a,b){
  const start=html.indexOf(a);
  const end=html.indexOf(b, start+a.length);
  if(start<0||end<0) throw new Error('slice fail '+a);
  return html.slice(start,end);
}
const hashes='function h2(x,y){ let n=(x|0)*374761393+(y|0)*668265263; n=(n^(n>>13))*1274126177; return ((n^(n>>16))>>>0)/4294967295; }\n'
  +'function h3(x,y,s){ let n=(x|0)*374761393+(y|0)*668265263+(s|0)*1442695041; n=(n^(n>>13))*1274126177; return ((n^(n>>16))>>>0)/4294967295; }\n';
const gridSrc=sliceBetween('function newGrid(w,h,f){','function paintSeenWalls(L){')
  + sliceBetween('function corridor(g,x1,y1,x2,y2,wd,t){','/* ==========================================================================');
const layout={
  G:{props:[], ents:[]}, Math, Object,
  lines:[], hints:[],
  say(t){ layout.lines.push(t); },
  hint(t){ layout.hints.push(t); }
};
vm.createContext(layout);
vm.runInContext(hashes+gridSrc, layout);
['secretFaceOk','normalizeSecretFace','sealSecretCells','addSecretDoor','isTeethNorthWall','isTeethFaceWall','buildTeethCrownRoom']
  .forEach(n=>vm.runInContext(extractFn(n)+';', layout));
vm.runInContext('const WALL_TEETH_FACE_SCALE=3.15;\n'+extractFn('applyTeethFaceWallHeight')+';', layout);
layout.G.props=[];
const L=vm.runInContext(`
  var L={n:1,w:132,h:90,flags:{},secrets:[],lights:[],grid:newGrid(132,90,1)};
  corridor(L.grid,88,21,106,21,5,0);
  rect(L.grid,102,15,10,14,0);
  addSecretDoor(L,{x:106.5,y:15.05,i:105,j:15,w:3,h:1,kind:'teeth',face:'n',
    hint:'The north wall of the east corridor is too even — a colder, greyer face. SEARCH it.'});
  L;
`, layout);
assert(L.secrets[0].face==='n' && L.secrets[0].kind==='teeth', 'built secret is a north teeth face');
assert(L.grid[15][105]===1 && L.grid[15][106]===1 && L.grid[15][107]===1,
  'north seam cells are sealed wall');
assert(L.grid[16][106]===0, 'player stand south of the north wall is floor');
assert(L.grid[20][111]===0, 'far-east dead-end stays open floor — not the secret');
assert(!(L.grid[19][111]===1 && L.grid[20][111]===1 && L.grid[21][111]===1),
  'old east-wall three-high seal is gone');
vm.runInContext('rect(L.grid,105,15,3,1,0); rect(L.grid,105,16,3,1,0);',
  Object.assign(layout, {L}));
layout.L=L;
vm.runInContext('buildTeethCrownRoom(L, L.secrets[0]);', layout);
assert(L.teethBounds && L.teethBounds.y0===2 && L.teethBounds.y1===14 && L.teethBounds.x0===101,
  'chapel bounds sit north of the east hall');
assert(L.grid[8][107]===0 && L.grid[4][107]===0 && L.grid[15][106]===0,
  'door row and chapel floor are walkable');
const altar=layout.G.props.find(p=>p&&p.k==='altar');
const face=layout.G.props.find(p=>p&&p.k==='demonface');
const crown=layout.G.props.find(p=>p&&p.k==='bonecrown');
assert(altar && altar.x>=101.5 && altar.x<=104 && altar.y>=3.5 && altar.y<=5.5,
  'altar sits on the northwest wall of the chapel');
assert(face && face.wall==='n' && face.toothKind==='electrum', 'demon face is on the north wall');
assert(L.wallH && L.wallH['107,1']===3.15 && L.wallH['104,1']==null && L.wallH['105,1']===3.15 && L.wallH['109,1']===3.15,
  'the face segment stores a taller per-tile wall height; the mural tile does not');
assert(face && altar && face.x-altar.x>4, 'altar is west of the demon face');
assert(crown && Math.abs(crown.x-altar.x)<0.2 && Math.abs(crown.y-altar.y)<0.2, 'crown sits on the altar');
function canWalk(g,x0,y0,x1,y1){
  const q=[[x0|0,y0|0]], seen={};
  while(q.length){
    const [x,y]=q.pop(), k=x+','+y;
    if(seen[k]) continue; seen[k]=1;
    if(x===(x1|0) && y===(y1|0)) return true;
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{
      const nx=x+dx, ny=y+dy;
      if(g[ny] && g[ny][nx]===0) q.push([nx,ny]);
    });
  }
  return false;
}
assert(canWalk(L.grid,106,16,107,4), 'east-hall floor walks north through the door into the chapel');

const talk=html.match(/const NPC_TALK=\{[\s\S]*?\n\};/)[0];
function npcPack(key){
  const m=talk.match(new RegExp(key+':\\{[\\s\\S]*?\\n  \\},'));
  assert(!!m, key+' is in NPC_TALK');
  return m?m[0]:'';
}
const enterPack=npcPack('teeth_chapel_enter');
const facePack=npcPack('teeth_chapel_face');
const crownPack=npcPack('teeth_chapel_crown');
const ENTER_LINE='The air is musty and stinks like a charnel house. Teeth cover the floor. Ahead stands an altar slick with blood, a bone crown on top. A demon dwarf face stares from the wall. Demon motifs crawl the chamber.';
const FACE_LINE='A demon dwarf face is set into the north wall. Its mouth is packed with electrum teeth—pale gold-silver, cold and bright against the stone.';
const CROWN_LINE='A bone crown rests on the bloody altar. It is yellowed, fitted for a dwarf brow, sticky where the blood has climbed.';
assert(enterPack.indexOf(ENTER_LINE)>=0, 'enter box is Nick\'s chapel line');
assert(facePack.indexOf(FACE_LINE)>=0, 'face examine is Nick\'s north-wall line');
assert(crownPack.indexOf(CROWN_LINE)>=0, 'crown examine is Nick\'s altar line');
assert(!/electrum/i.test(enterPack), 'enter box does not name electrum');
assert(!/\b(north|south|east|west|northwest|northeast|southwest|southeast)\b/i.test(enterPack),
  'enter box does not name a compass direction');
assert(/maybeTeethChapelEnter\(p\)/.test(ch1), 'Ch1 tick fires the enter box');
assert(/maybeTeethChapelLooks\(p\)/.test(html), 'look-at uses the interact prompt');
assert(/teethChapelLookHit\(w\)/.test(html), 'tapping the face or crown looks');
assert(/Look at the demon face/.test(html) && /Look at the bone crown/.test(html),
  'look prompts name the face and the crown');
assert(/Take the bone crown/.test(html) && /Pry the tooth/.test(html),
  'take and pry prompts stay beside the looks');
assert(!/A hidden chapel of teeth/.test(html), 'old northwest chapel say is gone');

const box={
  G:{talk:null, fightOn:0, props:[], lvl:{n:1, flags:{}, teethBounds:{x0:101,y0:2,x1:113,y1:14}}},
  talks:[], PROMPT:null, NPC_TALK:{
    teeth_chapel_enter:{line:ENTER_LINE},
    teeth_chapel_face:{line:FACE_LINE},
    teeth_chapel_crown:{line:CROWN_LINE}
  },
  Math, Object,
  startTalk(key){ box.talks.push(key); box.G.talk={key, line:box.NPC_TALK[key]&&box.NPC_TALK[key].line}; },
  interact(label,fn){ box.PROMPT={label,fn}; },
  dist(a,b){ return Math.hypot((a.x||0)-(b.x||0),(a.y||0)-(b.y||0)); }
};
vm.createContext(box);
[
  'teethBounds','isTeethFloor','maybeTeethChapelEnter','nearestBoneCrown',
  'chapelNorthFace','chapelFaceToothTaken','maybeTeethChapelLooks',
  'teethChapelLookHit','teethChapelLookReach','teethChapelLookStand','openTeethChapelLook'
].forEach(n=>vm.runInContext(extractFn(n)+';', box));
const inside={x:107,y:8,dead:0};
assert(box.maybeTeethChapelEnter(inside)===true, 'stepping onto the chapel floor opens the enter box');
assert(box.talks[0]==='teeth_chapel_enter' && box.G.talk.line===ENTER_LINE, 'enter box key and line');
assert(box.G.lvl.flags.teethChapelEnter===1, 'enter flag is once per chapter');
box.G.talk=null;
assert(box.maybeTeethChapelEnter(inside)===false && box.talks.length===1, 'a second step does not reopen the box');
box.G.lvl.flags.teethChapelEnter=0;
assert(box.maybeTeethChapelEnter({x:106.5,y:16})===false && box.talks.length===1,
  'the east hall outside the chapel does not open the box');
box.G.fightOn=1;
assert(box.maybeTeethChapelEnter(inside)===false && !box.G.lvl.flags.teethChapelEnter,
  'a fight defers the enter box and does not spend the flag');
box.G.fightOn=0;

box.G.props=[{x:102.25,y:4.35,k:'bonecrown',gone:0},{x:107.25,y:2.48,k:'demonface',wall:'n',toothKind:'electrum',gone:0}];
const nearCrown={x:104.4,y:4.35};
assert(box.maybeTeethChapelLooks(nearCrown)===true && box.PROMPT.label==='Look at the bone crown',
  'outside take range the crown look prompt shows');
box.PROMPT.fn();
assert(box.talks[box.talks.length-1]==='teeth_chapel_crown', 'crown look opens teeth_chapel_crown');
box.G.talk=null; box.PROMPT=null;
assert(box.maybeTeethChapelLooks({x:102.6,y:4.35})===false,
  'inside take range the look prompt yields to Take');
box.G.props=[{x:107.25,y:2.48,k:'demonface',wall:'n',toothKind:'electrum',gone:0}];
assert(box.maybeTeethChapelLooks({x:107.25,y:5.0})===true && box.PROMPT.label==='Look at the demon face',
  'outside pry range the north-face look prompt shows');
box.G.talk=null; box.PROMPT=null;
assert(box.maybeTeethChapelLooks({x:107.25,y:3.4})===false,
  'inside pry range the look prompt yields to Pry');
box.G.lvl.flags.electrumTooth=1;
box.G.props[0].emptySocket=1;
assert(box.maybeTeethChapelLooks({x:107.25,y:3.4})===true && box.PROMPT.label==='Look at the demon face',
  'after the tooth is gone the face can still be looked at');
box.PROMPT=null; box.G.talk=null;
box.G.props=[{x:141,y:30,k:'demonface',wall:'e',toothKind:'bronze',gone:0}];
assert(box.maybeTeethChapelLooks({x:139,y:30})===false, 'the bronze east face is not the chapel examine');
box.G.props=[{x:102.25,y:4.35,k:'bonecrown',gone:0}];
const crownTap=box.teethChapelLookHit({x:102.4,y:4.5});
assert(crownTap && crownTap.key==='teeth_chapel_crown', 'a tap on the altar crown looks at the crown');
assert(box.openTeethChapelLook(crownTap.key)===true && box.G.talk.line===CROWN_LINE,
  'opening the crown look shows Nick\'s line');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nch1 teeth crown checks passed');
