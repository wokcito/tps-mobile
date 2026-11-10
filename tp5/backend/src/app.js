import express from 'express';
export function createApp({maxBytes=16*1024*1024}={}) {
 if(!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>256*1024*1024)throw Error('MAX_BYTES inválido');
 const app=express();app.disable('x-powered-by');
 app.use((_req,res,next)=>{res.set('Cache-Control','no-store');next();});
 app.get(['/ping','/health'],(_req,res)=>res.json({ok:true}));
 app.get('/download',(req,res)=>{
  const value=req.query.bytes;
  if(typeof value!=='string'||!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value)))return res.status(400).json({error:'bytes debe ser un entero no negativo'});
  const bytes=Number(value);if(bytes>maxBytes)return res.status(413).json({error:'Payload demasiado grande'});
  res.set('Content-Type','application/octet-stream');res.set('Content-Length',String(bytes));res.end(Buffer.alloc(bytes,0x61));
 });
 app.post('/upload',(req,res)=>{
  const start=performance.now();let bytes=0;let rejected=false;
  req.on('data',chunk=>{bytes+=chunk.length;if(bytes>maxBytes&&!rejected){rejected=true;res.status(413).json({error:'Payload demasiado grande'});}});
  req.on('end',()=>{if(!rejected)res.json({bytes,serverMs:performance.now()-start});});
  req.on('error',()=>{if(!res.headersSent)res.status(400).json({error:'Subida interrumpida'});});
 });
 return app;
}
