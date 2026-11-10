import React,{createContext,useContext,useEffect,useMemo,useState,useCallback,useRef} from 'react';
import { AppState } from 'react-native';
import { DEFAULT_SETTINGS,loadSettings,storage,makeService,refreshSubscriptions,registerBackground,type Settings } from './runtime';
import { useObserver } from './observer';
import { createOrbit,position,type OrbitalPosition,type Orbit } from './orbital';
import type { Cached,SatelliteRecord } from './data';
import { predictPassesAsync,type Pass } from './prediction';
function useModel(){
 const [settings,setSettings]=useState(DEFAULT_SETTINGS),[ready,setReady]=useState(false),[norad,setNorad]=useState(25544);
 const [orbital,setOrbital]=useState<Cached<SatelliteRecord>>(),[error,setError]=useState(''),[loading,setLoading]=useState(false),[now,setNow]=useState(Date.now());
 const {observer,observerStatus}=useObserver(settings.manualObserver);
 useEffect(()=>{loadSettings().then(s=>{setSettings(s);setReady(true);});registerBackground().catch(()=>{});},[]);
 const service=useMemo(()=>makeService(settings),[settings]);
 const requestId=useRef(0);
 const refresh=useCallback(async()=>{
  if(!ready)return;const id=++requestId.current;setLoading(true);setError('');
  try{const record=await service.orbital(norad);if(id===requestId.current)setOrbital(previous=>previous&&previous.savedAt===record.savedAt&&previous.stale===record.stale?previous:record);}
  catch(e){if(id===requestId.current)setError(String(e));}
  finally{if(id===requestId.current)setLoading(false);}
 },[ready,service,norad]);
 useEffect(()=>{setOrbital(undefined);void refresh();const id=setInterval(()=>void refresh(),60000);return()=>{requestId.current++;clearInterval(id);};},[refresh]);
 useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),2000);return()=>clearInterval(id);},[]);
 useEffect(()=>{const sub=AppState.addEventListener('change',state=>{if(state==='active'){void refresh();refreshSubscriptions().catch(()=>{});}});return()=>sub.remove();},[refresh]);
 const orbit=useMemo<Orbit|undefined>(()=>{if(!orbital)return;try{return createOrbit(orbital.value.omm??orbital.value.tle!);}catch{return undefined;}},[orbital]);
 const [current,setCurrent]=useState<OrbitalPosition>();
 useEffect(()=>{if(!orbit){setCurrent(undefined);return;}try{setCurrent(position(orbit,now,observer));}catch(e){setError(String(e));}},[orbit,now,observer]);
 const [passes,setPasses]=useState<Pass[]>([]),[predicting,setPredicting]=useState(false),[predictionError,setPredictionError]=useState('');
 useEffect(()=>{let active=true;setPasses([]);setPredictionError('');if(!orbit)return;setPredicting(true);
 predictPassesAsync(orbit,observer,Date.now(),settings.horizonDays,settings.minElevation).then(result=>{if(active)setPasses(result);}).catch(e=>{if(active)setPredictionError(String(e));}).finally(()=>{if(active)setPredicting(false);});return()=>{active=false;};
 },[orbit,observer,settings.horizonDays,settings.minElevation]);
 async function saveSettings(next:Settings){await storage.set('settings',JSON.stringify(next));setSettings(next);refreshSubscriptions().catch(()=>{});}
 const ageHours=orbital?Math.max(0,(now-orbital.value.epoch)/3600000):0;
 return {settings,saveSettings,ready,norad,setNorad,service,orbital,orbit,current,now,observer,observerStatus,ageHours,stale:!!orbital&&(orbital.stale||ageHours>settings.ttlHours),loading,error,refresh,passes,predicting,predictionError};
}
type Model=ReturnType<typeof useModel>;
const Context=createContext<Model|null>(null);
export function TrackerProvider({children}:{children:React.ReactNode}){const model=useModel();return <Context.Provider value={model}>{children}</Context.Provider>;}
export function useTracker(){const value=useContext(Context);if(!value)throw Error('TrackerProvider requerido');return value;}
