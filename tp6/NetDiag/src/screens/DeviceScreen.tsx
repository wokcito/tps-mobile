import React, { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { Button, s } from './ui';
import { querySystem, sampleInterface } from '../protocol/snmpClient';
import { runDiagnostic } from '../protocol/ssh';
import { DIAGNOSTIC_COMMANDS } from '../diagnostics/commands';
import { saveSshCredentials } from '../security/credentials';
import { saveDiagnostic } from '../storage/database';

export default function DeviceScreen({ route }: any) {
  const { ip } = route.params as { ip: string };
  const [community, setCommunity] = useState('public');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);

  const guard = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setOut(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const snmp = () =>
    guard(async () => {
      const info = await querySystem(ip, community);
      const traffic = await sampleInterface(ip, community, 1);
      const text = JSON.stringify({ ...info, if1: traffic }, null, 2);
      setOut(text);
      await saveDiagnostic(ip, undefined, 'snmp', `SNMP ${info.sysName ?? ip}`, { info, traffic });
    });

  const ssh = (cmd: string, label: string) =>
    guard(async () => {
      if (user && pass) {
        await saveSshCredentials(ip, user, pass); // to Keystore, then cleared from state
        setPass('');
      }
      const res = await runDiagnostic(ip, cmd);
      setOut(res);
      await saveDiagnostic(ip, undefined, 'ssh', `SSH ${label}`, { command: cmd, output: res });
    });

  return (
    <ScrollView style={s.screen}>
      <Text style={s.h}>{ip}</Text>
      <Text>Community SNMP</Text>
      <TextInput style={s.input} value={community} onChangeText={setCommunity} autoCapitalize="none" />
      <Button title="Consultar SNMP" onPress={snmp} disabled={busy} />
      <Text style={s.h}>SSH</Text>
      <TextInput style={s.input} placeholder="usuario" value={user} onChangeText={setUser} autoCapitalize="none" />
      <TextInput style={s.input} placeholder="contraseña (se guarda en Keystore)" value={pass} onChangeText={setPass} secureTextEntry />
      <View>
        {DIAGNOSTIC_COMMANDS.map(c => (
          <Button key={c.id} title={c.label} onPress={() => ssh(c.command, c.label)} disabled={busy} />
        ))}
      </View>
      <Text style={[s.mono, { marginTop: 12 }]}>{out}</Text>
    </ScrollView>
  );
}
