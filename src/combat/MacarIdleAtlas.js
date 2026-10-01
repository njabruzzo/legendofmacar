(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.MacarIdleAtlas=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const directions=['s','e','se','n','ne'];
  const cells={s:[0,0],e:[1,0],se:[2,0],n:[0,1],ne:[1,1]};
  const files={maul:'assets/creatures/dwarf_macar_idle_maul_v2.png',axe:'assets/creatures/dwarf_macar_idle_axe_v2.png',xbow:'assets/creatures/dwarf_macar_idle_xbow_v2.png'};
  const seats={
    maul:{s:[251,89,61,0],e:[281,87,57,.03],se:[239,98,62,.06],n:[252,69,62,0],ne:[288,82,57,.03]},
    axe:{s:[252,89,61,0],e:[281,87,57,.03],se:[239,98,62,.06],n:[252,83,62,0],ne:[288,96,57,.03]},
    xbow:{s:[251,65,61,0],e:[281,65,57,.03],se:[239,77,62,.06],n:[245,45,62,0],ne:[281,55,57,.03]}
  };
  function keys(stem){return directions.map(d=>stem+'_idle_'+d);}
  function pose(key){
    const m=/^macar(?:_(axe|xbow))?_idle_(s|e|se|n|ne)$/.exec(key||'');
    return m?{weapon:m[1]||'maul',direction:m[2],cell:cells[m[2]]}:null;
  }
  function register(bindings){
    for(const [weapon,file] of Object.entries(files)){
      for(const key of keys(weapon==='maul'?'macar':'macar_'+weapon))bindings[key]=file;
    }
  }
  function slice(image,key,document){
    const p=pose(key);if(!p)return image;
    const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
    const w=image.width/3,h=image.height/2;
    canvas.getContext('2d').drawImage(image,p.cell[0]*w,p.cell[1]*h,w,h,0,0,512,512);
    // Alpha and paint remain exactly as generated; no sprite-repair color lift.
    canvas.__macarIdleSeat=seats[p.weapon][p.direction];
    canvas.__macarDirectionalIdle=1;
    return canvas;
  }
  return {directions,cells,files,seats,keys,pose,register,slice};
});
