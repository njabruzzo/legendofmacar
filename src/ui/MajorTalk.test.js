'use strict';
/**
 * Quill major-hail trees — keys, who, line, choices verbatim.
 * Run: node src/ui/MajorTalk.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');
require('./MajorTalk.js');
const MT=globalThis.MajorTalk;
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

assert(!!MT, 'MajorTalk module loads');
assert(/src\/ui\/MajorTalk\.js/.test(html), 'index.html loads MajorTalk');

const talk=html.match(/const NPC_TALK=\{[\s\S]*?\n\};/)[0];
assert(!!talk, 'NPC_TALK block found');

['toy_find','toy_wind','goblin_mercy','web_skeleton','web_skeleton_more',
 'shaman_hail','shaman_bargain','shaman_chant','shaman_blood','goblin_yield'].forEach(k=>{
  assert(new RegExp(k+':\\{').test(talk), k+' is untouched in NPC_TALK');
});

function pack(key){
  const re=new RegExp(key+':\\{[\\s\\S]*?\\n  \\},');
  const m=talk.match(re) || talk.match(new RegExp(key+':\\{[\\s\\S]*?\\n  \\}'));
  assert(!!m, key+' pack is extractable');
  return m?m[0]:'';
}

const spider=pack('spider_lord');
assert(/who:'SPIDER LORD'/.test(spider), 'spider_lord who');
assert(/Soft meat\. The deep is quieter\. I keep the quiet\./.test(spider), 'spider_lord line');
assert(/t:'Cut the silk\.'/.test(spider) && /say:'MACAR: "Cut it\."'/.test(spider), 'Cut the silk');
assert(/t:'What is quieter\?'/.test(spider) && /Something that eats drums/.test(spider), 'What is quieter');
assert(/t:'Steel\.'/.test(spider) && /say:'MACAR: "Steel\."'/.test(spider), 'spider Steel say');
assert(/then:\(\)=>\{ majorTalkFight\(\); \}/.test(spider), 'spider choices fight');

const king=pack('goblin_king');
assert(/who:'GOBLIN KING'/.test(king), 'goblin_king who');
assert(/This gold was dwarf-cut\. Maglubiyet fattened me on it\. You will make more\./.test(king),
  'goblin_king line');
assert(/t:'That gold is ours\.'/.test(king) && /t:'What fattens you\?'/.test(king), 'king choices');
assert(/The hole under the throne\. It breathes when I sit\./.test(king), 'king reply');
assert(/majorTalkFight\(\)/.test(king) && !/shamanSkipKing/.test(king),
  'no then\(\) skips the king');

const war=pack('goblin_warlord');
assert(/who:'GOBLIN WARLORD'/.test(war) && /Drums\. Always drums\. Not mine\. From under\./.test(war),
  'warlord line');
assert(/We keep them fed so they stay down\./.test(war), 'warlord reply');
assert(/t:'Steel\.'/.test(war) && /then:\(\)=>\{ majorTalkFight\(\); \}/.test(war), 'warlord Steel fights');

const chief=pack('goblin_chieftain');
assert(/who:'GOBLIN CHIEFTAIN'/.test(chief), 'chieftain who');
assert(/The fat one eats first\. The hole eats last\. I do not look down\./.test(chief),
  'chieftain line');
assert(/Bones go in\. Warm air comes out\. I will not\./.test(chief), 'chieftain reply');

const boss=pack('goblin_boss');
assert(/who:'GOBLIN BOSS'/.test(boss), 'boss who');
assert(/Painted hole first\. Then the deep hole\. Then you\. I run last\./.test(boss), 'boss line');
assert(/Not the painted one\. Under that\. Maglubiyet's mouth\./.test(boss)
  || /Maglubiyet\\'s mouth/.test(boss), 'boss reply');

const kob=pack('kobold_chief');
assert(/who:'KOBOLD CHIEF'/.test(kob), 'kobold who');
assert(/Goblin-kings keep the down-stairs\. We keep the count\. The count is wrong\./.test(kob),
  'kobold line');
assert(/More holes than maps\. One hole has no goblin smell\./.test(kob), 'kobold reply');

const steel=pack('shaman_steel');
assert(/who:'GOBLIN SHAMAN'/.test(steel), 'shaman_steel who');
assert(/Maglubiyet is not in the hall\. He is under it\./.test(steel), 'shaman_steel line');
assert(/t:'Then I go under\.'/.test(steel) && /t:'Steel\.'/.test(steel), 'shaman_steel choices');
assert(!/shamanSteelFirst|shamanDarknessOnTile|shamanPayTribute/.test(steel),
  'shaman_steel does not rewrite hail then()');

assert(MT.talkKey({name:'Thin One', kind:'statue'})==='', 'Thin Ones mute');
assert(MT.talkKey({name:'RUBY WARDEN', kind:'warden', boss:1})==='', 'Ruby Warden skipped');
assert(MT.talkKey({name:'Spider Lord', boss:1, kind:'spider'})==='spider_lord', 'lord key');
assert(MT.talkKey({name:'Goblin King'})==='goblin_king', 'king key');
assert(MT.talkKey({name:'Goblin Warlord'})==='goblin_warlord', 'warlord key');
assert(MT.talkKey({name:'Goblin Chieftain'})==='goblin_chieftain', 'chieftain key');
assert(MT.talkKey({name:'Goblin Boss'})==='goblin_boss', 'boss key');
assert(MT.talkKey({name:'Kobold Chief'})==='kobold_chief', 'kobold key');
assert(MT.talkKey({name:'Goblin Shaman', shaman:1}, {})==='shaman_steel',
  'shaman_steel only if hail never opened');
assert(MT.talkKey({name:'Goblin Shaman', shaman:1}, {shamanHailed:1})==='',
  'existing shaman parley is not replaced');

assert(/function maybeMajorTalks\(/.test(html) && /interact\('Speak'/.test(html),
  'Speak prompt in range — no new HUD key');
assert(/function maybeOpenMajorTalkOnAggro\(/.test(html), 'first aggro opens the hail once');
assert(/e\.majorTalked=1/.test(html), 'once per entity');
assert(!/key==='talk'/.test(html.match(/const HUDSKILLS=\[[\s\S]*?\];/)[0]),
  'Helm HUD is not given a Talk verb');
assert(/label:'SEARCH'/.test(html.match(/\{key:'search'[\s\S]*?\}/)[0]),
  'SEARCH label stays on the plant verb');

const intro=html.match(/const CH_INTRO=\{[\s\S]*?\n\};/)[0];
assert(!/spider_lord|goblin_king|north hall|east stair|west door/i.test(intro),
  'no compass and no major hail jammed into CH_INTRO');

['spider_lord','goblin_king','goblin_warlord','goblin_chieftain','goblin_boss','kobold_chief','shaman_steel'].forEach(k=>{
  const body=pack(k);
  assert(!/\bnorth\b|\bsouth\b|\beast\b|\bwest\b/i.test(body), k+' has no compass');
});

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nmajor talk checks passed');
