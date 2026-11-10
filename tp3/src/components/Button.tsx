import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { MIN_TOUCH, colors, radius } from '../theme';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  variant?: 'primary' | 'link';
  testID?: string;
}

export function Button({ title, onPress, loading, loadingText, disabled, variant = 'primary', testID }: Props) {
  const off = !!disabled || !!loading;
  if (variant === 'link') {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="button"
        disabled={off}
        onPress={onPress}
        style={styles.link}
      >
        <Text style={[styles.linkText, off && { color: colors.disabled }]}>{title}</Text>
      </Pressable>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [styles.btn, off && styles.btnOff, pressed && { backgroundColor: colors.primaryDark }]}
    >
      {loading && <ActivityIndicator color={colors.primaryText} style={{ marginRight: 8 }} />}
      <Text style={styles.text}>{loading ? (loadingText ?? 'Cargando…') : title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: MIN_TOUCH + 4,
    borderRadius: radius.button,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  btnOff: { backgroundColor: colors.disabled },
  text: { color: colors.primaryText, fontSize: 16, fontWeight: '700' },
  link: { minHeight: MIN_TOUCH, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  linkText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
});
