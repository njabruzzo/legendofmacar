(function(root){
 'use strict';
 const walk=t=>t===0||t===3||t===4;
 function clear(L,x,y,margin,blocked){
  if(!L||!L.grid||!Number.isFinite(x)||!Number.isFinite(y))return false;
  for(let j=Math.floor(y-margin);j<=Math.floor(y+margin);j++)
   for(let i=Math.floor(x-margin);i<=Math.floor(x+margin);i++)
    if(!L.grid[j]||!walk(L.grid[j][i])||(blocked&&blocked(i,j)))return false;
  return true;
 }
 function spot(L,x,y,margin,blocked){
  if(clear(L,x,y,margin,blocked))return {x,y};
  const tile=(i,j)=>L.grid[j]&&walk(L.grid[j][i])&&!(blocked&&blocked(i,j));
  // Search only the original floor component. Invalid old positions use the
  // entrance component, so a drop cannot teleport through a sealed wall.
  let sx=Math.floor(x),sy=Math.floor(y);
  if(!tile(sx,sy)){sx=Math.floor(L.spawn.x);sy=Math.floor(L.spawn.y);}
  if(!tile(sx,sy))return null;
  const queue=[[sx,sy]],seen=new Set([sx+','+sy]);let best=null,bd=Infinity;
  for(let q=0;q<queue.length;q++){
   const [i,j]=queue[q],cx=i+.5,cy=j+.5,d=(cx-x)**2+(cy-y)**2;
   if(d<bd&&clear(L,cx,cy,margin,blocked)){best={x:cx,y:cy};bd=d;}
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const nx=i+dx,ny=j+dy,key=nx+','+ny;
    if(!seen.has(key)&&tile(nx,ny)){seen.add(key);queue.push([nx,ny]);}
   }
  }
  return best;
 }
 root.FloorItemPlacement={clear,spot};
 if(typeof module!=='undefined')module.exports=root.FloorItemPlacement;
})(typeof globalThis!=='undefined'?globalThis:this);
