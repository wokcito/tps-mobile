import {create} from 'zustand';
import {Acquisition} from './engine/orchestrator';
import {defaultSettings,Filters,Measurement,Session,Settings} from './types';
interface State {ready:boolean;busy:boolean;error:string|null;rows:Measurement[];sessions:Session[];sessionId:string|null;settings:Settings;filters:Filters;network:Acquisition}
export const useMonitor=create<State>(()=>({ready:false,busy:false,error:null,rows:[],sessions:[],sessionId:null,settings:defaultSettings,filters:{},network:{network:'Desconocida',operator:null,signalDbm:null}}));
