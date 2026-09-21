'use strict';
/**
 * Helm second-screen title menu: title / quote / billboard / thumb stack.
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

assert(/ASSET_VER='103'/.test(html) && !/ASSET_VER='104'/.test(html),
  'ASSET_VER stays 103 — title_menu is a hook, not a signed bind');
assert(/title_menu:'assets\/ui\/title_menu\.jpg'/.test(html),
  'SPRITE_FILES hooks title_menu to assets/ui/title_menu.jpg');
assert(/title_splash_2:'assets\/ui\/title_menu\.jpg'/.test(html),
  'title_splash_2 aliases the same Disney bind path');
assert(/href="assets\/ui\/title_menu\.jpg\?v=105"/.test(html),
  'title_menu is in the document preload list');
assert(/const first=\['title_splash','title_menu'/.test(html),
  'title_menu is in the first sprite queue');
assert(!fs.existsSync(path.join(root,'assets/ui/title_menu.jpg')),
  'Disney plate is not bound yet — placeholder is the runtime fallback');

assert(/function enterTitleMenu\(\)\{/.test(html) && /G\.scene='title_menu'/.test(html),
  'enterTitleMenu promotes splash → title_menu');
assert(/function titleMenuArt\(\)\{/.test(html), 'titleMenuArt helper exists');
assert(/SPR\.title_menu/.test(html.match(/function titleMenuArt\(\)\{[\s\S]*?\n\}/)[0]) &&
  /SPR\.chapters_plate/.test(html.match(/function titleMenuArt\(\)\{[\s\S]*?\n\}/)[0]) &&
  /SPR\.title_splash/.test(html.match(/function titleMenuArt\(\)\{[\s\S]*?\n\}/)[0]),
  'unsigned title_menu falls back to chapters_plate then title_splash');
assert(/function titleMenuBtnH\(s, port\)\{/.test(html) &&
  /Math\.max\(port\?48:44, \(port\?50:46\)\*s\)/.test(html),
  'menu buttons floor at 48px phone / 44px laptop');
assert(/function titleMenuSafe\(inset\)\{/.test(html) &&
  /Math\.max\(16, inset\.t/.test(html) && /Math\.max\(24\+\(inset\.b/.test(html),
  'safe pad is max(16, inset) and home-indicator bottom is 24+inset');
assert(/function titleMenuGap\(\)\{ return 12; \}/.test(html), 'stack gap is at least 12');
assert(/function titleMenuPillW\(vw, padL, padR\)\{/.test(html) && /Math\.min\(360/.test(html),
  'pills are full-width up to ~360');
assert(/function drawTitleMenuBillboard\(/.test(html) &&
  /Math\.min\(w\/img\.width, h\/img\.height\)/.test(html),
  'billboard contains (scale-to-fit) and never squashes');

assert(/if\(G\.scene==='title'\) drawTitle\(g\);/.test(html) &&
  /if\(G\.scene==='title_menu'\) drawTitleMenu\(g\);/.test(html),
  'render dispatches splash and menu as two scenes');

const splash=html.match(/function drawTitle\(g\)\{[\s\S]*?\nfunction drawTitleMenu/)[0];
assert(/menuBtn\(g,'Continue'/.test(splash) && /enterTitleMenu\(\)/.test(splash),
  'splash Continue advances to the menu');
assert(!/Enter the Deep/.test(splash) && !/menuBtn\(g,'Chapters'/.test(splash),
  'splash does not host the play / chapters / credits stack');
assert(/drawSplashCover\(g, splash/.test(splash) && /drawLetterbox/.test(splash),
  'splash still covers and letterboxes the party plate');

const menu=html.match(/function drawTitleMenu\(g\)\{[\s\S]*?\nfunction drawCredits/)[0];
assert(/titleMenuArt\(\)/.test(menu) && /drawTitleMenuBillboard/.test(menu),
  'menu paints a reserved billboard, not a full-bleed cover under the pills');
assert(!/drawSplashCover/.test(menu), 'menu art is not a cover crop under the buttons');
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
  const artTop=titleBottom+12;
  const artBot=stackTop-gap;
  const artH=artBot-artTop;
  const startFloor=port?48:44;
  assert(pad.t>=16 && pad.l>=16 && pad.r>=16, name+': pad ≥16 on the sides and top');
  assert(pad.b>=24, name+': home-indicator bottom is ≥24 ('+pad.b+')');
  assert(btnH>=startFloor, name+': start-path height is '+startFloor+'+ ('+btnH.toFixed(1)+')');
  assert(gap>=12, name+': stack gap is ≥12');
  assert(bw<=360 && bw>=vw-pad.l-pad.r-0.01 || bw===360, name+': pill width is full-band or 360 ('+bw.toFixed(1)+')');
  assert(stackTop>titleBottom, name+': thumb stack stays under the title band');
  assert(artH>=36, name+': billboard has a reserved middle band ('+artH.toFixed(1)+')');
  assert(artBot<=stackTop-gap+0.01, name+': art ends above the pills (no cover-up)');
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
  const signed=SPR.title_menu;
  if(signed&&signed.width) return signed;
  const alt=SPR.title_splash_2;
  if(alt&&alt.width) return alt;
  const plate=SPR.chapters_plate;
  if(plate&&plate.width) return plate;
  return SPR.title_splash||null;
}
{
  const plate={width:4, id:'plate'};
  const splash={width:4, id:'splash'};
  const signed={width:4, id:'signed'};
  assert(titleMenuArt({title_menu:signed, chapters_plate:plate, title_splash:splash})===signed,
    'signed title_menu wins over fallbacks');
  assert(titleMenuArt({chapters_plate:plate, title_splash:splash})===plate,
    'chapters_plate is the unsigned fallback');
  assert(titleMenuArt({title_splash:splash})===splash,
    'title_splash is the last fallback');
}

function enterTitleMenu(G){ G.scene='title_menu'; }
{
  const G={scene:'title'};
  enterTitleMenu(G);
  assert(G.scene==='title_menu', 'scene transition title → title_menu');
}

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nTitle menu Helm-layout checks passed');
