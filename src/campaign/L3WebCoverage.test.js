/**
 * Overhead webs must not cover Macar on the cage-to-mock walk.
 * Count only after the room has been explored for at least 2.5s.
 * Unexplored sheets are not drawn, so a count before that wait reads 0
 * even when the sheets still cross him.
 * Run: node src/campaign/L3WebCoverage.test.js
 */
'use strict';
const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

function chromeBin() {
  const cands = [
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/local/bin/google-chrome'
  ].filter(Boolean);
  for (const c of cands) if (fs.existsSync(c)) return c;
  return null;
}

function jsonGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let b = '';
      res.on('data', (c) => { b += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(b || 'null')); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

class Cdp {
  constructor(wsUrl) { this.wsUrl = wsUrl; this.id = 0; this.pending = new Map(); }
  connect() {
    this.ws = new WebSocket(this.wsUrl);
    return new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve);
      this.ws.addEventListener('error', reject);
    }).then(() => {
      this.ws.addEventListener('message', (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          else resolve(msg.result);
        }
      });
      return this.send('Runtime.enable');
    }).then(() => this.send('Page.enable'));
  }
  send(method, params) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params: params || {} }));
    });
  }
  eval(expr, awaitPromise) {
    return this.send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: !!awaitPromise
    }).then((r) => {
      if (r.exceptionDetails) {
        const t = (r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text;
        throw new Error(t || 'evaluate failed');
      }
      return r.result ? r.result.value : undefined;
    });
  }
  close() { try { this.ws && this.ws.close(); } catch (e) {} }
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function poll(fn, ms, label) {
  const t0 = Date.now();
  const step = () => fn().then((v) => {
    if (v) return v;
    if (Date.now() - t0 > ms) throw new Error('timeout ' + label);
    return sleep(200).then(step);
  });
  return step();
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.json': 'application/json',
  '.css': 'text/css',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.svg': 'image/svg+xml'
};

