import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ScanScreen from './src/screens/ScanScreen';
import DeviceScreen from './src/screens/DeviceScreen';
import QrScreen from './src/screens/QrScreen';
import InstallationScreen from './src/screens/InstallationScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import QueueScreen from './src/screens/QueueScreen';
import { startAutoSync } from './src/sync/syncManager';

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => startAutoSync(), []);
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Scan" component={ScanScreen} options={{ title: 'Network Diagnostics' }} />
        <Stack.Screen name="Device" component={DeviceScreen} options={{ title: 'Equipo' }} />
        <Stack.Screen name="Qr" component={QrScreen} options={{ title: 'Escanear código' }} />
        <Stack.Screen name="Installation" component={InstallationScreen} options={{ title: 'Instalación' }} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'Historial' }} />
        <Stack.Screen name="Queue" component={QueueScreen} options={{ title: 'Cola de sync' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
