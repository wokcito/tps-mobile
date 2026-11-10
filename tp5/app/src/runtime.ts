import {SQLiteRepository} from './persistence/sqlite';
import {MeasurementEngine} from './engine/orchestrator';
import {measureThroughput,throwIfCancelled} from './engine/probes';
import {qualityScore,detectDegradation} from './engine/quality';
import {readNetwork} from './native/network';
import {tcpProbe} from './native/tcp';
import {locate} from './geo/location';
import {useMonitor} from './store';
import {averageRtt,defaultSettings,Filters,Session,Settings} from './types';
import notifee,{AndroidImportance} from '@notifee/react-native';
let repository:SQLiteRepository|undefined;
export const getRepository=()=>repository??(repository=new SQLiteRepository());
const id=()=>`${Date.now()}-${Math.random().toString(36).slice(2,12)}`;
let initialization:Promise<void>|undefined;
let engine:MeasurementEngine|undefined;
let active:AbortController|undefined;
export function initialize():Promise<void>{
 if(!initialization)initialization=(async()=>{
  const repo=getRepository();const settings=(await repo.getSettings())??defaultSettings;
  let sessions=await repo.sessions();if(!sessions.length){await createSessionRecord();sessions=await repo.sessions();}
  useMonitor.setState({settings,sessions,sessionId:sessions[sessions.length-1].id,ready:true});
  await refresh();await refreshNetwork();
 })().catch(error=>{initialization=undefined;throw error;});
 return initialization;
}
async function createSessionRecord():Promise<Session>{const s={id:id(),name:`Sesión ${new Date().toLocaleString('es-AR')}`,startedAt:Date.now()};await getRepository().createSession(s);return s;}
export async function newSession(){if(useMonitor.getState().busy)throw Error('Esperá a que termine la medición');const s=await createSessionRecord();useMonitor.setState({sessions:await getRepository().sessions(),sessionId:s.id});}
export async function refresh(){const rows=await getRepository().query(useMonitor.getState().filters);useMonitor.setState({rows});}
export async function applyFilters(filters:Filters){const rows=await getRepository().query(filters);useMonitor.setState({filters,rows});}
export async function refreshNetwork(){try {useMonitor.setState({network:await readNetwork()});}catch{useMonitor.setState({network:{network:'Desconocida',operator:null,signalDbm:null}});}}
export async function saveSettings(settings:Settings){await getRepository().setSettings(settings);useMonitor.setState({settings});}
export function cancelMeasurement(){active?.abort();}
export async function runMeasurement(external?:AbortSignal){
 await initialize();if(active)throw Error('Ya hay una medición en curso');
 const controller=new AbortController();active=controller;
 const abort=()=>controller.abort();external?.addEventListener('abort',abort,{once:true});if(external?.aborted)controller.abort();
 const timer=setTimeout(abort,60000);useMonitor.setState({busy:true,error:null});
 try {
  const repo=getRepository();
  engine??=new MeasurementEngine({repo,network:readNetwork,location:locate,probe:tcpProbe,now:Date.now,id,
   throughput:async(settings,signal)=>{
    const child=new AbortController();const stop=()=>child.abort();signal.addEventListener('abort',stop,{once:true});if(signal.aborted)stop();
    const timeout=setTimeout(stop,20000);
    try{return await measureThroughput(settings.backendUrl,settings.payloadBytes,(url,init)=>fetch(url,init),()=>performance.now(),child.signal);}finally{clearTimeout(timeout);signal.removeEventListener('abort',stop);}
   },emit:m=>useMonitor.setState({network:{network:m.network,operator:m.operator,signalDbm:m.signalDbm}})});
  const {sessionId,settings}=useMonitor.getState();throwIfCancelled(controller.signal);
  const m=await engine.run(sessionId!,settings,controller.signal);await refresh();
  const result=detectDegradation(await repo.getDegraded(),qualityScore(m.signalDbm,averageRtt(m),m.throughput?.downloadMbps??null),settings.thresholds);
  if(result.notify){
   try {
    const channelId=await notifee.createChannel({id:'qos',name:'Calidad de red',importance:AndroidImportance.HIGH});
    await notifee.displayNotification({title:'Calidad de red degradada',body:`Se detectó calidad severamente baja en ${m.network}. Consultá el historial.`,android:{channelId,pressAction:{id:'default'}}});
   }catch {useMonitor.setState({error:'Medición guardada; no se pudo mostrar la notificación.'});}
  }
  await repo.setDegraded(result.degraded);return m;
 }catch(e){useMonitor.setState({error:controller.signal.aborted?'Medición cancelada o tiempo agotado.':e instanceof Error&&e.message==='Ya hay una medición en curso'?e.message:'No se pudo completar la medición. Revisá permisos y conectividad.'});throw e;}
 finally{clearTimeout(timer);external?.removeEventListener('abort',abort);active=undefined;useMonitor.setState({busy:false});}
}
