import { zodResolver } from '@hookform/resolvers/zod';
import * as Linking from 'expo-linking';
import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { cooldownRemaining } from '../lib/cooldown';
import { useCooldown } from '../hooks/useCooldown';
import { NEUTRAL_RESET_MESSAGE, mapAuthError } from '../lib/authErrors';
import { supabase } from '../lib/supabase';
import { ForgotForm, forgotSchema } from '../lib/validation';
import { colors } from '../theme';

export default function ForgotPasswordScreen() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const busy = useRef(false);
  const {
    control,
    handleSubmit,
    watch,
    formState: { isValid, errors },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
    mode: 'onChange',
    defaultValues: { email: '' },
  });
  const email = watch('email').trim().toLowerCase();
  // cooldown de 60 s entre reintentos para el mismo email
  const cooldown = useCooldown(`recover:${email}`);

  const onSubmit = handleSubmit(async ({ email: raw }) => {
    const clean = raw.trim();
    const key = `recover:${clean.toLowerCase()}`;
    if (busy.current || cooldownRemaining(key) > 0) return;
    busy.current = true;
    setLoading(true);
    setMessage(null);
    try {
      const redirectTo = Linking.createURL('reset-password');
      const { error } = await supabase.auth.resetPasswordForEmail(clean, { redirectTo });
      const mapped = error ? mapAuthError(error) : null;
      // Solo se informan fallos que no revelan si la cuenta existe (límite de envíos o red).
      if (mapped && (mapped.kind === 'rate_limit' || mapped.kind === 'network')) {
        if (mapped.kind === 'rate_limit') cooldown.start();
        setMessage({ type: 'error', text: mapped.message });
        return;
      }
      cooldown.start();
      setMessage({ type: 'success', text: NEUTRAL_RESET_MESSAGE });
    } catch (e) {
      setMessage({ type: 'error', text: mapAuthError(e).message });
    } finally {
      busy.current = false;
      setLoading(false);
    }
  });

  return (
    <Screen
      title="Recuperar contraseña"
      subtitle="Ingresá tu email y te enviaremos instrucciones para crear una contraseña nueva."
    >
      {message && <Banner type={message.type} message={message.text} testID="forgot-message" />}
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Email"
            testID="forgot-email"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            editable={!loading}
            keyboardType="email-address"
            autoComplete="email"
            placeholder="tu@email.com"
            error={value ? errors.email?.message : undefined}
          />
        )}
      />
      <Button
        testID="forgot-submit"
        title={cooldown.active ? `Reintentar en ${cooldown.remaining}s` : 'Enviar instrucciones'}
        loading={loading}
        loadingText="Enviando…"
        disabled={!isValid || cooldown.active}
        onPress={onSubmit}
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
  footer: { alignItems: 'center', marginTop: 20 },
  link: { color: colors.primary, fontWeight: '600', fontSize: 14, paddingVertical: 8 },
});
