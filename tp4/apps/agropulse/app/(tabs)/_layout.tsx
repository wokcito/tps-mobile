import React from 'react';
import {Tabs} from 'expo-router';
export default function Layout(){return <Tabs screenOptions={{tabBarActiveTintColor:'#14532d',headerTintColor:'#14532d'}}><Tabs.Screen name="index" options={{title:'Mapa'}}/><Tabs.Screen name="plots" options={{title:'Lotes'}}/><Tabs.Screen name="alerts" options={{title:'Alertas'}}/><Tabs.Screen name="account" options={{title:'Cuenta'}}/></Tabs>;}
