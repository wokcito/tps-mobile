import React,{useEffect,useRef,useState} from 'react';
import { Marker } from 'react-native-maps';
import { normalizeLongitude,type Geo } from './orbital';
// Isolated marker: interpolation never re-renders tracks or constellation markers.
// Avoids RN 0.88 / maps AnimatedRegion's legacy AnimatedWithChildren dependency.
export function AnimatedSatelliteMarker({target,title}:{target:Geo;title:string}){
 const [coordinate,setCoordinate]=useState(target),last=useRef(target);
 useEffect(()=>{const from=last.current,start=Date.now(),delta=normalizeLongitude(target.longitude-from.longitude);
 const timer=setInterval(()=>{const fraction=Math.min(1,(Date.now()-start)/1800);const next={latitude:from.latitude+(target.latitude-from.latitude)*fraction,longitude:normalizeLongitude(from.longitude+delta*fraction)};last.current={...target,...next};setCoordinate({...target,...next});if(fraction===1)clearInterval(timer);},100);
 return()=>clearInterval(timer);},[target]);
 return <Marker coordinate={coordinate} title={title} description={`${target.altitude.toFixed(1)} km`} pinColor="#51dfce"/>;
}
