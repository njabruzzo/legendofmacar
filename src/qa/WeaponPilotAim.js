(function(root){
 function flight(muzzle,railRear,distance){
  const dx=muzzle.x-railRear.x,dy=muzzle.y-railRear.y,length=Math.hypot(dx,dy);
  if(!length)throw Error('Crossbow rail must have a direction');
  return {angle:Math.atan2(dy,dx),at(u){return{x:muzzle.x+dx/length*distance*u,y:muzzle.y+dy/length*distance*u}}};
 }
 const api={flight};if(typeof module==='object')module.exports=api;else root.WeaponPilotAim=api;
})(globalThis);
