import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useCodeScanner } from 'react-native-vision-camera';
import { Button, s } from './ui';
import { BACKEND_URL } from '../config';
import { database, devices } from '../storage/database';
import { Q } from '@nozbe/watermelondb';

export default function QrScreen({ route, navigation }: any) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const [sheet, setSheet] = useState<string | null>(null);
  const [active, setActive] = useState(true);
  const ip: string | undefined = route.params?.ip;

  const onCode = async (code: string) => {
    setActive(false);
    let text: string | null = null;
    try {
      const r = await fetch(`${BACKEND_URL}/devices/${encodeURIComponent(code)}`);
      text = r.ok ? await r.text() : null;
    } catch {
      /* offline: fall back to the cached sheet below */
    }
    await database.write(async () => {
      const [d] = ip ? await devices().query(Q.where('ip', ip)).fetch() : [];
      const target = d ?? (await devices().query(Q.where('code', code)).fetch())[0];
      if (target) {
        await target.update(r => {
          r.code = code;
          if (text) r.sheetJson = text;
        });
        text = text ?? target.sheetJson ?? null;
      }
    });
    setSheet(text ?? `Código ${code}\n(ficha no disponible sin conexión)`);
  };

  const scanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'code-128'],
    onCodeScanned: codes => {
      const v = codes[0]?.value;
      if (v && active) onCode(v);
    },
  });

  if (!hasPermission) return <View style={s.screen}><Button title="Permitir cámara" onPress={requestPermission} /></View>;
  if (!device) return <View style={s.screen}><Text>Sin cámara</Text></View>;
  return (
    <View style={{ flex: 1 }}>
      {sheet ? (
        <View style={s.screen}>
          <Text style={s.mono}>{sheet}</Text>
          <Button title="Volver" onPress={() => navigation.goBack()} />
        </View>
      ) : (
        <Camera style={{ flex: 1 }} device={device} isActive={active} codeScanner={scanner} />
      )}
    </View>
  );
}
