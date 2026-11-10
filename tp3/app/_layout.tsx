import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '../src/auth/AuthProvider';
import { colors } from '../src/theme';

function RootStack() {
  const { session, loading, recovery } = useAuth();

  // 7.2: mientras se resuelve la sesión, estado de carga (nunca un parpadeo del login)
  if (loading) {
    return (
      <View
        testID="session-loading"
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const inRecovery = recovery !== 'none';
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={inRecovery}>
        <Stack.Screen name="reset-password" />
      </Stack.Protected>
      <Stack.Protected guard={!inRecovery && !!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!inRecovery && !session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootStack />
    </AuthProvider>
  );
}
