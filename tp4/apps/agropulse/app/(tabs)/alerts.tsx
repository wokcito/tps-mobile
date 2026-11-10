import React,{useState} from 'react';
import {router} from 'expo-router';
import {useStore} from '../../src/store';
import {supabase,errorMessage} from '../../src/supabase';
import {ageLabel} from '../../src/domain';
import {Page,Title,Body,Card,Button,ErrorText,Loading} from '../../src/ui';
export default function Alerts(){const s=useStore();const [error,setError]=useState(''),[busy,setBusy]=useState<string|null>(null);async function mark(id:string){setBusy(id);try{const {error}=await supabase.from('alerts').update({read_at:new Date().toISOString()}).eq('id',id);if(error)throw error;await s.refresh();}catch(e){setError(errorMessage(e));}finally{setBusy(null);}}return <Page refresh={s.refresh}><Title>Alertas del establecimiento</Title><ErrorText message={error||s.error}/>{s.loading&&<Loading/>}{!s.loading&&!s.alerts.length&&<Body>No hay alertas.</Body>}{s.alerts.map(a=><Card key={a.id}><Body>{a.type==='dry'?'⚠ Humedad bajo umbral':'◷ Estación sin datos confiables (>15 min)'}</Body><Body>{s.plots.find(p=>p.id===a.plot_id)?.name} · {ageLabel(a.created_at,s.now)} · {a.read_at?'Leída':'Sin leer'}</Body><Button title="Ver lote" onPress={()=>router.push(`/plot/${a.plot_id}`)}/>{!a.read_at&&s.canWrite&&<Button title="Marcar leída" busy={busy===a.id} onPress={()=>void mark(a.id)}/>}</Card>)}</Page>;}
