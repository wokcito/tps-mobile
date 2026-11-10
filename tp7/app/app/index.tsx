import React,{useEffect,useState} from 'react';
import { View,Text,FlatList,Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { GROUPS } from '../src/providers';
import type { Cached,SatelliteRecord } from '../src/data';
import { useTracker } from '../src/state';
import { styles,Button,Input,Busy } from '../src/ui';
export default function Catalog(){
 const t=useTracker(),[group,setGroup]=useState('stations'),[query,setQuery]=useState(''),[catalog,setCatalog]=useState<Cached<SatelliteRecord[]>>(),[loading,setLoading]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;setCatalog(undefined);
 const load=()=>{setLoading(true);setError('');t.service.catalog(group).then(c=>{if(active)setCatalog(c);}).catch(e=>{if(active)setError(String(e));}).finally(()=>{if(active)setLoading(false);});};
 load();const timer=setInterval(load,60000);return()=>{active=false;clearInterval(timer);};},[t.service,group,retry]);
 const filtered=catalog?.value.filter(s=>`${s.name} ${s.norad}`.toLowerCase().includes(query.trim().toLowerCase()))??[];
 function select(norad:number){t.setNorad(norad);router.navigate('/map');}
 return <SafeAreaView style={styles.screen} edges={['top']}><View style={styles.content}><Text style={styles.small}>SATELLITE TRACKER · SGP4 LOCAL</Text><Text style={styles.title}>Explorá la órbita</Text><Text style={styles.subtitle}>Seleccioná un satélite real. La posición se calcula en tu dispositivo.</Text><Input accessibilityLabel="Buscar satélites" placeholder="Nombre o NORAD ID" value={query} onChangeText={setQuery}/><View style={styles.row}>{Object.entries(GROUPS).map(([key,label])=><Button key={key} title={`${key===group?'● ':''}${label}`} onPress={()=>setGroup(key)}/>)}</View>{loading&&<Busy/>}{!!error&&<><Text style={styles.error}>{error}</Text><Button title="Reintentar" onPress={()=>setRetry(n=>n+1)}/></>}{catalog?.stale&&<Text style={styles.warning}>Catálogo sin conexión / caché desactualizada.</Text>}{/^\d+$/.test(query)&&<Button title={`Abrir NORAD ${query}`} onPress={()=>select(Number(query))}/>}</View><FlatList data={filtered} keyExtractor={item=>String(item.norad)} contentContainerStyle={{paddingHorizontal:18,paddingBottom:20,gap:8}} ListEmptyComponent={!loading?<Text style={styles.subtitle}>No hay satélites para esta búsqueda.</Text>:undefined} renderItem={({item})=><Pressable accessibilityRole="button" accessibilityLabel={`Seleccionar ${item.name}`} onPress={()=>select(item.norad)} style={styles.card}><Text style={styles.text}>{item.name}</Text><Text style={styles.small}>NORAD {item.norad} · {GROUPS[group as keyof typeof GROUPS]}</Text></Pressable>}/></SafeAreaView>;
}
