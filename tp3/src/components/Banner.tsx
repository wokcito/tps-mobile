import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export function Banner({ type, message, testID }: { type: 'success' | 'error' | 'info'; message: string; testID?: string }) {
  return (
    <View
      testID={testID}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.box, type === 'success' && styles.success, type === 'error' && styles.error]}
    >
      <Text style={[styles.text, type === 'success' && { color: colors.success }, type === 'error' && { color: colors.danger }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 12, padding: 12, marginBottom: 16, backgroundColor: colors.surface },
  success: { backgroundColor: colors.successBg },
  error: { backgroundColor: colors.dangerBg },
  text: { color: colors.text, fontSize: 14, lineHeight: 20 },
});
