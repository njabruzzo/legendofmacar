'use strict';
/**
 * Chapter I ruby-door carving: LIMNER crop is head / beard / mouth only.
 * Extra masonry sheet is dropped. Renderer, lantern, and wall height stay put.
 * Pixel stats are Node-native (src/qa/pngRgba.js) so CI needs no PIL.
 * Run: node src/dungeon/DwarfFaceCrop.test.js
 */
const fs=require('fs');
const path=require('path');
const {readRgba}=require('../qa/pngRgba');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
const sheet=path.join(__dirname,'../../assets/props/prop_dwarfface.png');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

function pngHdr(p){
  const b=fs.readFileSync(p);
  if(b[1]!==0x50 || b[2]!==0x4e || b[3]!==0x47) return null;
  return {w:b.readUInt32BE(16), h:b.readUInt32BE(20), depth:b[24], color:b[25]};
}

assert(fs.existsSync(sheet), 'bas-relief dwarf face sheet is in-repo');
const hdr=pngHdr(sheet);
assert(hdr && hdr.color===6, 'face sheet is RGBA (masonry dropped to alpha)');
assert(hdr.w<900 && hdr.h<1400, 'sheet is cropped off the 1024x1536 masonry tile');
assert(hdr.w>360 && hdr.h>700, 'crop still holds a full head / beard / mouth');

function faceSheetStats(filePath){
  const {w,h,data}=readRgba(filePath);
  const n=w*h;
  let opaque=0, clear=0, binary=0;
  let minX=w, minY=h, maxX=-1, maxY=-1;
  const gray=new Float32Array(n);
  const opq=new Uint8Array(n);
  for(let i=0,p=0;i<n;i++,p+=4){
    const a=data[p+3];
    if(a===0) clear++;
    if(a===0 || a===255) binary++;
    gray[i]=(data[p]+data[p+1]+data[p+2])/3;
    if(a>40){
      opaque++;
      opq[i]=1;
      const x=i%w, y=(i/w)|0;
      if(x<minX) minX=x; if(x>maxX) maxX=x;
      if(y<minY) minY=y; if(y>maxY) maxY=y;
    }
  }
  const y0=(h*0.32)|0, y1=(h*0.50)|0;
  const x0=(w*0.34)|0, x1=(w*0.66)|0;
  let band=0, mouthOpq=0, mouthDark=0;
  for(let y=y0;y<y1;y++){
    for(let x=x0;x<x1;x++){
      const i=y*w+x;
      band++;
      if(opq[i]){
        mouthOpq++;
        if(gray[i]<55) mouthDark++;
      }
    }
  }
  return {
    opaque: opaque/n,
    clear: clear/n,
    content_aspect: maxY>=minY ? (maxX-minX+1)/(maxY-minY+1) : 0,
    mouth_opaque: band ? mouthOpq/band : 0,
    mouth_dark: mouthOpq ? mouthDark/mouthOpq : 0,
    binary: (binary/n)>0.98 ? 1 : 0
  };
}

const stats=faceSheetStats(sheet);
assert(Number(stats.opaque)>0.32 && Number(stats.opaque)<0.85,
  'silhouette is the carving, not a full masonry rectangle');
assert(Number(stats.clear)>0.15, 'extra masonry around the face is transparent');
assert(Number(stats.content_aspect)>0.32 && Number(stats.content_aspect)<0.55,
  'opaque content is the tall face, not a leftover wall plaque');
assert(Number(stats.mouth_opaque)>0.98, 'open mouth stays in the carving');
assert(Number(stats.mouth_dark)>0.08, 'mouth cavity is still a dark hole');
assert(stats.binary===1, 'crop is binary-alpha (no fringe masonry haze)');

assert(/function dwarfFaceH\(L\)\{\s*return wallFaceH\(L\)\*0\.72;/.test(html),
  'dwarfFaceH stays *0.72 — no renderer rewrite');
assert(/if\(p\.k==='dwarfface'\)\{[\s\S]*?drawIsoPlaneImg\(g, img, p\.x-half, yPlane, p\.x\+half, yPlane, H, \{stroke:0\}\)[\s\S]*?return;/.test(html),
  'face stays a wall-plane bas-relief with no leftover tile stroke');
assert(/WALL_RUBY_NORTH_SCALE=1\.58/.test(html),
  'back wall stays tall enough for door + face');
assert(/return wallFaceH\(L\)\*1\.28/.test(html),
  'rubyDoorH stays *1.28 (do not take #81 door scale)');
assert(/y:f\.y\+1\.15/.test(html) && /y:face\.y\+1\.15/.test(html),
  'mouth / lantern keep-off stays face.y+1.15');
assert(/\{x:39\.6,y:17\.2,k:'lantern'\}/.test(html),
  'lantern stays off the mouth line');
assert(!/\{x:43,y:14,k:'lantern'\}/.test(html),
  'did not move the lantern back onto the mouth line');
assert(/\{x:43\.2,y:7\.28,k:'dwarfface'\}/.test(html),
  'face still hangs on the Chapter I north wall');
assert(/WALL_HALL_SCALE=0\.70/.test(html), 'hall faces stay 0.70 — not #44');
assert(/function isRubyNorthWall\(L,x,y\)/.test(html)
  && /y===6 && x>=24 && x<=51/.test(html),
  'did not take #81 / #44 wall rewrite');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\ndwarf-face crop checks passed');
