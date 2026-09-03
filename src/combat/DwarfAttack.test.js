'use strict';
/**
 * Party dwarves share one world height from walk/idle into a short attack
 * cycle (strike + recover). New recover sheets are on disk and binary-alpha.
 * Run: node src/combat/DwarfAttack.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
const root=path.join(__dirname,'../../assets/creatures');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

assert(/function dwarfFigureFit\(/.test(html), 'all party dwarves share one figure-fit');
assert(/Do not scale attack 1\.29x/.test(html), 'attack pop scale is forbidden');
assert(!/macar_atk:1\.29/.test(html) && !/macar_axe_atk:1\.18/.test(html),
  'no 1.29 / 1.18 attack FIT leftovers');
assert(!/macar_atk:1\.11/.test(html) && !/macar_atk:1\.29/.test(html),
  'idle-height strike is not FIT-scaled');
assert(/function figurePersonFrac\(/.test(html), 'fit measures the person, not the weapon box');
assert(/SPRITE_FILES\[k\+'_atk_recover'\]='assets\/creatures\/dwarf_'\+k\+'_atk_recover\.png'/.test(html),
  'living kin recover sheets are registered');
assert(/wantsMeleeRecover\(e\) && SPR\[k\+'_atk_recover'\]/.test(html),
  'recover pose is a real second attack frame');
assert(/wantsMeleePose\(e\)\|\|wantsMeleeRecover\(e\)\) && SPR\[k\+'_atk'\]/.test(html),
  'strike frame holds through the blow');

['pordoom','fendur','orbo','talpor'].forEach(k=>{
  ['','_ghost'].forEach(g=>{
    const atk='dwarf_'+k+g+'_atk.png';
    const rec='dwarf_'+k+g+'_atk_recover.png';
    assert(fs.existsSync(path.join(root,atk)), atk+' on disk');
    assert(fs.existsSync(path.join(root,rec)), rec+' on disk');
  });
});
function pngSize(p){
  const b=fs.readFileSync(p);
  if(b[1]!==0x50 || b[2]!==0x4e || b[3]!==0x47) return null;
  return {w:b.readUInt32BE(16), h:b.readUInt32BE(20)};
}

assert(fs.existsSync(path.join(root,'dwarf_macar_atk.png')), 'title-law Macar strike is on disk');
const macarAtk=pngSize(path.join(root,'dwarf_macar_atk.png'));
assert(macarAtk && macarAtk.w===470 && macarAtk.h===512, 'title-law Macar strike is 470x512');
assert(!fs.existsSync(path.join(root,'dwarf_macar_atk_recover.png')), 'leftover Macar recover is gone');
assert(!fs.existsSync(path.join(root,'dwarf_macar_e_atk.png')), 'leftover east strike is gone');
assert(fs.existsSync(path.join(root,'dwarf_macar.png')), 'title-law idle remains the Macar identity');

['pordoom','fendur','orbo','talpor'].forEach(k=>{
  ['','_ghost'].forEach(g=>{
    const rec=pngSize(path.join(root,'dwarf_'+k+g+'_atk_recover.png'));
    const atk=pngSize(path.join(root,'dwarf_'+k+g+'_atk.png'));
    assert(atk && atk.h===512, k+g+' strike is 512 tall');
    assert(rec && rec.h===512 && rec.w>360, k+g+' recover is a painted sheet, not a filled box');
  });
});

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\ndwarf attack cycle checks passed');
