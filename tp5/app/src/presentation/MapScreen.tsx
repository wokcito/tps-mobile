import React from 'react';
import {Button,Platform,Text,View} from 'react-native';
import MapView,{Heatmap,Marker,PROVIDER_GOOGLE} from 'react-native-maps';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useMonitor} from '../store';
import {qualityScore} from '../engine/quality';
import {averageRtt,Measurement,Position} from '../types';
import {styles} from './common';
import {Routes} from './routes';
export function MapScreen({navigation}:NativeStackScreenProps<Routes,'Mapa'>){
 const {rows,filters}=useMonitor();const located=rows.filter((m):m is Measurement&{position:Position}=>m.position!==null);
 const points=located.flatMap(m=>{const weight=qualityScore(m.signalDbm,averageRtt(m),m.throughput?.downloadMbps??null);return weight===null?[]:[{latitude:m.position.latitude,longitude:m.position.longitude,weight}];});
 const center=located[located.length-1]?.position??{latitude:-34.6037,longitude:-58.3816};
 return <View style={styles.page}><View style={{padding:12,gap:8}}><Text style={styles.subtitle}>Cobertura personal</Text><Text style={styles.text}>{located.length} mediciones con GPS · {Object.keys(filters).length?'Filtros activos':'Sin filtros'}</Text><Text style={styles.muted}>Rojo: baja calidad · amarillo: media · verde: alta. Los puntos sin métricas sólo tienen marcador. Calor relativo a la densidad de puntos.</Text><Button title="Cambiar filtros" onPress={()=>navigation.navigate('Filtros')}/>{!located.length&&<Text style={styles.text}>Sin mediciones georreferenciadas. Otorgá ubicación y medí.</Text>}</View>
 <MapView key={`${filters.network??''}-${filters.from??''}-${filters.to??''}-${located.length?'datos':'vacio'}`} style={{flex:1,minHeight:300}} provider={PROVIDER_GOOGLE} initialRegion={{...center,latitudeDelta:0.08,longitudeDelta:0.08}}>
 {points.length>0&&<Heatmap points={points} radius={Platform.OS==='android'?35:35} opacity={0.7} gradient={{colors:['#e13232','#f4d534','#219a57'],startPoints:[0,0.5,1],colorMapSize:256}}/>}
 {located.map(m=><Marker key={m.id} coordinate={m.position} title={`${m.network} · ${new Date(m.timestamp).toLocaleString('es-AR')}`} description={`RTT: ${averageRtt(m)?.toFixed(1)??'—'} ms · Descarga: ${m.throughput?.downloadMbps.toFixed(2)??'—'} Mbps · Sesión ${m.sessionId}`}/>)}
 </MapView></View>;
}
