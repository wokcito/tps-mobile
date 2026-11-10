import { WindowLimiter, retry, MemoryStorage, DataService } from '../data';
import { CelesTrakProvider, WhereTheIssProvider, ProxyProvider } from '../providers';
import { ISS } from './fixtures';
const record={norad:25544,name:'ISS (ZARYA)',group:'stations',omm:ISS,epoch:Date.parse(ISS.EPOCH+'Z')};
const provider=(name:string,fail=false)=>({name,getCatalog:jest.fn(async()=>{if(fail)throw Error('offline');return [record];}),getOrbitalData:jest.fn(async()=>{if(fail)throw Error('offline');return record;}),getValidationPosition:jest.fn(async()=>{throw Error('unsupported');})});
test('strict rolling windows, boundaries and exponential backoff with injected time',async()=>{
 let now=0;const clock={now:()=>now,sleep:async(ms:number)=>{now+=ms;}};
 const limiter=new WindowLimiter([{limit:2,ms:1000},{limit:3,ms:10000}],clock);
 await limiter.acquire();await limiter.acquire();await limiter.acquire();expect(now).toBe(1000);await limiter.acquire();expect(now).toBe(10000);
 const waits:number[]=[];let calls=0;
 expect(await retry(async()=>{if(++calls<3)throw Error('503');return 7;},{now:()=>0,sleep:async(ms)=>{waits.push(ms);}},3)).toBe(7);
 expect(waits).toEqual([500,1000]);
});
test('TTL, cache offline, automatic fallback and stale age preserve original timestamp',async()=>{
 let now=0;const store=new MemoryStorage();const first=provider('first',true),second=provider('second');
 const service=new DataService([first,second],store,()=>now,1000);
 expect((await service.orbital(25544)).stale).toBe(false);expect(second.getOrbitalData).toHaveBeenCalledTimes(1);
 now=999;await service.orbital(25544);expect(second.getOrbitalData).toHaveBeenCalledTimes(1);
 now=1000;second.getOrbitalData.mockRejectedValue(Error('offline'));
 const result=await service.orbital(25544);expect(result.stale).toBe(true);expect(result.savedAt).toBe(0);expect(result.value).toEqual(record);
 expect(await store.get('missing')).toBeNull();
});
test('CelesTrak uses GP JSON and Starlink supplemental endpoint; validation fetch is injectable',async()=>{
 const fetcher=jest.fn(async(_url:string)=>({ok:true,json:async()=>[ISS]} as Response));
 const c=new CelesTrakProvider(fetcher);expect((await c.getCatalog('starlink'))[0].norad).toBe(25544);expect(fetcher.mock.calls[0][0]).toContain('sup-gp.php?FILE=starlink&FORMAT=json');
 await c.getOrbitalData(25544);expect(fetcher.mock.calls[1][0]).toContain('CATNR=25544&FORMAT=json');
 const w=new WhereTheIssProvider(async()=>({ok:true,json:async()=>({latitude:1,longitude:2,altitude:420,timestamp:100})} as Response));
 expect((await w.getValidationPosition(25544)).time).toBe(100000);await expect(w.getValidationPosition(1)).rejects.toThrow('Solo ISS');
});
test('proxy URLs do not contain credentials and enforce numeric NORAD',async()=>{
 const fetcher=jest.fn(async(_url:string)=>({ok:true,json:async()=>record} as Response));
 await new ProxyProvider('https://proxy.example/',fetcher).getOrbitalData(25544);
 expect(fetcher.mock.calls[0][0]).toBe('https://proxy.example/orbital/25544');
 await expect(new ProxyProvider('https://proxy.example',fetcher).getOrbitalData(-1)).rejects.toThrow();
});
