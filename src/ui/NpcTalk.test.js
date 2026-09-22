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

['noz_untie','noz_bell','noz_trade_again','dwarf_face','ruby_door','ruby_door_look',
 'rubypillar_look','rubypillar_look_armed','rubypillar_touch','rubypillar_touch_locked',
 'ch1_lift_lever_look','ch1_lift_lever_thrown_look',
 'ch1_lift_pull','ch1_lift_pull_spent','cavein_behind_look',
 'rise_pordum','rise_fendur','rise_orbo','rise_talpor',
 'camp_pordum','camp_fendur','camp_orbo','camp_talpor',
 'toy_find','toy_wind','toy_grond','toy_teeth',
 'toy_ruby','toy_froren','toy_mordain','toy_anvil'].forEach(k=>{
  assert(new RegExp(k+':\\{').test(talk), k+' is in NPC_TALK');
});

function talkPack(key){
  const re=new RegExp(key+':\\{[\\s\\S]*?\\n  \\},');
  return (talk.match(re)||[''])[0];
}
function toyChoicesComplete(body){
  const m=body.match(/choices:\[([\s\S]*)\]/);
  if(!m) return false;
  const parts=m[1].split(/\{t:/).slice(1);
  return parts.length>0 && parts.every(p=>/\breply:/.test(p) || /\bthen:/.test(p));
}
['toy_find','toy_wind','toy_grond','toy_teeth','toy_ruby','toy_froren','toy_mordain','toy_anvil'].forEach(k=>{
  assert(toyChoicesComplete(talkPack(k)), k+' every choice has reply or then');
});
assert(/Ten empty sockets/.test(talk) && /Wind me, thick-skull/.test(talk),
  'toy_find names empty sockets');
assert(/then:\(\)=>\{ if\(G\.lvl\) G\.lvl\.flags\.toyWound=1; startTalk\('toy_wind'\)/.test(talkPack('toy_find')),
  'Wind it opens toy_wind and marks wound');
assert(/then:\(\)=>startTalk\('toy_froren'\)/.test(talkPack('toy_find')),
  'Who made you opens toy_froren');
assert(/What are those holes\?/.test(talkPack('toy_find')) && /Shake it\./.test(talkPack('toy_find')),
  'toy_find inspects sockets');
assert(/Your kin kissed Grond/.test(talk) && /then:\(\)=>startTalk\('toy_grond'\)/.test(talkPack('toy_wind')),
  'toy_wind names Grond and opens toy_grond');
assert(/then:\(\)=>startTalk\('toy_teeth'\)/.test(talkPack('toy_wind')),
  'toy_wind wires toy_teeth');
assert(/then:\(\)=>startTalk\('toy_ruby'\)/.test(talkPack('toy_wind')),
  'The ruby? opens toy_ruby');
assert(/Why insult me\?/.test(talkPack('toy_wind')), 'toy_wind has Why insult me');
assert(/Grond\. Deep hunger/.test(talkPack('toy_grond')) && /Who worshiped him\?/.test(talkPack('toy_grond')),
  'toy_grond pins hunger and worship');
assert(/then:\(\)=>startTalk\('toy_ruby'\)/.test(talkPack('toy_grond')),
  'toy_grond And the ruby opens toy_ruby');
assert(/then:\(\)=>startTalk\('toy_froren'\)/.test(talkPack('toy_grond')),
  'Was Froren of Grond opens toy_froren');
assert(/Ten teeth torn/.test(talkPack('toy_teeth')) && /Mordain\\'s holy hammer/.test(talkPack('toy_teeth')) &&
  /Anvil of Truth/.test(talkPack('toy_teeth')),
  'toy_teeth pins ten teeth, Mordain hammer, Anvil of Truth');
assert(/then:\(\)=>startTalk\('toy_mordain'\)/.test(talkPack('toy_teeth')),
  'Mordain hammer opens toy_mordain');
assert(/then:\(\)=>startTalk\('toy_anvil'\)/.test(talkPack('toy_teeth')),
  'Anvil of Truth opens toy_anvil');
assert(/Heart of it all\. Not a door/.test(talkPack('toy_ruby')) &&
  /The lust that called Grond down the hall/.test(talkPack('toy_ruby')),
  'toy_ruby pins lust-heart');
assert(/Soft Froren\. Tinker/.test(talkPack('toy_froren')) && /Not Grond\\'s\. Never Grond\\'s/.test(talkPack('toy_froren')),
  'toy_froren pins soft tinker not Grond');
assert(/then:\(\)=>startTalk\('toy_wind'\)/.test(talkPack('toy_froren')),
  'toy_froren Back returns to toy_wind');
assert(/Mordain\\'s holy hammer\. Not for ore/.test(talkPack('toy_mordain')),
  'toy_mordain line');
assert(/Anvil of Truth\. Soft Froren\\'s stand/.test(talkPack('toy_anvil')),
  'toy_anvil line');
assert(/interact\(L\.flags\.toyWound\?'Talk to the brass walker':'Wind the brass walker'/.test(html) &&
  /startTalk\(L\.flags\.toyWound\?'toy_wind':'toy_find'\)/.test(html),
  'winduptoy interact still toy_find / wound toy_wind');
assert(/G\.talk && e\.key>='1' && e\.key<='9'/.test(html),
  'talk keys 1-9 pick a choice');
assert(/\(talk\.choices\|\|\[\]\)\.forEach/.test(html.match(/function drawTalk\(g\)\{[\s\S]*?\n\}/)[0]),
  'drawTalk paints every choice');
assert(/170\*s\+n\*36\*s/.test(html.match(/function drawTalk\(g\)\{[\s\S]*?\n\}/)[0]),
  'talk plate grows for many choices');
assert(/const TOY_SCAMPER_SECS=5/.test(html) && /function kickToyScamper\(/.test(html),
  'toy scamper is 5s on talk end');
assert(/settleToyTalk\(\)/.test(html.match(/function pickTalk\(i\)\{[\s\S]*?\n\}/)[0]),
  'pickTalk settles toy scamper after then()');
assert(/if\(isToyTalkKey\(key\)\) G\.toyTalkEnded=null/.test(html.match(/function startTalk\(key\)\{[\s\S]*?\n\}/)[0]),
  'startTalk into a toy pack cancels pending scamper');

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

const doorPack=talkPack('ruby_door');
assert(/who:'THE DOOR'/.test(doorPack) && /The ruby is warm\. It knows this name\. It wants a hand\./.test(doorPack),
  'ruby_door talk');
assert(/Lay a hand on it\./.test(doorPack) && /Step back\./.test(doorPack) && /Leave it\./.test(doorPack),
  'ruby_door choices are Lay a hand, Step back, Leave it');
assert(/THE DOOR: \(silent heat\. The stone does not cool\.\)/.test(doorPack),
  'Step back is the door\'s silent heat');
assert(!/Not yet\./.test(doorPack), 'Not yet is not on the ruby door');
assert(/interact\('Touch the ruby door',\(\)=>startTalk\('ruby_door'\)\)/.test(html),
  'Ch I ruby door opens talk instead of instant wake');
assert(/function wakeRubyDoor\(\)\{/.test(html) && /then:\(\)=>wakeRubyDoor\(\)/.test(doorPack),
  'wake lives in ruby_door choice 1');
assert(/L\.flags\.touched=1/.test(html.match(/function wakeRubyDoor\(\)\{[\s\S]*?\n\}/)[0]),
  'Step back does not set touched — only wakeRubyDoor does');
assert(/FOE\.statue\(\)/.test(html.match(/function wakeRubyDoor\(\)\{[\s\S]*?\n\}/)[0]),
  'wake still spawns the six guardians');
assert(/QUILL_CH1_SAY\.rubypillar_appears/.test(
  html.match(/function wakeRubyDoor\(\)\{[\s\S]*?\n\}/)[0]),
  'wake seats a ruby on the center pillar at door touch, not after cleared');
assert(/A ruby is set in the door\. Warm to a dwarf palm\. It knows this name\. It wants a hand\./.test(talkPack('ruby_door_look')),
  'ruby_door_look is Quill\'s examine');
assert(/A ruby on a new pillar\. Cooler than the door\. It does not know a name yet\. It waits — for the lever, then a hand\./.test(talkPack('rubypillar_look')),
  'rubypillar_look is Quill\'s examine before the lever');
assert(/The ruby is brighter now\. The lever has spoken\. It wants a hand\./.test(talkPack('rubypillar_look_armed')),
  'rubypillar_look_armed is the examine after the lever');
const locked=talkPack('rubypillar_touch_locked');
assert(/The ruby sits quiet\. Cool\. It will not answer yet\./.test(locked)
  && /Cold\. Dead weight\. Something iron nearby still holds the dark shut\./.test(locked)
  && !/touchCh1RubyPillar|beginCh1ElevatorDescent|elevReady/.test(locked),
  'rubypillar_touch_locked speaks the cold line and does not descend');
assert(/who:'THE PILLAR'/.test(talkPack('rubypillar_touch'))
  && /The ruby burns\. The lever has already spoken\. Touch it and the dark below will answer\./.test(talkPack('rubypillar_touch'))
  && /then:\(\)=>touchCh1RubyPillar\(\)/.test(talkPack('rubypillar_touch')),
  'rubypillar_touch descends only after the lever');
assert(/who:'THE LEVER'/.test(talkPack('ch1_lift_pull')) && /Throw it\./.test(talkPack('ch1_lift_pull'))
  && /then:\(\)=>throwCh1LiftLever\(\)/.test(talkPack('ch1_lift_pull')) && /Leave it\./.test(talkPack('ch1_lift_pull')),
  'ch1_lift_pull throws the lever and does not descend inline');
assert(/A weathered iron lever by the pillar\. Dark knob\. Not candy\. Built to throw once and mean it\./.test(talkPack('ch1_lift_lever_look')),
  'upright lever examine');
assert(/The lever lies thrown\. The throw is spent\. The pillar's ruby is listening now\./.test(talkPack('ch1_lift_lever_thrown_look')),
  'thrown lever examine');
assert(/Spent\. The arm will not rise for you again\./.test(talkPack('ch1_lift_pull_spent'))
  && !/throwCh1LiftLever|elevReady/.test(talkPack('ch1_lift_pull_spent')),
  'a spent lever does not throw again');
assert(/The lever bites home\. Far below, something wakes — but the cage does not move\. The ruby on the pillar burns a shade brighter\./.test(html),
  'throwing the lever says the bite-home line and does not descend');
assert(/The tunnel behind you is dead stone\. Your brothers went under it\. The dark ahead does not care\./.test(talkPack('cavein_behind_look')),
  'cave-in behind examine');
assert(/interact\('Pull the lever'/.test(html) && /L\.flags\.leverThrown=1/.test(html),
  'Throw it persists leverThrown on the level flags');
assert(/Look at the ruby door/.test(html) && /Look at the ruby pillar/.test(html)
  && /Look at the lever/.test(html) && /Look at the cave-in/.test(html),
  'Ch1 examines use look prompts');

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
