'use strict';
/**
 * Minimal 8-bit PNG RGBA reader for Node tests. No native deps.
 * Handles filter types 0–4. Rejects interlaced / non-8-bit sheets.
 */
const fs=require('fs');
const zlib=require('zlib');

function paeth(a,b,c){
  const p=a+b-c, pa=Math.abs(p-a), pb=Math.abs(p-b), pc=Math.abs(p-c);
  if(pa<=pb && pa<=pc) return a;
  if(pb<=pc) return b;
  return c;
}

function readChunkedPng(buf){
  if(buf.slice(0,8).toString('binary')!=='\x89PNG\r\n\x1a\n') throw new Error('not png');
  let pos=8, w=0, h=0, bit=0, ctype=0, interlace=0, idat=[];
  while(pos<buf.length){
    const ln=buf.readUInt32BE(pos);
    const typ=buf.slice(pos+4, pos+8).toString('ascii');
    const chunk=buf.slice(pos+8, pos+8+ln);
    pos+=12+ln;
    if(typ==='IHDR'){
      w=chunk.readUInt32BE(0); h=chunk.readUInt32BE(4);
      bit=chunk[8]; ctype=chunk[9]; interlace=chunk[12];
    } else if(typ==='IDAT') idat.push(chunk);
    else if(typ==='IEND') break;
  }
  return {w,h,bit,ctype,interlace, raw:zlib.inflateSync(Buffer.concat(idat))};
}

function unfilter(raw, w, h, bpp){
  const stride=w*bpp;
  const out=Buffer.alloc(stride*h);
  let i=0;
  const prev=Buffer.alloc(stride);
  for(let y=0;y<h;y++){
    const f=raw[i++];
    const row=Buffer.from(raw.slice(i, i+stride));
    i+=stride;
    if(f===1){ for(let x=0;x<stride;x++) row[x]=(row[x]+(x>=bpp?row[x-bpp]:0))&255; }
    else if(f===2){ for(let x=0;x<stride;x++) row[x]=(row[x]+prev[x])&255; }
    else if(f===3){ for(let x=0;x<stride;x++) row[x]=(row[x]+(((x>=bpp?row[x-bpp]:0)+prev[x])>>1))&255; }
    else if(f===4){
      for(let x=0;x<stride;x++){
        const a=x>=bpp?row[x-bpp]:0, b=prev[x], c=x>=bpp?prev[x-bpp]:0;
        row[x]=(row[x]+paeth(a,b,c))&255;
      }
    } else if(f!==0) throw new Error('png filter '+f);
    row.copy(prev);
    row.copy(out, y*stride);
  }
  return out;
}

/** @returns {{w:number,h:number,data:Buffer}} packed RGBA, 4 bytes/pixel */
function readRgba(filePath){
  const {w,h,bit,ctype,interlace,raw}=readChunkedPng(fs.readFileSync(filePath));
  if(bit!==8) throw new Error('bit '+bit);
  if(interlace) throw new Error('interlaced png');
  if(ctype===6) return {w,h,data:unfilter(raw,w,h,4)};
  if(ctype===2){
    const rgb=unfilter(raw,w,h,3);
    const data=Buffer.alloc(w*h*4);
    for(let i=0,p=0;i<rgb.length;i+=3,p+=4){
      data[p]=rgb[i]; data[p+1]=rgb[i+1]; data[p+2]=rgb[i+2]; data[p+3]=255;
    }
    return {w,h,data};
  }
  throw new Error('ctype '+ctype);
}

function alphaChannel(rgba){
  const {w,h,data}=rgba;
  const a=new Float32Array(w*h);
  for(let i=0,p=3;i<a.length;i++,p+=4) a[i]=data[p];
  return {w,h,a};
}

function alphaMask(rgba, threshold){
  const {w,h}=rgba;
  const {a}=alphaChannel(rgba);
  const t=threshold==null?40:threshold;
  const mask=new Float32Array(w*h);
  for(let i=0;i<mask.length;i++) mask[i]=a[i]>t?1:0;
  return {w,h,mask};
}

/** PIL-style: bilinear-resize the alpha channel, then threshold. */
function resizedAlphaMask(rgba, dw, dh, threshold){
  const {w,h}=rgba;
  const {a}=alphaChannel(rgba);
  const scaled=resizeBilinear(a, w, h, dw, dh);
  const t=threshold==null?40:threshold;
  const mask=new Float32Array(dw*dh);
  for(let i=0;i<mask.length;i++) mask[i]=scaled[i]>t?1:0;
  return mask;
}

function resizeBilinear(src, sw, sh, dw, dh){
  const out=new Float32Array(dw*dh);
  for(let y=0;y<dh;y++){
    const fy=(y+0.5)*sh/dh-0.5;
    const y0=Math.max(0, Math.floor(fy));
    const y1=Math.min(sh-1, y0+1);
    const ty=Math.min(1, Math.max(0, fy-y0));
    for(let x=0;x<dw;x++){
      const fx=(x+0.5)*sw/dw-0.5;
      const x0=Math.max(0, Math.floor(fx));
      const x1=Math.min(sw-1, x0+1);
      const tx=Math.min(1, Math.max(0, fx-x0));
      const a00=src[y0*sw+x0], a10=src[y0*sw+x1];
      const a01=src[y1*sw+x0], a11=src[y1*sw+x1];
      out[y*dw+x]=a00*(1-tx)*(1-ty)+a10*tx*(1-ty)+a01*(1-tx)*ty+a11*tx*ty;
    }
  }
  return out;
}

function flipH(src, w, h){
  const out=new Float32Array(src.length);
  for(let y=0;y<h;y++){
    for(let x=0;x<w;x++) out[y*w+x]=src[y*w+(w-1-x)];
  }
  return out;
}

function corr(a,b){
  let ma=0, mb=0;
  for(let i=0;i<a.length;i++){ ma+=a[i]; mb+=b[i]; }
  ma/=a.length; mb/=b.length;
  let num=0, da=0, db=0;
  for(let i=0;i<a.length;i++){
    const xa=a[i]-ma, xb=b[i]-mb;
    num+=xa*xb; da+=xa*xa; db+=xb*xb;
  }
  const d=Math.sqrt(da)*Math.sqrt(db) || 1;
  return num/d;
}

module.exports={readRgba, alphaChannel, alphaMask, resizedAlphaMask, resizeBilinear, flipH, corr};
