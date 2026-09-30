(function(root){
  'use strict';
  /* Painted brow seats, in source pixels: x, y, rim width, tilt (radians).
     Key by file so compass aliases and the anchor windup share calibration.
     The prop's lower rim sits on this seat; weapon overhang is irrelevant. */
  const seats={
    'dwarf_macar.png':[232,278,94,0],
    'dwarf_macar_w1.png':[242,281,94,0],
    'dwarf_macar_w2.png':[249,285,94,0],
    'dwarf_macar_e_w1.png':[246,363,88,-0.08],
    'dwarf_macar_e_w2.png':[244,354,88,-0.08],
    'dwarf_macar_back_w1.png':[215,277,92,0],
    'dwarf_macar_back_w2.png':[221,278,92,0],
    'dwarf_macar_atk_contact.png':[400,416,92,0.12],
    'dwarf_macar_atk_n.png':[231,407,90,0],
    'dwarf_macar_atk_s.png':[110,353,85,-0.08],
    'dwarf_macar_atk_ne.png':[308,378,88,-0.08],
    'dwarf_macar_atk_se.png':[354,400,93,0.12],
    'dwarf_macar_axe.png':[232,278,94,0],
    'dwarf_macar_axe_w1.png':[242,281,94,0],
    'dwarf_macar_axe_w2.png':[249,285,94,0],
    'dwarf_macar_axe_atk.png':[400,416,92,0.12],
    'dwarf_macar_xbow.png':[232,278,94,0],
    'dwarf_macar_xbow_w1.png':[242,281,94,0],
    'dwarf_macar_xbow_w2.png':[249,285,94,0],
    'dwarf_macar_xbow_atk.png':[400,416,92,0.12]
  };
  function layout(file, sheet, rect, flip, crop){
    const seat=seats[String(file||'').split('?')[0].split('/').pop()];
    if(!seat || !sheet || !sheet.width || !sheet.height) return null;
    const c=crop||{x:0,y:0,w:sheet.width,h:sheet.height};
    const x=(seat[0]-c.x)/c.w;
    return {x:rect.x+rect.w*(flip?1-x:x), y:rect.y+rect.h*(seat[1]-c.y)/c.h,
      w:rect.w*seat[2]/c.w, angle:(flip?-1:1)*seat[3]};
  }
  const api={seats,layout};
  if(typeof module==='object' && module.exports) module.exports=api;
  else root.MacarCrown=api;
})(typeof globalThis!=='undefined'?globalThis:this);
