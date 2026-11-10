import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

export const Button = ({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) => (
  <Pressable onPress={onPress} disabled={disabled} style={[s.btn, disabled && s.off]}>
    <Text style={s.btnText}>{title}</Text>
  </Pressable>
);

export const s = StyleSheet.create({
  screen: { flex: 1, padding: 16, backgroundColor: '#fff' },
  btn: { backgroundColor: '#0b5fff', padding: 12, borderRadius: 8, marginVertical: 4 },
  off: { opacity: 0.4 },
  btnText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
  row: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#ccc' },
  h: { fontSize: 18, fontWeight: '700', marginVertical: 8 },
  mono: { fontFamily: 'monospace', fontSize: 12 },
  input: { borderWidth: 1, borderColor: '#bbb', borderRadius: 6, padding: 8, marginVertical: 4 },
  muted: { color: '#666' },
});
