const http=require('http'),fs=require('fs'),path=require('path');
const port=Number(process.argv[3]||4175);
const repo=path.resolve(__dirname,'../..');
const output=path.resolve(process.argv[2]||path.join(require('os').tmpdir(),'macar-browser-qa'));fs.mkdirSync(output,{recursive:true});
http.createServer((req,res)=>{
 const url=req.url.split('?')[0];
 if(url==='/qa-result' && req.method==='POST'){let data='';req.on('data',b=>data+=b);req.on('end',()=>{const result=JSON.parse(data);if(result.ghostGallery){fs.writeFileSync(path.join(output,'ghost-appearance-matrix.png'),Buffer.from(result.ghostGallery.split(',')[1],'base64'));delete result.ghostGallery;}if(result.gallery){fs.writeFileSync(path.join(output,'weapon-crown-matrix.png'),Buffer.from(result.gallery.split(',')[1],'base64'));delete result.gallery;}const name=result.suite==='Chapter I progression'?'ch1-browser-results.json':'browser-results.json';fs.writeFileSync(path.join(output,name),JSON.stringify(result,null,2));res.end('saved')});return;}
 let file=path.join(repo,url==='/qa'||url==='/qa-ch1'||url==='/'?'index.html':url);
 try{let content=fs.readFileSync(file);if(url==='/qa'||url==='/qa-ch1'){
  let s=content.toString().replace('function loop(now){','function loop(now){ return;');
  const i=s.lastIndexOf('</script>');s=s.slice(0,i)+fs.readFileSync(path.join(__dirname,url==='/qa-ch1'?'ch1-browser-checks.js':'macar-browser-checks.js'),'utf8')+s.slice(i);content=s;
 }res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.png')?'image/png':'application/octet-stream');res.end(content);
 }catch(e){res.statusCode=404;res.end('missing');}
}).listen(port,'127.0.0.1',()=>console.log('QA fixture server ready at http://127.0.0.1:'+port+'/qa; output '+output));
