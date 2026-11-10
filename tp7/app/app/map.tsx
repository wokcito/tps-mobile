import React,{useEffect,useState} from 'react';
import { View,Text,Switch,Platform } from 'react-native';
import MapView,{Marker,Polyline,Polygon} from 'react-native-maps';
import { AnimatedSatelliteMarker } from '../src/AnimatedSatelliteMarker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTracker } from '../src/state';
import { createOrbit,position,groundTrack,footprintRings,type Geo } from '../src/orbital';
import { SatelliteStatus,styles,colors } from '../src/ui';
export default function SatelliteMap(){
 const t=useTracker(),[show,setShow]=useState(false),[constellation,setConstellation]=useState<(Geo&{norad:number})[]>([]),[constellationError,setConstellationError]=useState('');
 const [tracks,setTracks]=useState<{past:Geo[][];future:Geo[][]}>({past:[],future:[]}),[rings,setRings]=useState<Geo[][]>([]);
 useEffect(()=>{if(!t.orbit){setTracks({past:[],future:[]});setRings([]);return;}let active=true;
 const update=()=>{if(!active||!t.orbit)return;try{const now=Date.now();setTracks(groundTrack(t.orbit,now));setRings(footprintRings(position(t.orbit,now),t.settings.minElevation));}catch{/* status panel reports propagation errors */}};
 const start=setTimeout(update,0),interval=setInterval(update,30000);return()=>{active=false;clearTimeout(start);clearInterval(interval);};
 },[t.orbit,t.settings.minElevation]);
 useEffect(()=>{let active=true;let timer:ReturnType<typeof setTimeout>|undefined;
 setConstellation([]);setConstellationError('');if(!show)return;
 (async()=>{try{const data=await t.service.catalog('starlink');if(!active)return;
 const parse=(catalog:typeof data)=>catalog.value.slice(0,t.settings.constellationLimit).flatMap(record=>{try{return [{norad:record.norad,orbit:createOrbit(record.omm??record.tle!)}];}catch{return [];}});
 let orbits=parse(data),checkedAt=Date.now(),savedAt=data.savedAt;
 const batch=async()=>{
  const now=Date.now();
  if(now-checkedAt>=60000){checkedAt=now;try{const latest=await t.service.catalog('starlink');if(latest.savedAt!==savedAt){orbits=parse(latest);savedAt=latest.savedAt;}if(active)setConstellationError(latest.stale?'Starlink: caché desactualizada / offline':'');}catch(e){if(active)setConstellationError(String(e));}}
  const points:(Geo&{norad:number})[]=[];for(let i=0;i<orbits.length&&active;i+=20){for(const item of orbits.slice(i,i+20)){try{points.push({...position(item.orbit,now),norad:item.norad});}catch{/* skip decayed objects */}}await new Promise<void>(r=>setTimeout(r,0));}
  if(active){setConstellation(points);timer=setTimeout(()=>void batch(),5000);}
 };
 if(data.stale)setConstellationError('Starlink: caché desactualizada / offline');await batch();
 }catch(e){if(active)setConstellationError(String(e));}})();return()=>{active=false;if(timer)clearTimeout(timer);};
 },[show,t.service,t.settings.constellationLimit]);
 return <SafeAreaView style={styles.screen} edges={['top']}><View style={{padding:12,gap:8}}><Text style={styles.title}>Mapa orbital</Text><SatelliteStatus/><View style={styles.row}><Switch accessibilityLabel="Mostrar constelación Starlink" value={show} onValueChange={setShow}/><Text style={styles.subtitle}>Starlink · {constellation.length}/{t.settings.constellationLimit}</Text></View>{!!constellationError&&<Text style={styles.warning}>{constellationError}</Text>}<Text style={styles.small}>Cian: pasado · dorado: futuro · verde: cobertura ≥ {t.settings.minElevation}°</Text></View>{Platform.OS==='android'&&!process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY?<View style={{padding:18}}><Text style={styles.warning}>Para el mapa nativo de Android configurá EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY (clave de SDK restringida) y reconstruí el dev client. iOS usa Apple Maps sin esa clave.</Text><Text style={styles.text}>{t.current?`Posición: ${t.current.latitude.toFixed(4)}°, ${t.current.longitude.toFixed(4)}° · ${t.current.altitude.toFixed(1)} km`:'Esperando elementos orbitales…'}</Text></View>:<MapView style={{flex:1,minHeight:250}} initialRegion={{latitude:0,longitude:0,latitudeDelta:140,longitudeDelta:300}} mapType="standard">
 <Marker coordinate={t.observer} title="Observador" pinColor="#318bea"/>
 {t.current&&<AnimatedSatelliteMarker target={t.current} title={t.orbital?.value.name??String(t.norad)}/>}
 {tracks.past.filter(s=>s.length>1).map((segment,i)=><Polyline key={`past-${i}`} coordinates={segment} strokeColor={colors.accent} strokeWidth={2}/>)}
 {tracks.future.filter(s=>s.length>1).map((segment,i)=><Polyline key={`future-${i}`} coordinates={segment} strokeColor={colors.warning} strokeWidth={2}/>)}
 {rings.map((ring,i)=><Polygon key={`cap-${i}`} coordinates={ring} fillColor="rgba(70,215,155,0.13)" strokeWidth={0} strokeColor="transparent"/>)}
 {constellation.map(s=><Marker key={s.norad} coordinate={s} title={`Starlink ${s.norad}`} tracksViewChanges={false} anchor={{x:0.5,y:0.5}}><View style={{width:5,height:5,borderRadius:3,backgroundColor:'#fff'}}/></Marker>)}
 </MapView>}</SafeAreaView>;
}
