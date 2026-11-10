import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { Magnetometer, DeviceMotion } from 'expo-sensors';
import { type Observer } from './orbital';
export function useObserver(fallback:Observer){
 const [observer,setObserver]=useState(fallback),[status,setStatus]=useState('Ubicación manual / Concordia');
 useEffect(()=>{let active=true;setObserver(fallback);(async()=>{try{const permission=await Location.requestForegroundPermissionsAsync();if(!permission.granted){if(active)setStatus('Sin permiso GPS: ubicación manual');return;}
 const result=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});if(active){setObserver({latitude:result.coords.latitude,longitude:result.coords.longitude,altitude:(result.coords.altitude??0)/1000});setStatus('GPS del dispositivo');}
 }catch{if(active)setStatus('GPS no disponible: ubicación manual');}})();return()=>{active=false;};},[fallback.latitude,fallback.longitude,fallback.altitude]);
 return {observer,observerStatus:status};
}
export function useOrientation(){
 const [heading,setHeading]=useState(0),[pitch,setPitch]=useState(0),[available,setAvailable]=useState(false);
 useEffect(()=>{let active=true;let magnetic:ReturnType<typeof Magnetometer.addListener>|undefined,motion:ReturnType<typeof DeviceMotion.addListener>|undefined;
 (async()=>{try{if(!await Magnetometer.isAvailableAsync())return;const permission=await DeviceMotion.requestPermissionsAsync();if(!permission.granted)return;if(!active)return;
 Magnetometer.setUpdateInterval(200);DeviceMotion.setUpdateInterval(200);
 magnetic=Magnetometer.addListener(({x,y})=>{setHeading((Math.atan2(-x,y)*180/Math.PI+360)%360);setAvailable(true);});
 motion=DeviceMotion.addListener(event=>{if(event.rotation)setPitch(event.rotation.beta*180/Math.PI);});
 }catch{if(active)setAvailable(false);}})();return()=>{active=false;magnetic?.remove();motion?.remove();};},[]);
 return {heading,pitch,available};
}
