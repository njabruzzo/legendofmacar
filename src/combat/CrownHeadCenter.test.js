'use strict';
const assert=require('assert'),Atlas=require('./MacarSharedAtlas');
const w=180,h=100,d=new Uint8Array(w*h*4);
const paint=(left,right,top,bottom)=>{for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)d[(y*w+x)*4+3]=255;};
paint(64,112,10,40);paint(25,35,12,40); // Head and separate raised hand.
assert.equal(Atlas.centerHead(d,w,h,78,25,42),88,'center follows scalp rather than stale hint or raised hand');
paint(114,114,15,15);
assert.equal(Atlas.centerHead(d,w,h,78,25,42),88,'single fringe pixel does not move median anchor');
const shifted=new Uint8Array(d.length);
for(let y=0;y<h;y++)for(let x=0;x<w-7;x++)shifted[(y*w+x+7)*4+3]=d[(y*w+x)*4+3];
assert.equal(Atlas.centerHead(shifted,w,h,78,25,42),95,'crown follows lateral head movement exactly');
const mirrored=new Uint8Array(d.length);
for(let y=0;y<h;y++)for(let x=0;x<w;x++)mirrored[(y*w+w-1-x)*4+3]=d[(y*w+x)*4+3];
assert.equal(Atlas.centerHead(mirrored,w,h,w-1-78,25,42),w-1-88,'mirrored scalp keeps mirrored center');
assert.equal(Atlas.centerHead(new Uint8Array(d.length),w,h,78,25,42),78,'missing pixels retain calibrated fallback');
console.log('Crown head center follows scalp, head movement and mirroring, ignoring arm and fringe');
