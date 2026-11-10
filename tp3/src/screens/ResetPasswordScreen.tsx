import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { PasswordChecklist } from '../components/PasswordChecklist';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { mapAuthError } from '../lib/authErrors';
import { supabase } from '../lib/supabase';
import { ResetForm, resetSchema } from '../lib/validation';
import { colors } from '../theme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { recovery, finishRecovery, cancelRecovery } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const {
    control,
    handleSubmit,
    watch,
    formState: { isValid, errors },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    mode: 'onChange',
    defaultValues: { password: '', confirmPassword: '' },
  });
  const password = watch('password');

  const onSubmit = handleSubmit(async ({ password: next }) => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.updateUser({ password: next });
      if (authError) {
        setError(mapAuthError(authError).message);
        return;
      }
      await finishRecovery(); // signOut de la sesión temporal; el guard lleva a Login con mensaje
    } catch (e) {
      setError(mapAuthError(e).message);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  });

  if (recovery === 'verifying') {
    return (
      <Screen title="Verificando enlace…">
        <ActivityIndicator size="large" color={colors.primary} testID="reset-verifying" />
      </Screen>
    );
  }

  if (recovery === 'invalid') {
    return (
      <Screen title="Enlace no válido" subtitle="El enlace venció o ya fue utilizado. Pedí uno nuevo para continuar.">
        <Banner type="error" message="El enlace venció o ya no es válido" testID="reset-invalid" />
        <Button
          testID="reset-request-new"
          title="Pedir un nuevo enlace"
          onPress={async () => {
            await cancelRecovery();
            router.replace('/forgot-password');
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen title="Nueva contraseña" subtitle="Elegí una contraseña segura para tu cuenta.">
      {error && <Banner type="error" message={error} testID="reset-error" />}
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Nueva contraseña"
            testID="reset-password"
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
            testID="reset-confirm"
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
      <Button
        testID="reset-submit"
        title="Guardar contraseña"
        loading={loading}
        loadingText="Guardando…"
        disabled={!isValid}
        onPress={onSubmit}
      />
      <View style={styles.cancel}>
        <Button variant="link" title="Cancelar" disabled={loading} onPress={() => void cancelRecovery()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ cancel: { alignItems: 'center', marginTop: 12 } });
