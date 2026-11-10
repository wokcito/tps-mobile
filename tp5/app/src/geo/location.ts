import Geolocation from 'react-native-geolocation-service';
import {Platform} from 'react-native';
import {Position} from '../types';
let last:Position|null=null;
export async function requestIOSLocation():Promise<void>{if(Platform.OS==='ios')await Geolocation.requestAuthorization('whenInUse');}
export function locate():Promise<Position|null>{
 if(last&&Date.now()-last.timestamp<30000)return Promise.resolve(last);
 return new Promise((resolve,reject)=>Geolocation.getCurrentPosition(p=>{last={latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy,timestamp:p.timestamp};resolve(last);},()=>reject(Error('Ubicación no disponible')),{enableHighAccuracy:true,timeout:8000,maximumAge:30000}));
}
