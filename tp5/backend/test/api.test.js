import {test} from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {createApp} from '../src/app.js';
const app=createApp({maxBytes:1024});
test('health y ping existentes responden JSON sin cache',async()=>{
 for(const path of ['/health','/ping']){const r=await request(app).get(path);assert.equal(r.status,200);assert.deepEqual(r.body,{ok:true});assert.equal(r.headers['cache-control'],'no-store');}
});
test('download exacto, cero y límite inclusive',async()=>{
 for(const bytes of [0,1,1024]){const r=await request(app).get(`/download?bytes=${bytes}`);assert.equal(r.status,200);assert.equal(Number(r.headers['content-length']),bytes);assert.equal(r.body.length,bytes);assert.equal(r.headers['cache-control'],'no-store');}
});
test('bytes inválidos 400, límite excedido 413, siguiente solicitud intacta',async()=>{
 for(const query of ['','?bytes=-1','?bytes=1.5','?bytes=abc','?bytes=1e2','?bytes=1&bytes=2']){const r=await request(app).get('/download'+query);assert.equal(r.status,400);assert.deepEqual(r.body,{error:'bytes debe ser un entero no negativo'});}
 const r=await request(app).get('/download?bytes=1025');assert.equal(r.status,413);assert.deepEqual(r.body,{error:'Payload demasiado grande'});
 assert.equal((await request(app).get('/download?bytes=3')).body.length,3);
});
test('upload cuenta bytes binarios, UTF8, vacío y rechaza exceso',async()=>{
 for(const body of [Buffer.alloc(0),Buffer.from('á☀'),Buffer.alloc(1024,7)]){
 const r=await request(app).post('/upload').set('Content-Type','application/octet-stream').send(body);assert.equal(r.status,200);assert.equal(r.body.bytes,body.length);assert.equal(typeof r.body.serverMs,'number');assert.ok(r.body.serverMs>=0);assert.equal(r.headers['cache-control'],'no-store');}
 const r=await request(app).post('/upload').set('Content-Type','application/octet-stream').send(Buffer.alloc(1025));assert.equal(r.status,413);assert.deepEqual(r.body,{error:'Payload demasiado grande'});
 assert.equal((await request(app).post('/upload').send('abc')).body.bytes,3);
});
