import React,{useState} from 'react';
import {Button,Text} from 'react-native';
import {useMonitor} from '../store';
import {averageRtt} from '../types';
import {Chart} from './Chart';
import {Card,metric,Page,styles} from './common';
export function History(){const {rows,sessions,sessionId}=useMonitor();const [selected,setSelected]=useState<string|null>(null);const current=selected??sessionId;const data=rows.filter(m=>m.sessionId===current);
 return <Page><Text style={styles.title}>Historial por sesión</Text><Text style={styles.muted}>Se aplican los filtros globales de red, fecha y zona. Fechas en hora local; exportación en milisegundos UTC.</Text>
 {sessions.map(s=><Button key={s.id} title={`${s.id===current?'✓ ':''}${s.name}`} onPress={()=>setSelected(s.id)}/>)}
 <Card><Text style={styles.subtitle}>{data.length} mediciones en la sesión</Text>
 <Chart title="Latencia promedio" unit="ms" points={data.map(m=>({time:m.timestamp,value:averageRtt(m)}))}/>
 <Chart title="Throughput de descarga" unit="Mbps" points={data.map(m=>({time:m.timestamp,value:m.throughput?.downloadMbps??null}))}/>
 <Chart title="Throughput de subida" unit="Mbps" points={data.map(m=>({time:m.timestamp,value:m.throughput?.uploadMbps??null}))}/></Card>
 {data.slice().reverse().map(m=><Card key={m.id}><Text style={styles.subtitle}>{new Date(m.timestamp).toLocaleString('es-AR')} · {m.network}</Text><Text style={styles.text}>Operador: {m.operator??'No disponible'} · Señal: {metric(m.signalDbm,'dBm')}</Text><Text style={styles.text}>RTT: {metric(averageRtt(m),'ms')} · ↓ {metric(m.throughput?.downloadMbps,'Mbps')} · ↑ {metric(m.throughput?.uploadMbps,'Mbps')}</Text><Text style={styles.muted}>{m.position?`GPS ${m.position.latitude.toFixed(5)}, ${m.position.longitude.toFixed(5)}`:'Sin GPS'}{m.errors.length?' · '+m.errors.join(' · '):''}</Text></Card>)}
 {!data.length&&<Text style={styles.text}>No hay datos en esta sesión con los filtros actuales.</Text>}</Page>;
}
