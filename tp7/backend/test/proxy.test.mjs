import test from 'node:test';
import assert from 'node:assert/strict';
import { createProxy, WindowLimiter, retry, SpaceTrackProvider, N2yoProvider } from '../server.mjs';
const orbital={norad:25544,name:'ISS',epoch:0,group:'stations',tle:['line1','line2']};
const provider=(fail=false)=>({name:'fake',getCatalog:async()=>{if(fail)throw Error('offline');return [orbital];},getOrbitalData:async()=>orbital,getValidationPosition:async()=>({latitude:0,longitude:0,altitude:420,time:0,source:'fake'})});
test('public API exact errors, fallback, cache TTL, input rejection preserves requests',async()=>{
 let time=0,calls=0;const good=provider();good.getCatalog=async()=>{calls++;return [orbital];};
 const api=createProxy({providers:[provider(true),good],now:()=>time,ttl:1000});
 assert.deepEqual(await api.handle('/catalog?group=stations'),{status:200,body:[orbital]});
 await api.handle('/catalog?group=stations');assert.equal(calls,1);
 assert.deepEqual(await api.handle('/orbital/not-a-number'),{status:400,body:{error:'NORAD inválido'}});assert.equal(calls,1);
 assert.deepEqual(await api.handle('/catalog?group=bad'),{status:400,body:{error:'Grupo inválido'}});
 assert.deepEqual(await api.handle('/missing'),{status:404,body:{error:'Ruta no encontrada'}});
 time=1000;await api.handle('/catalog?group=stations');assert.equal(calls,2);
 assert.deepEqual((await api.handle('/orbital/25544')).body,orbital);
 assert.equal((await api.handle('/validate/25544')).body.altitude,420);
});
test('rate limit and backoff clock is injectable',async()=>{
 let now=0;const clock={now:()=>now,sleep:async ms=>{now+=ms;}};
 const limiter=new WindowLimiter([{limit:2,ms:1000},{limit:3,ms:10000}],clock);
 for(let i=0;i<4;i++)await limiter.acquire();assert.equal(now,10000);
 let calls=0;const value=await retry(async()=>{if(++calls<3)throw Error('503');return 7;},clock);
 assert.equal(value,7);assert.equal(now,11500);
});
test('Space-Track login cookie and GP parsing; N2YO TLE, positions, visual passes',async()=>{
 const urls=[];const st=new SpaceTrackProvider({identity:'placeholder',password:'placeholder'},async(url,init)=>{
  urls.push([url,init]);return {ok:true,headers:new Headers({'set-cookie':'session=fake; Path=/'}),json:async()=>[{NORAD_CAT_ID:25544,OBJECT_NAME:'ISS',EPOCH:'2026-11-09T11:10:18',MEAN_MOTION:15.49}]};
 });
 assert.equal((await st.getOrbitalData(25544)).norad,25544);assert.match(urls[0][0],/ajaxauth\/login/);assert.equal(urls[1][1].headers.Cookie,'session=fake');
 const n=new N2yoProvider('placeholder',async url=>({ok:true,json:async()=>url.includes('/tle/')?{info:{satname:'ISS'},tle:'line1\nline2'}:url.includes('/positions/')?{positions:[{satlatitude:1,satlongitude:2,sataltitude:420,timestamp:100}]}:{passes:[{startUTC:100}]}}));
 assert.equal((await n.getOrbitalData(25544)).tle[0],'line1');assert.equal((await n.getValidationPosition(25544)).time,100000);assert.equal((await n.getVisualPasses(25544,{latitude:0,longitude:0,altitude:0},2)).passes.length,1);
});
test('proxy ingress quota: 120/min per client, exact reset, invalid input consumes no quota',async()=>{
 let now=0;const api=createProxy({providers:[provider()],now:()=>now});
 for(let i=0;i<10;i++)assert.equal((await api.handle('/orbital/bad','device')).status,400);
 for(let i=0;i<120;i++)assert.equal((await api.handle('/orbital/25544','device')).status,200);
 assert.deepEqual(await api.handle('/orbital/25544','device'),{status:429,body:{error:'Límite del proxy: 120 solicitudes/minuto'}});
 assert.equal((await api.handle('/orbital/25544','other-device')).status,200);
 now=60000;assert.equal((await api.handle('/orbital/25544','device')).status,200);
});
test('unavailable sources return sanitized error; response never exposes upstream secrets',async()=>{
 const bad={...provider(),getOrbitalData:async()=>{throw Error('secret-url?apiKey=do-not-leak');}};
 assert.deepEqual(await createProxy({providers:[bad]}).handle('/orbital/25544'),{status:503,body:{error:'Fuentes no disponibles'}});
});
