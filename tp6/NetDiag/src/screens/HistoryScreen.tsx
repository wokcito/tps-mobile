import React, { useEffect, useState } from 'react';
import { FlatList, Text, TextInput, View } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { s } from './ui';
import { Diagnostic } from '../storage/models';
import { diagnostics } from '../storage/database';

/** Fully local (SQLite): works with no connectivity. */
export default function HistoryScreen() {
  const [filter, setFilter] = useState('');
  const [rows, setRows] = useState<Diagnostic[]>([]);
  useEffect(() => {
    const q = filter
      ? diagnostics().query(Q.or(Q.where('device_id', Q.like(`%${Q.sanitizeLikeString(filter)}%`)), Q.where('site', Q.like(`%${Q.sanitizeLikeString(filter)}%`))), Q.sortBy('created_at', Q.desc))
      : diagnostics().query(Q.sortBy('created_at', Q.desc));
    const sub = q.observe().subscribe(setRows);
    return () => sub.unsubscribe();
  }, [filter]);
  return (
    <View style={s.screen}>
      <TextInput style={s.input} placeholder="Filtrar por equipo (IP) o sitio" value={filter} onChangeText={setFilter} />
      <FlatList
        data={rows}
        keyExtractor={r => r.id}
        renderItem={({ item }) => (
          <View style={s.row}>
            <Text>{item.summary}</Text>
            <Text style={s.muted}>{item.deviceId} · {new Date(item.createdAt).toLocaleString()}</Text>
          </View>
        )}
      />
    </View>
  );
}
