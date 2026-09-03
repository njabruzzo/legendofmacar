'use strict';
/**
 * Chapter I: kin under rubble, and the first play frame must not flash old art.
 * Run: node src/ui/Ch1RubbleLoad.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

assert(/cover:1/.test(html) && /drawCrushCover/.test(html),
  'crush spots spawn cover rubble drawn over the fallen kin');
assert(/drawKinRubbleOverlay/.test(html) && /blitCrushRock/.test(html),
  'each crushed body paints rubble/boulder sprites over the lower torso');
assert(/drawFallenKin\(ctx\)/.test(html) && /drawCrushCover\(ctx\)/.test(html)
  && /drawFallenKinLabels\(ctx\)/.test(html),
  'cover stones paint after the bodies; names paint last so they stay readable');
assert(/pordoom_dead/.test(html) && /fendur_dead/.test(html)
  && /orbo_dead/.test(html) && /talpor_dead/.test(html),
  'all four named dead sheets still exist');
assert(/e\.crushed && e\.col && e\.team==='party'/.test(html) && /makeGhostAlly/.test(html),
  'walking up still Rouses crushed party kin as ghosts');
assert(/Rouse ':'Loot /.test(html), 'prompt is still Rouse for crushed party kin');
assert(!/pin:\{x:0\.95,y:0\.82\}/.test(html), 'pin boulders are not offset a tile away from the bodies');

assert(/function worldArtReady\(/.test(html), 'worldArtReady gates the first in-world present');
assert(/WORLD_ART_KEYS/.test(html) && /pordoom_dead/.test(html.match(/WORLD_ART_KEYS=\{[\s\S]*?\};/)[0]),
  'Chapter I first frame waits on dead-kin and mine tiles');
assert(/function tryEnterPlay\(/.test(html) && /function enterPlayFromIntro\(/.test(html),
  'Descend holds on the title card until world art is decoded');
assert(/G\.scene==='play' && !worldArtReady\(G\.ch\)/.test(html),
  'play scene will not paint the dungeon until required sprites are ready');
assert(/!floorSrc\|\|!floorSrc\.width\|\|!wallSrc\|\|!wallSrc\.width/.test(html),
  'ensureTileBlit does not lock a blit on missing floor/wall sprites');
assert(!/scaleBlit\(SPR\[wallKey\]\|\|SPR\.wall_cave\|\|SPR\.wall_worked/.test(html),
  'Chapter I walls are not first-painted from the cave fallback sheet');
assert(/srcId=\(floorSrc&&floorSrc\.width/.test(html),
  'tile blit cache includes the actual sprite identity so a later load rebakes');
assert(!/else if\(okTex\)\{/.test(html),
  'generated TEX diamonds are not a first-frame floor/wall fallback');
assert(/tile_floor_mine\.png\?v=60/.test(html) && /tile_wall_worked\.png\?v=60/.test(html),
  'mine floor and worked wall are preloaded before first present');
assert(/ASSET_VER='84'/.test(html), 'asset cache-bust matches punched living-Macar sheets');
assert(/function scatterBurialRubble\(/.test(html) && /fallen:1/.test(html) && /k:'dust'/.test(html),
  'cave-in entry scatters extra timber, stone, and dust around the burial');
assert(/function drawFallenBeam\(/.test(html) && /function drawFloorDust\(/.test(html),
  'broken beams and floor dust have their own floor-hugging draws');
assert(/chapters_plate\.jpg/.test(html) && fs.existsSync(path.join(__dirname,'../../assets/ui/chapters_plate.jpg')),
  'chapters plate art is in-repo');
['intro_ch1','intro_ch2','intro_ch3','intro_ch4','intro_ch5'].forEach(k=>{
  assert(fs.existsSync(path.join(__dirname,'../../assets/ui/'+k+'.jpg')), k+' plate is on disk');
});
assert(/'floor_mine','wall_worked','wall_face'/.test(html.match(/const first=\[[\s\S]*?\];/)[0]),
  'load queue puts mine tiles before ghost walk cycles');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nChapter I rubble and load-flash checks passed');
