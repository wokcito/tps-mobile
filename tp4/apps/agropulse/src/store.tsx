import React, {createContext,useContext,useEffect,useRef,useState,useCallback} from 'react';
import type {Session} from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {supabase, configured,errorMessage} from './supabase';
import {enqueue,flushQueue,ManualReading,Polygon} from './domain';
export type Membership={organization_id:string;role:'producer'|'operator'|'advisor';organizations:{name:string}};
export type Plot={id:string;organization_id:string;name:string;crop:string|null;geom:Polygon;threshold_min:number;threshold_max:number;moisture_pct:number|null;measured_at:string|null;temp_c:number|null;rain_mm:number|null};
export type Station={id:string;plot_id:string;name:string};
export type SensorReading={id:string;station_id:string;measured_at:string;moisture_pct:number;temp_c:number|null;rain_mm:number|null;source:string};
export type Valve={id:string;plot_id:string;name:string;status:'open'|'closed'};
export type Command={id:string;valve_id:string;requested_by:string;action:string;duration_min:number|null;status:string;created_at:string;client_request_id:string;failure_reason:string|null};
export type Alert={id:string;plot_id:string;type:'dry'|'stale';created_at:string;read_at:string|null};
type Data={plots:Plot[];stations:Station[];readings:SensorReading[];valves:Valve[];commands:Command[];alerts:Alert[]};
const empty:Data={plots:[],stations:[],readings:[],valves:[],commands:[],alerts:[]};
function must<T>(result:{data:T;error:unknown}){if(result.error)throw result.error;return result.data;}
function useStoreValue(){
 const [session,setSession]=useState<Session|null>(null),[authLoading,setAuthLoading]=useState(true),[loading,setLoading]=useState(false),[error,setError]=useState(''),[memberships,setMemberships]=useState<Membership[]>([]),[organizationId,setOrganizationId]=useState(''),[data,setData]=useState<Data>(empty),[queued,setQueued]=useState(0),[lastTick,setLastTick]=useState<string|null>(null),[now,setNow]=useState(Date.now());
 const scope=useRef(0), fetchBusy=useRef(false),queueLock=useRef<Promise<unknown>>(Promise.resolve());
 const userId=session?.user.id;
 const membership=memberships.find(m=>m.organization_id===organizationId);
 const canWrite=membership?.role==='producer'||membership?.role==='operator';
 const serial=<T,>(job:()=>Promise<T>):Promise<T>=>{const next=queueLock.current.then(job,job);queueLock.current=next.catch(()=>{});return next;};
 useEffect(()=>{let alive=true;supabase.auth.getSession().then(({data,error})=>{if(alive){if(error)setError(errorMessage(error));setSession(data.session);setAuthLoading(false);}},e=>{if(alive){setError(errorMessage(e));setAuthLoading(false);}});const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>{if(alive){setSession(s);setAuthLoading(false);}});return()=>{alive=false;subscription.unsubscribe();};},[]);
 useEffect(()=>{let alive=true;scope.current++;setMemberships([]);setOrganizationId('');setData(empty);setLastTick(null);setQueued(0);if(!userId)return;
 setLoading(true);let pending=false;let loaded=false;
 async function loadMemberships(){if(pending||loaded||!alive)return;pending=true;try{const {data,error}=await supabase.from('memberships').select('organization_id,role,organizations(name)').eq('user_id',userId!);if(error)throw error;if(alive){const rows=data as unknown as Membership[];setMemberships(rows);setOrganizationId(rows[0]?.organization_id||'');setError('');loaded=true;}}catch(e){if(alive)setError(errorMessage(e));}finally{pending=false;if(alive)setLoading(false);}}
 const retry=setInterval(()=>void loadMemberships(),2500);void loadMemberships();return()=>{alive=false;clearInterval(retry);};},[userId]);
 const refresh=useCallback(async(initial=false)=>{
 if(!organizationId||!userId)return; if(fetchBusy.current)return;
 const generation=scope.current;fetchBusy.current=true;if(initial)setLoading(true);
 try{
 const plots=must(await supabase.from('plot_status').select('*').eq('organization_id',organizationId).order('name')) as Plot[];
 let next:Data={...empty,plots};
 if(plots.length){const ids=plots.map(p=>p.id);const [s,v,a]=await Promise.all([supabase.from('stations').select('*').in('plot_id',ids),supabase.from('valves').select('*').in('plot_id',ids),supabase.from('alerts').select('*').in('plot_id',ids).order('created_at',{ascending:false}).limit(100)]);const stations=must(s) as Station[],valves=must(v) as Valve[];
 const readings=stations.length?must(await supabase.from('reading_series').select('*').in('station_id',stations.map(s=>s.id)).gte('measured_at',new Date(Date.now()-6*3600000).toISOString()).order('measured_at',{ascending:false}).limit(10000)) as SensorReading[]:[];
 const histories=await Promise.all(plots.map(async p=>{const ids=valves.filter(v=>v.plot_id===p.id).map(v=>v.id);return ids.length?must(await supabase.from('irrigation_commands').select('*').in('valve_id',ids).order('created_at',{ascending:false}).limit(20)) as Command[]:[];}));
 const pending=valves.length?must(await supabase.from('irrigation_commands').select('*').in('valve_id',valves.map(v=>v.id)).eq('status','pending')) as Command[]:[];
 const commands=[...new Map([...histories.flat(),...pending].map(c=>[c.id,c])).values()].sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at));
 next={plots,stations,valves,readings,commands,alerts:must(a) as Alert[]};}
 if(generation===scope.current){setData(next);setError('');}
 }catch(e){if(generation===scope.current)setError(errorMessage(e));}finally{fetchBusy.current=false;if(generation===scope.current)setLoading(false);}
 },[organizationId,userId]);
 const syncQueue=useCallback(()=>serial(async()=>{
 if(!userId)return;const key=`agropulse:manual:${userId}`;const q:ManualReading[]=JSON.parse(await AsyncStorage.getItem(key)||'[]');
 const remaining=await flushQueue(q,async r=>{if(userRef.current!==userId)throw new Error('Sesión cambiada; se conserva la lectura para su autor.');const {error}=await supabase.rpc('submit_manual',{station:r.station_id,request:r.client_request_id,measured:r.measured_at,moisture:r.moisture_pct,note_text:r.note,latitude:r.lat,longitude:r.lng,actor:userId});if(error)throw error;});
 await AsyncStorage.setItem(key,JSON.stringify(remaining));if(userId===userRef.current)setQueued(remaining.length);return remaining.length;
 }),[userId]);
 const userRef=useRef(userId);userRef.current=userId;
 useEffect(()=>{scope.current++;setData(empty);setError('');setLoading(Boolean(organizationId));void refresh(true);void syncQueue().catch(e=>setError(errorMessage(e)));const interval=setInterval(()=>{setNow(Date.now());void refresh();void syncQueue().catch(e=>setError(errorMessage(e)));},2500);
 const channel=supabase.channel(`org:${organizationId}:${userId}`);
 for(const table of ['readings','valves','irrigation_commands','alerts'])channel.on('postgres_changes',{event:'*',schema:'public',table},payload=>{if(table==='readings'&&'measured_at' in payload.new)void supabase.from('stations').select('id,plots!inner(organization_id)').eq('id',String(payload.new.station_id)).eq('plots.organization_id',organizationId).maybeSingle().then(({data})=>{if(data)setLastTick(String((payload.new as Record<string,unknown>).measured_at));});void refresh();});
 channel.subscribe();return()=>{scope.current++;clearInterval(interval);void supabase.removeChannel(channel);};},[refresh,syncQueue,organizationId,userId]);
 async function queueManual(item:ManualReading){if(!userId||!canWrite)throw new Error('Solo productor y operador pueden cargar lecturas.');const count=await serial(async()=>{const key=`agropulse:manual:${userId}`;const q=enqueue(JSON.parse(await AsyncStorage.getItem(key)||'[]'),item);await AsyncStorage.setItem(key,JSON.stringify(q));setQueued(q.length);return q.length;});void syncQueue().catch(e=>setError(errorMessage(e)));return count;}
 function selectOrganization(id:string){scope.current++;setData(empty);setLastTick(null);setLoading(true);setOrganizationId(id);}
 return {session,authLoading,loading,error,setError,memberships,organizationId,selectOrganization,membership,canWrite,...data,refresh,queueManual,syncQueue,queued,lastTick,now,configured};
}
const Context=createContext<ReturnType<typeof useStoreValue>|null>(null);
export function StoreProvider({children}:{children:React.ReactNode}){const value=useStoreValue();return <Context.Provider value={value}>{children}</Context.Provider>;}
export function useStore(){const value=useContext(Context);if(!value)throw new Error('StoreProvider missing');return value;}
