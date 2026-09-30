(function(root){
  'use strict';
  /* Painted brow seats, in source pixels: x, y, rim width, tilt (radians).
     Key by file so compass aliases and the anchor windup share calibration.
     The lower rim hugs the upper forehead, leaving painted scalp visible
     through the ring opening; weapon overhang is irrelevant. */
  const seats={
    'dwarf_macar.png':[232,285,94,0],
    'dwarf_macar_w1.png':[242,288,94,0],
    'dwarf_macar_w2.png':[249,292,94,0],
    'dwarf_macar_e_w1.png':[246,369,88,-0.08],
    'dwarf_macar_e_w2.png':[244,360,88,-0.08],
    'dwarf_macar_back_w1.png':[215,283,92,0],
    'dwarf_macar_back_w2.png':[221,284,92,0],
    'dwarf_macar_atk_contact.png':[400,422,92,0.12],
    'dwarf_macar_atk_n.png':[231,413,90,0],
    'dwarf_macar_atk_s.png':[110,359,85,-0.08],
    'dwarf_macar_atk_ne.png':[308,384,88,-0.08],
    'dwarf_macar_atk_se.png':[354,406,93,0.12],
    'dwarf_macar_axe.png':[232,285,94,0],
    'dwarf_macar_axe_w1.png':[242,288,94,0],
    'dwarf_macar_axe_w2.png':[249,292,94,0],
    'dwarf_macar_axe_atk.png':[400,422,92,0.12],
    'dwarf_macar_xbow.png':[232,285,94,0],
    'dwarf_macar_xbow_w1.png':[242,288,94,0],
    'dwarf_macar_xbow_w2.png':[249,292,94,0],
    'dwarf_macar_xbow_atk.png':[400,422,92,0.12]
  };
  function layout(file, sheet, rect, flip, crop){
    const seat=seats[String(file||'').split('?')[0].split('/').pop()];
    if(!seat || !sheet || !sheet.width || !sheet.height) return null;
    const c=crop||{x:0,y:0,w:sheet.width,h:sheet.height};
    const x=(seat[0]-c.x)/c.w;
    return {x:rect.x+rect.w*(flip?1-x:x), y:rect.y+rect.h*(seat[1]-c.y)/c.h,
      w:rect.w*seat[2]/c.w, angle:(flip?-1:1)*seat[3]};
  }
  /* The shipped prop has an opaque neutral-gray fill in its opening.
     Punch only the interior matte patches in a worn-render copy. Keep
     every source pixel, including gray bone shadows, outside that region. */
  function punchOpening(data,w,h){
    const sx=Math.round(w*.5), sy=Math.round(h*.55), seed=(sy*w+sx)*4;
    const rgb=[data[seed],data[seed+1],data[seed+2]];
    if(Math.max(...rgb)-Math.min(...rgb)>8 || rgb[0]<110 || rgb[0]>155) return 0;
    const seen=new Uint8Array(w*h),queue=[sy*w+sx];
    /* Front fangs divide the gray fill into several disconnected gaps. */
    for(const x of [.17,.35,.5,.65,.83]) queue.push(Math.round(h*.6)*w+Math.round(w*x));
    let count=0;
    for(let head=0;head<queue.length;head++){
      const at=queue[head];if(at<0||at>=w*h||seen[at])continue;seen[at]=1;
      const x=at%w,y=Math.floor(at/w),i=at*4;
      if(x<w*.07||x>w*.93||y<h*.4||y>h*.82||data[i+3]===0)continue;
      if(Math.abs(data[i]-rgb[0])>11||Math.abs(data[i+1]-rgb[1])>11||Math.abs(data[i+2]-rgb[2])>11)continue;
      data[i+3]=0;count++;
      if(x>0)queue.push(at-1);if(x<w-1)queue.push(at+1);
      if(y>0)queue.push(at-w);if(y<h-1)queue.push(at+w);
    }
    return count;
  }
  const api={seats,layout,punchOpening};
  if(typeof module==='object' && module.exports) module.exports=api;
  else root.MacarCrown=api;
})(typeof globalThis!=='undefined'?globalThis:this);
