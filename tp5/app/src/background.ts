import BackgroundFetch from 'react-native-background-fetch';
import {initialize,runMeasurement} from './runtime';
import {useMonitor} from './store';
interface TaskState {controller:AbortController;finished:boolean}
const tasks=new Map<string,TaskState>();
function finishTask(taskId:string,state?:TaskState){
 if(state?.finished)return;
 if(state)state.finished=true;
 BackgroundFetch.finish(taskId);
}
export async function backgroundTask(taskId:string){
 const state:TaskState={controller:new AbortController(),finished:false};tasks.set(taskId,state);
 try {await initialize();if(useMonitor.getState().settings.backgroundEnabled)await runMeasurement(state.controller.signal);}catch{/* The runtime records errors; OS task must always finish. */}
 finally{finishTask(taskId,state);tasks.delete(taskId);}
}
export function backgroundTimeout(taskId:string){const state=tasks.get(taskId);state?.controller.abort();finishTask(taskId,state);}
export async function configureBackground(){
 await initialize();const settings=useMonitor.getState().settings;
 if(!settings.backgroundEnabled){await BackgroundFetch.stop();return;}
 await BackgroundFetch.configure({minimumFetchInterval:settings.intervalMinutes,stopOnTerminate:false,startOnBoot:true,enableHeadless:true,requiredNetworkType:BackgroundFetch.NETWORK_TYPE_ANY,requiresBatteryNotLow:true},backgroundTask,backgroundTimeout);
}
export async function headlessTask(event:{taskId:string;timeout:boolean}){if(event.timeout)backgroundTimeout(event.taskId);else await backgroundTask(event.taskId);}
