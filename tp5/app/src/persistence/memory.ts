import {Filters,Measurement,Session,Settings} from '../types';
import {matches,Repository} from './repository';
const clone=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
export class MemoryRepository implements Repository {
 private data:Measurement[]=[];private groups:Session[]=[];private settings:Settings|null=null;private degraded=false;
 async createSession(s:Session){if(this.groups.some(x=>x.id===s.id))throw Error('Sesión duplicada');this.groups.push(clone(s));}
 async sessions(){return clone(this.groups).sort((a,b)=>a.startedAt-b.startedAt);}
 async save(m:Measurement){if(this.data.some(x=>x.id===m.id))throw Error('Medición duplicada');if(!this.groups.some(s=>s.id===m.sessionId))throw Error('Sesión inexistente');this.data.push(clone(m));}
 async query(f:Filters){return clone(this.data.filter(m=>matches(m,f))).sort((a,b)=>a.timestamp-b.timestamp||a.id.localeCompare(b.id));}
 async getSettings(){return clone(this.settings);}async setSettings(s:Settings){this.settings=clone(s);}
 async getDegraded(){return this.degraded;}async setDegraded(v:boolean){this.degraded=v;}
}
