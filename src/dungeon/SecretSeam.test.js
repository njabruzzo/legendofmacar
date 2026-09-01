'use strict';
/**
 * Book I secret doors are a faded masonry wall on n/e/w faces, never south.
 * Run: node src/dungeon/SecretSeam.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

assert(/function secretFaceOk\(/.test(html) && /function normalizeSecretFace\(/.test(html),
  'south faces are normalized off the secret');
assert(/function fadeMasonryCanvas\(/.test(html) && /function drawSecretFadedFace\(/.test(html),
  'closed secret is a faded masonry face, not a door');
assert(/function fadeMasonryCanvas\(/.test(html)
  && /fillStyle='#8aa4bc'/.test(html)
  && /globalCompositeOperation='multiply'/.test(html),
  'secret wall is a cooler multiply of the live masonry tile');
assert(/sprReady\('secret_wall_n'\)/.test(html) && /sprReady\('secret_wall_e'\)/.test(html)
  && /sprReady\('secret_wall_w'\)/.test(html),
  'signed secret_wall n/e/w faces bind when those sheets decode');
assert(!/sprReady\('secret_wall_s'\)/.test(html) && !/secret_wall_s/.test(html),
  'no south secret-wall sheet');
assert(!/function drawSecretSeamTint\(/.test(html) && !/fillStyle='#9bb3c6'/.test(html),
  'old grey-blue multiply seam is gone');
assert(!/g\.globalAlpha=0\.34/.test(html) || !/fillStyle='#6f8498'/.test(html),
  'old 0.34 wash is gone');
assert(/function markSecretProps\(L\)\{\s*\/\* Closed secret is a tinted masonry seam/.test(html)
  || /Closed secret is a tinted masonry seam/.test(html)
  || /Closed secret is a tinted masonry seam, not a door billboard/.test(html),
  'markSecretProps does not plant a secret_door billboard');
assert(!/G\.props\.push\(\{x,y,k:'secret_door'/.test(html),
  'no extra door prop on a closed secret');

assert(!/addSecretDoor\(L,\{[^}]*face:'s'/.test(html),
  'no Book I secret is placed on a south face');
assert(/face:'n',vaultFace:'s'/.test(html),
  'ch3/ch4 keep the old vault carve when the display face flips north');

const ch1=html.match(/if\(n===1\)\{[\s\S]*?if\(n===2\)\{/)[0];
assert(/face:'n'/.test(ch1) && !/south wall of the new hall/.test(ch1),
  'ch1 stays on the north face and the hint no longer says south wall');
assert(/kind:'treasure'/.test(ch1), 'ch1 still has a SEARCH treasure secret');

const ch3=html.match(/if\(n===3\)\{[\s\S]*?if\(n===4\)\{/)[0];
assert(/x:46\.4,y:11\.15[\s\S]*?face:'n'/.test(ch3), 'Hall of Names secret faces north');
assert(!/face:'s'/.test(ch3), 'ch3 has no south-face secret');

const ch4=html.match(/if\(n===4\)\{[\s\S]*?if\(n===5\)\{/)[0];
assert(/x:50\.4,y:7\.15[\s\S]*?face:'n'/.test(ch4), 'ch4 outpost secret faces north');
assert(!/face:'s'/.test(ch4), 'ch4 has no south-face secret');

const ch5=html.match(/if\(n===5\)\{[\s\S]*?sealOuter\(L\.grid\);/)[0];
assert(/face:'e'/.test(ch5), 'ch5 keeps the west-wall / east-face chapel seam');

assert(/label:'SEARCH'/.test(html.match(/\{key:'secret'[\s\S]*?\}/)[0]),
  'secret-door verb still reads SEARCH');
assert(/WALL_RUBY_NORTH_SCALE=1\.58/.test(html) && /function isRubyNorthWall/.test(html),
  'did not take #81 / #44');
assert(/function isStartBackWall/.test(html) && /START_CAVEIN_SCALE=1\.45/.test(html),
  'did not reopen the west cave-in');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nsecret seam checks passed');
