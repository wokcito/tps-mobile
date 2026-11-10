import {MeasurementEngine} from '../src/engine/orchestrator';
import {MemoryRepository} from '../src/persistence/memory';
import {defaultSettings} from '../src/types';
test('orquesta, persiste y emite una medición completa sin datos inventados',async()=>{
 const repo=new MemoryRepository();await repo.createSession({id:'s',name:'Prueba',startedAt:0});
 const emit=jest.fn();
 const engine=new MeasurementEngine({repo,network:async()=>({network:'WiFi',operator:null,signalDbm:null}),location:async()=>({latitude:0,longitude:0,accuracy:5,timestamp:10}),probe:async()=>10,throughput:async()=>({downloadMbps:8,uploadMbps:4,downloadBytes:1000,uploadBytes:500}),now:()=>100,id:()=> 'm',emit});
 const m=await engine.run('s',defaultSettings,new AbortController().signal);
 expect(m).toEqual({id:'m',sessionId:'s',timestamp:100,network:'WiFi',operator:null,signalDbm:null,position:{latitude:0,longitude:0,accuracy:5,timestamp:10},rtt:defaultSettings.hosts.map(h=>({...h,min:10,avg:10,max:10,jitter:0,loss:0,samples:[10,10,10]})),throughput:{downloadMbps:8,uploadMbps:4,downloadBytes:1000,uploadBytes:500},errors:[]});
 expect(await repo.query({})).toEqual([m]);expect(emit).toHaveBeenCalledTimes(1);expect(emit).toHaveBeenCalledWith(m);
});
test('GPS y backend fallidos se registran como ausentes; cancelación no guarda ni emite',async()=>{
 const repo=new MemoryRepository();await repo.createSession({id:'s',name:'Prueba',startedAt:0});const emit=jest.fn();
 const engine=new MeasurementEngine({repo,network:async()=>({network:'LTE',operator:'AR',signalDbm:-100}),location:async()=>{throw Error('sin permiso');},probe:async()=>{throw Error('timeout');},throughput:async()=>{throw Error('HTTP');},now:()=>100,id:()=> 'm',emit});
 const m=await engine.run('s',defaultSettings,new AbortController().signal);
 expect(m.position).toBeNull();expect(m.throughput).toBeNull();expect(m.errors).toEqual(['Ubicación no disponible','Throughput no disponible']);expect(m.rtt.every(r=>r.loss===100&&r.avg===null)).toBe(true);
 expect(await repo.query({})).toEqual([m]);expect(emit).toHaveBeenCalledTimes(1);
 const c=new AbortController();c.abort();await expect(engine.run('s',defaultSettings,c.signal)).rejects.toThrow('cancelada');
 expect(await repo.query({})).toEqual([m]);expect(emit).toHaveBeenCalledTimes(1);
});
