import React,{useState} from 'react';
import {useLocalSearchParams,router} from 'expo-router';
import * as Crypto from 'expo-crypto';
import {useStore} from '../src/store';
import {supabase,errorMessage} from '../src/supabase';
import {canRequest,validateDuration} from '../src/domain';
import {Page,Title,Body,Card,Field,Button,ErrorText} from '../src/ui';
export default function Confirm(){const {valveId}=useLocalSearchParams<{valveId:string}>();const s=useStore();const v=s.valves.find(v=>v.id===valveId),p=s.plots.find(p=>p.id===v?.plot_id);const [requestId]=useState(()=>Crypto.randomUUID()),[action,setAction]=useState<'open'|'close'>('open'),[timed,setTimed]=useState(true),[duration,setDuration]=useState('30'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[submitted,setSubmitted]=useState(false);
 const command=s.commands.find(c=>c.client_request_id===requestId);
 async function send(){setBusy(true);setError('');try{if(!s.canWrite||!v||!s.session)throw new Error('No tenés permiso para emitir comandos.');const duration_min=action==='open'&&timed?validateDuration(Number(duration)):null;
 // Retry after a lost response uses the SAME UUID; read the original instead of inserting again.
 const {data:existing,error:lookupError}=await supabase.from('irrigation_commands').select('id').eq('client_request_id',requestId).maybeSingle();if(lookupError)throw lookupError;
 if(!existing){if(!canRequest(s.commands,v.id))throw new Error('Ya hay un comando pendiente para esta válvula.');const {error}=await supabase.from('irrigation_commands').insert({valve_id:v.id,requested_by:s.session.user.id,action,duration_min,client_request_id:requestId,status:'pending'});if(error)throw error;}
 setSubmitted(true);await s.refresh();
 }catch(e){setError(errorMessage(e));}finally{setBusy(false);}}
 if(!v||!p)return <Page><Body>Válvula no disponible en el establecimiento activo.</Body></Page>;
 return <Page><Title>Confirmar riego</Title><Card><Body>Lote: {p.name}</Body><Body>Válvula: {v.name}</Body><Body>Acción: {action==='close'?'Cerrar':timed?`Abrir por ${duration} minutos`:'Abrir sin temporizador'}</Body><Body>client_request_id: {requestId}</Body><Body>El UUID se conserva al reintentar. Nunca se envían comandos al broker desde el móvil.</Body></Card>{!submitted&&<><Button title="Abrir por minutos" disabled={busy} onPress={()=>{setAction('open');setTimed(true);}}/><Button title="Abrir sin temporizador" disabled={busy} onPress={()=>{setAction('open');setTimed(false);}}/><Button title="Cerrar válvula" disabled={busy} onPress={()=>setAction('close')}/>{action==='open'&&timed&&<Field label="Duración en minutos (1–120)" numeric value={duration} onChangeText={setDuration}/>}</>}<ErrorText message={error||s.error}/>{submitted?<><Body>{command?.status==='applied'?'✓ Comando aplicado':command?.status==='failed'?`Falló: ${command.failure_reason||'Error de válvula'}`:command?.status==='cancelled'?'Comando cancelado':'Comando en vuelo: pendiente de acuse…'}</Body><Button title="Ver historial / cancelar pendiente" onPress={()=>router.replace(`/history/${p.id}`)}/></>:<Button title="Confirmar comando" disabled={!s.canWrite} busy={busy} onPress={()=>void send()}/>}<Body>Simulación: acuse esperado en ≤5 s sin congestión. Un 10 % falla con valve_timeout. Una falla no deja un spinner bloqueado.</Body></Page>;
}
