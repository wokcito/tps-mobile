import React,{useState} from 'react';
import {Button,Linking,Platform,Switch,Text} from 'react-native';
import notifee from '@notifee/react-native';
import Geolocation from 'react-native-geolocation-service';
import {useMonitor} from '../store';
import {saveSettings} from '../runtime';
import {configureBackground} from '../background';
import {requestMeasurementPermissions} from '../native/telephony';
import {parseSettings} from './forms';
import {Field,Page,styles} from './common';
export function SettingsScreen(){const {settings,busy}=useMonitor();const [hosts,setHosts]=useState(settings.hosts.map(h=>`${h.host}:${h.port}`).join(',')),[url,setUrl]=useState(settings.backendUrl),[interval,setInterval]=useState(String(settings.intervalMinutes)),[low,setLow]=useState(String(settings.thresholds.low)),[recovery,setRecovery]=useState(String(settings.thresholds.recovery)),[enabled,setEnabled]=useState(settings.backgroundEnabled),[message,setMessage]=useState('');
 const save=async()=>{try{const next=parseSettings(hosts,url,interval,low,recovery,enabled);if(enabled){await requestMeasurementPermissions();await notifee.requestPermission();if(Platform.OS==='ios')await Geolocation.requestAuthorization('always');}await saveSettings(next);await configureBackground();setMessage('Ajustes guardados. El sistema decide cuándo ejecutar el muestreo.');}catch(e){setMessage(e instanceof Error?e.message:'No se pudieron guardar los ajustes.');}};
 return <Page><Text style={styles.title}>Ajustes de medición</Text>
 <Field label="Hosts TCP (al menos 3, nombre:puerto)" value={hosts} onChangeText={setHosts}/>
 <Field label="URL del backend" value={url} onChangeText={setUrl}/>
 <Text style={styles.muted}>En dispositivo real usá la IP LAN o HTTPS del servidor, no localhost. En emulador Android: http://10.0.2.2:3000. Cada prueba usa 1 MB de descarga y 1 MB de subida.</Text>
 <Field label="Intervalo background (minutos, mínimo 15)" value={interval} onChangeText={setInterval}/>
 <Field label="Umbral de degradación (0–1)" value={low} onChangeText={setLow}/>
 <Field label="Umbral de recuperación (mayor que degradación)" value={recovery} onChangeText={setRecovery}/>
 <Text style={styles.text}>Activar muestreo en segundo plano</Text><Switch accessibilityLabel="Activar muestreo en segundo plano" value={enabled} onValueChange={setEnabled}/>
 <Text style={styles.muted}>Consume datos y batería. Android: habilitá ubicación «Permitir siempre» en ajustes del sistema para GPS en background. Sin ese permiso se guarda sin coordenadas. Android 10+ y ahorro de batería pueden suspender tareas. iOS no ejecuta luego de cierre forzado.</Text>
 <Button title="Abrir permisos del sistema" onPress={()=>{Linking.openSettings().catch(()=>setMessage('No se pudieron abrir los permisos.'));}}/>
 <Button title="Guardar ajustes" disabled={busy} onPress={save}/>{message&&<Text accessibilityRole="alert" style={styles.text}>{message}</Text>}</Page>;
}
