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
assert(/ASSET_VER='128'/.test(html) && !/ASSET_VER='115'/.test(html),
  'ASSET_VER is 117 — remat Talpor idle bw=344 (Nick CALL)');
assert(/bone_crown:'assets\/props\/prop_bone_crown\.png'/.test(html),
  'bone_crown is registered to the painted prop');
assert(/SPRITE_FILES\.bone_crown_scene='assets\/props\/prop_bone_crown_scene\.png'/.test(html),
  'scene crown is registered for the altar diorama');
assert(/SPRITE_FILES\.bone_crown_worn='assets\/props\/prop_bone_crown_worn\.png'/.test(html),
  'hollow worn crown is registered for Macar');
assert(/tooth:'assets\/props\/prop_tooth\.png'/.test(html)
  && /tooth_2:'assets\/props\/prop_tooth_2\.png'/.test(html)
  && /tooth_3:'assets\/props\/prop_tooth_3\.png'/.test(html),
  'tooth sprites are registered');
['prop_bone_crown.png','prop_bone_crown_scene.png','prop_bone_crown_worn.png','prop_tooth.png','prop_tooth_2.png','prop_tooth_3.png'].forEach(n=>{
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
  const wornPath=path.join(__dirname,'../../assets/props/prop_bone_crown_worn.png');
  const wbuf=fs.readFileSync(wornPath);
  assert(wbuf.readUInt32BE(16)===512 && wbuf.readUInt32BE(20)===250,
    'worn crown is the compact 512×250 hollow overlay');
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
  assert(w===298 && h===392, 'approved demon face is the 298×392 plate');
}
{
  const emptyPath=path.join(__dirname,'../../assets/props/prop_demon_dwarfface_empty.png');
  assert(fs.existsSync(emptyPath), 'empty-socket demon face is on disk');
  const ebuf=fs.readFileSync(emptyPath);
  assert(ebuf.readUInt32BE(16)===298 && ebuf.readUInt32BE(20)===392,
    'empty socket is the same 298×392 plate');
}
assert(/demonFaceDrawH\(img, p\)/.test(extractFn('demonFaceHalf'))
  && /return clamp\(H\*aspect\/\(2\*perTile\), 0\.70, 2\.80\)/.test(extractFn('demonFaceHalf')),
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
  && /wornCrownSprite\(/.test(extractFn('drawWornBoneCrown'))
  && !/if\(teethAltarSheetActive\(\)\) return/.test(extractFn('drawProp')),
  'v11 platform is the altar; the scene crown draws on the slab; wear uses the hollow crown');
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
assert(/DEMON_FACE_PLATE=\{w:298,h:392,pad:16\}/.test(html)
  && /DEMON_FACE_CONTENT_SCALE=1\.94/.test(html)
  && /WALL_TEETH_FACE_SCALE=2\.25/.test(html)
  && 2.25 > 1.94 / (360/392),
  'the face wall covers the 298×392 plate, horns included, with margin');
assert(/function chapelFaceContentFrac\(/.test(html)
  && /return 360\/DEMON_FACE_PLATE\.h/.test(extractFn('chapelFaceContentFrac'))
  && !/spriteBounds/.test(extractFn('demonFaceDrawH'))
  && /chapelFaceContentFrac\(\)/.test(extractFn('demonFaceDrawH')),
  'chapel face height uses the plate fraction, not a live content box');
assert(/WALL_TEETH_FACE_SCALE=2\.25/.test(html)
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
  assert(/const face=\{x:107\.10,y:2\.48\}/.test(room), 'demon face is centered on the tall north-wall span');
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
assert(/TEETH_ALTAR_SLAB_FX=445\/1075/.test(html) && /TEETH_ALTAR_SLAB_FY=212\/718/.test(html),
  'crown base is the blood-lid center of the altar sheet');
assert(!/TEETH_CROWN_SEAT_TUCK/.test(html) && !/TEETH_CROWN_SEAT_X/.test(html),
  'seat has no zoom tuck and no world-unit x offset');
assert(/function boneCrownAltarSeat\(rect\)/.test(html)
  && /rect\.x\+TEETH_ALTAR_SLAB_FX\*rect\.w/.test(extractFn('boneCrownAltarSeat'))
  && /rect\.y\+TEETH_ALTAR_SLAB_FY\*rect\.h/.test(extractFn('boneCrownAltarSeat')),
  'seat is a fraction of the altar drawn rect');
assert(/const altarRect=\{x:-sheetW\/2, y:-H, w:sheetW, h:H\}/.test(extractFn('drawProp'))
  && /drawBillboard\(g, sheet, altarRect\.h\)[\s\S]*boneCrownAltarSeat\(altarRect\)/.test(extractFn('drawProp'))
  && /drawBoneCrownAt\(g, z, seat\.x, seat\.y, crown\.s\|\|1\)/.test(extractFn('drawProp')),
  'seated crown is painted on the altar sheet rect after that sheet');
assert(/if\(teethCrownStillSeated\(\)\) return;/.test(extractFn('drawProp')),
  'the seated crown is not drawn again as its own prop');
assert(/g\.translate\(seatX, seatY\)/.test(extractFn('drawBoneCrownAt'))
  && /drawBoneCrownShape\(g, z, scale\|\|1\)/.test(extractFn('drawBoneCrownAt')),
  'fallback crown shape uses the same slab seat');
assert(/o\.k==='bonecrown' && teethCrownStillSeated\(\)\) return boneCrownDrawDepth\(o\)/.test(extractFn('actorDrawDepth'))
  && /demonFaceDrawDepth\(face\)\+1/.test(extractFn('boneCrownDrawDepth')),
  'a seated crown prop still sorts after the wall and the face');
assert(/\(8\.2\+h2\(i,x\)\*3\.4\)\*z\*sc/.test(extractFn('drawTeethTile'))
  && /\(risen\?4\.0:6\.4\+h2\(i,x\+y\)\*2\.8\)\*z\*sc/.test(extractFn('drawTeethTile')),
  'floor tile fangs are scaled down to a carpet');
assert(!/x0=116, y0=16/.test(extractFn('buildTeethCrownRoom')),
  'old east-of-door chapel coords are gone');
assert(/sec\.kind==='teeth'/.test(html) && /buildTeethCrownRoom\(L, sec\)/.test(html),
  'openSecret branches to the teeth chapel');
assert(/Take the bone crown/.test(html) && /\{key:'animate', ico:'cross', label:'Animate'\}/.test(html),
  'TAKE prompt and the Animate bar button exist');
assert(!/return 'Animate the dead'/.test(html),
  'the floating Animate the dead prompt is gone');
assert(!/Attack the bone crown/.test(html), 'the Attack the bone crown prompt is gone');
assert(!/crown/i.test(extractFn('meleeSwing')),
  'meleeSwing contains no Crown reference');
assert(!/crownTarget/.test(html), 'the hero state has no crown target');
assert(/crownTouched/.test(html) && /teethRisen/.test(html) && /crownDestroyed/.test(html),
  'Sage one-shot flags are crownTouched / teethRisen / crownDestroyed');

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
  SKELETAL_DWARF_N:4,
  FOE:{
    fangedSkeleton(){ return {id:eid++, kind:'undead', name:'Fanged Skeleton', team:'foe', x:0,y:0, hp:16, maxhp:16, dead:0, hd:2, ac:7, dmg:4.5, dice:'1d6+1'}; },
    skeletalDwarf(){ return {id:eid++, kind:'undead', name:'Skeletal Dwarf', team:'foe', x:0,y:0, hp:16, maxhp:16, dead:0, hd:2, ac:7, dmg:4.5, dice:'1d6+1'}; }
  },
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
vm.runInContext('const TEETH_ALTAR_STEP_FY=475/718;', ctx);
[
  'teethBounds','isTeethFloor','makeBoneCrownItem','wearingBoneCrown','nearestBoneCrown',
  'livingThrall','releaseThrall','isAnimateDeadEligible','corpseIsBones','nearestAnimatableCorpse',
  'collapseCrownThrall','setThrallStay','tryAnimateDead',
  'teethHordeBox','teethHordeWalkable','teethHordeSpots','teethAltarLipHalf','teethAltarStepDepth','teethChapelAltar','teethAltarBlocksTile','skeletalDwarfClearOfWalls','skeletalDwarfOpen','skeletalDwarfSpots','riseTeethHorde','riseSkeletalDwarves','takeBoneCrown','awardCrownDestroyXp',
  'destroyBoneCrown','liveFoeBlocksCrown','playerDestroyBoneCrown','smashWornBoneCrown','doffBoneCrownAtCamp',
  'buildTeethCrownRoom','tryTalporTurnThrall'
].forEach(n=>vm.runInContext(extractFn(n)+';', ctx));

function chapelGrid(){
  const grid=[];
  for(let y=0;y<22;y++){
    const row=[];
    for(let x=0;x<130;x++) row.push((x>=101 && x<113 && y>=2 && y<14)?0:1);
    grid.push(row);
  }
  ctx.G.lvl.grid=grid;
  ctx.G.lvl.teethBounds={x0:101,y0:2,x1:113,y1:14};
  return grid;
}
function tilesFromAnyWall(grid, x, y){
  const ix=x|0, iy=y|0;
  let best=99;
  for(let yy=iy-3; yy<=iy+3; yy++){
    const row=grid[yy];
    if(!row) continue;
    for(let xx=ix-3; xx<=ix+3; xx++){
      if(row[xx]!==1) continue;
      const d=Math.max(Math.abs(ix-xx), Math.abs(iy-yy));
      if(d<best) best=d;
    }
  }
  return best;
}
/* Spots follow Macar. Properties, not a fixed tile list. */
function assertMacarSpots(label, mac){
  const grid=ctx.G.lvl.grid;
  const altar=(ctx.G.props||[]).find(p=>p&&p.teethAltar&&!p.gone);
  const spots=ctx.skeletalDwarfSpots(ctx.G.lvl, mac, 4);
  assert(spots.length===4, label+' places four spots');
  const seen={};
  spots.forEach((s,i)=>{
    const key=(s.x|0)+','+(s.y|0);
    assert(!seen[key], label+' spot '+i+' is a distinct tile');
    seen[key]=1;
    assert(ctx.teethHordeWalkable(ctx.G.lvl, s.x, s.y), label+' spot '+i+' is walkable chapel floor');
    assert(grid[s.y|0] && grid[s.y|0][s.x|0]===0, label+' spot '+i+' is a floor tile');
    assert(s.x>=101 && s.x<113 && s.y>=2 && s.y<14, label+' spot '+i+' is inside the chapel');
    assert(tilesFromAnyWall(grid, s.x, s.y)>=2, label+' spot '+i+' is at least 2 tiles from any wall ('+key+')');
    assert(Math.hypot(s.x-mac.x, s.y-mac.y)+1e-9>=ctx.TEETH_HORDE_MIN_DIST, label+' spot '+i+' stays 2.8 from Macar');
    assert(altar && !ctx.teethAltarBlocksTile(altar, s.x|0, s.y|0), label+' spot '+i+' is clear of the altar');
  });
  return spots;
}

const crownItem=ctx.makeBoneCrownItem();
assert(crownItem.boneCrown===1 && crownItem.slot==='helmet', 'crown item is a worn helm');
assert(ctx.wearingBoneCrown({helmet:crownItem})===true, 'wearingBoneCrown reads the item');
assert(ctx.wearingBoneCrown({helmet:{n:'Iron Helm'}})===false, 'iron helm is not the bone crown');

const altarCrown={x:125,y:21,k:'bonecrown',gone:0};
const teethAltar={k:'altar', teethAltar:1, x:102.25, y:4.35, s:1.55, gone:0};
chapelGrid();
ctx.G.props=[altarCrown, teethAltar];
ctx.G.ents=[{id:1, hero:1, name:'Macar', team:'party', col:{key:'macar'}, x:102.03, y:5.62, hp:80, maxhp:80}];
const take=ctx.takeBoneCrown(altarCrown);
assert(take.ok===1 && take.worn===1, 'TAKE seats the crown');
assert(altarCrown.gone===1 && ctx.G.lvl.flags.crownTaken===1, 'taken crown is spent');
assert(ctx.G.lvl.flags.crownTouched===1, 'TAKE sets crownTouched');
assert(ctx.G.equipped.helmet && ctx.G.equipped.helmet.boneCrown, 'crown is on Macar\'s head');
assert(ctx.G.lvl.flags.skeletalDwarves===1, 'TAKE raises the skeletal dwarves once');
assert(!ctx.G.lvl.flags.teethRisen, 'TAKE does not raise the fanged horde');
assert(ctx.G.ents.filter(e=>e.name==='Skeletal Dwarf').length===4,
  'TAKE raises four skeletal dwarves');
assert(ctx.G.ents.filter(e=>e.name==='Fanged Skeleton').length===0,
  'TAKE does not spawn fanged skeletons');
{
  const mac=ctx.G.ents.find(e=>e.hero);
  const spots=assertMacarSpots('TAKE', mac);
  const dwarves=ctx.G.ents.filter(e=>e.name==='Skeletal Dwarf');
  assert(dwarves.length===4, 'TAKE places four approach spots');
  dwarves.forEach((e,i)=>{
    assert(e.x===spots[i].x && e.y===spots[i].y, 'TAKE dwarf '+i+' stands on its approach spot');
    assert(e.x<=113-4.2 && e.y<=14-4.2, 'TAKE dwarf '+i+' is clear of the south and east caps');
  });
  let nearest=99;
  for(let i=0;i<dwarves.length;i++) for(let j=i+1;j<dwarves.length;j++){
    nearest=Math.min(nearest, Math.hypot(dwarves[i].x-dwarves[j].x, dwarves[i].y-dwarves[j].y));
  }
  assert(nearest>=2.1, 'TAKE dwarves do not overlap ('+nearest.toFixed(2)+')');
}
assert(ctx.takeBoneCrown(altarCrown).ok===0, 'taking again is a no-op');
assert(ctx.G.ents.filter(e=>e.name==='Skeletal Dwarf').length===4,
  'wearing after take does not raise the dwarves twice');
ctx.destroyBoneCrown({worn:1, x:124, y:21});
assert(ctx.G.ents.filter(e=>e.name==='Skeletal Dwarf').length===4,
  'destroy after take does not raise a second pack');
assert(ctx.xpAwards.length===1, 'that destroy still awards XP once');
ctx.xpAwards.length=0;
assert(!/riseTeethHorde\(/.test(extractFn('takeBoneCrown'))
  && !/riseTeethHorde\(/.test(extractFn('destroyBoneCrown')),
  'take and destroy do not call the fanged horde');
assert(/riseSkeletalDwarves\(crown\)/.test(extractFn('takeBoneCrown'))
  && /riseSkeletalDwarves\(where\)/.test(extractFn('destroyBoneCrown')),
  'take and destroy raise skeletal dwarves');
assert(ctx.xpAwards.length===0, 'TAKE does not award the destroy XP');

ctx.G.lvl.flags={};
chapelGrid();
ctx.G.ents=[{id:1, hero:1, name:'Macar', team:'party', col:{key:'macar'}, x:105.1, y:5.7, hp:80, maxhp:80}];
ctx.G.equipped={};
ctx.G.props=[teethAltar];
ctx.xpAwards=[];
const smash={x:125,y:21,k:'bonecrown',gone:0};
const dest=ctx.destroyBoneCrown(smash);
assert(dest.ok===1 && dest.xp===5000, 'ATTACK/DESTROY awards 5000 XP');
assert(smash.gone===1 && smash.destroyed===1, 'destroyed crown is gone');
assert(ctx.G.lvl.flags.crownDestroyed===1, 'destroy flag is set');
assert(ctx.xpAwards[0] && ctx.xpAwards[0].n===5000, 'awardPartyXp got 5000');
assert(/Bone Crown destroyed/.test(ctx.xpAwards[0].why), 'XP reason names the crown');
assert(ctx.G.equipped.helmet==null, 'destroy does not wear the crown');
assert(ctx.G.ents.filter(e=>e.name==='Skeletal Dwarf').length===4,
  'DESTROY raises four skeletal dwarves');
assert(ctx.G.ents.filter(e=>e.name==='Fanged Skeleton').length===0,
  'DESTROY does not spawn fanged skeletons');
{
  const mac=ctx.G.ents.find(e=>e.hero);
  const spots=assertMacarSpots('DESTROY', mac);
  const dwarves=ctx.G.ents.filter(e=>e.name==='Skeletal Dwarf');
  assert(dwarves.length===4, 'DESTROY places four approach spots');
  dwarves.forEach((e,i)=>{
    assert(e.x===spots[i].x && e.y===spots[i].y, 'DESTROY dwarf '+i+' stands on its approach spot');
    assert(ctx.skeletalDwarfOpen(ctx.G.lvl, e.x, e.y), 'DESTROY dwarf '+i+' is open floor inside the cap');
  });
}
[[102,3],[103,3],[102,4],[103,4],[102,5],[104,5],[103,6]].forEach(([x,y])=>{
  assert(ctx.teethAltarBlocksTile(teethAltar, x, y), 'altar footprint covers ('+x+','+y+')');
  assert(!ctx.skeletalDwarfOpen(ctx.G.lvl, x+0.5, y+0.5), 'open rejects the altar tile ('+x+','+y+')');
});
{
  const realSpots=ctx.skeletalDwarfSpots;
  ctx.skeletalDwarfSpots=function(){ return []; };
  ctx.G.lvl.flags={};
  ctx.G.ents=[{id:1, hero:1, name:'Macar', team:'party', x:105.1, y:5.7, hp:80, maxhp:80}];
  assert(ctx.riseSkeletalDwarves({x:105.1,y:5.7})===0 && !ctx.G.lvl.flags.skeletalDwarves,
    'the raise flag stays clear when no dwarf spawns');
  ctx.skeletalDwarfSpots=realSpots;
}
{
  let swept=0;
  const grid=ctx.G.lvl.grid;
  for(let iy=2.4; iy<=11.6; iy+=0.9){
    for(let ix=101.4; ix<=110.6; ix+=0.9){
      if(!grid[iy|0] || grid[iy|0][ix|0]!==0) continue;
      swept++;
      assertMacarSpots('sweep '+ix.toFixed(1)+','+iy.toFixed(1), {x:ix,y:iy});
    }
  }
  assert(swept>=40, 'the chapel sweep covers many Macar positions ('+swept+')');
}
assert(/skeletalDwarfSpots\(L, origin, n\)/.test(extractFn('riseSkeletalDwarves'))
  && !/teethHordeSpots\(/.test(extractFn('riseSkeletalDwarves')),
  'skeletal dwarves use the approach spots, not the room-edge horde ring');

/* Player at the altar. teethHordeSpots still picks the east lip. The dwarves
   stand at least two tiles in from that wall, and the floor-teeth flag stays unset. */
ctx.G.lvl.flags={};
ctx.G.lvl.teethBounds={x0:101,y0:2,x1:113,y1:14};
{
  const grid=[];
  for(let y=0;y<20;y++){
    const row=[];
    for(let x=0;x<130;x++) row.push((x>=101 && x<113 && y>=2 && y<14)?0:1);
    grid.push(row);
  }
  for(let x=105;x<=108;x++) grid[14][x]=0;
  ctx.G.lvl.grid=grid;
  ctx.G.props=[
    {k:'altar', teethAltar:1, x:102.25, y:4.35, s:1.55, gone:0},
    {k:'tooth', x:106, y:7, gone:0},
    {k:'bonecrown', x:102.25, y:4.35, gone:0}
  ];
  ctx.G.ents=[{id:1, hero:1, name:'Macar', team:'party', col:{key:'macar'}, x:102.25, y:4.35, hp:80, maxhp:80}];
  const mac=ctx.G.ents[0];
  const lip=ctx.teethHordeSpots(ctx.G.lvl, mac, 4);
  const lipWant=[[112.5,13.5],[112.5,11.5],[110.5,13.5],[112.5,9.5]];
  assert(lip.length===4 && lip.every((s,i)=>s.x===lipWant[i][0] && s.y===lipWant[i][1]),
    'the horde ring is still the east-wall lip');
  const n=ctx.riseSkeletalDwarves({x:102.25,y:4.35});
  const dwarves=ctx.G.ents.filter(e=>e.name==='Skeletal Dwarf');
  assert(n===4 && dwarves.length===4, 'altar take raises four dwarves off the lip');
  assert(!ctx.G.lvl.flags.teethRisen, 'the floor-teeth flag stays unset');
  assert(ctx.G.props.find(p=>p.k==='tooth').gone!==1, 'floor teeth stay on the chapel floor');
  dwarves.forEach((e,i)=>{
    const ix=e.x|0, iy=e.y|0;
    assert(grid[iy][ix]===0, 'approach dwarf '+i+' stands on floor');
    assert(ctx.teethHordeWalkable(ctx.G.lvl, e.x, e.y), 'approach dwarf '+i+' is walkable');
    assert(ix<=110, 'approach dwarf '+i+' is at least two tiles in from the east wall ('+ix+')');
    assert(tilesFromAnyWall(grid, e.x, e.y)>=2, 'approach dwarf '+i+' is at least 2 tiles from any wall');
    assert(!ctx.teethAltarBlocksTile(ctx.G.props[0], ix, iy), 'approach dwarf '+i+' is clear of the altar');
    assert(Math.hypot(e.x-mac.x, e.y-mac.y)+1e-9>=ctx.TEETH_HORDE_MIN_DIST, 'approach dwarf '+i+' stays 2.8 from Macar');
    assert(e.x<=113-4.2 && e.y<=14-4.2, 'approach dwarf '+i+' is inside the wall-face span');
    assert(!lipWant.some(o=>o[0]===e.x && o[1]===e.y), 'approach dwarf '+i+' is not on the east lip');
  });
  let nearest=99;
  for(let i=0;i<dwarves.length;i++) for(let j=i+1;j<dwarves.length;j++){
    nearest=Math.min(nearest, Math.hypot(dwarves[i].x-dwarves[j].x, dwarves[i].y-dwarves[j].y));
  }
  assert(nearest>=2.1, 'approach dwarves do not overlap ('+nearest.toFixed(2)+')');
  ctx.G.lvl.grid=null;
  ctx.G.lvl.flags={};
  ctx.G.props=[];
  ctx.G.ents=[{id:1, hero:1, name:'Macar', team:'party', col:{key:'macar'}, x:124, y:21, hp:80, maxhp:80}];
}

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
assert(ctx.livingThrall()===skel && skel.team==='party' && skel.hp===16,
  'camp removal leaves the thrall in the party');

/* Each way the crown leaves is its own raise. The thrall stays. */
require('../packs/EquipmentSlots.js');
function crownExit(label, run){
  const w={
    G:{
      equipped:{}, ents:[], props:[],
      lvl:{n:1, flags:{}, w:20, h:20},
      packs:{macar:{magic:[]}},
      thrallId:null, animateDeadSpent:0, campDoff:0, sleepShow:null, gear:{}
    },
    EquipmentSlots: global.EquipmentSlots,
    BONE_CROWN_DESTROY_XP: 5000,
    Math, Object,
    lines:[],
    say(t){ w.lines.push(t); },
    hint(){}, burst(){}, shake(){}, ftext(){},
    awardPartyXp(){ return 0; },
    stowPackItem(it){ w.G.packs.macar.magic.push(it); return it; },
    player(){ return (w.G.ents||[]).find(e=>e&&e.hero)||null; },
    crownDropAtAltar(){ return false; },
    refreshAnimateButton(){},
    riseSkeletalDwarves(){},
    ensureEquippedShape(){ w.G.equipped=w.G.equipped||{}; return w.G.equipped; },
    ensureMacarHammer(){},
    applyEquipped(){},
    convertCoinsToElectrum(){},
    dist(a,b){ return Math.hypot((a.x||0)-(b.x||0),(a.y||0)-(b.y||0)); }
  };
  vm.createContext(w);
  [
    'makeBoneCrownItem','wearingBoneCrown','livingThrall','isAnimateDeadEligible','corpseIsBones',
    'tryAnimateDead','awardCrownDestroyXp','dropBoneCrown','destroyBoneCrown','doffBoneCrownAtCamp','unequipPackSlot'
  ].forEach(n=>vm.runInContext(extractFn(n)+';', w));
  const crown=w.makeBoneCrownItem();
  w.G.equipped={helmet:crown};
  const mac={id:1, hero:1, name:'Macar', team:'party', col:{key:'macar'}, x:10, y:10, hp:80, maxhp:80};
  const body={id:77, name:'Goblin', kind:'goblin', team:'foe', dead:1, corpse:1, x:11, y:10, hp:0, maxhp:16};
  w.G.ents=[mac, body];
  const raised=w.tryAnimateDead(mac, body);
  assert(raised.ok===1 && w.livingThrall()===body, label+' raises a thrall');
  const hp=body.hp;
  const left=run(w, crown, body);
  assert(left && !w.wearingBoneCrown(), label+' takes the crown off');
  assert(w.livingThrall()===body && body.team==='party' && body.thrall===1 && !body.dead && body.hp===hp,
    label+' leaves the thrall in the party at '+hp+' hp');
}
crownExit('inventory Drop', w=>w.dropBoneCrown().ok===1);
crownExit('unequip', w=>!!w.unequipPackSlot('helmet', {camp:1}));
crownExit('destroy', w=>w.destroyBoneCrown({worn:1, x:10, y:10}).ok===1);
crownExit('camp removal', w=>w.doffBoneCrownAtCamp().ok===1);

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
vm.runInContext('const WALL_TEETH_FACE_SCALE=2.25;\n'+extractFn('applyTeethFaceWallHeight')+';', layout);
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
assert(L.wallH && L.wallH['107,1']===2.25 && L.wallH['104,1']==null && L.wallH['105,1']===2.25 && L.wallH['109,1']===2.25,
  'the face segment stores a taller per-tile wall height; the mural tile does not');
assert(face && altar && face.x-altar.x>4, 'altar is west of the demon face');
assert(face && face.x>105.4 && face.x<108.2, 'face anchor is centered on the tall north-wall span');
assert(/o\.k==='demonface' && o\.wall!=='e'\) return demonFaceDrawDepth\(o\)/.test(extractFn('actorDrawDepth')),
  'chapel face sorts after the east wall that covers its right horn');
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
assert(/maybeCrownAltarHint\(p\)/.test(ch1), 'Ch1 tick fires the altar hint when the crown comes into view');
assert(!/A bone crown on the altar/.test(extractFn('buildTeethCrownRoom')),
  'opening the secret does not burn the crown hint while Macar is still in the hall');
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

{
  const hintCtx={
    G:{talk:null, props:[
      {x:102.25,y:4.35,k:'altar',teethAltar:1,gone:0},
      {x:102.25,y:4.35,k:'bonecrown',gone:0}
    ], lvl:{n:1, flags:{}}},
    hints:[],
    dist(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); },
    tileVisible(){ return false; },
    hint(t){ hintCtx.hints.push(t); }
  };
  vm.createContext(hintCtx);
  vm.runInContext(extractFn('maybeCrownAltarHint')+'\nthis.maybeCrownAltarHint=maybeCrownAltarHint;', hintCtx);
  const far={x:106,y:10,dead:0};
  assert(hintCtx.maybeCrownAltarHint(far)===false && hintCtx.hints.length===0,
    'an unseen altar out of reach does not toast the crown hint');
  hintCtx.tileVisible=function(){ return true; };
  assert(hintCtx.maybeCrownAltarHint(far)===true
    && hintCtx.hints[0]==='A bone crown on the altar. Destroy the crown, or take it.',
    'seeing the altar toasts Destroy the crown, or take it');
  assert(hintCtx.maybeCrownAltarHint(far)===false && hintCtx.hints.length===1,
    'the altar hint fires once');
  hintCtx.G.lvl.flags.crownAltarHint=0;
  hintCtx.G.talk={key:'teeth_chapel_enter'};
  assert(hintCtx.maybeCrownAltarHint(far)===false && hintCtx.hints.length===1,
    'the chapel-enter dialogue holds the altar hint until it closes');
}

{
  /* Face height / face-wall height at the tile heights resize() produces:
     1280×720 → TH 58, 1024×570 → 46, ~740 wide → 40, phone 844×390 → 34.
     The ratio must match with no image decoded, so a late plate cannot
     collapse the chapel carving to the dwarf-face mask. */
  const faceCtx={
    G:{lvl:{n:1}},
    TH:58,
    TILESET:{srcH:96},
    DEMON_FACE_PLATE:{w:298,h:392,pad:16},
    DEMON_FACE_CONTENT_SCALE:1.94,
    WALL_TEETH_FACE_SCALE:2.25,
    tilesetPack(){ return {wall:{oy:287}}; }
  };
  vm.createContext(faceCtx);
  ['wallFaceH','dwarfFaceH','vaultDemonFace','chapelFaceContentFrac','demonFaceDrawH','teethFaceWallH']
    .forEach(n=>vm.runInContext(extractFn(n)+'\nthis.'+n+'='+n+';', faceCtx));
  const chapel={wall:'n', toothKind:'electrum'};
  const vault={wall:'e', toothKind:'bronze'};
  const ratios=[];
  [58,46,40,34].forEach(th=>{
    faceCtx.TH=th;
    const faceH=faceCtx.demonFaceDrawH(null, chapel);
    const wallH=faceCtx.teethFaceWallH(faceCtx.G.lvl);
    const ratio=faceH/wallH;
    ratios.push(ratio);
    assert(faceH>wallH*0.70, 'TH '+th+' chapel face is full on its wall ('+faceH.toFixed(1)+'/'+wallH.toFixed(1)+')');
    assert(Math.abs(faceH - faceCtx.dwarfFaceH()*1.08)>1, 'TH '+th+' chapel face is not the dwarf-face mask');
  });
  ratios.forEach(r=>{
    assert(Math.abs(r-ratios[0])<1e-9, 'face-to-wall ratio holds across zooms ('+r+' vs '+ratios[0]+')');
  });
  faceCtx.TH=46;
  const vaultH=faceCtx.demonFaceDrawH({width:457,height:274}, vault);
  assert(Math.abs(vaultH - faceCtx.dwarfFaceH()*1.08)<1e-6,
    'vault face stays on dwarfFaceH()*1.08');
  assert(vaultH/faceCtx.teethFaceWallH(faceCtx.G.lvl)<0.40,
    'vault height is the small plate, not the chapel portrait scale');
}

/* Drop at the altar seats the crown again before any reload.
   Take hides the billboard while it is held. */
{
  [
    'wearingBoneCrown','teethAltarLipHalf','teethAltarFootTiles','crownAltarTileDist','crownDropAtAltar',
    'dropBoneCrown','teethCrownStillSeated','crownSprite','sceneCrownSprite',
    'teethAltarSheetImg','teethAltarSheetH','teethAltarBillboardRect','boneCrownAltarSeat',
    'boneCrownHeadH','boneCrownFloorSeatY','boneCrownSeatY','boneCrownSeatX',
    'drawBoneCrownAt','boneCrownDroppedOnFloor','drawBoneCrownProp'
  ].forEach(n=>vm.runInContext(extractFn(n)+';', ctx));
  const seatConsts=html.match(/const TEETH_CROWN_ON_ALTAR=[\s\S]*?const TEETH_ALTAR_SLAB_FY=212\/718;/)[0];
  vm.runInContext(seatConsts, ctx);
  ctx.SPR={bone_crown_scene:{width:109,height:66}};
  const altar={x:102.25,y:4.35,k:'altar',teethAltar:1,s:1.55,gone:0};
  const crown={x:altar.x,y:altar.y,k:'bonecrown',s:1.70,gone:0,taken:0};
  ctx.G.lvl.flags={};
  ctx.G.lvl.grid=null;
  ctx.G.props=[altar, crown];
  ctx.G.packs={macar:{magic:[]}};
  ctx.G.equipped={};
  ctx.G.ents=[{id:1, hero:1, name:'Macar', team:'party', col:{key:'macar'}, x:altar.x, y:altar.y+0.8, hp:80, maxhp:80, range:1.4}];
  ctx.ang=function(x,y){ return Math.atan2(y,x); };
  ctx.TAU=Math.PI*2;
  ctx.addAttack=function(){ return 8; };
  ctx.onHitFx=function(a,o,d){ return d; };
  ctx.wear=function(){};
  ctx.damage=function(o, amt){
    if(!o||o.dead) return;
    o.hp=(o.hp==null?1:o.hp)-(amt||0);
    if(o.hp<=0){ o.hp=0; o.dead=1; }
  };
  vm.runInContext(extractFn('meleeSwing')+';', ctx);
  vm.runInContext(extractFn('teethCrownChoices')+';', ctx);
  function swing(e, reach){
    const who=e||ctx.player();
    const before=ctx.xpAwards.length;
    ctx.meleeSwing(who, 2.3, reach==null?1.6:reach, 8);
    return ctx.xpAwards.length-before;
  }
  ctx.lines=[]; ctx.hints=[];
  const z=1;
  function paint(){
    const calls=[];
    const g={drawImage(img,x,y,w,h){ calls.push({img,x,y,w,h}); }};
    ctx.drawBoneCrownProp(g, crown, z);
    return calls;
  }
  const took=ctx.takeBoneCrown(crown);
  assert(took.ok===1 && ctx.wearingBoneCrown() && !ctx.teethCrownStillSeated(),
    'take holds the crown and the seated billboard stops');
  assert(paint().length===0, 'while held, the seated crown is not drawn');
  const dropped=ctx.dropBoneCrown();
  assert(dropped.ok===1 && !ctx.wearingBoneCrown(), 'drop at the altar clears the helm');
  assert(ctx.G.lvl.flags.crownTouched===0 && ctx.G.lvl.flags.crownTaken===0,
    'drop at the altar returns the crown to the seated flags');
  assert(ctx.G.lvl.flags.crownDropped===0,
    'drop at the altar clears the dropped flag so melee does not shatter the seated crown');
  swing(ctx.player(), 1.2);
  assert(!crown.destroyed && !crown.gone,
    'a swing beside the altar does not destroy the crown just seated there');
  assert(crown.gone===0 && crown.x===altar.x && crown.y===altar.y,
    'drop at the altar puts the crown prop back on the altar foot');
  assert(ctx.teethCrownStillSeated(), 'the crown is seated again before any reload');
  const drawn=paint();
  const seat=ctx.boneCrownSeatY(z), head=ctx.boneCrownHeadH(z);
  const seatX=ctx.boneCrownSeatX(z);
  assert(drawn.length===1 && drawn[0].img===ctx.sceneCrownSprite()
    && drawn[0].y===seat-head
    && drawn[0].x===-drawn[0].w/2+seatX,
    'the seated crown is drawn on the slab before any reload');
  const sheet={width:1075,height:718};
  const zoomFrac=[];
  [0.78, 1.38].forEach(zz=>{
    const rect=ctx.teethAltarBillboardRect(altar, zz, sheet);
    const at=ctx.boneCrownAltarSeat(rect);
    const fx=(at.x-rect.x)/rect.w, fy=(at.y-rect.y)/rect.h;
    zoomFrac.push({fx, fy});
    assert(Math.abs(fx-445/1075)<1e-12 && Math.abs(fy-212/718)<1e-12,
      'zoom '+zz+' seat is the lid-center fraction of the altar rect');
    const calls=[];
    ctx.drawBoneCrownProp({drawImage(img,x,y,w,h){ calls.push({x,y,w,h}); }}, crown, zz);
    assert(calls.length===1, 'zoom '+zz+' draws one seated crown');
    const baseX=calls[0].x+calls[0].w/2, baseY=calls[0].y+calls[0].h;
    assert(Math.abs((baseX-rect.x)/rect.w - 445/1075)<1e-9
      && Math.abs((baseY-rect.y)/rect.h - 212/718)<1e-9,
      'zoom '+zz+' crown base sits on that same fraction of the drawn rect');
  });
  assert(Math.abs(zoomFrac[0].fx-zoomFrac[1].fx)<1e-12
    && Math.abs(zoomFrac[0].fy-zoomFrac[1].fy)<1e-12,
    'the seat fraction is the same at two zooms');
  const again=ctx.takeBoneCrown(crown);
  assert(again.ok===1 && ctx.wearingBoneCrown() && crown.gone===1,
    'take again works after the crown is back on the slab');
  assert(!ctx.teethCrownStillSeated() && paint().length===0,
    'while held again, the seated crown stops drawing');

  /* More than 4 tiles from the altar: the crown stays touched, so the slab
     path hides, and the floor billboard is the one draw. */
  ctx.G.ents[0].x=altar.x+6;
  ctx.G.ents[0].y=altar.y+1;
  assert(ctx.dist(ctx.player(), altar)>4, 'the far drop stands more than 4 tiles from the altar');
  const far=ctx.dropBoneCrown();
  assert(far.ok===1 && ctx.G.lvl.flags.crownDropped===1 && ctx.G.lvl.flags.crownTouched===1
    && ctx.G.lvl.flags.crownTaken===0,
    'a far drop leaves the crown touched and marks it dropped');
  assert(crown.gone===0 && crown.x===ctx.player().x && crown.y===ctx.player().y+0.55,
    'a far drop puts the crown on the floor at the player');
  const floorDrawn=paint();
  const floorSeat=ctx.boneCrownFloorSeatY(z), floorHead=ctx.boneCrownHeadH(z);
  assert(floorDrawn.length===1 && floorDrawn[0].img===ctx.sceneCrownSprite()
    && floorDrawn[0].y===floorSeat-floorHead
    && floorDrawn[0].y!==ctx.boneCrownSeatY(z)-floorHead,
    'exactly one crown sprite is drawn at the floor seat, not on the slab');
  const gsSrc=fs.readFileSync(path.join(__dirname,'../saves/GameSave.js'),'utf8');
  ctx.globalThis=ctx;
  vm.runInContext(gsSrc, ctx);
  const world=ctx.GameSave.captureWorld(ctx.G);
  const savedCrown=(world.props||[]).find(p=>p&&p.k==='bonecrown');
  assert(savedCrown && savedCrown.x===crown.x && savedCrown.y===crown.y && !savedCrown.gone
    && world.flags.crownDropped===1 && world.flags.crownTouched===1,
    'the save records the dropped crown where it lies');
  crown.x=0; crown.y=0; crown.gone=1;
  ctx.G.lvl.flags={};
  ctx.G.props=[];
  ctx.G.lvl.flags=Object.assign({}, world.flags);
  ctx.GameSave.applyWorld(ctx.G, world);
  const loaded=ctx.G.props.find(p=>p&&p.k==='bonecrown');
  assert(loaded && loaded.x===savedCrown.x && loaded.y===savedCrown.y && !loaded.gone,
    'load puts the crown back on that floor tile');
  const loadedCalls=[];
  ctx.drawBoneCrownProp({drawImage(img,x,y,w,h){ loadedCalls.push({img,x,y,w,h}); }}, loaded, z);
  assert(ctx.boneCrownDroppedOnFloor(loaded) && loadedCalls.length===1
    && loadedCalls[0].img===ctx.sceneCrownSprite()
    && loadedCalls[0].y===floorSeat-floorHead,
    'after save and load the crown is still drawn at the drop');

  /* Three camera-south steps are (+3,+3). Euclidean length is ~4.2, which
     the old dist()<=3 test treated as a far drop and left invisible. */
  function stand(n){
    ctx.G.ents[0].x=altar.x+n;
    ctx.G.ents[0].y=altar.y+n;
    ctx.G.ents[0].fdx=-1; ctx.G.ents[0].fdy=-1;
    ctx.G.ents[0].crownDropGuard=0;
    ctx.G.ents[0].atk=0; ctx.G.ents[0]._attack=null;
    ctx.G.equipped.helmet={id:'bone_crown', n:'Bone Crown', boneCrown:1};
    ctx.G.lvl.flags={crownTaken:1, crownTouched:1, crownDropped:0, crownDestroyed:0};
    crown.gone=1; crown.taken=1; crown.destroyed=0; crown.x=altar.x; crown.y=altar.y;
    ctx.G.props=[altar, crown];
    ctx.G.fightOn=0;
  }
  [1,2,3].forEach(n=>{
    stand(n);
    assert(ctx.dist(ctx.player(), altar)>3 || n<3, 'tile '+n+' setup');
    if(n===3) assert(ctx.dist(ctx.player(), altar)>3,
      'three tiles toward the camera is farther than Euclidean 3');
    assert(ctx.crownAltarTileDist(ctx.player(), altar)===n,
      'stand '+n+' is '+n+' king-move tiles from the altar footprint');
    const d=ctx.dropBoneCrown();
    assert(d.ok===1 && ctx.crownDropAtAltar(ctx.player(), altar),
      'drop at '+n+' tiles seats on the slab');
    assert(ctx.G.lvl.flags.crownTouched===0 && ctx.G.lvl.flags.crownDropped===0,
      'drop at '+n+' tiles clears touched and dropped');
    assert(ctx.teethCrownStillSeated() && paint().length===1 && paint()[0].y===seat-head,
      'drop at '+n+' tiles draws the crown on the slab');
    swing(ctx.player(), 1.2);
    assert(!crown.destroyed && !ctx.G.lvl.flags.crownXp,
      'a swing after a '+n+'-tile drop does not shatter the seated crown');
  });
  stand(4);
  assert(ctx.crownAltarTileDist(ctx.player(), altar)===4, 'four tiles is outside the seat');
  const four=ctx.dropBoneCrown();
  assert(four.ok===1 && ctx.G.lvl.flags.crownDropped===1 && ctx.G.lvl.flags.crownTouched===1,
    'a drop at 4 tiles stays on the floor');
  assert(paint().length===1 && paint()[0].y===floorSeat-floorHead,
    'a drop at 4 tiles draws the crown at the floor seat');

  /* Beside the lip: four cells from the prop tile, two from the footprint. */
  ctx.G.ents[0].x=106.2; ctx.G.ents[0].y=4.2;
  assert(Math.max(Math.abs(Math.floor(ctx.player().x)-Math.floor(altar.x)),
    Math.abs(Math.floor(ctx.player().y)-Math.floor(altar.y)))>=4,
    'the side stand is four tiles from the prop cell');
  assert(ctx.crownAltarTileDist(ctx.player(), altar)<=3,
    'the side stand is within 3 tiles of the front lip');
  stand(0);
  ctx.G.ents[0].x=106.2; ctx.G.ents[0].y=4.2;
  assert(ctx.dropBoneCrown().ok===1 && ctx.teethCrownStillSeated() && paint().length===1,
    'a drop beside the altar footprint seats and draws');

  /* Combat uses dropBoneCrown. The swing already in the air must not erase it. */
  stand(2);
  ctx.G.fightOn=1;
  ctx.G.ents.push({id:9, team:'foe', name:'Skeletal Dwarf', dead:0, hp:12, x:altar.x+1, y:altar.y+1});
  const foe=ctx.G.ents[ctx.G.ents.length-1];
  ctx.G.ents[0].fdx=foe.x-ctx.player().x; ctx.G.ents[0].fdy=foe.y-ctx.player().y;
  ctx.G.ents[0]._attack={fdx:ctx.G.ents[0].fdx, fdy:ctx.G.ents[0].fdy};
  assert(!/G\.fightOn/.test(extractFn('dropBoneCrown')),
    'a drop during combat takes the same dropBoneCrown path');
  const combatNear=ctx.dropBoneCrown();
  assert(combatNear.ok===1 && ctx.teethCrownStillSeated(),
    'a drop at 2 tiles during combat seats the crown');
  swing(ctx.player(), ctx.player().range||1.4);
  assert(!crown.destroyed && paint().length===1 && paint()[0].y===seat-head,
    'combat melee after a near drop still draws the crown on the slab');

  stand(6);
  ctx.G.fightOn=1;
  assert(ctx.crownAltarTileDist(ctx.player(), altar)>3, 'the open-floor drop is farther than 3 tiles');
  const combatFar=ctx.dropBoneCrown();
  assert(combatFar.ok===1 && ctx.G.lvl.flags.crownDropped===1 && !ctx.wearingBoneCrown(),
    'a far drop during combat puts the crown on the floor');
  ctx.G.ents[0].fdx=-1; ctx.G.ents[0].fdy=-1;
  ctx.G.ents[0]._attack={fdx:-1, fdy:-1};
  swing(ctx.player(), 1.6);
  assert(!crown.gone && !crown.destroyed && !ctx.G.lvl.flags.crownXp,
    'the swing already in the air does not destroy the crown just dropped');
  assert(paint().length===1 && paint()[0].y===floorSeat-floorHead,
    'after that swing the far crown is still drawn at the floor seat');
  assert(!/crown/i.test(extractFn('meleeSwing')),
    'meleeSwing contains no Crown reference');

  /* A swing never touches the crown, whatever direction the foe stands. */
  const hero=ctx.player();
  hero.x=110.5; hero.y=2.5; hero.range=1.4;
  crown.x=110.5; crown.y=3.05; crown.gone=0; crown.destroyed=0; crown.taken=0;
  ctx.G.lvl.flags.crownDropped=1; ctx.G.lvl.flags.crownDestroyed=0; ctx.G.lvl.flags.crownXp=0;
  ctx.G.equipped.helmet=null;
  [[0,1,'S'],[0,-1,'N'],[1,0,'E'],[-1,0,'W']].forEach(([dx,dy,name])=>{
    const foe={id:90, team:'foe', name:'Skeletal Dwarf', dead:0, hp:12, r:0.35, x:hero.x+dx, y:hero.y+dy};
    ctx.G.ents.push(foe);
    hero.aim=foe; hero.fdx=dx||0; hero.fdy=dy||0; hero._attack={fdx:hero.fdx, fdy:hero.fdy}; hero.atk=0;
    const gained=swing(hero, 1.6);
    assert(!crown.destroyed && !crown.gone && gained===0 && !ctx.G.lvl.flags.crownXp,
      'a swing at a foe to the '+name+' leaves the crown and awards no crown XP');
    hero.aim=null;
    assert(swing(hero, 1.6)===0 && !crown.destroyed,
      'a swing with a foe to the '+name+' still in reach leaves the crown');
    ctx.G.ents.pop();
  });

  const around=[[1.1,0],[-1.1,0],[0,1.1],[0,-1.1],[0.8,0.8]];
  around.forEach((d,i)=>{
    ctx.G.ents.push({id:100+i, team:'foe', dead:0, hp:40, x:hero.x+d[0], y:hero.y+d[1], r:0.35});
  });
  hero.aim=ctx.G.ents[ctx.G.ents.length-1];
  for(let i=0;i<15;i++){
    assert(swing(hero, 1.6)===0 && !crown.destroyed, 'swing '+(i+1)+' with foes around leaves the crown');
  }
  assert(!crown.destroyed && !crown.gone && !ctx.G.lvl.flags.crownXp,
    'the floor crown survives repeated swings with foes around');

  /* Killing blow: the foe dies, and the swing still does not touch the crown. */
  ctx.G.ents=ctx.G.ents.filter(e=>e.hero);
  hero.x=110.5; hero.y=2.5; hero.range=1.4; hero.r=0.36; hero.atk=0;
  hero.fdx=0; hero.fdy=1; hero._attack={fdx:0, fdy:1};
  crown.x=111.4; crown.y=2.5; crown.gone=0; crown.destroyed=0; crown.taken=0;
  ctx.G.lvl.flags.crownDropped=1; ctx.G.lvl.flags.crownDestroyed=0; ctx.G.lvl.flags.crownXp=0;
  const killFoe={id:77, team:'foe', name:'Fanged Skeleton', dead:0, hp:1, maxhp:8, r:0.34,
    x:hero.x, y:hero.y+0.7};
  ctx.G.ents.push(killFoe);
  hero.aim=killFoe;
  const reach=(hero.range||1.4)+0.35;
  assert(ctx.dist(hero, killFoe)<=1.2 && ctx.dist(hero, crown)<=1.2,
    'the killing-blow foe and the crown are both adjacent');
  const xp0=ctx.xpAwards.length;
  ctx.meleeSwing(hero, 2.3, reach, 8);
  assert(killFoe.dead===1 && killFoe.hp<=0, 'Macar\'s swing kills the 1 HP foe');
  assert(!crown.destroyed && !crown.gone && ctx.G.lvl.flags.crownDestroyed!==1,
    'the killing blow leaves the adjacent crown intact');
  assert(ctx.xpAwards.length===xp0 && !ctx.G.lvl.flags.crownXp,
    'the killing blow awards no crown XP');
  hero.aim=null;
  ctx.meleeSwing(hero, 2.3, reach, 8);
  assert(!crown.destroyed && !crown.gone && ctx.xpAwards.length===xp0,
    'another swing with no living foe still leaves the crown');

  /* Destroy is the look menu, on the altar and after a drop. */
  ctx.G.ents=ctx.G.ents.filter(e=>e.hero);
  hero.aim=null;
  ctx.G.lvl.flags.crownDropped=0;
  let menu=ctx.teethCrownChoices();
  assert(menu[0] && menu[0].t==='Destroy the crown.',
    'Destroy the crown. leads the look menu on the altar');
  ctx.G.lvl.flags.crownDropped=1;
  menu=ctx.teethCrownChoices();
  assert(menu[0] && menu[0].t==='Destroy the crown.' && menu[1] && menu[1].t==='Take the bone crown.',
    'Destroy the crown. leads the look menu after a drop');
  const blocker={id:78, team:'foe', name:'Skeletal Dwarf', dead:0, hp:8, r:0.34, x:hero.x, y:hero.y+0.6};
  ctx.G.ents.push(blocker);
  hero.aim=blocker;
  ctx.lines=[];
  menu[0].then();
  assert(!crown.destroyed && !crown.gone && ctx.xpAwards.length===xp0 && !ctx.G.lvl.flags.crownXp,
    'Destroy the crown. refuses while a live foe is in range');
  assert(ctx.lines.some(t=>/Not with foes this close/.test(t)),
    'the refusal says foes are too close');
  ctx.G.ents=ctx.G.ents.filter(e=>e.hero);
  hero.aim=null;
  ctx.lines=[];
  ctx.teethCrownChoices()[0].then();
  assert(crown.destroyed===1 && crown.gone===1 && ctx.G.lvl.flags.crownDestroyed===1,
    'Destroy the crown. from the look menu destroys the floor crown');
  assert(ctx.xpAwards.length===xp0+1 && ctx.xpAwards[ctx.xpAwards.length-1].why==='Bone Crown destroyed'
    && ctx.G.lvl.flags.crownXp===1,
    'that menu choice awards the destroy XP exactly once');
  ctx.teethCrownChoices()[0].then();
  assert(ctx.xpAwards.length===xp0+1,
    'a second Destroy the crown. gives no extra XP');
  assert(!/nearestBoneCrown/.test(extractFn('fire')),
    'the Attack button does not choose the bone crown');
  assert(!/\bdestroyBoneCrown\b/.test(extractFn('explode'))
    && !/\bdestroyBoneCrown\b/.test(extractFn('damage'))
    && !/\bdestroyBoneCrown\b/.test(extractFn('meleeSwing')),
    'shots, bombs, and swings do not destroy the crown');
}

/* Ten seconds of the real update loop: a live skeleton beside a floor crown,
   the four ghosts engaged, Macar swinging while that foe is outside his reach. */
{
  const fsSkill=fs.readFileSync(path.join(__dirname,'../../SkillSystem.js'),'utf8');
  const base={
    Math, Object, Array, Number, String, Date, JSON, parseInt, parseFloat, isNaN, isFinite,
    console,
    swingN:{hero:0, party:0, foe:0, shots:0, bombs:0},
    xpAwards:[],
    TAU:Math.PI*2,
    GHOST_DAY_SECS:1e9,
    PARTY_SEP_LEAD:0.85,
    PARTY_SEP_KIN:0.72,
    BONE_CROWN_DESTROY_XP:5000,
    ABIL:[],
    cds:{},
    PROMPT:null,
    IN:{stick:{moved:0,x:0,y:0,ox:0,oy:0}, keys:{}, taps:[]},
    TW:84, TH:42, UIS:1, VW:1280, VH:800,
    PartyOrders:{use(){return false;}, settle(){}, clear(){}, decide(){return null;}, order(){return null;}, commands(){return false;}},
    Navigation:{use(){return false;}, isPilot(){return false;}},
    EnemyIntent:{use(){return false;}, meleeClear(){return true;}, isMeleePursuer(){return false;}},
    MacarStrikeQA:{hold:0},
    window:undefined
  };
  const sandbox=new Proxy(base,{
    get(t,p){
      if(p in t) return t[p];
      if(typeof p==='symbol') return undefined;
      const f=function(){ return 0; };
      t[p]=f;
      return f;
    },
    set(t,p,v){ t[p]=v; return true; }
  });
  vm.createContext(sandbox);
  vm.runInContext(fsSkill, sandbox);
  sandbox.skillSystem=new sandbox.SkillSystem();
  function ang(x,y){ return Math.atan2(y,x); }
  function dist(a,b){ return Math.hypot((a.x||0)-(b.x||0),(a.y||0)-(b.y||0)); }
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  Object.assign(sandbox,{
    ang, dist, clamp,
    tileVisible(){ return true; },
    walk(){ return true; },
    canBe(){ return true; },
    diggable(){ return false; },
    ri(){ return 1; },
    rollDice(){ return 1; },
    skillLvl(){ return 0; },
    rnd(){ return 0; },
    chanceOk(){ return false; },
    addAttack(){ return 4; },
    onHitFx(a,o,d){ return d; },
    damage(e,amt){ if(e&&e.hp!=null) e.hp=Math.max(1,(e.hp||1)-0.01); },
    awardPartyXp(n,why,where){ sandbox.xpAwards.push({n,why,where}); return n; },
    say(){}, hint(){}, burst(){}, shake(){}, ftext(){}, wear(){},
    packOf(){ return {bombs:0}; },
    player(){ return (sandbox.G.ents||[]).find(e=>e&&e.hero)||null; },
    riseTeethHorde(){},
    riseSkeletalDwarves(){},
    collapseCrownThrall(){},
    armLivingMacarWindup(){},
    armLivingMacarStrike(){},
    beginSpecialtySwing(){ return 0; },
    endSpecialtySwing(){},
    partyHoldMelee(){ return 0; },
    shotStyle(){ return ['bolt','#d8c49a',10]; },
    wornAttackCd(e){ return e.cd||1.1; },
    interact(label,fn){ sandbox.PROMPT={label,fn}; }
  });
  [
    'wearingBoneCrown','nearestBoneCrown','awardCrownDestroyXp','destroyBoneCrown',
    'liveFoeBlocksCrown','playerDestroyBoneCrown',
    'nearestFoe','nearestAlly','kinCanAutoFight','foeInTheFight','faceToward','shoot','explode','updateBombs',
    'ghostSapperBomb','fire'
  ].forEach(n=>vm.runInContext(extractFn(n)+';', sandbox));
  vm.runInContext(extractFn('meleeSwing').replace('function meleeSwing','function meleeSwingReal')+';', sandbox);
  vm.runInContext(`
function meleeSwing(e,arc,reach,dmg,col){
  if(e&&e.hero) swingN.hero++;
  else if(e&&e.team==='party') swingN.party++;
  else swingN.foe++;
  return meleeSwingReal(e,arc,reach,dmg,col);
}
`, sandbox);
  const realShoot=sandbox.shoot;
  sandbox.shoot=function(){
    sandbox.swingN.shots++;
    return realShoot.apply(null, arguments);
  };
  const realExplode=sandbox.explode;
  sandbox.explode=function(){
    sandbox.swingN.bombs++;
    return realExplode.apply(null, arguments);
  };
  vm.runInContext(extractFn('update')+';', sandbox);

  const altar={x:102.25,y:4.35,k:'altar',teethAltar:1,gone:0};
  const crown={x:107.80,y:8.35,k:'bonecrown',s:1.70,gone:0,destroyed:0};
  const hero={
    id:1, hero:1, name:'Macar', team:'party', kind:'dwarf', col:{key:'macar'},
    x:106.25, y:8.35, hp:400, maxhp:400, dead:0, range:1.4, cd:1.05, ct:0,
    atk:0, atkMax:0.78, atkKind:'melee', swung:0, fdx:1, fdy:0, aim:null,
    moving:0, r:0.36, dmg:8, sp:4.3, defending:0
  };
  assert(Math.hypot(hero.x-crown.x, hero.y-crown.y)<2.6, 'the floor crown sits inside a crown-strike radius');
  assert(Math.hypot(hero.x-crown.x, hero.y-crown.y)>0.5, 'the floor crown is not under Macar\'s feet');
  const skel={
    id:2, hero:0, name:'Fanged Skeleton', team:'foe', kind:'undead',
    x:crown.x+0.95, y:crown.y, hp:9999, maxhp:9999, dead:0, range:1.05, cd:0.7, ct:0,
    atk:0, atkMax:0.42, swung:0, fdx:-1, fdy:0, r:0.34, dmg:6, sp:2.2, aggro:99, engaged:1
  };
  const macarToSkel=Math.hypot(hero.x-skel.x, hero.y-skel.y);
  const crownToSkel=Math.hypot(crown.x-skel.x, crown.y-skel.y);
  assert(crownToSkel<1.15, 'the live skeleton stands about one tile from the floor crown');
  assert(macarToSkel>(hero.range+0.35+0.2+skel.r),
    'that skeleton is outside the reach that would block a crown strike');
  assert(macarToSkel>hero.range+0.75, 'auto-attack does not have the skeleton in reach');
  const ghosts=[
    ['pordoom','Pordum','pick',1.15,1.15],
    ['fendur','Fendur','bolt',6.5,1.7],
    ['orbo','Orbo','shield',1.15,1.15],
    ['talpor','Talpor','faith',1.05,1.25]
  ].map((g,i)=>({
    id:10+i, hero:0, ghost:1, name:g[1], team:'party', kind:'dwarf', col:{key:g[0]},
    role:g[2], x:skel.x+((i%2)?0.7:-0.7), y:skel.y+((i<2)?0.55:-0.55),
    hp:9999, maxhp:9999, dead:0, range:g[3], cd:g[4], ct:0, atk:0, atkMax:0.42,
    swung:0, fdx:0, fdy:0, r:0.36, dmg:8, sp:4, ranged:g[0]==='fendur'?1:0,
    glow:'#7ad8ff', defending:0, moving:0
  }));
  sandbox.G={
    scene:'play', paused:0, talk:null, sleepShow:null, elapsed:0, day:1, dayClock:0,
    hint:null, flash:null, craftGuideT:0, hurt:0, digging:0, searching:0, secretSearch:0,
    fightOn:1, songBuff:0, shake:0, hitstop:0, aim:null, cam:{x:106.25,y:8.35},
    thrown:[], shots:[], parts:[],
    texts:[], log:[], loot:[], props:[altar, crown], ents:[hero].concat(ghosts, [skel]),
    equipped:{}, packs:{macar:{magic:[]}, pordoom:{bombs:0}},
    lvl:{n:1, flags:{crownDropped:1, crownTouched:1, crownTaken:0, crownDestroyed:0, crownXp:0},
      w:132, h:90, grid:null, plug:null}
  };
  sandbox.G.thrown.push({
    sx:crown.x, sy:crown.y, tx:crown.x, ty:crown.y, x:crown.x, y:crown.y,
    t:1, dur:0.62, fuse:0.08, state:1, spin:0, kind:'bomb', done:0
  });
  const dt=1/30;
  let heroSwingsArmed=0;
  for(let t=0;t<10;t+=dt){
    if(hero.atk<=0 && hero.ct<=0 && (Math.floor(t*2)!==heroSwingsArmed)){
      heroSwingsArmed=Math.floor(t*2);
      sandbox.G.scene='play';
      vm.runInContext("fire('attack');", sandbox);
    }
    vm.runInContext('update('+dt+');', sandbox);
  }
  assert(sandbox.swingN.hero>=8, 'Macar swung through the update loop ('+sandbox.swingN.hero+')');
  assert(sandbox.swingN.party>=8, 'ghost allies swung through the update loop ('+sandbox.swingN.party+')');
  assert(sandbox.swingN.foe>=8, 'the skeleton swung through the update loop ('+sandbox.swingN.foe+')');
  assert(sandbox.swingN.shots>=1, 'a ghost shot was fired ('+sandbox.swingN.shots+')');
  assert(sandbox.swingN.bombs>=1, 'a bomb exploded on the crown tile ('+sandbox.swingN.bombs+')');
  assert(!crown.destroyed && !crown.gone && sandbox.G.lvl.flags.crownDestroyed!==1,
    'ten seconds of party and foe combat leaves the floor crown');
  assert(!sandbox.xpAwards.some(a=>/Bone Crown destroyed/.test(a.why||'')),
    'that fight awards no crown-destroy XP');
  assert(!/crown/i.test(extractFn('meleeSwing')),
    'meleeSwing contains no Crown reference');
}

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nch1 teeth crown checks passed');
