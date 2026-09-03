'use strict';
/**
 * Major kills always drop the Quill scrap. Mundane — not magic.
 * Run: node src/loot/LoreClues.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');
require('./LoreClues.js');
require('../loot/SpiderLair.js');
const LC=globalThis.LoreClues;
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}
function extractFn(name){
  const re=new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}');
  const m=html.match(re);
  if(!m) throw new Error('missing '+name);
  return m[0];
}

assert(!!LC, 'LoreClues module loads');
assert(/src\/loot\/LoreClues\.js/.test(html), 'index.html loads LoreClues');

const expect={
  spider_lord:{n:'Torn Spinneret', d:'The silk runs down a crack no goblin dug. Whatever drinks the drums is under the last web.'},
  goblin_king:{n:'Stolen Throne-Nail', d:'A dwarf nail from under the seat. The throne is a lid. Something breathes when the fat one sits.'},
  goblin_warlord:{n:'Split Drum-Skin', d:'The beat comes up through the floor. They feed it so it does not climb.'},
  goblin_chieftain:{n:'Warm-Air Token', d:'Clay, black on one side, still warm. Things go in. Air comes out.'},
  goblin_boss:{n:'Painted Chip', d:'A flake of red mine-paint. The true dark starts where the paint stops.'},
  kobold_chief:{n:'Crooked Tally-Stick', d:'Notches past the last goblin mark. One notch has no tribe. The dark keeps going.'},
  shaman:{n:"Maglubiyet's Tooth", d:'A yellow tooth on a thong. It hums over any floor that is thinner than it looks.'}
};
Object.keys(expect).forEach(k=>{
  const row=LC.CLUES[k];
  assert(row && row.n===expect[k].n && row.d===expect[k].d, k+' clue text is verbatim');
});

assert(LC.clueKey({name:'Thin One', kind:'statue'})==='', 'Thin Ones are mute — no clue');
assert(LC.clueKey({name:'RUBY WARDEN', kind:'warden', boss:1})==='', 'Ruby Warden is Ch III — skipped');
assert(LC.clueKey({name:'Spider Lord', boss:1, kind:'spider'})==='spider_lord', 'Spider Lord clue key');
assert(LC.clueKey({name:'Goblin Shaman', shaman:1})==='shaman', 'shaman clue always, even without hail');

const majors=[
  {name:'Spider Lord', boss:1, kind:'spider'},
  {name:'Goblin King', boss:1, kind:'goblin'},
  {name:'Goblin Warlord', kind:'goblin'},
  {name:'Goblin Chieftain', kind:'goblin'},
  {name:'Goblin Boss', kind:'goblin'},
  {name:'Kobold Chief', kind:'kobold'},
  {name:'Goblin Shaman', shaman:1, kind:'goblin'}
];
majors.forEach(e=>{
  const pile=LC.attach({coins:{cp:3}, items:[]}, e);
  const clue=pile.items.find(it=>it&&it.k==='clue');
  const exp=expect[LC.clueKey(e)];
  assert(clue && clue.n===exp.n && clue.d===exp.d && clue.mundane===1,
    e.name+' kill pile includes the mundane scrap');
  assert(clue.k!=='misc' && !clue.plus && !clue.charges, e.name+' clue is not a magic item');
});

assert(/attachLoreClue\(pile, e\)/.test(html.match(/function foeDrop\([\s\S]*?\nfunction newGear/)[0]),
  'foeDrop attaches the scrap on the corpse pile');
assert(/it\.k==='clue'/.test(extractFn('takeLoot')), 'takeLoot stows clues, not giveMagic');
assert(/function giveClue\(/.test(html) && /pk\.notes/.test(extractFn('giveClue')),
  'giveClue writes pack notes');
assert(/kind:'note'/.test(html) && /tag:'Note'/.test(html),
  'pack rows show the scrap');

const ctx={
  G:{packs:{macar:{notes:[],potions:[],healPots:[],herbs:{},magic:[],gems:[]}}},
  lastSay:'',
  say(line){ ctx.lastSay=line; },
  ensurePacks(){},
  packOf(){ return ctx.G.packs.macar; },
  syncPackTotals(){}
};
vm.createContext(ctx);
vm.runInContext(extractFn('giveClue'), ctx);
ctx.giveClue(LC.forEntity({name:'Spider Lord', boss:1, kind:'spider'}));
assert(ctx.G.packs.macar.notes[0].n==='Torn Spinneret', 'pack shows Torn Spinneret');
assert(/into MACAR/.test(ctx.lastSay), 'stow line names the scrap');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nlore clue checks passed');
