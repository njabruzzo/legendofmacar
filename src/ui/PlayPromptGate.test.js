'use strict';
/**
 * World prompts are a play-field plate. They must not paint or take taps
 * over Pack, camp, pause, the rest card, craft, trade, or a dialogue.
 * Shift+9 (an ordinary AZERTY 9) must not kill foes outside dev.
 * Run: node src/ui/PlayPromptGate.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}
function fn(name){
  const m=html.match(new RegExp('function '+name+'\\([^)]*\\)\\{[\\s\\S]*?\\n\\}'));
  assert(!!m, name+' exists');
  return m?m[0]:'';
}

const gate=fn('playFieldPlates');
const plates=fn('drawPlayPlates');
assert(/G\.scene==='play' && !G\.paused && !G\.sleepShow/.test(gate),
  'play plates require the live play field, not pause or the rest card');

assert(!/G\.scene!=='play' && G\.scene!=='pack'/.test(plates),
  'pack is no longer a second scene that receives play plates');
assert(/promptBtn=null/.test(plates.slice(0, plates.indexOf('drawTalk'))),
  'camp clears the prompt hit rect before it paints');
assert(plates.indexOf('drawPromptBtn')<0 || plates.indexOf('drawPromptBtn')>plates.indexOf('if(field){'),
  'the prompt is not drawn on the camp path');

const fieldAt=plates.indexOf('if(field){');
const afterField=plates.indexOf('promptBtn=null;\n  drawTalk(g);');
assert(fieldAt>0 && afterField>fieldAt, 'non-play dialogue is a talk-only tail');
const fieldBody=plates.slice(fieldAt, afterField);
const tail=plates.slice(afterField);
assert(/drawPromptBtn\(g,s\)/.test(fieldBody), 'the prompt still draws on the play field');
assert(/if\(G\.talk \|\| G\.inspect\) promptBtn=null/.test(fieldBody),
  'a dialogue or kin sheet clears the prompt instead of painting it');
assert(fieldBody.indexOf('if(G.talk || G.inspect) promptBtn=null')<fieldBody.indexOf('drawPromptBtn(g,s)'),
  'the prompt is skipped while a dialogue owns the screen');
assert(/drawHint\(g,s\)/.test(fieldBody) && /drawInspect\(g,s\)/.test(fieldBody) &&
  /if\(G\.scene==='play'\) drawLog\(g,s\)/.test(fieldBody),
  'hint, inspect, and the combat log stay on the play field');
assert(!/drawPromptBtn|drawHint|drawInspect|drawLog/.test(tail),
  'pack dialogue does not bring the prompt, hint, inspect, or log with it');
assert(/drawTalk\(g\)/.test(tail), 'stone-mouth talk still paints over the pack');
assert(/if\(!field && !packTalk\)\{\s*promptBtn=null;/.test(plates),
  'pack, pause, craft, trade, and menus drop the prompt hit rect');
const sleepHint=plates.indexOf("if(G.scene==='play'&&G.sleepShow&&!G.paused&&G.hint)");
const platesReturn=plates.indexOf('if(!field && !packTalk)');
assert(sleepHint>0 && sleepHint<platesReturn, 'the rest-card hint is drawn before the play-plate return');
assert(/drawHint\(g,UIS\)/.test(plates.slice(sleepHint, platesReturn+1)),
  'the rest card paints the camp hint');
assert(!/drawPromptBtn|drawLog|drawInspect/.test(plates.slice(sleepHint, platesReturn)),
  'the rest card does not bring the prompt, log, or kin sheet with the hint');
assert(/Macar camps\. Hit points restored\./.test(html) && /Macar camps\. Already whole\./.test(html) &&
  /The book is marked\./.test(html),
  'camp rest still writes the book-marked hint');

const hud=fn('drawHUD');
assert(/if\(playFieldPlates\(\)\) drawObjectives\(g,s\)/.test(hud),
  'QUEST draws only on the live field, the same rule as the combat log');
assert(/UI\.objHit=null; UI\.objPanel=null/.test(hud),
  'pause and the rest card drop the QUEST hit rect');

const open=fn('openPackMenu');
assert(!/PROMPT\s*=/.test(open), 'opening the pack does not throw away the world prompt');

function runGate(G){
  const ctx={G:G};
  vm.createContext(ctx);
  vm.runInContext(gate+'\nthis.on=playFieldPlates();', ctx);
  return ctx.on;
}
assert(runGate({scene:'play', paused:false, sleepShow:null})===true, 'live play draws plates');
['pack','camp','craft','trade','dead','win','title','title_menu','chapters','credits'].forEach(scene=>{
  assert(runGate({scene:scene, paused:false, sleepShow:null})===false, scene+' does not take play plates');
});
assert(runGate({scene:'play', paused:true, sleepShow:null})===false, 'pause does not take play plates');
assert(runGate({scene:'play', paused:false, sleepShow:{t:0}})===false, 'the rest card does not take play plates');

function runPlates(G){
  const calls=[];
  const ctx={
    G:G, UIS:1, promptBtn:{x:1,y:2,w:3,h:4},
    beginUiLayer(){ calls.push('layer'); },
    drawHint(){ calls.push('hint'); },
    drawTalk(){ calls.push('talk'); },
    drawLog(){ calls.push('log'); },
    drawPromptBtn(){ calls.push('prompt'); },
    drawInspect(){ calls.push('inspect'); },
  };
  vm.createContext(ctx);
  vm.runInContext(gate+'\n'+plates+'\ndrawPlayPlates(null);', ctx);
  return {calls:calls, promptBtn:ctx.promptBtn};
}
const restHint=runPlates({
  scene:'play', paused:false, sleepShow:{t:1,dur:5},
  hint:{text:'Macar camps. Hit points restored. The book is marked.', life:4},
});
assert(restHint.calls.indexOf('hint')>=0 && restHint.calls.indexOf('layer')===0,
  'the rest-card hint is visible on the card');
assert(restHint.calls.indexOf('prompt')<0 && restHint.calls.indexOf('log')<0 &&
  restHint.calls.indexOf('inspect')<0 && restHint.calls.indexOf('talk')<0,
  'the rest card shows only the camp hint');
assert(restHint.promptBtn===null, 'the rest-card hint does not leave a prompt hit rect');
const restQuiet=runPlates({scene:'play', paused:false, sleepShow:{t:1,dur:5}, hint:null});
assert(restQuiet.calls.length===0 && restQuiet.promptBtn===null,
  'a rest card with no hint stays blank');
const restPaused=runPlates({
  scene:'play', paused:true, sleepShow:{t:1,dur:5},
  hint:{text:'Macar camps. Hit points restored. The book is marked.', life:4},
});
assert(restPaused.calls.length===0 && restPaused.promptBtn===null,
  'a paused rest card draws nothing, hint included');

const onDown=html.match(/function onDown\([\s\S]*?\nfunction onMove/)[0];
assert(/promptBtn&&x>=promptBtn\.x[\s\S]*?!G\.inspect/.test(onDown),
  'a prompt under the kin sheet does not take the tap');
assert(/if\(G\.scene!=='play'\|\|G\.paused\)\{ IN\.taps\.push/.test(onDown),
  'pack and pause taps never enter the prompt hit test');

const consume=fn('consumePlayUiTap');
const taps=fn('resolveTaps');
assert(/G\.scene==='play'&&!G\.paused&&!G\.sleepShow&&!G\.inspect&&promptBtn/.test(consume),
  'queued play taps ignore a prompt that is not on the live field');
assert(/G\.scene==='play'&&!G\.paused&&!G\.sleepShow&&!G\.inspect&&promptBtn/.test(taps),
  'resolveTaps ignores a prompt that is not on the live field');

const dev=fn('devDebugEnabled');
const kill=fn('debugKillOnScreen');
assert(/if\(!devDebugEnabled\(\)\) return;/.test(kill),
  'debugKillOnScreen refuses to run for players');
assert(kill.indexOf('if(!devDebugEnabled()) return;')<kill.indexOf('damage('),
  'the dev gate is ahead of the kill');
const keys=html.match(/window\.addEventListener\('keydown'[\s\S]*?\n\}\);/)[0];
assert(/devDebugEnabled\(\) && e\.shiftKey && \(e\.code==='Digit9' \|\| e\.key==='9'\)/.test(keys),
  'Shift+9 reaches the kill only through the dev gate');
assert(!/if\(e\.key==='9' && e\.shiftKey\) debugKillOnScreen\(\)/.test(keys),
  'the ungated AZERTY 9 chord is gone');

function runDev(location){
  const ctx={location:location};
  vm.createContext(ctx);
  vm.runInContext(dev+'\nthis.ok=devDebugEnabled();', ctx);
  return ctx.ok;
}
assert(runDev({hostname:'legendofmacar.com', search:'', hash:''})===false,
  'the live site cannot kill foes');
assert(runDev({hostname:'www.legendofmacar.com', search:'', hash:''})===false,
  'www cannot kill foes');
assert(runDev({hostname:'legendofmacar.com', search:'?debug=1', hash:''})===true,
  '?debug=1 arms the hotkey on the live host');
assert(runDev({hostname:'example.com', search:'', hash:'#debug=1'})===true,
  '#debug=1 arms the hotkey');
assert(runDev({hostname:'localhost', search:'', hash:''})===true, 'localhost keeps the hotkey');
assert(runDev({hostname:'127.0.0.1', search:'', hash:''})===true, '127.0.0.1 keeps the hotkey');
assert(runDev({hostname:'::1', search:'', hash:''})===true, '::1 keeps the hotkey');
assert(runDev({hostname:'[::1]', search:'', hash:''})===true, 'the browser [::1] host keeps the hotkey');
assert(runDev({hostname:'', search:'', hash:''})===false, 'a blank host does not count as dev');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nPlay prompt gate checks passed');
