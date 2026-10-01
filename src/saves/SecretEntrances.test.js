'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
function fn(name){const start=html.indexOf('function '+name+'(');let i=html.indexOf('{',start),d=0;for(;i<html.length;i++){if(html[i]==='{')d++;else if(html[i]==='}'&&!--d)return html.slice(start,i+1);}throw new Error(name);}
const c={G:{lvl:{n:1,grid:Array.from({length:24},()=>Array(120).fill(0)),secrets:[]}},builds:0,bumps:0,
 rect(g,x,y,w,h,v){for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)g[j][i]=v;},
 buildTeethCrownRoom(){c.builds++;},bumpTopology(){c.bumps++;}};
vm.createContext(c);for(const n of ['sealSecretCells','savedSecretFor','restoreSecretEntrances'])vm.runInContext(fn(n),c);
const L=c.G.lvl,sec={i:105,j:15,w:3,h:1,kind:'teeth',face:'n',open:0};L.secrets=[sec];
const book={secrets:[{i:105,j:15,kind:'teeth',open:false,hinted:true}]};L.grid[18][104]=4;
c.restoreSecretEntrances(book);assert.deepEqual(Array.from(L.grid[15].slice(105,108)),[1,1,1]);assert(sec.hinted);
assert.equal(L.grid[18][104],4,'excavated terrain stays unchanged');assert.equal(c.builds,0,'closed room is not generated');
sec.open=1;book.secrets[0].open=true;L.grid[16].fill(1);c.restoreSecretEntrances(book);
assert.deepEqual(Array.from(L.grid[15].slice(105,108)),[0,0,0]);assert.deepEqual(Array.from(L.grid[16].slice(105,108)),[0,0,0]);assert.equal(c.builds,0,'current room contents are not regenerated');
book.secrets[0].i=111;assert.equal(c.savedSecretFor(L,book,sec),book.secrets[0],'unique room finds legacy entrance');
c.restoreSecretEntrances(book);assert.equal(c.builds,1,'relocated chapel reconnects to its room');
L.secrets.push({...sec,i:95});assert.equal(c.savedSecretFor(L,book,sec),null,'ambiguous same-kind entrances are not guessed');
book.secrets.push({i:105,j:15,kind:'teeth',open:true});assert.equal(c.savedSecretFor(L,book,sec),book.secrets[1],'exact coordinates resolve multiple same-kind rooms');
assert(html.indexOf('restoreSecretEntrances(play);')>html.indexOf('GameSave.applyWorld(G, play,'),'reconcile after saved grid replacement');
console.log('Closed/open crown-room seams, legacy entrance matching, and preserved terrain passed');
