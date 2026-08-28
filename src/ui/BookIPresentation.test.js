'use strict';
/**
 * Book I presentation: chapter-card copy, fallen-kin scale, desktop HUD size.
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
assert(/north wall/.test(block), 'Chapter I ask keeps the full ruby-door sentence');
assert(/Pordum, Fendur, Orbo and Talpor/.test(block), 'Chapter I names the four fallen kin');
assert(/Walk to each of them and Rouse them/.test(block), 'Chapter I ask raises all four as ghosts');
assert(!/Raise only Pordum and Fendur/.test(block), 'Chapter I no longer says raise only two');
assert(!/Take kit from the other two/.test(block), 'Chapter I no longer treats Orbo and Talpor as loot-only');
assert(/gem-bronze door/.test(block) && /Spider Lord/.test(block), 'Chapter II intro copy is complete');
assert(/dead still walk/.test(block), 'Chapter III flavor is a full sentence');
assert(/water remembers the city/.test(block), 'Chapter IV flavor is a full sentence');
assert(/wore the crown out/.test(block), 'Chapter V flavor is a full sentence');
assert(/You are MACAR/.test(block), 'Every chapter card still addresses Macar');

assert(/function centerCopyY\(ceil, floor, blockH\)/.test(html), 'centerCopyY helper exists');

const drawIntro=html.match(/function drawIntro\(g\)\{[\s\S]*?\n\}/);
assert(!!drawIntro, 'drawIntro exists');
const di=drawIntro?drawIntro[0]:'';
assert(/descendTop=descendY-descendH\/2/.test(di), 'intro keeps a clear band above Descend');
assert(/centerCopyY\(copyCeil, copyFloor, lay\.h\)/.test(di), 'intro body is vertically centered between the gold title and Descend');
assert(/layoutIntroCopy/.test(di), 'intro copy wraps and shrinks to the band above Descend');
assert(/CH_INTRO\[L\.n\]/.test(di), 'intro draws CH_INTRO, not a clipped inline stub');
assert(/plateH=lay\.h\+platePad\*2/.test(di), 'intro plate wraps the copy block instead of stretching to Descend');
assert(!/if\(y<=copyBot\)/.test(di), 'intro does not clip wrapped lines against Descend');
assert(/ay:0\.40/.test(di) && /zoom:1/.test(di), 'chapter splash does not extra-zoom the foreground close-ups');
assert(!/VH\*\(PORT\?0\.80:0\.78\)/.test(di), 'intro no longer parks body text on a fixed 78% line over Descend');
assert(!/copyBot-lay\.h/.test(di), 'intro no longer shoves body text against the bottom band');
assert(/bigTitle\(g,L\.sub,titleY,titleSize\);\s*g\.textAlign='center'/.test(di),
  'intro restores center align after the gold title so body copy is not shoved to the right');

const select=html.match(/function drawChapterSelect\(g\)\{[\s\S]*?\n\}/);
assert(!!select, 'drawChapterSelect exists');
const ds=select?select[0]:'';
assert(/wrapLines\(g, m\.t/.test(ds), 'chapter select wraps titles instead of ellipsizing them');
assert(/wrapLines\(g, m\.s\|\|''/.test(ds), 'chapter select shows wrapped subtitles');
assert(!/\.slice\(0,2\)/.test(ds), 'chapter select does not clip subtitles to two lines');
assert(!/PORT\?92\*s:148\*s/.test(ds), 'chapter cards are not height-capped into a bottom strip');
assert(/centerCopyY\(y\+pad, y\+ch-pad, lay\.h\)/.test(ds), 'chapter-select body text is centered in each card');
assert(/g\.textAlign='center'/.test(ds), 'chapter-select copy is centered on the card');
assert(/yy=t0\+labSize/.test(ds) && /yy\+=labGap/.test(ds),
  'chapter-select CHAPTER label sits above the gold title with a gap, not overlapping it');
assert(!/ellipsize\(g,m\.t/.test(ds), 'chapter select does not cut titles with ellipses');

function centerCopyY(ceil, floor, blockH){
  const mid=(ceil+floor)*0.5;
  let y=mid-blockH*0.5;
  if(y<ceil) y=ceil;
  if(y+blockH>floor) y=Math.max(ceil, floor-blockH);
  return y;
}
function checkIntroBand(name, vw, vh, port){
  const s=Math.min(1.30, Math.max(0.66, Math.min(vw,vh)/(port?430:700)));
  const titleY=vh*(port?0.155:0.165);
  const titleSize=(port?22:30)*s;
  const musicY=titleY+(port?20:24)*s;
  const copyCeil=Math.max(titleY+titleSize*0.28, musicY)+22*s;
  const descendY=vh-48*s;
  const descendTop=descendY-50*s/2;
  const copyFloor=descendTop-18*s;
  const blockH=120*s;
  const y=centerCopyY(copyCeil, copyFloor, blockH);
  const mid=y+blockH/2;
  const bandMid=(copyCeil+copyFloor)/2;
  assert(copyCeil>titleY, name+': copy band starts below the gold title');
  assert(copyFloor<descendTop, name+': copy band ends above Descend');
  assert(Math.abs(mid-bandMid)<0.5, name+': copy block is centered in the title-to-Descend band');
  assert(mid>vh*0.32 && mid<vh*0.68, name+': copy sits in the middle of the screen (mid='+mid.toFixed(1)+')');
  assert(y+blockH<=copyFloor+0.01, name+': copy is not clipped by Descend');
}
checkIntroBand('desktop 1440x900', 1440, 900, false);
checkIntroBand('phone 390x844', 390, 844, true);

const crush=html.match(/function drawCrushedKin\(g,e\)\{[\s\S]*?\n\}/);
assert(!!crush, 'drawCrushedKin exists');
const ck=crush?crush[0]:'';
assert(/dwarfH=entSpriteH\(\{kind:'dwarf'\}/.test(ck), 'fallen kin size is keyed to living dwarf height');
assert(/maxW=dwarfH\*1\.12/.test(ck) && /maxH=dwarfH\*0\.82/.test(ck), 'crush sprites stay near Macar scale, not giant close-ups');
assert(!/128\*z/.test(ck) && !/TW\*1\.55/.test(ck), 'old 128*z / TW*1.55 crush draw size is gone');
assert(/ellipse\(2\*z, 8\*z, 20\*z, 9\*z/.test(ck), 'crush glow matches dwarf footprint, not a half-screen ring');

assert(/HUD_DESK_WIDE=1280/.test(html), 'desktop HUD wide breakpoint is 1280px');
assert(/HUD_DESK_SLOT_MIN=60/.test(html), 'desktop HUD icons floor at 60px');
assert(/HUD_DESK_SLOT_MAX=80/.test(html), 'desktop HUD icons may reach 80px');
assert(/HUD_TAP=44/.test(html), 'mobile HUD_TAP stays 44');
assert(/HUD_OVERFLOW=\{rally:1\}/.test(html), 'mobile Rally stays in More');
assert(!/#dgBtn\{position:fixed;left:8px;bottom:8px/.test(html), 'diagnostic flag is still off the stick');

/* Desktop bar math for a 1440×900 mouse layout (not a phone). */
function deskSim(vw, vh, s){
  const padL=8, padR=8, padB=8;
  const deskWide=vw>=1280;
  const stickR=(deskWide?42:34)*s;
  const stickX=padL+14*s+stickR;
  const gap=5*s;
  const perRow=12;
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
