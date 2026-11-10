export type NetworkType = 'WiFi'|'LTE'|'NR'|'UMTS'|'GSM'|'Ethernet'|'Sin conexión'|'Desconocida';
export interface Position {latitude:number; longitude:number; accuracy:number; timestamp:number}
export interface Host {host:string; port:number}
export interface RttStats {min:number|null; avg:number|null; max:number|null; jitter:number|null; loss:number; samples:(number|null)[]}
export interface HostResult extends Host, RttStats {}
export interface Throughput {downloadMbps:number; uploadMbps:number; downloadBytes:number; uploadBytes:number}
export interface Measurement {id:string; sessionId:string; timestamp:number; network:NetworkType; operator:string|null; signalDbm:number|null; position:Position|null; rtt:HostResult[]; throughput:Throughput|null; errors:string[]}
export interface Session {id:string; name:string; startedAt:number}
export interface BoundingBox {south:number; north:number; west:number; east:number}
export interface Filters {network?:NetworkType; from?:number; to?:number; bbox?:BoundingBox; sessionId?:string}
export interface Thresholds {low:number; recovery:number}
export interface Settings {hosts:Host[]; backendUrl:string; intervalMinutes:number; thresholds:Thresholds; backgroundEnabled:boolean; payloadBytes:number}
export const networks:NetworkType[]=['WiFi','LTE','NR','UMTS','GSM','Ethernet','Sin conexión','Desconocida'];
export const defaultSettings:Settings={hosts:[{host:'1.1.1.1',port:443},{host:'8.8.8.8',port:443},{host:'example.com',port:443}],backendUrl:'http://10.0.2.2:3000',intervalMinutes:15,thresholds:{low:0.3,recovery:0.5},backgroundEnabled:false,payloadBytes:1000000};
export function averageRtt(m:Measurement):number|null {const values=m.rtt.map(r=>r.avg).filter((v):v is number=>v!==null);return values.length?values.reduce((a,b)=>a+b,0)/values.length:null;}
