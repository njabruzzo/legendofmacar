(function(root){
 const files={front:'../../assets/creatures/pilots/macar-axe-posture-front-v7.png',rear:'../../assets/creatures/pilots/macar-axe-posture-rear-v7.png'};
 const calibration={front:{cut:560,centers:[410,410,410,410],feet:[560,560,577,588],scale:.52},rear:{cut:575,centers:[478,446,498,470],feet:[558,554,602,585],scale:.49}};
 function slice(image,view,phase,doc){
  const cfg=calibration[view],row=Math.floor(phase/2),col=phase%2,cuts=[0,cfg.cut,image.height];
  const c=doc.createElement('canvas');c.width=image.width/2;c.height=cuts[row+1]-cuts[row];
  c.getContext('2d').drawImage(image,col*image.width/2,cuts[row],image.width/2,c.height,0,0,image.width/2,c.height);
  return{c,center:cfg.centers[phase],bottom:cfg.feet[phase],scale:cfg.scale};
 }
 const api={files,calibration,slice};root.PostureWalk=api;if(typeof module==='object')module.exports=api;
})(globalThis);
