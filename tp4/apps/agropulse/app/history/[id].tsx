import React,{useState} from 'react';
import {useLocalSearchParams} from 'expo-router';
import {useStore} from '../../src/store';
import {supabase,errorMessage} from '../../src/supabase';
import {Page,Title,Body,Card,Button,ErrorText,Loading} from '../../src/ui';
const labels:Record<string,string>={pending:'Pendiente',applied:'Aplicado',failed:'Fallido',cancelled:'Cancelado'};
export default function History(){const {id}=useLocalSearchParams<{id:string}>();const s=useStore();const [busy,setBusy]=useState(''),[error,setError]=useState('');const ids=s.valves.filter(v=>v.plot_id===id).map(v=>v.id);const commands=s.commands.filter(c=>ids.includes(c.valve_id)).slice(0,20);
 async function cancel(commandId:string){setBusy(commandId);setError('');try{const {data,error}=await supabase.from('irrigation_commands').update({status:'cancelled'}).eq('id',commandId).eq('status','pending').select('id');if(error)throw error;if(!data.length)throw new Error('El comando ya cambió de estado o no tenés permiso.');await s.refresh();}catch(e){setError(errorMessage(e));}finally{setBusy('');}}
 return <Page refresh={s.refresh}><Title>Últimos 20 comandos</Title><ErrorText message={error||s.error}/>{s.loading&&<Loading/>}{!commands.length&&!s.loading&&<Body>Sin comandos para este lote.</Body>}{commands.map(c=><Card key={c.id}><Body>{new Date(c.created_at).toLocaleString('es-AR')}</Body><Body>Actor: {c.requested_by}</Body><Body>{s.valves.find(v=>v.id===c.valve_id)?.name} · {c.action==='open'?'Abrir':'Cerrar'} {c.duration_min?`${c.duration_min} min`:''}</Body><Body>Resultado: {labels[c.status]||c.status}{c.failure_reason?` · ${c.failure_reason}`:''}</Body><Body>ID cliente: {c.client_request_id}</Body>{c.status==='pending'&&s.canWrite&&<Button title="Cancelar pendiente" busy={busy===c.id} onPress={()=>void cancel(c.id)}/>}</Card>)}</Page>;
}
