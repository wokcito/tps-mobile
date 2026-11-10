import {Host, HostResult, RttStats, Throughput} from '../types';
export function throwIfCancelled(signal:AbortSignal):void {if(signal.aborted)throw new Error('Medición cancelada');}
export function summarize(samples:(number|null)[]):RttStats {
 const good=samples.filter((v):v is number=>v!==null);
 return {min:good.length?Math.min(...good):null,avg:good.length?good.reduce((a,b)=>a+b,0)/good.length:null,max:good.length?Math.max(...good):null,
 jitter:good.length?good.slice(1).reduce((sum,v,i)=>sum+Math.abs(v-good[i]),0)/Math.max(1,good.length-1):null,
 loss:samples.length?(samples.length-good.length)/samples.length*100:0,samples};
}
export type Probe=(host:string,port:number,signal:AbortSignal)=>Promise<number>;
export async function pingHosts(hosts:Host[],attempts:number,probe:Probe,signal:AbortSignal):Promise<HostResult[]> {
 if(hosts.length<3||attempts<1)throw Error('Se requieren al menos 3 hosts y una sonda');
 return Promise.all(hosts.map(async host=>{
  const samples:(number|null)[]=[];
  for(let i=0;i<attempts;i++){
   throwIfCancelled(signal);
   try {samples.push(await probe(host.host,host.port,signal));}catch {throwIfCancelled(signal);samples.push(null);}
  }
  throwIfCancelled(signal);return {...host,...summarize(samples)};
 }));
}
export interface ProbeResponse {ok:boolean;arrayBuffer:()=>Promise<ArrayBuffer>;json:()=>Promise<unknown>}
export type Fetcher=(url:string,init?:{method?:string;body?:Uint8Array;signal?:AbortSignal;headers?:Record<string,string>})=>Promise<ProbeResponse>;
export async function measureThroughput(base:string,bytes:number,fetcher:Fetcher,now:()=>number,signal:AbortSignal):Promise<Throughput> {
 if(!Number.isSafeInteger(bytes)||bytes<1||bytes>16*1024*1024)throw Error('Tamaño de payload inválido');
 throwIfCancelled(signal);
 const start=now();
 const down=await fetcher(`${base.replace(/\/$/,'')}/download?bytes=${bytes}`,{signal,headers:{'Cache-Control':'no-cache'}});
 if(!down.ok)throw Error('Error HTTP de descarga');
 const downloadBytes=(await down.arrayBuffer()).byteLength;
 const downMs=now()-start;
 const payload=new Uint8Array(bytes); // ASCII/binary: one element is exactly one byte, no UTF-16 assumption.
 const uploadStart=now();
 const up=await fetcher(`${base.replace(/\/$/,'')}/upload`,{method:'POST',body:payload,signal,headers:{'Content-Type':'application/octet-stream'}});
 if(!up.ok)throw Error('Error HTTP de subida');
 const receipt=await up.json() as {bytes?:number};
 const upMs=now()-uploadStart;
 throwIfCancelled(signal);
 if(receipt.bytes!==bytes)throw Error('Conteo de bytes de subida inconsistente');
 if(downMs<=0||upMs<=0||downloadBytes===0)throw Error('Duración o descarga no medible');
 return {downloadMbps:downloadBytes*8/(downMs*1000),uploadMbps:receipt.bytes*8/(upMs*1000),downloadBytes,uploadBytes:receipt.bytes};
}
