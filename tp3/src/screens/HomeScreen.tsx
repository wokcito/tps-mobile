import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { colors } from '../theme';

export default function HomeScreen() {
  const { session, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const name = (session?.user.user_metadata?.full_name as string | undefined) ?? 'cliente';
  return (
    <Screen title={`Hola, ${name}`} subtitle="Sesión iniciada correctamente.">
      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value} testID="home-email">
          {session?.user.email}
        </Text>
      </View>
      <Button
        testID="logout"
        title="Cerrar sesión"
        loading={loading}
        loadingText="Cerrando…"
        onPress={async () => {
          setLoading(true);
          try {
            await signOut();
          } finally {
            setLoading(false);
          }
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 20 },
  label: { color: colors.muted, fontSize: 12 },
  value: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 2 },
});
