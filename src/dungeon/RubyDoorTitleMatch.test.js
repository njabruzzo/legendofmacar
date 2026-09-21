'use strict';
/**
 * Chapter I ruby door accepts Disney's title-menu match.
 * The live sheet stays the current face plate until
 * assets/props/prop_rubydoor_signed.png lands. Touch, wakeRubyDoor,
 * and the six guardians do not read the sheet. Teeth chapel and the
 * elevator lever are out of scope.
 * Run: node src/dungeon/RubyDoorTitleMatch.test.js
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
  'ASSET_VER stays 102 — ruby door and title_menu are hooks, not a signed bind');

const start=html.indexOf('const SPRITE_FILES={');
const end=html.indexOf('const ICON_SPR={');
assert(start>=0 && end>start, 'sprite registry block is extractable');
const registry=new Function(html.slice(start, end)+'\nreturn SPRITE_FILES;')();

assert(registry.rubydoor==='assets/props/prop_rubydoor.png',
  'canonical hero path is assets/props/prop_rubydoor.png');
assert(registry.rubydoor_face==='assets/props/prop_rubydoor_face.png',
  'optional face plate stays prop_rubydoor_face.png');
assert(registry.rubydoor_signed==='assets/props/prop_rubydoor_signed.png',
  'SPRITE_FILES.rubydoor_signed accepts the title-menu door');
assert(!registry.rubydoor_w1 && !registry.rubydoor_w2 && !registry.rubydoor_signed_w1 && !registry.rubydoor_signed_w2,
  'ruby door does not register walk frames (they flickered in place)');
assert(registry.rubydoor_atk==='assets/props/prop_rubydoor_atk.png',
  'placeholder hero still derives a sprung _atk until a bind regenerates it');
assert(!registry.rubydoor_signed_atk,
  'the accept slot does not invent a signed attack frame');
assert(/'rubydoor_signed'/.test(html.match(/const first=\[[\s\S]*?\];/)[0]),
  'rubydoor_signed is in the first sprite queue');

assert(fs.existsSync(path.join(root,'assets/props/prop_rubydoor.png')),
  'placeholder hero remains on disk until Disney replaces it');
assert(fs.existsSync(path.join(root,'assets/props/prop_rubydoor_face.png')),
  'current face plate remains the live fallback');
assert(!fs.existsSync(path.join(root,'assets/props/prop_rubydoor_signed.png')),
  'Disney title-menu door is not bound yet');

assert(/title-menu ruby-door-hall/.test(html) && /central hexagonal ruby/.test(html),
  'registry documents the knotwork arch and central hexagonal ruby');
assert(/dwarven stone face/.test(html) && /assets\/ui\/title_menu\.jpg/.test(html),
  'door law names the title-menu billboard and the dwarven stone face');
assert(/prop_rubydoor_signed\.png/.test(html) && /bump ASSET_VER/.test(html),
  'bind note is: drop the signed sheet and bump ASSET_VER');

assert(/title_menu:'assets\/ui\/title_menu\.jpg'/.test(html),
  'second screen still hooks assets/ui/title_menu.jpg');
assert(/Right wall opened onto the dwarven/.test(html),
  'title_menu hook documents the opened right wall');
assert(!fs.existsSync(path.join(root,'assets/ui/title_menu.jpg')),
  'title_menu.jpg is not uploaded — path stays ready');

assert(/function rubyDoorSpriteKey\(\)\{/.test(html), 'rubyDoorSpriteKey exists');
const keyFn=html.match(/function rubyDoorSpriteKey\(\)\{[\s\S]*?\n\}/)[0];
assert(/SPR\.rubydoor_signed/.test(keyFn) && /return 'rubydoor_signed'/.test(keyFn),
  'a decoded signed sheet wins');
assert(/SPR\.rubydoor_face/.test(keyFn) && /return 'rubydoor_face'/.test(keyFn),
  'face plate stays until the signed sheet lands');
assert(/return 'rubydoor'/.test(keyFn), 'hero path is the last fallback');
assert(/if\(k==='rubydoor'\) return rubyDoorSpriteKey\(\)/.test(html),
  'propSpriteKey asks rubyDoorSpriteKey for the door');
assert(/SPR\[rubyDoorSpriteKey\(\)\]/.test(html),
  'door width uses the same sheet the chamber blits');

const wake=html.match(/function wakeRubyDoor\(\)\{[\s\S]*?\n\}/)[0];
assert(/L\.flags\.touched=1/.test(wake), 'wakeRubyDoor still sets touched');
assert(/FOE\.statue\(\)/.test(wake), 'wakeRubyDoor still spawns statue guardians');
assert(/\[\[33\.6,12\.4\],\[39\.2,12\.2\],\[32\.4,14\.6\],\[40\.1,14\.8\],\[36\.4,13\.6\],\[34\.8,15\.8\]\]/.test(wake),
  'the six guardian posts are unchanged');
assert(/The guardians wake from the stone around the door/.test(wake),
  'guardian wake line is unchanged');
assert(/then:\(\)=>wakeRubyDoor\(\)/.test(html), 'Lay a hand still wakes the door');
assert(/interact\('Touch the ruby door',\(\)=>startTalk\('ruby_door'\)\)/.test(html),
  'Touch the ruby door still opens the talk');
assert(/\{x:36\.5,y:7\.28,k:'rubydoor'\}/.test(html) && /\{x:43\.2,y:7\.28,k:'dwarfface'\}/.test(html),
  'door and dwarven face stay on the Chapter I north wall');

assert(/function buildTeethCrownRoom\(/.test(html), 'teeth chapel builder is untouched');
assert(/function paintCh1LiftLever\(/.test(html), 'elevator lever paint is untouched');
assert(/function wakeRubyDoor\(\)\{/.test(html), 'wakeRubyDoor is still the door-touch entry');

function rubyDoorSpriteKey(SPR){
  if(SPR.rubydoor_signed && SPR.rubydoor_signed.width) return 'rubydoor_signed';
  if(SPR.rubydoor_face && SPR.rubydoor_face.width) return 'rubydoor_face';
  return 'rubydoor';
}
{
  const signed={width:4}, face={width:4}, hero={width:4};
  assert(rubyDoorSpriteKey({rubydoor_signed:signed, rubydoor_face:face, rubydoor:hero})==='rubydoor_signed',
    'signed door outranks face and placeholder hero');
  assert(rubyDoorSpriteKey({rubydoor_face:face, rubydoor:hero})==='rubydoor_face',
    'without the signed file the face plate stays live');
  assert(rubyDoorSpriteKey({rubydoor:hero})==='rubydoor',
    'hero is used only when face and signed are both missing');
  assert(rubyDoorSpriteKey({})==='rubydoor',
    'missing sheets still name the hero key');
}

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nruby door title-menu match checks passed');
