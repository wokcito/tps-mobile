import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import { DataService, type Storage } from './data';
import { CelesTrakProvider, WhereTheIssProvider, ProxyProvider, N2yoProvider, SpaceTrackProvider } from './providers';
import { createOrbit, type Observer } from './orbital';
import { planReminders, predictPassesAsync, type Pass } from './prediction';
export const storage:Storage={get:key=>AsyncStorage.getItem(key),set:(key,value)=>AsyncStorage.setItem(key,value)};
export const DEFAULT_OBSERVER:Observer={latitude:-31.392,longitude:-58.021,altitude:0.03};
export type Settings={minElevation:number;noticeMinutes:number;ttlHours:number;constellationLimit:number;horizonDays:number;proxyUrl:string;manualObserver:Observer};
export const DEFAULT_SETTINGS:Settings={minElevation:10,noticeMinutes:5,ttlHours:24,constellationLimit:100,horizonDays:2,proxyUrl:process.env.EXPO_PUBLIC_PROXY_URL??'',manualObserver:DEFAULT_OBSERVER};
export async function loadSettings():Promise<Settings>{try{const raw=await storage.get('settings');return raw?{...DEFAULT_SETTINGS,...JSON.parse(raw)}:DEFAULT_SETTINGS;}catch{return DEFAULT_SETTINGS;}}
export function makeService(settings:Settings){
 const providers=settings.proxyUrl?[new ProxyProvider(settings.proxyUrl),new CelesTrakProvider(),new WhereTheIssProvider(),new N2yoProvider(settings.proxyUrl),new SpaceTrackProvider(settings.proxyUrl)]:[new CelesTrakProvider(),new WhereTheIssProvider()];
 return new DataService(providers,storage,Date.now,settings.ttlHours*3600000);
}
Notifications.setNotificationHandler({handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:false})});
const TASK='satellite-refresh';
type Subscription={norad:number;observer:Observer};
async function subscriptions():Promise<Subscription[]>{try{return JSON.parse(await storage.get('subscriptions')??'[]');}catch{return [];}}
export async function notificationPermission(){
 await Notifications.setNotificationChannelAsync('passes',{name:'Pases satelitales',importance:Notifications.AndroidImportance.HIGH});
 const permission=await Notifications.requestPermissionsAsync();if(!permission.granted)throw Error('Permiso de notificaciones denegado. Podés habilitarlo en el sistema.');
}
export async function schedulePasses(norad:number,passes:Pass[],minutes:number){
 const plans=planReminders(norad,passes,minutes,Date.now()).slice(0,24);
 const scheduled=await Notifications.getAllScheduledNotificationsAsync();
 // Replace only this satellite's schedules; no duplicates after recalculation/settings changes.
 for(const n of scheduled)if(n.content.data?.norad===norad)await Notifications.cancelScheduledNotificationAsync(n.identifier);
 for(const plan of plans)await Notifications.scheduleNotificationAsync({identifier:plan.key,content:{title:'Próximo pase satelital',body:`NORAD ${norad}: AOS ${new Date(plan.aos).toLocaleTimeString('es-AR')}`,data:{norad,aos:plan.aos},sound:true},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:new Date(plan.at),channelId:'passes'}});
 return plans.length;
}
export async function enableReminders(norad:number,observer:Observer,passes:Pass[],minutes:number){
 await notificationPermission();const count=await schedulePasses(norad,passes,minutes);
 const existing=await subscriptions(),next=[...existing.filter(s=>s.norad!==norad),{norad,observer}];await storage.set('subscriptions',JSON.stringify(next));
 await registerBackground();return count;
}
export async function refreshSubscriptions(){
 const settings=await loadSettings(),service=makeService(settings),list=await subscriptions();
 for(const item of list){
  const data=await service.orbital(item.norad); // TTL-aware, offline cached fallback.
  const orbit=createOrbit(data.value.omm??data.value.tle!);
  const passes=await predictPassesAsync(orbit,item.observer,Date.now(),settings.horizonDays,settings.minElevation);
  await schedulePasses(item.norad,passes,settings.noticeMinutes);
 }
}
TaskManager.defineTask(TASK,async()=>{try{await refreshSubscriptions();return BackgroundTask.BackgroundTaskResult.Success;}catch{return BackgroundTask.BackgroundTaskResult.Failed;}});
export async function registerBackground(){
 if(await BackgroundTask.getStatusAsync()===BackgroundTask.BackgroundTaskStatus.Available)await BackgroundTask.registerTaskAsync(TASK,{minimumInterval:60});
}
