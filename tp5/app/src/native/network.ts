import NetInfo from '@react-native-community/netinfo';
import {Acquisition} from '../engine/orchestrator';
import {NetworkType} from '../types';
import {readTelephony} from './telephony';
export async function readNetwork():Promise<Acquisition>{
 const [state,t]=await Promise.all([NetInfo.fetch(),readTelephony()]);let network:NetworkType='Desconocida';
 if(state.isConnected===false)network='Sin conexión';else if(state.type==='wifi')network='WiFi';else if(state.type==='ethernet')network='Ethernet';
 else if(state.type==='cellular'){
  const generation=state.details.cellularGeneration;
  network=t.radio==='NR'||generation==='5g'?'NR':t.radio==='LTE'||generation==='4g'?'LTE':t.radio==='UMTS'||generation==='3g'?'UMTS':t.radio==='GSM'||generation==='2g'?'GSM':'Desconocida';
 }
 return {network,operator:t.operator,signalDbm:state.type==='cellular'?t.signalDbm:null};
}
