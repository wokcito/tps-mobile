import { useState } from 'react';
import { Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import { ThemeName, useThemeStyles } from '../theme';

export const MAX_COUNT = 10;

export default function CounterScreen() {
  const [count, setCount] = useState(0);
  const [theme, setTheme] = useState<ThemeName>('light');
  const { styles } = useThemeStyles(theme);
  const atLimit = count >= MAX_COUNT;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} />
      <View style={styles.card}>
        <Text style={styles.title}>Contador</Text>
        <Text style={styles.counter} accessibilityLabel={`Valor ${count}`} testID="counter-value">
          {count}
        </Text>
        {atLimit && <Text style={styles.notice}>Llegaste al máximo ({MAX_COUNT}). Hacé Reset.</Text>}
        <View style={styles.row}>
          <Pressable
            testID="btn-increment"
            accessibilityRole="button"
            disabled={atLimit}
            onPress={() => setCount((c) => c + 1)}
            android_ripple={{ color: '#ffffff55' }}
            style={({ pressed }) => [
              styles.button,
              pressed && { opacity: 0.7 },
              atLimit && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.buttonText}>+1</Text>
          </Pressable>
          <Pressable
            testID="btn-reset"
            accessibilityRole="button"
            onPress={() => setCount(0)}
            style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.buttonText}>Reset</Text>
          </Pressable>
          <Pressable
            testID="btn-theme"
            accessibilityRole="button"
            onPress={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
            style={({ pressed }) => [
              styles.button,
              styles.buttonSecondary,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
              Tema {theme === 'light' ? 'oscuro' : 'claro'}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
