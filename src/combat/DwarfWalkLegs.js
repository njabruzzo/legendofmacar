(function(root){
 'use strict';
 // Articulate only the painted legs. The hip is fixed; opposite half-strides
 // exchange the two boots' forward/back offsets without mirroring the torso.
 function offsets(stage,view,height){
  if(!/^walk[0-3]$/.test(stage))return null;
  const beat=[1,-1,.35,-.35][Number(stage.slice(4))];
  const side={s:.22,se:.72,e:1,ne:.72,n:.22}[view];
  return {left:[beat*height*.065*side,-Math.max(0,beat)*height*.035],right:[-beat*height*.065*side,-Math.max(0,-beat)*height*.035]};
 }
 function apply(canvas,stage,view,hip,foot,height){
  const o=offsets(stage,view,height);if(!o)return canvas;
  const doc=canvas.ownerDocument,g=canvas.getContext('2d'),source=doc.createElement('canvas');source.width=canvas.width;source.height=canvas.height;source.getContext('2d').drawImage(canvas,0,0);
  const pixels=g.getImageData(0,Math.floor(foot-height*.12),canvas.width,Math.ceil(height*.12)).data;
  let lo=canvas.width,hi=0;for(let n=0;n<pixels.length;n+=4)if(pixels[n+3]>80){const x=(n/4)%canvas.width;lo=Math.min(lo,x);hi=Math.max(hi,x);}
  const split=Math.round((lo+hi)/2),top=Math.floor(hip),bottom=Math.ceil(foot);
  g.clearRect(0,top,canvas.width,canvas.height-top);
  // Thin horizontal strips taper motion to zero at the hip to avoid a seam.
  for(let y=top;y<=bottom;y++){
   const weight=Math.pow(Math.max(0,(y-top)/(bottom-top)),1.5);
   for(const [x,w,d]of [[0,split,o.left],[split,canvas.width-split,o.right]])
    g.drawImage(source,x,y,w,1,x+d[0]*weight,y+d[1]*weight,w,1);
  }
  canvas.__walkLegOffsets=o;
  return canvas;
 }
 const api={offsets,apply};root.DwarfWalkLegs=api;if(typeof module==='object')module.exports=api;
})(globalThis);
