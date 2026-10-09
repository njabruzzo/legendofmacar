/**
 * Guardian rubies stay on the guardian. A chest or cache in L2.js–L10.js
 * must not hold one. Map JSON is checked by the level tests; this file
 * checks the encounter modules.
 * Run: node src/campaign/ChestRuby.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

function holdsGuardianRuby(node, at) {
  if (typeof node === 'string') {
    return /guardian[-_ ]?ruby/i.test(node) ? at : null;
  }
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const hit = holdsGuardianRuby(node[i], at + '[' + i + ']');
      if (hit) return hit;
    }
    return null;
  }
  if (node.includesRuby === true) return at + '.includesRuby';
  const keys = Object.keys(node);
  for (let i = 0; i < keys.length; i++) {
    const hit = holdsGuardianRuby(node[keys[i]], at + '.' + keys[i]);
    if (hit) return hit;
  }
  return null;
}

function chestHits(node, at, hits) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach(function (item, i) { chestHits(item, at + '[' + i + ']', hits); });
    return;
  }
  Object.keys(node).forEach(function (key) {
    const next = at + '.' + key;
    if (/chest|cache/i.test(key)) {
      const hit = holdsGuardianRuby(node[key], next);
      if (hit) hits.push(hit);
    }
    chestHits(node[key], next, hits);
  });
}

for (let n = 2; n <= 10; n++) {
  const file = 'L' + n + '.js';
  const src = fs.readFileSync(path.join(__dirname, file), 'utf8');
  assert(src.indexOf('guardian-ruby') < 0, file + ' does not name the guardian ruby in a chest or cache');
  const hits = [];
  chestHits(require('./L' + n), file, hits);
  assert(hits.length === 0, (hits[0] || file) + ' does not hold the guardian ruby');
}

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('guardian rubies stay off L2-L10 chests and caches');
