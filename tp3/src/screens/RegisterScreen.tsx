import { zodResolver } from '@hookform/resolvers/zod';
import * as Linking from 'expo-linking';
import { Link, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { PasswordChecklist } from '../components/PasswordChecklist';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { useCooldown } from '../hooks/useCooldown';
import { mapAuthError } from '../lib/authErrors';
import { startCooldown } from '../lib/cooldown';
import { supabase } from '../lib/supabase';
import { RegisterForm, registerSchema } from '../lib/validation';
import { MIN_TOUCH, colors } from '../theme';

export default function RegisterScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const cooldown = useCooldown('signup');
  const {
    control,
    handleSubmit,
    watch,
    formState: { isValid, errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '', acceptTerms: false },
  });
  const password = watch('password');

  const onSubmit = handleSubmit(async ({ fullName, email, password: pass }) => {
    if (busy.current || cooldown.active) return;
    busy.current = true;
    setLoading(true);
    setError(null);
    try {
      const cleanEmail = email.trim();
      const { error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: pass,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: Linking.createURL('confirm'),
        },
      });
      const mapped = authError ? mapAuthError(authError) : null;
      // Anti-enumeración: un email ya registrado se comporta igual que uno nuevo.
      if (mapped && mapped.kind !== 'user_already_exists') {
        if (mapped.kind === 'rate_limit') cooldown.start();
        setError(mapped.message);
        return;
      }
      startCooldown(`resend:${cleanEmail.toLowerCase()}`);
      router.replace({ pathname: '/pending', params: { email: cleanEmail } });
    } catch (e) {
      setError(mapAuthError(e).message);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  });

  return (
    <Screen title="Crear cuenta" subtitle="Completá tus datos para abrir tu cuenta iBank.">
      {error && <Banner type="error" message={error} testID="register-error" />}
      <Controller
        control={control}
        name="fullName"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Nombre completo"
            testID="register-name"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            editable={!loading}
            autoCapitalize="words"
            autoComplete="name"
            error={value ? errors.fullName?.message : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Email"
            testID="register-email"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            editable={!loading}
            keyboardType="email-address"
            autoComplete="email"
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
            testID="register-password"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            editable={!loading}
            secure
            autoComplete="new-password"
            textContentType="newPassword"
          />
        )}
      />
      <PasswordChecklist password={password} />
      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Confirmar contraseña"
            testID="register-confirm"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            editable={!loading}
            secure
            autoComplete="new-password"
            error={value ? errors.confirmPassword?.message : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="acceptTerms"
        render={({ field: { onChange, value } }) => (
          <Pressable
            testID="register-terms"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: value, disabled: loading }}
            accessibilityLabel="Acepto los Términos y Condiciones"
            disabled={loading}
            onPress={() => onChange(!value)}
            style={styles.terms}
          >
            <View style={[styles.box, value && styles.boxChecked]}>
              {value && <Text style={styles.tick}>✓</Text>}
            </View>
            <Text style={styles.termsText}>Acepto los Términos y Condiciones</Text>
          </Pressable>
        )}
      />
      <Button
        testID="register-submit"
        title={cooldown.active ? `Reintentar en ${cooldown.remaining}s` : 'Crear cuenta'}
        loading={loading}
        loadingText="Creando cuenta…"
        disabled={!isValid || cooldown.active}
        onPress={onSubmit}
      />
      <View style={styles.footer}>
        <Text style={styles.footerText}>¿Ya tenés cuenta? </Text>
        <Link href="/login" style={styles.link} accessibilityRole="link">
          Iniciá sesión
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  terms: { flexDirection: 'row', alignItems: 'center', minHeight: MIN_TOUCH, marginBottom: 12, gap: 10 },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  tick: { color: colors.primaryText, fontWeight: '800' },
  termsText: { color: colors.text, fontSize: 14, flex: 1 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  footerText: { color: colors.muted, fontSize: 14 },
  link: { color: colors.primary, fontWeight: '600', fontSize: 14, paddingVertical: 8 },
});
