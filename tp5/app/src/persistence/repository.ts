import {Filters, Measurement, Session, Settings} from '../types';
export interface Repository {
 createSession(session:Session):Promise<void>; sessions():Promise<Session[]>;
 save(measurement:Measurement):Promise<void>; query(filters:Filters):Promise<Measurement[]>;
 getSettings():Promise<Settings|null>; setSettings(settings:Settings):Promise<void>;
 getDegraded():Promise<boolean>; setDegraded(value:boolean):Promise<void>;
}
export function matches(m:Measurement,f:Filters):boolean {
 if(f.network&&m.network!==f.network||f.sessionId&&m.sessionId!==f.sessionId||f.from!==undefined&&m.timestamp<f.from||f.to!==undefined&&m.timestamp>f.to)return false;
 if(f.bbox){const b=f.bbox,p=m.position;if(!p||p.latitude<b.south||p.latitude>b.north)return false;
  if(b.west<=b.east?(p.longitude<b.west||p.longitude>b.east):(p.longitude<b.west&&p.longitude>b.east))return false;}
 return true;
}
