import React,{useState} from 'react';
import {Button,Text} from 'react-native';
import {useMonitor} from '../store';
import {applyFilters} from '../runtime';
import {parseFilters} from './forms';
import {Field,Page,styles} from './common';
export function FilterScreen(){const {filters}=useMonitor();const [network,setNetwork]=useState(filters.network??''),[from,setFrom]=useState(filters.from===undefined?'':new Date(filters.from).toISOString()),[to,setTo]=useState(filters.to===undefined?'':new Date(filters.to).toISOString()),[zone,setZone]=useState(filters.bbox?[filters.bbox.south,filters.bbox.west,filters.bbox.north,filters.bbox.east].join(','):''),[message,setMessage]=useState('');
 const apply=async()=>{try{await applyFilters(parseFilters(network,from,to,zone));setMessage('Filtros aplicados al mapa, historial y exportación.');}catch(e){setMessage(e instanceof Error?e.message:'No se pudieron aplicar los filtros.');}};
 return <Page><Text style={styles.title}>Filtros del historial</Text><Text style={styles.muted}>Todos los extremos son inclusivos. Las fechas sin hora se interpretan a las 00:00 UTC. Una caja que cruza ±180° se admite indicando oeste mayor que este.</Text>
 <Field label="Tipo de red (vacío: todas)" value={network} onChangeText={setNetwork} placeholder="WiFi, LTE, NR, UMTS, GSM, Ethernet, Sin conexión, Desconocida"/>
 <Field label="Desde (UTC)" value={from} onChangeText={setFrom} placeholder="2026-01-01 o 2026-01-01T00:00:00Z"/>
 <Field label="Hasta (UTC)" value={to} onChangeText={setTo} placeholder="2026-12-31T23:59:59Z"/>
 <Field label="Zona: sur,oeste,norte,este" value={zone} onChangeText={setZone} placeholder="-35,-59,-34,-58"/>
 <Button title="Aplicar filtros" onPress={apply}/><Button title="Limpiar filtros" onPress={async()=>{try{await applyFilters({});setNetwork('');setFrom('');setTo('');setZone('');setMessage('Filtros eliminados.');}catch{setMessage('No se pudieron limpiar los filtros.');}}}/>
 {message&&<Text accessibilityRole="alert" style={styles.text}>{message}</Text>}</Page>;
}
