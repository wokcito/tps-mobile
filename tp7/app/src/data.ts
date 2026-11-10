import type { Geo } from './orbital';
export type SatelliteRecord={norad:number;name:string;group:string;epoch:number;omm?:Record<string,unknown>;tle?:readonly [string,string]};
export type ValidationPosition=Geo & {time:number;source:string};
export interface DataProvider {name:string;getCatalog(group?:string):Promise<SatelliteRecord[]>;getOrbitalData(norad:number):Promise<SatelliteRecord>;getValidationPosition(norad:number):Promise<ValidationPosition>}
export interface Storage {get(key:string):Promise<string|null>;set(key:string,value:string):Promise<void>}
export class MemoryStorage implements Storage {private values=new Map<string,string>();async get(key:string){return this.values.get(key)??null;}async set(key:string,value:string){this.values.set(key,value);}}
export interface Clock {now():number;sleep(ms:number):Promise<void>}
export const realClock:Clock={now:Date.now,sleep:ms=>new Promise(resolve=>setTimeout(resolve,ms))};
export class WindowLimiter {
 private hits:number[]=[];private queue:Promise<void>=Promise.resolve();
 constructor(private rules:{limit:number;ms:number}[],private clock:Clock=realClock){}
 acquire():Promise<void>{
  const work=this.queue.then(async()=>{
   for(;;){const now=this.clock.now();this.hits=this.hits.filter(t=>now-t<Math.max(...this.rules.map(r=>r.ms)));let delay=0;
    for(const rule of this.rules){const recent=this.hits.filter(t=>now-t<rule.ms);if(recent.length>=rule.limit)delay=Math.max(delay,recent[recent.length-rule.limit]+rule.ms-now);}
    if(delay<=0){this.hits.push(now);return;}await this.clock.sleep(delay);
   }
  });this.queue=work.catch(()=>{});return work;
 }
}
export async function retry<T>(operation:()=>Promise<T>,clock:Clock=realClock,attempts=3):Promise<T>{
 for(let i=0;;i++){try{return await operation();}catch(error){if(i>=attempts-1)throw error;await clock.sleep(500*2**i);}}
}
export type Cached<T>={value:T;savedAt:number;source:string;stale:boolean};
export class DataService {
 private inFlight=new Map<string,Promise<Cached<unknown>>>();
 constructor(private providers:DataProvider[],private storage:Storage,private now=Date.now,public ttl=24*3600000){}
 private async load<T>(key:string,call:(p:DataProvider)=>Promise<T>):Promise<Cached<T>>{
  const existing=this.inFlight.get(key);if(existing)return existing as Promise<Cached<T>>;
  const operation=(async()=>{
   let cached:Cached<T>|undefined;try{const raw=await this.storage.get(key);if(raw)cached=JSON.parse(raw);}catch{/* corrupt/missing disk cache is a miss */}
   if(cached && this.now()-cached.savedAt<this.ttl)return {...cached,stale:false};
   const errors:string[]=[];
   for(const provider of this.providers){try{const value=await call(provider),entry={value,savedAt:this.now(),source:provider.name,stale:false};try{await this.storage.set(key,JSON.stringify(entry));}catch{/* allow live data when disk is full */}return entry;}catch(e){errors.push(`${provider.name}: ${String(e)}`);}}
   if(cached)return {...cached,stale:true};throw Error(`Sin datos disponibles. ${errors.join('; ')}`);
  })();this.inFlight.set(key,operation);try{return await operation;}finally{this.inFlight.delete(key);}
 }
 catalog(group='stations'){return this.load(`catalog:${group}`,p=>p.getCatalog(group));}
 orbital(norad:number){return this.load(`orbital:${norad}`,p=>p.getOrbitalData(norad));}
 async validate(norad:number,source?:string){
  const errors:string[]=[];for(const p of this.providers){if(source && p.name!==source)continue;try{return await p.getValidationPosition(norad);}catch(e){errors.push(String(e));}}
  throw Error(`Validación no disponible: ${errors.join('; ')}`);
 }
}
