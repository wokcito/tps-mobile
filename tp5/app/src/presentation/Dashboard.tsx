import React from 'react';
import {Button,Text} from 'react-native';
import {useMonitor} from '../store';
import {cancelMeasurement,newSession,runMeasurement} from '../runtime';
import {requestMeasurementPermissions} from '../native/telephony';
import {requestIOSLocation} from '../geo/location';
import {qualityScore} from '../engine/quality';
import {averageRtt} from '../types';
import {Card,metric,Page,styles} from './common';
export function Dashboard(){
 const {network,rows,busy,error,ready,sessionId,sessions}=useMonitor();const last=rows[rows.length-1];
 const measure=async()=>{try {await requestMeasurementPermissions();await requestIOSLocation();await runMeasurement();}catch{/* Runtime exposes errors. */}};
 const score=last?qualityScore(last.signalDbm,averageRtt(last),last.throughput?.downloadMbps??null):null;
 return <Page><Text style={styles.title}>Monitor de calidad de red</Text>
 <Card><Text style={styles.subtitle}>Conexión actual: {network.network}</Text><Text style={styles.text}>Operador: {network.operator??'No disponible'}</Text><Text style={styles.text}>Señal: {metric(network.signalDbm,'dBm')}</Text><Text style={styles.muted}>La señal celular puede no estar disponible por plataforma o permisos. WiFi no expone RSSI celular.</Text></Card>
 <Card><Text style={styles.text}>{sessions.find(s=>s.id===sessionId)?.name??'Inicializando sesión…'}</Text>
 <Button title={busy?'Midiendo…':'Medir ahora'} disabled={!ready||busy} onPress={measure}/>{busy&&<Button title="Cancelar medición" onPress={cancelMeasurement}/>}
 <Button title="Nueva sesión" disabled={!ready||busy} onPress={()=>{newSession().catch(()=>useMonitor.setState({error:'No se pudo crear la sesión.'}));}}/>
 <Text style={styles.muted}>Cada prueba consume aproximadamente 2 MB de datos; tres sondas TCP por host. Una sesión agrupa tus recorridos.</Text></Card>
 {error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
 <Card><Text style={styles.subtitle}>Último resultado (según filtros)</Text>{!last?<Text style={styles.text}>Todavía no hay mediciones. Tocá «Medir ahora».</Text>:<>
 <Text style={styles.text}>{new Date(last.timestamp).toLocaleString('es-AR')} · {last.network}</Text>
 <Text style={styles.text}>Calidad: {score===null?'No disponible':`${Math.round(score*100)} %`}</Text>
 <Text style={styles.text}>Descarga: {metric(last.throughput?.downloadMbps,'Mbps')} · Subida: {metric(last.throughput?.uploadMbps,'Mbps')}</Text>
 {last.rtt.map(r=><Text key={`${r.host}:${r.port}`} style={styles.text}>{r.host}:{r.port}{'\n'}Mín: {metric(r.min,'ms')} · Prom: {metric(r.avg,'ms')} · Máx: {metric(r.max,'ms')}{'\n'}Jitter: {metric(r.jitter,'ms')} · Pérdida: {r.loss.toFixed(1)} %</Text>)}
 <Text style={styles.text}>GPS: {last.position?`${last.position.latitude.toFixed(5)}, ${last.position.longitude.toFixed(5)} (±${Math.round(last.position.accuracy)} m)`:'No disponible'}</Text>
 {last.errors.map(e=><Text key={e} style={styles.error}>{e}</Text>)}
 </>}</Card></Page>;
}
