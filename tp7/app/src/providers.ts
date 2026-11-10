import { WindowLimiter, retry, type DataProvider, type SatelliteRecord, type ValidationPosition } from './data';
export type Fetcher=(url:string,init?:RequestInit)=>Promise<Response>;
export const GROUPS={stations:'ISS / estaciones',starlink:'Starlink',gps:'GPS',weather:'Meteorológicos',active:'Activos',geo:'Geoestacionarios'};
export function checkNorad(n:number){if(!Number.isSafeInteger(n)||n<1)throw Error('NORAD inválido');return n;}
export function fromOmm(omm:Record<string,unknown>,group='active'):SatelliteRecord {
 const epoch=Date.parse(String(omm.EPOCH)+(String(omm.EPOCH).endsWith('Z')?'':'Z'));
 const norad=checkNorad(Number(omm.NORAD_CAT_ID));if(!Number.isFinite(epoch))throw Error('Época inválida');
 return {norad,name:String(omm.OBJECT_NAME??norad),epoch,group,omm};
}
abstract class HttpProvider implements DataProvider {
 abstract name:string;abstract getCatalog(group?:string):Promise<SatelliteRecord[]>;abstract getOrbitalData(norad:number):Promise<SatelliteRecord>;
 constructor(protected fetcher:Fetcher=fetch,private limiter=new WindowLimiter([{limit:1,ms:1000}])){}
 protected async json<T>(url:string):Promise<T>{return retry(async()=>{await this.limiter.acquire();const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);try{const r=await this.fetcher(url,{signal:controller.signal});if(!r.ok)throw Error(`HTTP ${r.status}`);return await r.json() as T;}finally{clearTimeout(timer);}});}
 async getValidationPosition(_norad:number):Promise<ValidationPosition>{throw Error('Proveedor sin posiciones de validación');}
}
export class CelesTrakProvider extends HttpProvider {
 name='CelesTrak';
 async getCatalog(group='stations'){
  if(!(group in GROUPS))throw Error('Grupo no soportado');
  const query=group==='starlink'?'sup-gp.php?FILE=starlink&FORMAT=json':`gp.php?GROUP=${group==='gps'?'gps-ops':group}&FORMAT=json`;
  const data=await this.json<Record<string,unknown>[]>(`https://celestrak.org/NORAD/elements/${query}`);return data.map(row=>fromOmm(row,group));
 }
 async getOrbitalData(norad:number){const rows=await this.json<Record<string,unknown>[]>(`https://celestrak.org/NORAD/elements/gp.php?CATNR=${checkNorad(norad)}&FORMAT=json`);if(!rows.length)throw Error('Satélite no encontrado');return fromOmm(rows[0]);}
}
export class WhereTheIssProvider extends HttpProvider {
 name='Where the ISS at?';
 async getCatalog(){throw Error('Solo ISS: no hay catálogo');return [] as SatelliteRecord[];}
 async getOrbitalData(norad:number){
  if(norad!==25544)throw Error('Solo ISS 25544');const r=await this.json<{line1:string;line2:string;requested:number}>(`https://api.wheretheiss.at/v1/satellites/25544/tles`);
  const y=Number(r.line1.slice(18,20)),year=y<57?2000+y:1900+y,day=Number(r.line1.slice(20,32));
  return {norad,name:'ISS (ZARYA)',group:'stations',epoch:Date.UTC(year,0,1)+(day-1)*86400000,tle:[r.line1,r.line2] as const};
 }
 async getValidationPosition(norad:number){if(norad!==25544)throw Error('Solo ISS 25544');const p=await this.json<{latitude:number;longitude:number;altitude:number;timestamp:number}>(`https://api.wheretheiss.at/v1/satellites/25544`);return {...p,time:p.timestamp*1000,source:this.name};}
}
export class ProxyProvider extends HttpProvider {
 name='Proxy';private base:string;
 constructor(base:string,fetcher:Fetcher=fetch,private source?:string){super(fetcher);if(!/^https?:\/\//.test(base))throw Error('URL de proxy inválida');this.base=base.replace(/\/$/,'');}
 private url(path:string){return `${this.base}${path}${this.source?`${path.includes('?')?'&':'?'}source=${this.source}`:''}`;}
 getCatalog(group='stations'){return this.json<SatelliteRecord[]>(this.url(`/catalog?group=${encodeURIComponent(group)}`));}
 async getOrbitalData(norad:number){return this.json<SatelliteRecord>(this.url(`/orbital/${checkNorad(norad)}`));}
 getValidationPosition(norad:number){return this.json<ValidationPosition>(this.url(`/validate/${checkNorad(norad)}`));}
}
// Credential-backed implementations deliberately delegate to server; never accept secrets.
export class SpaceTrackProvider extends ProxyProvider {name='Space-Track';constructor(base:string,fetcher:Fetcher=fetch){super(base,fetcher,'spacetrack');}}
export class N2yoProvider extends ProxyProvider {name='N2YO';constructor(base:string,fetcher:Fetcher=fetch){super(base,fetcher,'n2yo');}}
