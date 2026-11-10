import React, { useState } from 'react';
import { Alert, Image, ScrollView, Text, TextInput, View } from 'react-native';
import { launchCamera } from 'react-native-image-picker';
import { Button, s } from './ui';
import { Fix, getFix } from '../evidence/location';
import { generatePdf } from '../reporting/pdf';
import { database, installations } from '../storage/database';
import { outbox } from '../sync/syncManager';
import { ReportPhoto } from '../reporting/reportHtml';

export default function InstallationScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [site, setSite] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<ReportPhoto[]>([]);
  const [fix, setFix] = useState<Fix | null>(null);
  const [busy, setBusy] = useState(false);

  const takePhoto = async () => {
    const [shot, here] = await Promise.all([launchCamera({ mediaType: 'photo', saveToPhotos: false }), getFix()]);
    const uri = shot.assets?.[0]?.uri;
    if (uri) {
      setPhotos(p => [...p, { uri, latitude: here?.latitude, longitude: here?.longitude }]);
      if (here) setFix(here);
    }
  };

  const save = async () => {
    if (!title || !site) {
      return Alert.alert('Faltan datos', 'Título y sitio son obligatorios');
    }
    setBusy(true);
    try {
      const gps = fix ?? (await getFix());
      const createdAt = Date.now();
      const report = { title, siteName: site, notes, technician: 'Técnico', createdAt, latitude: gps?.latitude, longitude: gps?.longitude, photos };
      const pdfPath = await generatePdf(report, `instalacion-${createdAt}`);
      const row = await database.write(() =>
        installations().create(r => {
          r.title = title;
          r.site = site;
          r.notes = notes;
          r.latitude = gps?.latitude;
          r.longitude = gps?.longitude;
          r.photosJson = JSON.stringify(photos);
          r.pdfPath = pdfPath;
          r.createdAt = createdAt;
        }),
      );
      // Generating the report always queues it; the sync layer decides when it ships.
      await outbox.enqueue('installation_report', { id: row.id, title, site, notes, latitude: gps?.latitude, longitude: gps?.longitude, photoCount: photos.length, pdfPath, createdAt });
      Alert.alert('Reporte generado', 'Encolado para sincronización');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={s.screen}>
      <TextInput style={s.input} placeholder="Título" value={title} onChangeText={setTitle} />
      <TextInput style={s.input} placeholder="Sitio" value={site} onChangeText={setSite} />
      <TextInput style={[s.input, { height: 100 }]} placeholder="Notas técnicas" value={notes} onChangeText={setNotes} multiline />
      <Text style={s.muted}>{fix ? `GPS ${fix.latitude.toFixed(5)}, ${fix.longitude.toFixed(5)} (±${Math.round(fix.accuracy)} m)` : 'Sin ubicación todavía'}</Text>
      <Button title="Tomar foto (con GPS)" onPress={takePhoto} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {photos.map(p => <Image key={p.uri} source={{ uri: p.uri }} style={{ width: 90, height: 90, margin: 2 }} />)}
      </View>
      <Button title="Guardar y generar PDF" onPress={save} disabled={busy} />
    </ScrollView>
  );
}
