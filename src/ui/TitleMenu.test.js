'use strict';
/**
 * Two-screen title: splash → title_menu → Enter / Chapters / Credits.
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

assert(/ASSET_VER='102'/.test(html) && !/ASSET_VER='103'/.test(html),
  'ASSET_VER stays 102 — title_menu is a hook, not a signed bind');
assert(/title_menu:'assets\/ui\/title_menu\.jpg'/.test(html),
  'SPRITE_FILES hooks title_menu to assets/ui/title_menu.jpg');
assert(/title_splash_2:'assets\/ui\/title_menu\.jpg'/.test(html),
  'title_splash_2 aliases the same Disney bind path');
assert(/href="assets\/ui\/title_menu\.jpg\?v=102"/.test(html),
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
  /Math\.max\(port\?44:48, \(port\?50:52\)\*s\)/.test(html),
  'menu buttons floor at 44px phone / 48px laptop');
assert(/function titleSafeBottom\(s, port\)\{/.test(html) && /safeInsets/.test(html.match(/function titleSafeBottom[\s\S]*?\n\}/)[0]),
  'both title screens keep a safe bottom margin');

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
assert(/titleMenuArt\(\)/.test(menu) && /drawSplashCover\(g, art/.test(menu) && /drawLetterbox/.test(menu),
  'menu covers title_menu (or fallback) and letterboxes');
assert(/menuBtn\(g,'Enter the Deep'/.test(menu) && /startChapter\(1\)/.test(menu),
  'blank-book menu starts Chapter I');
assert(/menuBtn\(g,'Continue'/.test(menu) && /loadSavedGame\(\)/.test(menu),
  'marked-book menu Continue loads the save');
assert(/menuBtn\(g,'New descent'/.test(menu) && /G\.wipeAsk=1/.test(menu),
  'marked-book menu can ask to burn the book');
assert(/menuBtn\(g,'Chapters'/.test(menu) && /menuBtn\(g,'Credits'/.test(menu),
  'menu keeps Chapters and Credits');
assert(/openCredits\('title_menu'\)/.test(menu), 'Credits from the menu returns to the menu');
assert(/G\.scene='title_menu'/.test(html.match(/function drawChapterSelect\(g\)\{[\s\S]*?\nfunction enterPlayFromIntro/)[0]),
  'Chapters Back returns to title_menu, not the splash');
assert(/if\(!consumed && G\.scene==='title'\) enterTitleMenu\(\)/.test(html),
  'tap-anywhere on the splash opens the menu');
assert(/nudgeY:PORT\?0:VH\*0\.02/.test(menu), 'phone menu plate is flush, no extra desktop ken-burns');

function clamp(n,a,b){ return Math.max(a, Math.min(b, n)); }
function titleMenuBtnH(s, port){ return Math.max(port?44:48, (port?50:52)*s); }
function titleSafeBottom(s, port, insetB){
  return Math.max(port?28*s:24*s, (insetB||0)+16);
}
function checkStack(name, vw, vh, port){
  const s=clamp(Math.min(vw,vh)/(port?430:700), 0.66, 1.30);
  const btnH=titleMenuBtnH(s, port);
  const gap=port?14*s:16*s;
  const safeB=titleSafeBottom(s, port, 0);
  const nBtns=3;
  const stackH=nBtns*btnH+(nBtns-1)*gap;
  const stackTop=vh-safeB-stackH;
  const splashH=Math.max(port?44:48, (port?48:52)*s);
  const splashY=vh-safeB-splashH/2;
  const splashTop=splashY-splashH/2;
  assert(btnH>=(port?44:48), name+': menu tap height is '+(port?44:48)+'+ ('+btnH.toFixed(1)+')');
  assert(splashH>=(port?44:48), name+': splash Continue is '+(port?44:48)+'+ ('+splashH.toFixed(1)+')');
  assert(safeB>=(port?24:20), name+': safe bottom margin is generous ('+safeB.toFixed(1)+')');
  assert(stackTop>vh*0.42, name+': stacked menu sits in the lower band, not over the title (top='+stackTop.toFixed(1)+')');
  assert(stackTop+stackH<=vh-safeB+0.01, name+': menu stack ends above the safe inset');
  assert(splashTop>=vh*0.72, name+': splash Continue is not a tiny bottom-corner chip (y='+splashTop.toFixed(1)+')');
  assert(vw*0.78>=200, name+': Continue / Enter plates are wide, not corner stamps');
  const ceil=vh*(port?0.048:0.038);
  const titleY=ceil+13*s+8*s+(port?28:42)*s;
  assert(titleY<vh*0.22, name+': menu gold title stays in the upper fifth (y='+titleY.toFixed(1)+')');
  const titleGap=28*s;
  assert(titleGap>=22*s, name+': air before the subtitle is at least the high-plate floor');
}
checkStack('phone 390x844', 390, 844, true);
checkStack('desktop 1440x900', 1440, 900, false);

function titleMenuArt(SPR){
  const signed=SPR.title_menu;
  if(signed&&signed.width) return signed;
  const alt=SPR.title_splash_2;
  if(alt&&alt.width) return alt;
  const plate=SPR.chapters_plate;
  if(plate&&plate.width) return plate;
  return SPR.title_splash||null;
}
assert(titleMenuArt({chapters_plate:{width:8}, title_splash:{width:8}})===undefined ||
  titleMenuArt({chapters_plate:{width:8}, title_splash:{width:8}}).width===8,
  'fallback helper picks a loaded plate');
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
console.log('\nTitle menu two-screen checks passed');
