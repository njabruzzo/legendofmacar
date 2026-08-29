'use strict';
/**
 * Book I presentation: chapter title cards, fallen-kin scale, desktop HUD size.
 * Run: node src/ui/BookIPresentation.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

const intro=html.match(/const CH_INTRO=\{[\s\S]*?\n\};/);
assert(!!intro, 'CH_INTRO copy table exists');
const block=intro?intro[0]:'';
assert(/Your dwarf brothers were killed in the cave-in\. The tunnel behind you collapsed\. You are alone\./.test(block),
  'Chapter I entrance copy is the cave-in sentence');
assert(!/Walk to each of them and Rouse them/.test(block), 'Chapter I card does not lecture Rouse');
assert(!/ruby door waits/.test(block), 'Chapter I card is not a ruby-door tutorial');
assert(!/Raise only Pordum and Fendur/.test(block), 'Chapter I no longer says raise only two');
assert(!/Take kit from the other two/.test(block), 'Chapter I no longer treats Orbo and Talpor as loot-only');
assert(/The rock splits, and the dark does not choose for you/.test(block),
  'Chapter II flavor is mood, not a four-way map');
assert(!/West, bronze/.test(block) && !/North, goblins/.test(block) && !/East, webs/.test(block),
  'Chapter II plate names no compass loot');
assert(!/Left, the gem-bronze door/.test(block) && !/Spider Lord/.test(block),
  'Chapter II plate has no Left/Straight/Right spoiler line');
assert(!/Purple light\. The stone sweats/.test(block), 'Chapter III has no bold ask line');
assert(!/Illithids hunt the drowned streets/.test(block), 'Chapter IV has no bold ask line');
assert(!/brother\\'s blood, still bright/.test(block), 'Chapter V has no bold ask line');
assert(!/ask:'[^']+'/.test(block.replace(/ask:''/g,'')), 'no chapter plate keeps a bold ask spoiler');
assert(/Picks still ring below/.test(block), 'Chapter III flavor is mood, not a roster of the dead');
assert(/Old dwarf-cut halls/.test(block), 'Chapter IV flavor is mood, not a city map');
assert(/Two went in\. One came back/.test(block), 'Chapter V flavor does not name the crown');
assert(!/bronze and a bell/.test(block) && !/goblins/.test(block) && !/webs/.test(block),
  'no chapter flavor lists what waits in a direction');
assert(!/You are MACAR/.test(block), 'chapter plates do not name the player');

const meta=html.match(/const CH_META=\{[\s\S]*?\nconst CH_INTRO/);
assert(!!meta, 'CH_META copy table exists');
assert(!/Left the gnome door/.test(meta[0]) && !/Spider Lord/.test(meta[0]),
  'chapter-select fallback blurbs are not a map legend');
assert(!/Illithids in the drowned streets/.test(meta[0]) && !/Temple Guardians/.test(meta[0]),
  'chapter-select fallbacks do not name the foes behind the plate');

assert(/function centerCopyY\(ceil, floor, blockH\)/.test(html), 'centerCopyY helper exists');
assert(/function drawIntro\(g\)\{/.test(html), 'drawIntro exists');
assert(/descendTop=descendY-descendH\/2/.test(html), 'intro keeps a clear band above Descend');
assert(/groupCeil=VH\*\(PORT\?0\.048:0\.038\)/.test(html), 'intro title block starts near the top of the plate');
assert(/titleGap=36\*s/.test(html), 'intro keeps a generous gap between gold title and flavor');
assert(/titleGap=Math\.max\(26\*s, titleGap-0\.35\)/.test(html), 'intro never shrinks the title-to-flavor gap below a wide floor');
assert(/let t0=groupCeil/.test(html.match(/function drawIntro\(g\)\{[\s\S]*?menuBtn\(g,'Descend'/)[0]),
  'intro titles pin high instead of centering the story plate');
assert(!/centerCopyY\(groupCeil, groupFloor, blockH\)/.test(html),
  'intro copy is not vertically centered in the title-card band');
assert(/layoutIntroCopy/.test(html), 'intro copy wraps and shrinks to the band above Descend');
assert(/CH_INTRO\[L\.n\]/.test(html), 'intro draws CH_INTRO, not a clipped inline stub');
assert(/flSize=\(PORT\?18:22\)\*s/.test(html), 'intro flavor italic starts larger than the old 14/17 size');
assert(/flSize=Math\.max\(15, flSize-0\.45\)/.test(html), 'flavor italic does not shrink below the old body size');
assert(/drawCopyVeil/.test(html.match(/function drawIntro\(g\)\{[\s\S]*?menuBtn\(g,'Descend'/)[0]),
  'intro uses a soft title-card veil, not a gold box');
assert(!/plate\(g, plateX, plateTop, plateW, plateH/.test(html.match(/function drawIntro\(g\)\{[\s\S]*?menuBtn\(g,'Descend'/)[0]),
  'intro no longer parks copy in a gold plate');
assert(!/if\(y<=copyBot\)/.test(html), 'intro does not clip wrapped lines against Descend');
assert(/ay:0\.52/.test(html.match(/function drawIntro\(g\)\{[\s\S]*?menuBtn\(g,'Descend'/)[0]) && /zoom:1/.test(html),
  'chapter splash covers as a painted plate, no extra zoom');
assert(!/VH\*\(PORT\?0\.80:0\.78\)/.test(html), 'intro no longer parks body text on a fixed 78% line over Descend');
assert(!/copyBot-lay\.h/.test(html), 'intro no longer shoves body text against the bottom band');
assert(/FONT_DISPLAY/.test(html.match(/function drawIntro\(g\)\{[\s\S]*?menuBtn\(g,'Descend'/)[0]),
  'intro gold title uses the display face');
assert(/MUSIC_LABEL\.chapter/.test(html.match(/function drawIntro\(g\)\{[\s\S]*?menuBtn\(g,'Descend'/)[0]),
  'intro title card includes the music credit');
assert(/enterPlayFromIntro/.test(html), 'Descend waits for world art instead of presenting a half-loaded frame');

assert(/function drawChapterSelect\(g\)\{/.test(html), 'drawChapterSelect exists');
assert(/SPR\.chapters_plate/.test(html), 'chapter select uses the painted chapters plate, not a screenshot strip');
assert(/cols=PORT\?1:2/.test(html), 'chapter select is at most two columns so sentences fit');
assert(!/VW>980\?3:2/.test(html), 'chapter select is not a three-column thumbnail grid');
assert(/wrapLines\(g, m\.t/.test(html), 'chapter select wraps titles instead of ellipsizing them');
assert(/wrapLines\(g, intro\.fl\|\|m\.s\|\|''/.test(html), 'chapter select shows full CH_INTRO flavor sentences');
assert(!/\.slice\(0,2\)/.test(html), 'chapter select does not clip subtitles to two lines');
assert(!/PORT\?92\*s:148\*s/.test(html), 'chapter cards are not height-capped into a bottom strip');
assert(/centerCopyY\(y\+pad, y\+ch-pad, lay\.h\)/.test(html), 'chapter-select body text is centered in each card');
assert(/yy=t0\+labSize/.test(html) && /yy\+=labGap/.test(html),
  'chapter-select CHAPTER label sits above the gold title with a gap, not overlapping it');
assert(!/ellipsize\(g,m\.t/.test(html), 'chapter select does not cut titles with ellipses');
assert(!/drawArtRect\(g, chapterSplashImg/.test(html), 'chapter select is not a tiny text box on a screenshot');

function centerCopyY(ceil, floor, blockH){
  const mid=(ceil+floor)*0.5;
  let y=mid-blockH*0.5;
  if(y<ceil) y=ceil;
  if(y+blockH>floor) y=Math.max(ceil, floor-blockH);
  return y;
}
function checkIntroBand(name, vw, vh, port){
  const s=Math.min(1.30, Math.max(0.66, Math.min(vw,vh)/(port?430:700)));
  const descendY=vh-(port?52:48)*s;
  const descendH=50*s;
  const descendTop=descendY-descendH/2;
  const groupCeil=vh*(port?0.048:0.038);
  const groupFloor=descendTop-16*s;
  const titleSize=(port?24:34)*s;
  const titleGap=36*s;
  const flSize=(port?18:22)*s;
  const labSize=(port?12:14)*s;
  const blockH=labSize+10*s+titleSize*1.18+titleGap+flSize*1.36*3+14*s+9*s*1.35;
  let t0=groupCeil;
  if(t0+blockH>groupFloor) t0=Math.max(8*s, groupFloor-blockH);
  const titleY=t0+labSize+10*s+titleSize;
  const flavorY=titleY+titleSize*0.18+titleGap;
  assert(groupCeil<vh*0.055, name+': title block starts near the top (ceil='+groupCeil.toFixed(1)+')');
  assert(titleY<vh*0.22, name+': gold chapter title sits in the upper fifth (y='+titleY.toFixed(1)+')');
  assert(flavorY-titleY>=26*s, name+': generous air between title and flavor ('+(flavorY-titleY).toFixed(1)+'px)');
  assert(groupFloor<descendTop, name+': story plate ends above Descend');
  assert(t0+blockH<=groupFloor+0.01 || t0<=groupCeil+0.01,
    name+': titles stay high without running into Descend');
  assert(flavorY<descendTop-8*s, name+': flavor does not crowd Descend');
}
checkIntroBand('desktop 1440x900', 1440, 900, false);
checkIntroBand('phone 390x844', 390, 844, true);

const crush=html.match(/function drawCrushedKin\(g,e\)\{[\s\S]*?\n\}/);
assert(!!crush, 'drawCrushedKin exists');
assert(/dwarfH=entSpriteH\(\{kind:'dwarf'\}/.test(html), 'fallen kin size is keyed to living dwarf height');
assert(/maxW=dwarfH\*1\.12/.test(html) && /maxH=dwarfH\*0\.82/.test(html), 'crush sprites stay near Macar scale, not giant close-ups');
assert(!/128\*z/.test(html.match(/function drawCrushedKin[\s\S]*function blitCrushRock/)[0]) &&
  !/TW\*1\.55/.test(html.match(/function drawCrushedKin[\s\S]*function blitCrushRock/)[0]),
  'old 128*z / TW*1.55 crush draw size is gone');
assert(/ellipse\(2\*z, 8\*z, 20\*z, 9\*z/.test(html), 'crush glow matches dwarf footprint, not a half-screen ring');
assert(/drawKinRubbleOverlay/.test(html), 'fallen kin draw crush/rubble over the bodies');

assert(/HUD_DESK_WIDE=1280/.test(html), 'desktop HUD wide breakpoint is 1280px');
assert(/HUD_DESK_SLOT_MIN=60/.test(html), 'desktop HUD icons floor at 60px');
assert(/HUD_DESK_SLOT_MAX=80/.test(html), 'desktop HUD icons may reach 80px');
assert(/HUD_TAP=44/.test(html), 'mobile HUD_TAP stays 44');
assert(/HUD_OVERFLOW=\{\}/.test(html), 'mobile HUD has no Rally overflow icon');
assert(!/#dgBtn\{position:fixed;left:8px;bottom:8px/.test(html), 'diagnostic flag is still off the stick');

/* Desktop bar math for a 1440×900 mouse layout (not a phone). */
function deskSim(vw, vh, s){
  const padL=8, padR=8;
  const deskWide=vw>=1280;
  const stickR=(deskWide?42:34)*s;
  const stickX=padL+14*s+stickR;
  const gap=5*s;
  const perRow=11;
  const rightReserve=padR+10*s;
  const stickReserve=stickX+stickR+12*s;
  const availW=Math.max(180, vw-stickReserve-rightReserve);
  const slotMin=deskWide?60:46;
  const slotMax=deskWide?80:56;
  const slot=Math.min(slotMax, Math.max(slotMin, (availW-(perRow-1)*gap)/perRow));
  return {slot, deskWide, availW};
}

const wide=deskSim(1440, 900, Math.min(1440,900)/700);
assert(wide.deskWide, '1440×900 is a desktop-wide layout');
assert(wide.slot>=60, '1440×900 skill slots are at least 60px (got '+wide.slot.toFixed(1)+')');
assert(wide.slot>46, '1440×900 slots are larger than the old 46px cap');

const hd=deskSim(1920, 1080, 1.30);
assert(hd.slot>=60, '1920×1080 skill slots are at least 60px (got '+hd.slot.toFixed(1)+')');

const phoneLike=deskSim(390, 844, 390/430);
assert(phoneLike.slot<=56, 'narrow widths do not take the 60px desktop floor when not wide');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nBook I presentation checks passed');
