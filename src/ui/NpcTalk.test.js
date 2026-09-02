'use strict';
/**
 * Quill NPC talk: replace Noz / face copy, ruby door is a talk, rise and
 * camp keys ride startTalk / pickTalk. CH_INTRO plates stay.
 * Run: node src/ui/NpcTalk.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

assert(/const CH_INTRO=\{/.test(html), 'CH_INTRO plates stay');
assert(/function startTalk\(key\)\{/.test(html) && /function pickTalk\(i\)\{/.test(html),
  'talk engine is not rewritten');
assert(/function startTalkObj\(pack\)\{/.test(html), 'startTalkObj still builds G.talk');

const talk=html.match(/const NPC_TALK=\{[\s\S]*?\n\};/)[0];
assert(!!talk, 'NPC_TALK block found');

['noz_untie','noz_bell','noz_trade_again','dwarf_face','ruby_door',
 'rise_pordum','rise_fendur','rise_orbo','rise_talpor',
 'camp_pordum','camp_fendur','camp_orbo','camp_talpor'].forEach(k=>{
  assert(new RegExp(k+':\\{').test(talk), k+' is in NPC_TALK');
});

assert(/Run\. We hold\./.test(talk) && /Why keep a gnome\?/.test(talk) && /Stay with us\./.test(talk),
  'noz_untie choices');
assert(/G\.talkAfter=sendHome/.test(html), 'untie still sendHome after talk');
assert(/noz\.fleeTo=null; noz\.fleePath=null/.test(talk), 'Stay with us still clears flee');

assert(/Show your wares\./.test(talk) && /That door\./.test(talk) && /Farewell\./.test(talk),
  'noz_bell choices');
assert(/Trade, then\. I stay on my side\./.test(talk), 'noz_trade_again line');

assert(/The mouth is open\. Old work\. Hungry work\./.test(talk), 'dwarf_face line');
assert(/Offer it something\./.test(talk) && /Ask what it wants\./.test(talk),
  'dwarf_face offer and ask');
assert(/The jaws wait\. Drop it in\?/.test(html) && /key:'face_drop'/.test(html),
  'face_drop keeps startTalkObj and then');
assert(/then:\(\)=>dropInDwarfMouth\(r\)/.test(html), 'face_drop still drops');

assert(/who:'THE DOOR'/.test(talk) && /Lay a hand on it\./.test(talk) && /Not yet\./.test(talk),
  'ruby_door talk');
assert(/interact\('Touch the ruby door',\(\)=>startTalk\('ruby_door'\)\)/.test(html),
  'Ch I ruby door opens talk instead of instant wake');
assert(/function wakeRubyDoor\(\)\{/.test(html) && /then:\(\)=>wakeRubyDoor\(\)/.test(talk),
  'wake lives in ruby_door choice 1');
assert(/L\.flags\.touched=1/.test(html.match(/function wakeRubyDoor\(\)\{[\s\S]*?\n\}/)[0]),
  'Not yet does not set touched — only wakeRubyDoor does');
assert(/FOE\.statue\(\)/.test(html.match(/function wakeRubyDoor\(\)\{[\s\S]*?\n\}/)[0]),
  'wake still spawns the six guardians');

assert(/startTalk\(riseKey\)/.test(html) && /talkKinKey\(k\)/.test(html),
  'makeGhostAlly starts rise talk after the raise');
assert(/pordoom:'PORDUM:/.test(html) && /function returnGhost\(/.test(html),
  'GHOST_RISE table and returnGhost stay');
assert(/GHOST_RETURN_LINE\[k\]/.test(html), 'return-to-life stay as say()');
assert(/Catch, you grave-robbing lump/.test(html), 'Pordum daily bomb gift stays say()');
assert(/Heads down\. Short fuse/.test(html), 'Pordum throw line stays say()');

assert(/name:'Speak with '\+r\.name/.test(html), 'camp Other has Speak with kin');
assert(/campTalkDay/.test(html), 'camp talk is once per rest');
assert(/Does not use Save/.test(html), 'camp Speak copy does not steal Save');
assert(/menuHits\.unshift\.apply\(menuHits, footHits\)/.test(html),
  'Save hit is still tested before camp rows');

const plates=html.match(/function drawPlayPlates\(g\)\{[\s\S]*?\n\}/)[0];
assert(/if\(G\.scene==='camp'\)\{/.test(plates) && /drawTalk\(g\)/.test(plates),
  'camp talk paints on the post-terrain plate pass');
assert(/UI\.talkHits\.push/.test(html.match(/function drawTalk\(g\)\{[\s\S]*?\n\}/)[0]),
  'talk choices stay tappable');

assert(!/const CH_INTRO=[\s\S]{0,80}ruby_door/.test(html),
  'ruby_door is not jammed into CH_INTRO');

['shaman_hail','shaman_bargain','shaman_chant','shaman_blood','goblin_yield'].forEach(k=>{
  assert(new RegExp(k+':\\{').test(talk), k+' is in NPC_TALK');
});
assert(/Maglubiyet, still their tongues/.test(talk), 'shaman_chant Maglubiyet line');
assert(/shamanSteelFirst\(\)/.test(talk) && /Bless/.test(html), 'hail Steel first then() Bless');
assert(/shamanDarknessOnTile\(\)/.test(talk) && !/shamanCauseFear\(\)/.test(talk.match(/shaman_hail:[\s\S]*?shaman_bargain/)[0]),
  'hail walk/linger is Darkness, not Cause Fear');
assert(/shamanPayTribute\(\)/.test(talk) && /shamanSkipKing/.test(html), 'pay tribute skips shaman at king');
assert(/shamanKneelFearBless\(\)/.test(talk), 'kneel is Cause Fear + Bless');
assert(/shamanHoldMacar\(\)/.test(talk) && /roundSec\(11\)/.test(html), 'no bargain Hold Person 11 rds');
assert(/shamanInterruptChant\(\)/.test(talk) && /Silence does not land/.test(html), 'interrupt: Silence does not land');
assert(/shamanFinishSilence\(\)/.test(talk), 'let him finish lands Silence');
assert(/shamanStrikeNow\(\)/.test(talk), 'Strike now interrupts with surprise');
assert(/shamanSendPack\(\)/.test(talk) && /king is not in this deal/.test(html), 'send them: pack flees, king not in deal');
assert(/shamanSilenceTalpor\(\)/.test(talk), 'Silence the sun-staff');
assert(/shamanDarknessOnMelee\(\)/.test(talk), 'blood No is Darkness on melee');
assert(/goblinHonestYield\(\)/.test(talk) && !/goblinBetrayalSwing\(\)/.test(talk.match(/goblin_yield:[\s\S]*?\n  \}/)[0]),
  'goblin_yield has no betrayal swing');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nNPC talk checks passed');
