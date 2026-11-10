import {summarize, pingHosts, measureThroughput} from '../src/engine/probes';
import {qualityScore, detectDegradation} from '../src/engine/quality';
import {MemoryRepository} from '../src/persistence/memory';
import {exportCSV, exportJSON} from '../src/persistence/export';
import {Measurement} from '../src/types';

export const sample: Measurement = {id:'1',sessionId:'s1',timestamp:1000,network:'LTE',operator:'Red, "Sur"\nAR',signalDbm:-90,position:{latitude:-34,longitude:-58,accuracy:10,timestamp:1000},rtt:[{host:'a',port:80,min:10,avg:20,max:30,jitter:20,loss:25,samples:[10,null,30]}],throughput:{downloadMbps:8,uploadMbps:4,downloadBytes:1000,uploadBytes:500},errors:[]};
test('RTT exacto, jitter sucesivo y pérdida, incluidos cero y sin respuestas',()=>{
 expect(summarize([10,30,null,20])).toEqual({min:10,avg:20,max:30,jitter:15,loss:25,samples:[10,30,null,20]});
 expect(summarize([0])).toEqual({min:0,avg:0,max:0,jitter:0,loss:0,samples:[0]});
 expect(summarize([null,null])).toEqual({min:null,avg:null,max:null,jitter:null,loss:100,samples:[null,null]});
 expect(summarize([])).toEqual({min:null,avg:null,max:null,jitter:null,loss:0,samples:[]});
});
test('sondas inyectadas contra tres hosts, errores son pérdida y cancelar no es pérdida',async()=>{
 const probe=jest.fn(async(host:string)=>{if(host==='b')throw Error('timeout');return 12;});
 const hosts=['a','b','c'].map(host=>({host,port:80}));
 const result=await pingHosts(hosts,2,probe,new AbortController().signal);
 expect(result).toEqual(hosts.map(h=>({...h,...summarize(h.host==='b'?[null,null]:[12,12])})));
 expect(probe).toHaveBeenCalledTimes(6);
 const control=new AbortController();control.abort();
 await expect(pingHosts(hosts,2,probe,control.signal)).rejects.toThrow('cancelada');
 expect(probe).toHaveBeenCalledTimes(6);
});
test('throughput usa bytes realmente transferidos y tiempo cliente, no tamaño solicitado',async()=>{
 let now=0;
 const fetcher=jest.fn(async(_url:string,init?:{method?:string;body?:Uint8Array;signal?:AbortSignal})=>{
  now+=1000;
  return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1000000),json:async()=>({bytes:init?.body?.byteLength,serverMs:1})};
 });
 expect(await measureThroughput('http://local',2000000,fetcher,()=>now,new AbortController().signal)).toEqual({downloadMbps:8,uploadMbps:16,downloadBytes:1000000,uploadBytes:2000000});
 expect(fetcher.mock.calls[0][0]).toBe('http://local/download?bytes=2000000');
 expect(fetcher.mock.calls[1][1]?.body?.byteLength).toBe(2000000);
});
test('error HTTP o conteo de subida inválido no produce métricas ficticias',async()=>{
 await expect(measureThroughput('http://local',100,async()=>({ok:false,arrayBuffer:async()=>new ArrayBuffer(0),json:async()=>({})}),Date.now,new AbortController().signal)).rejects.toThrow('HTTP');
 let clock=0;
 await expect(measureThroughput('http://local',100,async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(100),json:async()=>({bytes:99})}),()=>++clock,new AbortController().signal)).rejects.toThrow('subida');
});
test('score normalizado y ausencia de datos no inventa calidad',()=>{
 expect(qualityScore(-50,0,50)).toBe(1);
 expect(qualityScore(-120,300,0)).toBe(0);
 expect(qualityScore(-85,150,25)).toBe(0.5);
 expect(qualityScore(null,null,null)).toBeNull();
 expect(qualityScore(null,0,null)).toBe(1);
});
test('histéresis: avisa una vez, zona muerta no rearma, recuperación rearma',()=>{
 const thresholds={low:0.3,recovery:0.5};
 expect(detectDegradation(false,0.3,thresholds)).toEqual({degraded:true,notify:true});
 expect(detectDegradation(true,0.2,thresholds)).toEqual({degraded:true,notify:false});
 expect(detectDegradation(true,0.4,thresholds)).toEqual({degraded:true,notify:false});
 expect(detectDegradation(true,null,thresholds)).toEqual({degraded:true,notify:false});
 expect(detectDegradation(true,0.5,thresholds)).toEqual({degraded:false,notify:false});
 expect(detectDegradation(false,0.1,thresholds)).toEqual({degraded:true,notify:true});
});
test('repositorio: sesiones, filtros combinados inclusivos, bbox antimeridiano, sin GPS excluido',async()=>{
 const repo=new MemoryRepository();
 await repo.createSession({id:'s1',name:'Primera',startedAt:0});
 await repo.save(sample);await repo.save({...sample,id:'2',network:'WiFi',timestamp:2000,position:null});
 await repo.save({...sample,id:'3',timestamp:3000,position:{...sample.position!,longitude:179}});
 expect(await repo.sessions()).toEqual([{id:'s1',name:'Primera',startedAt:0}]);
 expect(await repo.query({network:'LTE',from:1000,to:1000,bbox:{south:-34,north:-34,west:-58,east:-58}})).toEqual([sample]);
 expect((await repo.query({bbox:{south:-90,north:90,west:170,east:-170}})).map(x=>x.id)).toEqual(['3']);
 expect((await repo.query({sessionId:'s1',from:2000})).map(x=>x.id)).toEqual(['2','3']);
 await expect(repo.save(sample)).rejects.toThrow('duplicada');
 expect((await repo.query({})).length).toBe(3);
});
test('CSV exacto: comas, comillas, saltos; JSON preserva datos',()=>{
 expect(exportCSV([sample])).toBe('id,sessionId,timestamp,network,operator,signalDbm,latitude,longitude,rttAvgMs,downloadMbps,uploadMbps\r\n1,s1,1000,LTE,"Red, ""Sur""\nAR",-90,-34,-58,20,8,4\r\n');
 expect(JSON.parse(exportJSON([sample]))).toEqual([sample]);
 expect(exportCSV([])).toBe('id,sessionId,timestamp,network,operator,signalDbm,latitude,longitude,rttAvgMs,downloadMbps,uploadMbps\r\n');
});
