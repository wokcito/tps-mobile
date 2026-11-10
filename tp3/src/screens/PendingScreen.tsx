import * as Linking from 'expo-linking';
import { Link, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { useCooldown } from '../hooks/useCooldown';
import { NEUTRAL_SIGNUP_MESSAGE, mapAuthError } from '../lib/authErrors';
import { supabase } from '../lib/supabase';
import { colors } from '../theme';

export default function PendingScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const email = (Array.isArray(params.email) ? params.email[0] : params.email) ?? '';
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const busy = useRef(false);
  const cooldown = useCooldown(`resend:${email.toLowerCase()}`);

  const resend = async () => {
    if (busy.current || cooldown.active || !email) return;
    busy.current = true;
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: Linking.createURL('confirm') },
      });
      const mapped = error ? mapAuthError(error) : null;
      if (mapped && mapped.kind !== 'user_already_exists') {
        if (mapped.kind === 'rate_limit') cooldown.start();
        setMessage({ type: 'error', text: mapped.message });
        return;
      }
      cooldown.start();
      setMessage({ type: 'success', text: NEUTRAL_SIGNUP_MESSAGE });
    } catch (e) {
      setMessage({ type: 'error', text: mapAuthError(e).message });
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };

  return (
    <Screen
      title="Revisá tu email"
      subtitle="Te enviamos un enlace para confirmar tu cuenta. Abrilo desde este dispositivo para continuar."
    >
      <View style={styles.emailBox}>
        <Text style={styles.emailLabel}>Enviado a</Text>
        <Text style={styles.email} testID="pending-email" selectable>
          {email}
        </Text>
      </View>
      {message && <Banner type={message.type} message={message.text} testID="pending-message" />}
      <Button
        testID="pending-resend"
        title={cooldown.active ? `Reenviar en ${cooldown.remaining}s` : 'Reenviar email'}
        loading={loading}
        loadingText="Enviando…"
        disabled={cooldown.active || !email}
        onPress={resend}
      />
      <View style={styles.footer}>
        <Link href="/login" style={styles.link} accessibilityRole="link">
          Volver a iniciar sesión
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  emailBox: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 20 },
  emailLabel: { color: colors.muted, fontSize: 12 },
  email: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 2 },
  footer: { alignItems: 'center', marginTop: 20 },
  link: { color: colors.primary, fontWeight: '600', fontSize: 14, paddingVertical: 8 },
});
