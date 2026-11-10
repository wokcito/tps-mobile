import {NativeModules,PermissionsAndroid,Platform} from 'react-native';
export interface TelephonySnapshot {operator:string|null;radio:string|null;signalDbm:number|null}
const empty:TelephonySnapshot={operator:null,radio:null,signalDbm:null};
export async function readTelephony():Promise<TelephonySnapshot>{
 try {const value=await NativeModules.TelephonyModule?.getSnapshot();return {...empty,...value};}catch{return empty;}
}
export async function requestMeasurementPermissions():Promise<boolean>{
 if(Platform.OS!=='android')return true;
 const result=await PermissionsAndroid.requestMultiple([PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE]);
 return result[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]===PermissionsAndroid.RESULTS.GRANTED||result[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION]===PermissionsAndroid.RESULTS.GRANTED;
}
