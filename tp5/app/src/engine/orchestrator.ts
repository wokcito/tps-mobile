import {Measurement,NetworkType,Position,Settings,Throughput} from '../types';
import {Repository} from '../persistence/repository';
import {pingHosts,Probe,throwIfCancelled} from './probes';
export interface Acquisition {network:NetworkType;operator:string|null;signalDbm:number|null}
interface Dependencies {repo:Repository;network:()=>Promise<Acquisition>;location:()=>Promise<Position|null>;probe:Probe;throughput:(settings:Settings,signal:AbortSignal)=>Promise<Throughput>;now:()=>number;id:()=>string;emit:(m:Measurement)=>void}
export class MeasurementEngine {
 private running=false;
 constructor(private deps:Dependencies){}
 async run(sessionId:string,settings:Settings,signal:AbortSignal):Promise<Measurement> {
  throwIfCancelled(signal);if(this.running)throw Error('Ya hay una medición en curso');this.running=true;
  try {
   const d=this.deps;const timestamp=d.now();const errors:string[]=[];
   const info=await d.network();throwIfCancelled(signal);
   const position=await d.location().catch(()=>{errors.push('Ubicación no disponible');return null;});throwIfCancelled(signal);
   const rtt=await pingHosts(settings.hosts,3,d.probe,signal);
   const throughput=await d.throughput(settings,signal).catch(()=>{throwIfCancelled(signal);errors.push('Throughput no disponible');return null;});
   throwIfCancelled(signal);
   const m:Measurement={id:d.id(),sessionId,timestamp,...info,position,rtt,throughput,errors};
   await d.repo.save(m);d.emit(m);return m;
  } finally {this.running=false;}
 }
}
