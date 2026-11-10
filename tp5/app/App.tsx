import React,{useEffect,useState} from 'react';
import {Button,Text,View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import {initialize,refreshNetwork} from './src/runtime';
import {configureBackground} from './src/background';
import {Dashboard} from './src/presentation/Dashboard';
import {MapScreen} from './src/presentation/MapScreen';
import {History} from './src/presentation/History';
import {FilterScreen} from './src/presentation/FilterScreen';
import {SettingsScreen} from './src/presentation/SettingsScreen';
import {ExportScreen} from './src/presentation/ExportScreen';
import {Routes} from './src/presentation/routes';
import {styles} from './src/presentation/common';
import {useMonitor} from './src/store';
const Stack=createNativeStackNavigator<Routes>();
function Home({navigation}:{navigation:{navigate:(route:keyof Routes)=>void}}){return <View style={{flex:1}}><View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-around',backgroundColor:'#e2edf5'}}>{(['Mapa','Historial','Filtros','Ajustes','Exportar'] as const).map(route=><Button key={route} title={route} onPress={()=>navigation.navigate(route)}/>)}</View><Dashboard/></View>;}
export default function App(){const [error,setError]=useState(false);const ready=useMonitor(s=>s.ready);
 const boot=()=>{setError(false);initialize().then(configureBackground).catch(()=>{setError(true);});};
 useEffect(()=>{boot();return NetInfo.addEventListener(()=>{void refreshNetwork();});},[]);
 return <SafeAreaProvider>{error?<View style={styles.content}><Text style={styles.error}>No se pudo inicializar el almacenamiento o el muestreo background.</Text><Button title="Reintentar" onPress={boot}/></View>:!ready?<View style={styles.content}><Text style={styles.text}>Preparando monitor…</Text></View>:<NavigationContainer><Stack.Navigator screenOptions={{headerStyle:{backgroundColor:'#123550'},headerTintColor:'#fff'}}><Stack.Screen name="Inicio" component={Home} options={{title:'Calidad de red'}}/><Stack.Screen name="Mapa" component={MapScreen}/><Stack.Screen name="Historial" component={History}/><Stack.Screen name="Filtros" component={FilterScreen}/><Stack.Screen name="Ajustes" component={SettingsScreen}/><Stack.Screen name="Exportar" component={ExportScreen}/></Stack.Navigator></NavigationContainer>}</SafeAreaProvider>;
}