function startServer(root) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/') rel = '/index.html';
    const abs = path.join(root, rel);
    if (!abs.startsWith(root)) { res.writeHead(403); res.end(); return; }
    fs.readFile(abs, (err, buf) => {
      if (err) { res.writeHead(404); res.end('missing'); return; }
      const ext = path.extname(abs).toLowerCase();
      res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(buf);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

const PAGE = `
(function(){
  const SHEETS = ['web_sheet_corner_b','web_sheet_span_a','web_sheet_span_b'];
  function hero(){ return G.ents.find(function(e){ return e.hero; }); }
  function sheets(){
    return ensureL3WebPieces(G.lvl).filter(function(q){
      return q.room==='north-web' && SHEETS.indexOf(q.key)>=0;
    });
  }
  function headingFor(name){
    const ang = {e:0,se:45,s:90,sw:135,w:180,nw:225,n:270,ne:315}[name]*Math.PI/180;
    const sx=Math.cos(ang), sy=Math.sin(ang);
    return {fdx:(sy/(TH/2)+sx/(TW/2))/2, fdy:(sy/(TH/2)-sx/(TW/2))/2};
  }
  function wipeSeen(){
    const L=G.lvl;
    for(let j=0;j<L.h;j++){ L.seen[j].fill(0); if(L.vis&&L.vis[j]) L.vis[j].fill(0); }
  }
  window.__covBoot = function(){
    G.campaignLevel=3;
    startChapter(30);
    G.paused=true;
    const p=hero();
    for(const e of G.ents){ if(e!==p){ e.dead=1; e.hp=0; } }
    p.moving=0; p.ix=0; p.iy=0; p.atk=0; p.defending=0;
    return {n:G.lvl&&G.lvl.n, rise:sheets().map(function(q){ return q.key+':'+q.rise; })};
  };
  window.__covReady = function(){
    const left=L3Webs.keys.filter(function(k){ return !(SPR[k]&&SPR[k].width); });
    const p=hero();
    const key=p?livingMacarAnimKey(p):null;
    const img=key?livingMacarImg(key):null;
    return {left:left.length, key:key, integrated:!!(img&&img.__macarIntegratedMotion), tw:TW, th:TH};
  };
  window.__covPark = function(x,y){
    const p=hero();
    p.x=x; p.y=y; p.dest=null; p.moving=0; p.ix=0; p.iy=0; p.atk=0; p.defending=0; p.aim=null;
    G.cam.x=x; G.cam.y=y; G.scene='play'; G.paused=true;
    syncCamProj();
    return true;
  };
  window.__covClear = function(){ wipeSeen(); G.paused=true; return sheets().map(function(q){ return {key:q.key, on:l3WebOnScreen(q)}; }); };
  window.__covTick = function(dt){
    G.paused=false; G.scene='play';
    update(dt);
    const p=hero();
    return {x:p.x, y:p.y};
  };
  function drawnCount(){
    let n=0, semi=0;
    const pieces=sheets().filter(function(q){ return l3WebOnScreen(q); });
    if(!pieces.length) return {n:0, semi:0, on:0};
    const c=document.createElement('canvas');
    c.width=VW; c.height=VH;
    const g=c.getContext('2d',{willReadFrequently:true});
    g.imageSmoothingEnabled=false;
    for(const piece of pieces) drawL3WebPiece(g, piece);
    const d=g.getImageData(0,0,VW,VH).data;
    for(let i=3;i<d.length;i+=4){
      const a=d[i];
      if(a!==0 && a!==255) semi++;
      if(a>=128) n++;
    }
    return {n:n, semi:semi, on:pieces.length};
  }
  window.__covDrawn = function(){ return drawnCount(); };
  function macMask(p){
    const c=document.createElement('canvas');
    c.width=VW; c.height=VH;
    const g=c.getContext('2d',{willReadFrequently:true});
    g.imageSmoothingEnabled=false;
    drawLivingMacar(g, p);
    const d=g.getImageData(0,0,VW,VH).data;
    const op=new Uint8Array(VW*VH);
    let minY=VH, maxY=0, x0=VW, x1=0, n=0;
    for(let y=0;y<VH;y++){
      for(let x=0;x<VW;x++){
        if(d[(y*VW+x)*4+3]>=128){
          op[y*VW+x]=1; n++;
          if(y<minY) minY=y; if(y>maxY) maxY=y;
          if(x<x0) x0=x; if(x>x1) x1=x;
        }
      }
    }
    const box=new Uint8Array(VW*VH);
    if(n){ for(let y=minY;y<=maxY;y++) box.fill(1, y*VW+x0, y*VW+x1+1); }
    return {op:op, box:box, n:n, key:livingMacarAnimKey(p)};
  }
  function hit(a,b){ let n=0; for(let i=0;i<a.length;i++) if(a[i]&&b[i]) n++; return n; }
  window.__covWalk = function(samples){
    const p=hero();
    const pieces=sheets();
    let maxOp=0, maxBox=0, worst=null;
    for(const s of samples){
      p.x=s.x; p.y=s.y; p.dest=null; p.atk=0; p.defending=0; p.aim=null; p.swung=0;
      p.moving=s.moving?1:0; p.gait=s.gait||0;
      const h=s.face?headingFor(s.face):{fdx:s.fdx, fdy:s.fdy};
      p.fdx=h.fdx; p.fdy=h.fdy;
      G.cam.x=p.x; G.cam.y=p.y; syncCamProj();
      const mac=macMask(p);
      const union=new Uint8Array(VW*VH);
      const per={};
      for(const piece of pieces){
        if(!l3WebOnScreen(piece)){ per[piece.key]=-1; continue; }
        const c=document.createElement('canvas');
        c.width=VW; c.height=VH;
        const g=c.getContext('2d',{willReadFrequently:true});
        g.imageSmoothingEnabled=false;
        drawL3WebPiece(g, piece);
        const d=g.getImageData(0,0,VW,VH).data;
        const m=new Uint8Array(VW*VH);
        for(let i=0,q=0;i<m.length;i++,q+=4) if(d[q+3]>=128){ m[i]=1; union[i]=1; }
        per[piece.key]=hit(mac.op, m);
      }
      let uOp=0, uBox=0;
      for(let i=0;i<union.length;i++){
        if(!union[i]) continue;
        if(mac.op[i]) uOp++;
        if(mac.box[i]) uBox++;
      }
      if(uOp>maxOp || uBox>maxBox){
        worst={tag:s.tag, key:mac.key, uOp:uOp, uBox:uBox, per:per};
      }
      if(uOp>maxOp) maxOp=uOp;
      if(uBox>maxBox) maxBox=uBox;
    }
    return {maxOp:maxOp, maxBox:maxBox, worst:worst, samples:samples.length};
  };
  window.__covFloor = function(){
    const pieces=ensureL3WebPieces(G.lvl).filter(function(q){ return q.layer==='floor' && q.room==='north-web'; });
    let rawBad=0, clipBad=0, raw117=0, clip117=0, clipPx=0, semi=0;
    for(const piece of pieces){
      piece._floorSig=''; piece._floorCanvas=null;
      const img=l3WebSheet(piece.key);
      const k=TW/116;
      const dw=Math.round(img.width*k), dh=Math.round(img.height*k);
      const raw=document.createElement('canvas');
      raw.width=dw; raw.height=dh;
      const rg=raw.getContext('2d',{willReadFrequently:true});
      rg.imageSmoothingEnabled=false;
      rg.drawImage(img,0,0,dw,dh);
      const clip=l3WebFloorCanvas(piece, img, dw, dh);
      const pv=L3Webs.pivot(piece.key)||[0,0];
      const up=l3WebUp(piece);
      const dx0=Math.round((piece.x-piece.y)*(TW/2)-pv[0]*k);
      const dy0=Math.round((piece.x+piece.y)*(TH/2)-up-pv[1]*k);
      const hx=TW/2, hy=TH/2;
      const rd=rg.getImageData(0,0,dw,dh).data;
      const cd=clip.getContext('2d',{willReadFrequently:true}).getImageData(0,0,dw,dh).data;
      for(let py=0;py<dh;py++){
        for(let px=0;px<dw;px++){
          const i=(py*dw+px)*4;
          const ix=dx0+px+0.5, iy=dy0+py+0.5;
          const wx=(iy/hy+ix/hx)/2, wy=(iy/hy-ix/hx)/2;
          const ti=Math.floor(wx), tj=Math.floor(wy);
          const t=G.lvl.grid[tj]?G.lvl.grid[tj][ti]:1;
          const walk=t===0||t===3||t===4;
          if(rd[i+3]>=128 && !walk){ rawBad++; if(ti===117&&tj===94) raw117++; }
          const a=cd[i+3];
          if(a!==0 && a!==255) semi++;
          if(a>=128){
            clipPx++;
            if(!walk){ clipBad++; if(ti===117&&tj===94) clip117++; }
          }
        }
      }
    }
    return {rawBad:rawBad, clipBad:clipBad, raw117:raw117, clip117:clip117, clipPx:clipPx, semi:semi};
  };
  return 'cov';
})()
`;

function samplesFor(origin) {
  const locals = [[3.9, 3.4], [3.3, 3.2], [2.0, 3.2], [1.3, 2.6]];
  const out = [];
  for (let i = 0; i < locals.length - 1; i++) {
    const a = locals[i], b = locals[i + 1];
    const steps = i === 1 ? 4 : 3;
    for (let s = 0; s <= steps; s++) {
      const u = s / steps;
      const lx = a[0] + (b[0] - a[0]) * u;
      const ly = a[1] + (b[1] - a[1]) * u;
      const x = origin.x + lx, y = origin.y + ly;
      const fdx = b[0] - a[0], fdy = b[1] - a[1];
      out.push({ tag: 'walk-' + i + '.' + s, x: x, y: y, fdx: fdx, fdy: fdy, moving: 1, gait: (s % 4) * 0.25 });
      out.push({ tag: 'se-' + i + '.' + s, x: x, y: y, face: 'se', moving: 0, gait: 0 });
      out.push({ tag: 'sw-' + i + '.' + s, x: x, y: y, face: 'sw', moving: 1, gait: 0.5 });
    }
  }
  const spot = { x: origin.x + 1.3, y: origin.y + 2.6 };
  ['s', 'se', 'e', 'ne', 'n', 'nw', 'w', 'sw'].forEach(function (face) {
    out.push({ tag: 'spot-' + face, x: spot.x, y: spot.y, face: face, moving: 0, gait: 0 });
  });
  return out;
}

async function main() {
  const bin = chromeBin();
  assert(!!bin, 'chrome is available for the coverage count');
  if (!bin) return;

  const root = path.join(__dirname, '../..');
  const server = await startServer(root);
  const port = server.address().port;
  const origin = 'http://127.0.0.1:' + port;
  const cdpPort = 9400 + (process.pid % 200);
  const userData = path.join('/tmp', 'l3-cov-chrome-' + process.pid);
  fs.mkdirSync(userData, { recursive: true });
  const chrome = spawn(bin, [
    '--headless=new',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-extensions',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1280,800',
    '--remote-debugging-address=127.0.0.1',
    '--remote-debugging-port=' + cdpPort,
    '--user-data-dir=' + userData,
    'about:blank'
  ], { stdio: 'ignore', detached: true });
  chrome.unref();

  let cdp = null;
  const finish = () => {
    try { if (cdp) cdp.close(); } catch (e) {}
    try { process.kill(-chrome.pid, 'SIGKILL'); } catch (e) { try { chrome.kill('SIGKILL'); } catch (e2) {} }
    try { server.close(); } catch (e) {}
    try { fs.rmSync(userData, { recursive: true, force: true }); } catch (e) {}
  };

  try {
    await poll(() => jsonGet('http://127.0.0.1:' + cdpPort + '/json/version').then(() => true).catch(() => false), 20000, 'cdp');
    const list = await jsonGet('http://127.0.0.1:' + cdpPort + '/json/list');
    const page = (list || []).find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    if (!page) throw new Error('no chrome page');
    cdp = new Cdp(page.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.navigate', { url: origin + '/?cov=' + Date.now() });
    await poll(() => cdp.eval('typeof startChapter==="function" && typeof L3Webs!=="undefined" && typeof drawL3WebPiece==="function"'), 40000, 'scripts');
    const installed = await cdp.eval(PAGE);
    assert(installed === 'cov', 'coverage probe installed');
    const boot = await cdp.eval('__covBoot()');
    console.log('boot', JSON.stringify(boot));
    assert(boot && boot.n === 30, 'chapter 30 is up');
    assert(boot.rise && boot.rise.every(function (row) { return /:48$/.test(row); }), 'the three west sheets carry the rise (' + (boot.rise || []).join(' ') + ')');
    const ready = await poll(async () => {
      const r = await cdp.eval('__covReady()');
      return r && r.left === 0 && r.integrated ? r : null;
    }, 30000, 'sheets');
    console.log('ready', JSON.stringify(ready));
    assert(ready.integrated, 'Macar is the shared atlas, not a stand-in');

    const pix = await cdp.eval('L3Shell.points.pixie');
    const cage = await cdp.eval('L3Webs.cage');
    const originW = { x: pix.x - cage[0], y: pix.y - cage[1] };
    const spot = { x: originW.x + 1.3, y: originW.y + 2.6 };
    const walk = samplesFor(originW);

    async function measure(name, w, h, mobile) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: w, height: h, deviceScaleFactor: 1, mobile: !!mobile
      });
      const view = await cdp.eval('resize(true); ({TW:TW,TH:TH,VW:VW,VH:VH,ZOOM:ZOOM})');
      console.log(name, JSON.stringify(view));
      assert(name === 'laptop' ? view.TW === 116 && view.TH === 58 : view.TW === 66 && view.TH === 34,
        name + ' tile is ' + view.TW + 'x' + view.TH);

      await cdp.eval('__covPark(' + spot.x + ',' + spot.y + ')');
      const hidden = await cdp.eval('__covClear()');
      const before = await cdp.eval('__covDrawn()');
      console.log(name, 'before wait', JSON.stringify(before), JSON.stringify(hidden));
      assert(before.on === 0 && before.n === 0, name + ' draws no overhead before the room is explored (a count here would be a false 0)');

      const t0 = Date.now();
      while (Date.now() - t0 < 2600) {
        await cdp.eval('__covTick(0.05)');
        await sleep(50);
      }
      const waited = Date.now() - t0;
      assert(waited >= 2500, name + ' waited ' + waited + 'ms after explore started');
      const after = await cdp.eval('__covDrawn()');
      console.log(name, 'after wait', waited + 'ms', JSON.stringify(after));
      assert(after.on === 3 && after.n > 0, name + ' draws the three west sheets after the explored wait (' + after.n + ' px)');
      assert(after.semi === 0, name + ' overhead alpha stays hard');

      const cover = await cdp.eval('__covWalk(' + JSON.stringify(walk) + ')');
      console.log(name, 'coverage', JSON.stringify(cover));
      assert(cover && cover.maxOp === 0 && cover.maxBox === 0,
        name + ' overhead on Macar along the cage-to-mock walk is 0 px (opaque ' + (cover && cover.maxOp) + ', box ' + (cover && cover.maxBox) + ')');

      const floor = await cdp.eval('__covFloor()');
      console.log(name, 'floor', JSON.stringify(floor));
      assert(floor.raw117 > 0, name + ' had north-wall floor bleed at 117,94 before the clip (' + floor.raw117 + ')');
      assert(floor.clip117 === 0 && floor.clipBad === 0, name + ' floor webs stay off unwalkable tiles (117,94 ' + floor.clip117 + ', other ' + floor.clipBad + ')');
      assert(floor.clipPx > 0 && floor.semi === 0, name + ' clipped floor webs still paint the walkable floor with hard alpha');
      return { cover: cover, floor: floor, after: after };
    }

    const laptop = await measure('laptop', 1280, 800, false);
    const phone = await measure('phone', 844, 390, true);
    console.log('RESULT laptop opaque ' + laptop.cover.maxOp + ' box ' + laptop.cover.maxBox +
      ' floor117 ' + laptop.floor.clip117 + '/' + laptop.floor.raw117);
    console.log('RESULT phone opaque ' + phone.cover.maxOp + ' box ' + phone.cover.maxBox +
      ' floor117 ' + phone.floor.clip117 + '/' + phone.floor.raw117);
  } finally {
    finish();
  }
}

const timer = setTimeout(function () {
  console.error('FAIL  coverage test exceeded 120s');
  process.exit(1);
}, 120000);

main().then(function () {
  clearTimeout(timer);
  if (failed) {
    console.error(failed + ' failed');
    process.exit(1);
  }
  console.log('L3 web coverage ok');
  process.exit(0);
}).catch(function (e) {
  clearTimeout(timer);
  console.error('FAIL  ' + (e && e.stack || e));
  process.exit(1);
});
