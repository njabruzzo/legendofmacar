(function(root){
  'use strict';
  function normalize(data,w,h){
    const histogram=new Uint32Array(256), mask=new Uint8Array(w*h);
    let n=0;
    for(let i=0,p=0;i<w*h;i++,p+=4){
      if(data[p+3]<=40) continue;
      mask[i]=1;n++;
      histogram[Math.round(data[p]*.30+data[p+1]*.59+data[p+2]*.11)]++;
    }
    if(!n){data.fill(0);return data;}
    function percentile(q){let count=0;for(let v=0;v<256;v++){count+=histogram[v];if(count>=n*q)return v;}return 255;}
    const lo=percentile(.05),mid=percentile(.5),hi=percentile(.95);
    for(let i=0,p=0;i<w*h;i++,p+=4){
      if(!mask[i]){data[p]=data[p+1]=data[p+2]=data[p+3]=0;continue;}
      const y=data[p]*.30+data[p+1]*.59+data[p+2]*.11;
      const value=Math.max(15,Math.min(210,y<=mid?20+75*(y-lo)/Math.max(1,mid-lo):95+95*(y-mid)/Math.max(1,hi-mid)));
      data[p]=Math.round(value*.25);data[p+1]=Math.round(value*.8+12);data[p+2]=Math.round(value+30);
      data[p+3]=224;
      const x=i%w,yy=Math.floor(i/w);
      if(x===0||yy===0||x===w-1||yy===h-1||!mask[i-1]||!mask[i+1]||!mask[i-w]||!mask[i+w]){
        data[p]=10;data[p+1]=35;data[p+2]=48;
      }
    }
    return data;
  }
  const api={normalize};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.GhostAppearance=api;
})(typeof globalThis!=='undefined'?globalThis:this);
