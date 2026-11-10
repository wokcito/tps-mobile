import React from 'react';
import {Stack} from 'expo-router';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {StoreProvider,useStore} from '../src/store';
import {Loading,Page} from '../src/ui';
function Routes(){const {session,authLoading}=useStore();if(authLoading)return <Page><Loading/></Page>;return <Stack screenOptions={{headerTintColor:'#14532d',headerBackTitle:'Volver'}}><Stack.Protected guard={!session}><Stack.Screen name="login" options={{title:'Ingresar a AgroPulse'}}/></Stack.Protected><Stack.Protected guard={!!session}><Stack.Screen name="(tabs)" options={{headerShown:false}}/><Stack.Screen name="plot/[id]" options={{title:'Detalle de lote'}}/><Stack.Screen name="confirm" options={{title:'Confirmar comando'}}/><Stack.Screen name="history/[id]" options={{title:'Historial de comandos'}}/><Stack.Screen name="edit-plot" options={{title:'Alta / edición de lote'}}/><Stack.Screen name="manual/[id]" options={{title:'Lectura manual'}}/><Stack.Screen name="diagnostics" options={{title:'Diagnóstico'}}/></Stack.Protected></Stack>;}
export default function Layout(){return <SafeAreaProvider><StoreProvider><Routes/></StoreProvider></SafeAreaProvider>;}
