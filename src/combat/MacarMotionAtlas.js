(function(root){
 const files={axe:{front:'assets/creatures/pilots/macar-axe-walk-front-v9.png',rear:'assets/creatures/pilots/macar-axe-walk-rear-v9.png'},xbow:{front:'assets/creatures/pilots/macar-crossbow-walk-v9.png',rear:'assets/creatures/pilots/macar-crossbow-walk-v9.png'}};
 const shot='assets/creatures/pilots/macar-crossbow-walk-v9.png';
 function pose(key){const m=/^macar_(axe|xbow)_cycle_(front|rear)_([0-3])$/.exec(key||'');if(m)return{weapon:m[1],view:m[2],phase:+m[3],walk:true};const b=/^macar_xbow_side_(front|rear)$/.exec(key||'');return b?{weapon:'xbow',view:b[1],phase:0,walk:false}:null;}
 function keys(weapon){const out=[];for(const v of ['front','rear'])for(let n=0;n<4;n++)out.push('macar_'+weapon+'_cycle_'+v+'_'+n);if(weapon==='xbow')out.push('macar_xbow_side_front','macar_xbow_side_rear');return out;}
 function register(bindings){for(const weapon of ['axe','xbow'])for(const key of keys(weapon)){const p=pose(key);bindings[key]=p.walk?files[weapon][p.view]:shot;}}
 function select(weapon,e,oct,moving){const rear=['n','ne','nw'].includes(oct),view=rear?'rear':'front';if(moving)return 'macar_'+weapon+'_cycle_'+view+'_'+Math.min(3,Math.floor((((e.gait||0)%1)+1)%1*4));return weapon==='xbow'?'macar_xbow_side_'+view:null;}
 function slice(image,key,doc){const p=pose(key);if(!p)return image;const c=doc.createElement('canvas');c.width=c.height=512;
  if(p.weapon==='xbow'){
   const cellW=image.width/2,cellH=image.height/4;
   const phase=p.walk?p.phase:3;
   const row=(p.view==='rear'?2:0)+Math.floor(phase/2),col=phase%2;
   const scale=360/(cellH*.89);
   c.getContext('2d').drawImage(image,col*cellW,row*cellH,cellW,cellH,256-cellW*.46*scale,512-cellH*.98*scale,cellW*scale,cellH*scale);
   c.__macarIdleSeat=[256,152,54,0];c.__macarDirectionalIdle=1;c.__macarIntegratedMotion=1;c._stature=360/512;return c;
  }
  const i=p.phase,row=Math.floor(i/2),col=i%2,cols=p.walk?2:2;
  const cuts=p.weapon==='axe'?[0,image.height/2,image.height]:p.walk?(p.view==='front'?[0,560,image.height]:[0,575,image.height]):[0,480,image.height];
  const r=p.walk?row:(p.view==='rear'?1:0),sw=image.width/cols,sy=cuts[r],sh=cuts[r+1]-sy;
  const centers=p.weapon==='xbow'?(p.view==='front'?[365,365,365,365]:[350,350,350,350]):(p.view==='front'?[294,300,293,297]:[305,305,305,305]);
  const bases=p.weapon==='axe'?(p.view==='front'?[604,602,593,592]:[604,604,597,597]):(p.view==='front'?[555,556,594,576]:[567,566,592,579]);
  const center=p.walk?centers[i]:430,base=p.walk?bases[i]:(p.view==='front'?466:502);
  const headY=p.walk?(p.weapon==='axe'?85:78):(p.view==='front'?46:38),scale=360/(base-headY);
  c.getContext('2d').drawImage(image,col*sw,sy,sw,sh,256-center*scale,512-base*scale,sw*scale,sh*scale);
  const rim=p.walk?78:80;
  c.__macarIdleSeat=[256,512-(base-headY)*scale,rim*scale,0];c.__macarDirectionalIdle=1;c.__macarIntegratedMotion=1;c._stature=360/512;return c;
 }
 const api={files,shot,keys,pose,register,select,slice};root.MacarMotionAtlas=api;if(typeof module==='object')module.exports=api;
})(globalThis);
