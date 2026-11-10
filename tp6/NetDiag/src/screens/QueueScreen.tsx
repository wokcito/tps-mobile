import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { Button, s } from './ui';
import { outbox } from '../sync/syncManager';
import { OutboxAction } from '../sync/outbox';

export default function QueueScreen() {
  const [items, setItems] = useState<OutboxAction[]>([]);
  const [msg, setMsg] = useState('');
  const refresh = useCallback(async () => setItems(await outbox.list()), []);
  useEffect(() => { refresh(); }, [refresh]);
  const sync = async () => {
    const r = await outbox.flush();
    setMsg(`Enviadas ${r.sent} · fallidas ${r.failed} · conflictos ${r.conflicts}`);
    refresh();
  };
  return (
    <View style={s.screen}>
      <Button title="Sincronizar ahora" onPress={sync} />
      <Text>{msg}</Text>
      <FlatList
        data={items}
        keyExtractor={a => a.id}
        renderItem={({ item }) => (
          <View style={s.row}>
            <Text>{item.type} · {item.status}</Text>
            <Text style={s.muted}>intentos {item.attempts}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={s.muted}>Cola vacía</Text>}
      />
    </View>
  );
}
