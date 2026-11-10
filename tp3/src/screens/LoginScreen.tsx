import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { useCooldown } from '../hooks/useCooldown';
import { mapAuthError } from '../lib/authErrors';
import { supabase } from '../lib/supabase';
import { LoginForm, loginSchema } from '../lib/validation';
import { colors } from '../theme';

export default function LoginScreen() {
  const router = useRouter();
  const { notice, setNotice } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const cooldown = useCooldown('login');
  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => () => setNotice(null), [setNotice]);

  const onSubmit = handleSubmit(async ({ email, password }) => {
    if (busy.current || cooldown.active) return; // sin doble envío
    busy.current = true;
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (!authError) return; // la sesión persiste sola; el guard de rutas lleva a Home
      const mapped = mapAuthError(authError);
      if (mapped.kind === 'email_not_confirmed') {
        router.replace({ pathname: '/pending', params: { email: email.trim() } });
        return;
      }
      if (mapped.kind === 'rate_limit') cooldown.start();
      setError(mapped.message);
    } catch (e) {
      setError(mapAuthError(e).message);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  });

  const disabled = !isValid || cooldown.active;
  return (
    <Screen title="Iniciar sesión" subtitle="Ingresá a tu cuenta para administrar tu dinero.">
      {notice && <Banner type={notice.type} message={notice.message} testID="notice" />}
      {error && <Banner type="error" message={error} testID="login-error" />}
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Email"
            testID="login-email"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            editable={!loading}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="username"
            placeholder="tu@email.com"
            error={value ? errors.email?.message : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Contraseña"
            testID="login-password"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            editable={!loading}
            secure
            autoComplete="current-password"
            textContentType="password"
            placeholder="Tu contraseña"
          />
        )}
      />
      <View style={styles.forgot}>
        <Link href="/forgot-password" style={styles.link} accessibilityRole="link">
          Olvidé mi contraseña
        </Link>
      </View>
      <Button
        testID="login-submit"
        title={cooldown.active ? `Reintentar en ${cooldown.remaining}s` : 'Iniciar sesión'}
        loading={loading}
        loadingText="Ingresando…"
        disabled={disabled}
        onPress={onSubmit}
      />
      <View style={styles.footer}>
        <Text style={styles.footerText}>¿No tenés cuenta? </Text>
        <Link href="/register" style={styles.link} accessibilityRole="link">
          Registrate
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  forgot: { alignItems: 'flex-end', marginBottom: 20, marginTop: -4 },
  link: { color: colors.primary, fontWeight: '600', fontSize: 14, paddingVertical: 8 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  footerText: { color: colors.muted, fontSize: 14 },
});
