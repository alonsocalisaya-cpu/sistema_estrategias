const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
http.createServer((req,res)=>{const name=req.url.split('?')[0];const file=path.join(__dirname,name==='/'?'index.html':name);if(!file.startsWith(__dirname+path.sep)){res.writeHead(403);return res.end();}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end('No encontrado');}res.setHeader('Content-Type',({'html':'text/html; charset=utf-8','css':'text/css','js':'application/javascript'})[file.split('.').pop()]||'text/plain');res.end(data);});}).listen(5000,'0.0.0.0',()=>console.log('Dashboard listo en http://localhost:5000'));
