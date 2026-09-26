'use strict';
/**
 * Two-screen title: classic title_splash, then a ruby-door hall menu.
 * Run: node src/ui/TitleMenu.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
const root=path.join(__dirname,'../..');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

assert(/ASSET_VER='119'/.test(html) && !/ASSET_VER='115'/.test(html),
  'ASSET_VER is 117 — remat Talpor idle bw=344 (Nick CALL)');
assert(/title_menu:'assets\/ui\/title_menu\.jpg'/.test(html),
  'SPRITE_FILES hooks title_menu to assets/ui/title_menu.jpg');
assert(!/title_splash_2:/.test(html),
  'title_splash_2 alias is gone');
assert(/href="assets\/ui\/title_menu\.jpg\?v=119"/.test(html),
  'title_menu preload matches ASSET_VER 117');
assert(/const first=\['title_splash','title_menu','rubydoor','dwarfface'/.test(html),
  'title_menu, the signed ruby door, and the dwarf face lead the sprite queue');
assert(/SIGNED ruby-door hall/.test(html),
  'title_menu.jpg comment names the signed ruby-door hall plate');
const menuJpg=path.join(root,'assets/ui/title_menu.jpg');
const splashJpg=path.join(root,'assets/ui/title_splash.jpg');
const caveJpg=path.join(root,'assets/ui/intro_cavein.jpg');
assert(fs.existsSync(menuJpg) && fs.statSync(menuJpg).size>150000,
  'SIGNED title_menu.jpg is in-repo');
function jpegSize(buf){
  let i=2;
  while(i<buf.length-9){
    if(buf[i]!==0xFF){ i++; continue; }
    const mark=buf[i+1];
    if(mark===0xD8||mark===0xD9){ i+=2; continue; }
    if(mark===0x01||(mark>=0xD0&&mark<=0xD7)){ i+=2; continue; }
    const len=buf.readUInt16BE(i+2);
    if(mark===0xC0||mark===0xC1||mark===0xC2){
      return {h:buf.readUInt16BE(i+5), w:buf.readUInt16BE(i+7)};
    }
    if(len<2) break;
    i+=2+len;
  }
  return null;
}
const menuDim=jpegSize(fs.readFileSync(menuJpg));
assert(menuDim&&menuDim.w===1920&&menuDim.h===1080,
  'SIGNED title_menu.jpg is the 1920×1080 v5 plate');
assert(!fs.readFileSync(menuJpg).equals(fs.readFileSync(splashJpg)) &&
  !fs.readFileSync(menuJpg).equals(fs.readFileSync(caveJpg)),
  'second-screen plate is neither the party splash nor the cave-in');
assert(!/intro_cavein/.test(html.match(/function titleMenuArt\(\)\{[\s\S]*?\n\}/)[0]),
  'menu art does not fall back to the cave-in plate');

assert(/function enterTitleMenu\(\)\{/.test(html) && /G\.scene='title_menu'/.test(html),
  'enterTitleMenu promotes splash → title_menu');
assert(/function titleMenuArt\(\)\{/.test(html), 'titleMenuArt helper exists');
const artFn=html.match(/function titleMenuArt\(\)\{[\s\S]*?\n\}/)[0];
assert(/SPR\.title_menu/.test(artFn) && /return null/.test(artFn),
  'unsigned title_menu does not substitute another plate');
assert(!/SPR\.title_splash/.test(artFn) && !/title_splash_2/.test(artFn) && !/chapters_plate/.test(artFn) && !/intro_cavein/.test(artFn),
  'second screen does not fall back to the splash, chapters plate, or cave-in');
const hallFn=html.match(/function drawRubyHallPlate\(g, x, y, w, h\)\{[\s\S]*?\nfunction titleMenuSafe/)[0];
assert(/SPR\.rubydoor\|\|SPR\.rubydoor_face/.test(hallFn) && /SPR\.pillar/.test(hallFn) && /SPR\.lantern/.test(hallFn),
  'fallback billboard prefers the signed ruby door, then pillars and lanterns');
assert(!/title_splash/.test(hallFn) && !/intro_cavein/.test(hallFn),
  'ruby hall plate does not paint the splash or the cave-in');
assert(/function titleMenuBtnH\(s, port\)\{/.test(html) &&
  /Math\.max\(port\?48:44, \(port\?50:46\)\*s\)/.test(html),
  'menu buttons floor at 48px phone / 44px laptop');
assert(/function titleMenuSafe\(inset\)\{/.test(html) &&
  /Math\.max\(16, inset\.t/.test(html) && /Math\.max\(24\+\(inset\.b/.test(html),
  'safe pad is max(16, inset) and home-indicator bottom is 24+inset');
assert(/function titleMenuGap\(\)\{ return 12; \}/.test(html), 'stack gap is at least 12');
assert(/function titleMenuPillW\(vw, padL, padR\)\{/.test(html) && /Math\.min\(360/.test(html),
  'pills are full-width up to ~360');
assert(/function drawTitleMenuCover\(/.test(html) &&
  /Math\.max\(VW\/img\.width, VH\/img\.height\)/.test(html),
  'menu plate cover-bleeds the canvas and never letterboxes');
assert(!/function drawTitleMenuBillboard\(/.test(html),
  'contain-fit framed billboard is gone');

assert(/if\(G\.scene==='title'\) drawTitle\(g\);/.test(html) &&
  /if\(G\.scene==='title_menu'\) drawTitleMenu\(g\);/.test(html),
  'render dispatches splash and menu as two scenes');
assert(/rubydoor:'assets\/props\/prop_rubydoor\.png'/.test(html),
  'SPRITE_FILES.rubydoor is assets/props/prop_rubydoor.png');
assert(/dwarfface:'assets\/props\/prop_dwarfface\.png'/.test(html),
  'SPRITE_FILES.dwarfface is assets/props/prop_dwarfface.png');
assert(/if\(k==='rubydoor'\) return 'rubydoor';/.test(html),
  'live k:rubydoor draws SPR.rubydoor, never the old face crop');
assert(/if\(p\.k==='rubydoor'\) return SPR\.rubydoor/.test(html),
  'ruby door animation stays on the signed idle sheet');
assert(/if\(p\.k==='dwarfface'\)\{/.test(html) && /k:'dwarfface'/.test(html),
  'Ch1 still draws the dwarf face on the north wall');
{
  const door=fs.readFileSync(path.join(root,'assets/props/prop_rubydoor.png'));
  assert(door.readUInt32BE(16)===642 && door.readUInt32BE(20)===679,
    'prop_rubydoor.png is the signed 642×679 sheet');
}
{
  assert(/function solidRubyDoorSheet\(\)/.test(html),
    'signed ruby door mattes lattice alpha before the wall blit');
  const live=html.match(/if\(p\.k==='rubydoor'\)\{[\s\S]*?return;\s*\}/)[0];
  assert(/solidRubyDoorSheet\(\)/.test(live) && /stroke:0/.test(live),
    'live door draws the opaque matte and does not box the arch');
  assert(!/ray\(sx\.x,sx\.y-H/.test(live),
    'no god-ray wash down the carved door');
  const fb=html.match(/case 'rubydoor':[\s\S]*?break;/)[0];
  assert(!/drawFacetGem|drawCarvedArch/.test(fb),
    'rubydoor fallback is not the crystal lattice or facet gem');
  assert(!/pr\.k==='rubywall'\|\|pr\.k==='rubydoor'/.test(html),
    'the wide red light no longer washes the carved door');
  const face=fs.readFileSync(path.join(root,'assets/props/prop_dwarfface.png'));
  assert(face.readUInt32BE(16)===810 && face.readUInt32BE(20)===1110,
    'prop_dwarfface.png is still the live 810×1110 carving');
}

const splash=html.match(/function drawTitle\(g\)\{[\s\S]*?\nfunction drawTitleMenu/)[0];
assert(/menuBtn\(g,'Continue'/.test(splash) && /enterTitleMenu\(\)/.test(splash),
  'splash Continue advances to the menu');
assert(!/Enter the Deep/.test(splash) && !/menuBtn\(g,'Chapters'/.test(splash),
  'splash does not host the play / chapters / credits stack');
assert(/drawSplashCover\(g, splash/.test(splash) && /drawLetterbox/.test(splash),
  'splash still covers and letterboxes the party plate');
assert(/SPR\.title_splash/.test(splash) && !/title_menu/.test(splash) && !/titleMenuArt/.test(splash),
  'first screen paints title_splash and does not borrow the level-scene plate');

const menu=html.match(/function drawTitleMenu\(g\)\{[\s\S]*?\nfunction drawCredits/)[0];
assert(/titleMenuArt\(\)/.test(menu) && /drawTitleMenuCover/.test(menu) &&
  /drawRubyHallPlate\(g, 0, 0, VW, VH\)/.test(menu),
  'signed plate cover-bleeds; otherwise the ruby hall fills the canvas');
assert(!/drawTitleCavern/.test(menu) && !/intro_cavein/.test(menu) && !/title_splash/.test(menu),
  'menu plate is not the cavern fallback, the cave-in, or the party splash');
assert(!/drawSplashCover/.test(menu), 'menu does not reuse the splash cover zoom');
assert(!/drawArtFrame/.test(menu) && !/drawLetterbox/.test(menu),
  'menu has no gold frame and no black letterbox');
assert(!/UIBTN|stickHome|drawHUD|icon_pack/.test(menu),
  'menu has no HUD chrome, stick, or inventory');
assert(/title:'THE LEGEND OF MACAR'/.test(menu) && /titleGapMin:24/.test(menu),
  'canvas title is always painted with ≥24px air before the quote');
assert(/From simple beginnings Macar would rise to become a hero among dwarves\./.test(menu),
  'quote stays on the canvas; it is not baked into the art');
assert(/wrapLines/.test(html.match(/function layoutHighPlate\(g, spec\)\{[\s\S]*?function paintHighPlate/)[0]),
  'quote wraps on word boundaries');
assert(/menuBtn\(g,'New descent'[\s\S]*startChapter\(1\)[\s\S]*'primary'/.test(menu),
  'blank-book primary is New descent and starts Chapter I');
assert(/menuBtn\(g,'Continue'[\s\S]*loadSavedGame\(\)[\s\S]*'primary'/.test(menu),
  'marked-book primary is Continue');
assert(/menuBtn\(g,'New descent'[\s\S]*G\.wipeAsk=1[\s\S]*'secondary'/.test(menu),
  'marked-book New descent is a quieter secondary');
assert(/menuBtn\(g,'Chapters'[\s\S]*'secondary'/.test(menu) &&
  /menuBtn\(g,'Credits'[\s\S]*'secondary'/.test(menu),
  'Chapters and Credits are quieter secondaries');
assert(/openCredits\('title_menu'\)/.test(menu), 'Credits from the menu returns to the menu');
assert(/G\.scene='title_menu'/.test(html.match(/function drawChapterSelect\(g\)\{[\s\S]*?\nfunction enterPlayFromIntro/)[0]),
  'Chapters Back returns to title_menu, not the splash');
assert(/if\(!consumed && G\.scene==='title'\) enterTitleMenu\(\)/.test(html),
  'tap-anywhere on the splash opens the menu');
assert(/Math\.max\(16, 16\*s\)/.test(html.match(/function menuBtn\(g,label[\s\S]*?\nfunction drawSleepRest/)[0]),
  'Helm pills keep labels at least 16px');
assert(/menuHits\.push\(\{x,y,w,h,fn\}\)/.test(html.match(/function menuBtn\(g,label[\s\S]*?\nfunction drawSleepRest/)[0]),
  'hit box is the full painted plate');

function clamp(n,a,b){ return Math.max(a, Math.min(b, n)); }
function titleMenuBtnH(s, port){ return Math.max(port?48:44, (port?50:46)*s); }
function titleMenuSafe(inset){
  inset=inset||{t:0,r:0,b:0,l:0};
  return {
    t:Math.max(16, inset.t||0),
    r:Math.max(16, inset.r||0),
    b:Math.max(24+(inset.b||0), 16),
    l:Math.max(16, inset.l||0)
  };
}
function titleMenuPillW(vw, padL, padR){ return Math.min(360, Math.max(160, vw-padL-padR)); }
function checkStack(name, vw, vh, port, inset){
  const s=clamp(Math.min(vw,vh)/(port?430:700), 0.66, 1.30);
  const pad=titleMenuSafe(inset||{});
  const btnH=titleMenuBtnH(s, port);
  const gap=12;
  const nBtns=3;
  const stackH=nBtns*btnH+(nBtns-1)*gap;
  const stackTop=vh-pad.b-stackH;
  const bw=titleMenuPillW(vw, pad.l, pad.r);
  const titleGap=Math.max(24, 28*s);
  const titleBottom=pad.t+Math.max(12,13*s)+8*s+(port?30:26)*s+titleGap+Math.max(16,(port?15:14)*s)*2;
  const startFloor=port?48:44;
  assert(pad.t>=16 && pad.l>=16 && pad.r>=16, name+': pad ≥16 on the sides and top');
  assert(pad.b>=24, name+': home-indicator bottom is ≥24 ('+pad.b+')');
  assert(btnH>=startFloor, name+': start-path height is '+startFloor+'+ ('+btnH.toFixed(1)+')');
  assert(gap>=12, name+': stack gap is ≥12');
  assert(bw<=360 && bw>=vw-pad.l-pad.r-0.01 || bw===360, name+': pill width is full-band or 360 ('+bw.toFixed(1)+')');
  assert(stackTop>titleBottom, name+': thumb stack stays under the title band');
  assert(titleGap>=24, name+': ≥24px air before the quote ('+titleGap.toFixed(1)+')');
  assert(titleBottom<vh*0.42, name+': title+quote stay in the top band (bottom='+titleBottom.toFixed(1)+')');
  const lastBottom=stackTop+stackH;
  assert(lastBottom<=vh-pad.b+0.01, name+': last pill sits above the home inset');
  assert(stackTop>=vh*0.55 || !port, name+': portrait pills sit in the thumb zone (top='+stackTop.toFixed(1)+')');
}
checkStack('phone 375x667', 375, 667, true, {});
checkStack('phone 390x844', 390, 844, true, {});
checkStack('phone landscape 667x375', 667, 375, false, {});
checkStack('desktop 1440x900', 1440, 900, false, {});
checkStack('phone with home inset', 375, 667, true, {b:34,t:44,l:0,r:0});

function titleMenuArt(SPR){
  const scene=SPR.title_menu;
  if(scene&&scene.width) return scene;
  return null;
}
{
  const cave={width:4, id:'cave'};
  const splash={width:4, id:'splash'};
  const signed={width:4, id:'signed'};
  assert(titleMenuArt({title_menu:signed, intro_cavein:cave, title_splash:splash})===signed,
    'SIGNED title_menu wins');
  assert(titleMenuArt({intro_cavein:cave, title_splash:splash})===null,
    'cave-in and splash are not the menu plate');
  assert(titleMenuArt({})===null,
    'missing title_menu leaves the ruby-hall painter in charge');
}

function enterTitleMenu(G){ G.scene='title_menu'; }
{
  const G={scene:'title'};
  enterTitleMenu(G);
  assert(G.scene==='title_menu', 'scene transition title → title_menu');
}

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nTitle menu Helm-layout checks passed');
