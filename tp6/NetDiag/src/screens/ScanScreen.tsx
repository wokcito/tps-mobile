import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Button, s } from './ui';
import { DiscoveredDevice, scanSubnet, startMdns } from '../discovery/lanScan';
import { upsertDevice } from '../storage/database';

export default function ScanScreen({ navigation }: any) {
  const [found, setFound] = useState<Record<string, DiscoveredDevice>>({});
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = (d: DiscoveredDevice) => {
    upsertDevice(d);
    setFound(prev => ({ ...prev, [d.ip]: { ...prev[d.ip], ...d, hostname: d.hostname ?? prev[d.ip]?.hostname } }));
  };

  useEffect(() => startMdns(add), []);

  const run = async () => {
    setScanning(true);
    setError(null);
    try {
      await scanSubnet(add);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setScanning(false);
    }
  };

  return (
    <View style={s.screen}>
      <Button title={scanning ? 'Escaneando…' : 'Escanear red'} onPress={run} disabled={scanning} />
      <Button title="Escanear QR / barras" onPress={() => navigation.navigate('Qr')} />
      <Button title="Nueva instalación" onPress={() => navigation.navigate('Installation')} />
      <Button title="Historial" onPress={() => navigation.navigate('History')} />
      <Button title="Cola de sincronización" onPress={() => navigation.navigate('Queue')} />
      {error && <Text style={{ color: 'crimson' }}>{error}</Text>}
      <FlatList
        data={Object.values(found).sort((a, b) => a.ip.localeCompare(b.ip, undefined, { numeric: true }))}
        keyExtractor={d => d.ip}
        renderItem={({ item }) => (
          <Pressable style={s.row} onPress={() => navigation.navigate('Device', { ip: item.ip })}>
            <Text>{item.ip} {item.hostname ? `· ${item.hostname}` : ''}</Text>
            <Text style={s.muted}>MAC {item.mac ?? 'n/d'} · {item.source}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
