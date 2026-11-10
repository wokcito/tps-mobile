import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme';

export function PrimaryButton({
  title,
  onPress,
  disabled,
  testID,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.btn, disabled && styles.disabled, pressed && { opacity: 0.8 }]}
    >
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    minHeight: 48,
  },
  disabled: { opacity: 0.4 },
  text: { color: colors.primaryText, fontSize: 16, fontWeight: '700' },
});
