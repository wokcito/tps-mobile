import SQLite,{SQLiteDatabase} from 'react-native-sqlite-storage';
import {Filters,Measurement,Session,Settings} from '../types';
import {Repository} from './repository';
SQLite.enablePromise(true);
export class SQLiteRepository implements Repository {
 private ready:Promise<SQLiteDatabase>;
 constructor(){this.ready=this.open();}
 private async open(){
  const db=await SQLite.openDatabase({name:'qos.db',location:'default'});
  await db.executeSql('PRAGMA foreign_keys = ON');
  await db.executeSql('CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, name TEXT NOT NULL, startedAt INTEGER NOT NULL)');
  await db.executeSql('CREATE TABLE IF NOT EXISTS measurements (id TEXT PRIMARY KEY, sessionId TEXT NOT NULL REFERENCES sessions(id), timestamp INTEGER NOT NULL, network TEXT NOT NULL, latitude REAL, longitude REAL, payload TEXT NOT NULL)');
  await db.executeSql('CREATE INDEX IF NOT EXISTS measurements_time ON measurements(timestamp)');
  await db.executeSql('CREATE INDEX IF NOT EXISTS measurements_session ON measurements(sessionId,timestamp)');
  await db.executeSql('CREATE INDEX IF NOT EXISTS measurements_network ON measurements(network,timestamp)');
  await db.executeSql('CREATE INDEX IF NOT EXISTS measurements_geo ON measurements(latitude,longitude)');
  await db.executeSql('CREATE TABLE IF NOT EXISTS preferences (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  return db;
 }
 async createSession(s:Session){await (await this.ready).executeSql('INSERT INTO sessions(id,name,startedAt) VALUES (?,?,?)',[s.id,s.name,s.startedAt]);}
 async sessions():Promise<Session[]>{const [r]=await (await this.ready).executeSql('SELECT * FROM sessions ORDER BY startedAt,id');const rows:Session[]=[];for(let i=0;i<r.rows.length;i++)rows.push(r.rows.item(i));return rows;}
 async save(m:Measurement){await (await this.ready).executeSql('INSERT INTO measurements(id,sessionId,timestamp,network,latitude,longitude,payload) VALUES (?,?,?,?,?,?,?)',[m.id,m.sessionId,m.timestamp,m.network,m.position?.latitude??null,m.position?.longitude??null,JSON.stringify(m)]);}
 async query(f:Filters):Promise<Measurement[]>{
  const where:string[]=[],args:(string|number)[]=[];
  const add=(sql:string,...values:(string|number)[])=>{where.push(sql);args.push(...values);};
  if(f.network)add('network = ?',f.network);if(f.sessionId)add('sessionId = ?',f.sessionId);
  if(f.from!==undefined)add('timestamp >= ?',f.from);if(f.to!==undefined)add('timestamp <= ?',f.to);
  if(f.bbox){const b=f.bbox;add('latitude >= ? AND latitude <= ?',b.south,b.north);
   add(b.west<=b.east?'longitude >= ? AND longitude <= ?':'(longitude >= ? OR longitude <= ?)',b.west,b.east);}
  const [r]=await (await this.ready).executeSql(`SELECT payload FROM measurements${where.length?' WHERE '+where.join(' AND '):''} ORDER BY timestamp,id`,args);
  const rows:Measurement[]=[];for(let i=0;i<r.rows.length;i++)rows.push(JSON.parse(r.rows.item(i).payload));return rows;
 }
 private async read<T>(key:string):Promise<T|null>{const [r]=await (await this.ready).executeSql('SELECT value FROM preferences WHERE key = ?',[key]);return r.rows.length?JSON.parse(r.rows.item(0).value):null;}
 private async write(key:string,value:unknown){await (await this.ready).executeSql('INSERT OR REPLACE INTO preferences(key,value) VALUES (?,?)',[key,JSON.stringify(value)]);}
 getSettings(){return this.read<Settings>('settings');}setSettings(s:Settings){return this.write('settings',s);}
 async getDegraded(){return (await this.read<boolean>('degraded'))??false;}setDegraded(v:boolean){return this.write('degraded',v);}
}
