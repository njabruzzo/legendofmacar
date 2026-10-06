const http=require('http'),fs=require('fs'),path=require('path');
const port=Number(process.argv[3]||4175);
const repo=path.resolve(__dirname,'../..');
const output=path.resolve(process.argv[2]||path.join(require('os').tmpdir(),'macar-browser-qa'));fs.mkdirSync(output,{recursive:true});
http.createServer((req,res)=>{
 const url=req.url.split('?')[0];
 if(url==='/qa-result' && req.method==='POST'){
  let data='';req.on('data',b=>data+=b);req.on('end',()=>{
   const result=JSON.parse(data);
   const galleries={entranceGallery:'crown-entrance.png',toyGallery:'toy-salvage.png',motionGallery:'gameplay-walk-review.png',idleGallery:'macar-standing-directions.png',doorGallery:'ruby-door-stairs.png',ghostGallery:'ghost-appearance-matrix.png',gallery:'weapon-crown-matrix.png'};
   for(const [key,name] of Object.entries(galleries))if(result[key]){
    fs.writeFileSync(path.join(output,name),Buffer.from(result[key].split(',')[1],'base64'));delete result[key];
   }
   const name=result.suite==='Chapter I progression'?'ch1-browser-results.json':result.suite==='Party movement regression'?'movement-browser-results.json':'browser-results.json';
   fs.writeFileSync(path.join(output,name),JSON.stringify(result,null,2));res.end('saved');
  });return;
 }
 const fixture={'/qa':'macar-browser-checks.js','/qa-ch1':'ch1-browser-checks.js','/qa-movement':'movement-browser-checks.js'}[url];
 let file=path.join(repo,fixture||url==='/'?'index.html':url);
 try{let content=fs.readFileSync(file);if(fixture){
  let s=content.toString().replace('function loop(now){','function loop(now){ return;');
  const i=s.lastIndexOf('</script>');s=s.slice(0,i)+fs.readFileSync(path.join(__dirname,fixture),'utf8')+s.slice(i);content=s;
 }res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.png')?'image/png':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.wav')?'audio/wav':'application/octet-stream');res.end(content);
 }catch(e){res.statusCode=404;res.end('missing');}
}).listen(port,'127.0.0.1',()=>console.log('QA fixture server ready at http://127.0.0.1:'+port+'/qa; output '+output));
