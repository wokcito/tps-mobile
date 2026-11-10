// Exercise the production SQL through its public repository using Node's real in-memory SQLite.
import {SQLiteRepository} from '../src/persistence/sqlite';
import {Measurement,defaultSettings} from '../src/types';
jest.mock('react-native-sqlite-storage',()=>({enablePromise:jest.fn(),openDatabase:async()=>{
 const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(':memory:');
 return {executeSql:async(sql:string,args:unknown[]=[])=>{const stmt=db.prepare(sql);const rows=/^SELECT/i.test(sql)?stmt.all(...args):(stmt.run(...args),[]);return [{rows:{length:rows.length,item:(i:number)=>rows[i]}}];}};
}}));
test('SQLite persiste, filtra fechas/red/sesión/bbox inclusiva y antimeridiano, conserva preferencias',async()=>{
 const repo=new SQLiteRepository();await repo.createSession({id:'s',name:'Recorrido',startedAt:0});
 const base:Measurement={id:'a',sessionId:'s',timestamp:100,network:'LTE',operator:null,signalDbm:null,position:{latitude:0,longitude:179,accuracy:1,timestamp:100},rtt:[],throughput:null,errors:[]};
 await repo.save(base);await repo.save({...base,id:'b',timestamp:200,network:'WiFi',position:{...base.position!,longitude:-179}});await repo.save({...base,id:'c',position:null});
 expect(await repo.query({network:'LTE',sessionId:'s',from:100,to:100,bbox:{south:0,north:0,west:179,east:179}})).toEqual([base]);
 expect((await repo.query({bbox:{south:-1,north:1,west:170,east:-170}})).map(m=>m.id)).toEqual(['a','b']);
 await expect(repo.save(base)).rejects.toThrow();expect((await repo.query({})).length).toBe(3);
 await expect(repo.save({...base,id:'orphan',sessionId:'missing'})).rejects.toThrow();expect((await repo.query({})).length).toBe(3);
 expect(await repo.sessions()).toEqual([{id:'s',name:'Recorrido',startedAt:0}]);
 expect(await repo.getSettings()).toBeNull();await repo.setSettings(defaultSettings);expect(await repo.getSettings()).toEqual(defaultSettings);
 expect(await repo.getDegraded()).toBe(false);await repo.setDegraded(true);expect(await repo.getDegraded()).toBe(true);
});
