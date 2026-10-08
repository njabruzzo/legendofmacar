'use strict';
/**
 * Sprite requests must name a file that is really under assets/.
 * The manifest is that directory. Speculative _atk / _w3 siblings stay
 * in the derivation loops and are dropped before fetch when the file
 * is absent. Every key whose file exists must still be requested.
 * Run: node src/qa/AssetManifest.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {walk, root} = require('./build-asset-manifest');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const manifestPath = path.join(root, 'src/assets/asset-manifest.js');
const manifestSrc = fs.readFileSync(manifestPath, 'utf8');

const onDisk = walk(path.join(root, 'assets'), []).sort();
const listed = vm.runInNewContext(manifestSrc + '\nObject.keys(ASSET_FILES).sort();');
assert(onDisk.length === listed.length && onDisk.every((f, i) => f === listed[i]),
  'asset manifest lists exactly the files under assets/ (' + onDisk.length + ' on disk, ' + listed.length + ' listed)');
const extra = listed.filter(f => !onDisk.includes(f));
const missingFromList = onDisk.filter(f => !listed.includes(f));
if (extra.length) console.error('  manifest extras: ' + extra.slice(0, 8).join(', '));
if (missingFromList.length) console.error('  missing from manifest: ' + missingFromList.slice(0, 8).join(', '));

assert(/<link rel="icon" href="favicon\.ico"/.test(html), 'favicon link points at favicon.ico');
assert(fs.existsSync(path.join(root, 'favicon.ico')), 'favicon.ico is in the repo root');
assert(/src\/assets\/asset-manifest\.js/.test(html), 'index.html loads the asset manifest');
assert(/k\.replace\(\/_w1\$\/,'_w3'\)/.test(html), 'the _w3 sibling pass is still in place');
assert(/const MACAR_PLAN=/.test(html), 'MACAR_PLAN is untouched by this gate');

const ATLASES = [
  'src/combat/DwarfWalkLegs.js',
  'src/combat/MacarIdleAtlas.js',
  'src/combat/MacarMotionAtlas.js',
  'src/combat/MacarSharedAtlas.js',
  'src/combat/MacarWeaponShaft.js',
  'src/combat/NpcDirectionalAtlas.js'
];

function freshContext(withManifest) {
  const ctx = {console};
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const rel of ATLASES) {
    vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), ctx, {filename: rel});
  }
  if (withManifest) vm.runInContext(manifestSrc, ctx, {filename: 'asset-manifest.js'});
  return ctx;
}

const start = html.indexOf('const SPRITE_FILES={');
const end = html.indexOf('const ICON_SPR={');
assert(start > 0 && end > start, 'sprite registry slice is intact');
const slice = html.slice(start, end) + '\nSPRITE_FILES;';

function registry(withManifest) {
  const ctx = freshContext(withManifest);
  assert(typeof ctx.MacarIdleAtlas === 'object' && typeof ctx.MacarSharedAtlas === 'object'
    && typeof ctx.NpcDirectionalAtlas === 'object' && typeof ctx.MacarMotionAtlas === 'object'
    && typeof ctx.MacarWeaponShaft === 'object',
    'atlas modules attach the way the page loads them');
  return vm.runInContext(slice, ctx, {filename: 'sprite-registry.js'});
}

const raw = registry(false);
const filtered = registry(true);

function exists(src) {
  return fs.existsSync(path.join(root, String(src).split('?')[0]));
}

const rawKeys = Object.keys(raw).sort();
const filteredKeys = Object.keys(filtered).sort();
const loadable = rawKeys.filter(k => exists(raw[k])).sort();

assert(filteredKeys.length === loadable.length && filteredKeys.every((k, i) => k === loadable[i]),
  'requested keys are exactly the keys whose files exist (' + filteredKeys.length + ' requested, ' + loadable.length + ' loadable)');

let missingFile = 0;
for (const k of filteredKeys) {
  const src = String(filtered[k]).split('?')[0];
  if (!exists(src) || !listed.includes(src)) {
    missingFile++;
    if (missingFile <= 12) console.error('  requested missing ' + k + ' -> ' + src);
  }
}
assert(missingFile === 0, 'every requested sprite key has a file in assets/');

const dropped = rawKeys.filter(k => !filtered[k]);
const droppedExisting = dropped.filter(k => exists(raw[k]));
assert(droppedExisting.length === 0, 'no sprite that loads today was dropped');
assert(dropped.length > 0 && dropped.every(k => !exists(raw[k])),
  'only missing files were dropped (' + dropped.length + ')');

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('asset manifest ok');
