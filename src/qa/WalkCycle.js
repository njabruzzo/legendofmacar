(function(root){
 const PHASES=['Right foot forward','Passing left foot','Left foot forward','Passing right foot'];
 function phase(seconds){return ((Math.floor(seconds*6)%4)+4)%4;}
 const api={PHASES,phase};if(typeof module==='object')module.exports=api;else root.WalkCycle=api;
})(globalThis);
