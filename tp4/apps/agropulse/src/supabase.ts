import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';
export const configured = Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
export const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://localhost:54321', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'not-configured', {
 auth: {storage:AsyncStorage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false},
 global:{fetch:async(input,init)=>{const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);try{return await fetch(input,{...init,signal:controller.signal});}finally{clearTimeout(timer);}}},
});
AppState.addEventListener('change', state => { if(state==='active') supabase.auth.startAutoRefresh(); else supabase.auth.stopAutoRefresh(); });
export function errorMessage(error:unknown):string {
 const e=error as {message?:string;code?:string;status?:number};
 if(e?.code==='23505')return 'Ya existe un comando pendiente para esta válvula o se recibió este identificador. Actualizá el historial antes de reintentar.';
 if(e?.code==='42501'||e?.status===403)return 'No tenés permiso para realizar esta acción (403).';
 if(e?.status===401||e?.code==='PGRST301')return 'La sesión venció (401). Volvé a iniciar sesión.';
 return e?.message || 'Error de red. Revisá tu conexión y reintentá.';
}
