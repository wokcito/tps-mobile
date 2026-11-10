import React,{useState} from 'react';
import {Button,Share,Text} from 'react-native';
import {useMonitor} from '../store';
import {exportCSV,exportJSON} from '../persistence/export';
import {Page,styles} from './common';
export function ExportScreen(){const {rows}=useMonitor();const [message,setMessage]=useState('');
 const share=async(format:'CSV'|'JSON')=>{try{const content=format==='CSV'?exportCSV(rows):exportJSON(rows);const result=await Share.share({title:`Mediciones ${format}`,message:content});setMessage(result.action===Share.dismissedAction?'Exportación cancelada.':`${format} enviado al menú de compartir.`);}catch{setMessage('No se pudo compartir el historial.');}};
 return <Page><Text style={styles.title}>Exportar mediciones</Text><Text style={styles.text}>{rows.length} mediciones seleccionadas por los filtros actuales.</Text><Text style={styles.muted}>Se comparte texto CSV o JSON con el menú del sistema (copiar, correo o guardar según la app receptora). CSV: una fila por medición con RTT promedio entre hosts; JSON: incluye todas las sondas y errores. Contiene ubicación: compartilo sólo con personas de confianza.</Text><Button title="Compartir CSV" onPress={()=>share('CSV')}/><Button title="Compartir JSON" onPress={()=>share('JSON')}/>{message&&<Text accessibilityRole="alert" style={styles.text}>{message}</Text>}</Page>;
}
