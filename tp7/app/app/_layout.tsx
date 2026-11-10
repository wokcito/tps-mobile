import React from 'react';
import { Tabs } from 'expo-router';
import { TrackerProvider } from '../src/state';
import { colors } from '../src/ui';
export default function Layout(){return <TrackerProvider><Tabs screenOptions={{headerShown:false,tabBarActiveTintColor:colors.accent,tabBarInactiveTintColor:colors.muted,tabBarStyle:{backgroundColor:colors.card},tabBarLabelStyle:{fontSize:10}}}><Tabs.Screen name="index" options={{title:'Catálogo'}}/><Tabs.Screen name="map" options={{title:'Mapa'}}/><Tabs.Screen name="passes" options={{title:'Pases'}}/><Tabs.Screen name="sky" options={{title:'Cielo'}}/><Tabs.Screen name="compass" options={{title:'Brújula'}}/><Tabs.Screen name="validation" options={{title:'Validar'}}/><Tabs.Screen name="settings" options={{title:'Ajustes'}}/></Tabs></TrackerProvider>;}
