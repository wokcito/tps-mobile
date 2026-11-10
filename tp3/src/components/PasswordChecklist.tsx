import { StyleSheet, Text, View } from 'react-native';
import { evaluatePassword } from '../lib/passwordRules';
import { colors } from '../theme';

/** Checklist que se va tildando mientras el usuario escribe (6.2). */
export function PasswordChecklist({ password }: { password: string }) {
  return (
    <View style={styles.box} testID="password-checklist">
      {evaluatePassword(password).map((r) => (
        <Text
          key={r.id}
          testID={`rule-${r.id}`}
          accessibilityLabel={`${r.label}: ${r.ok ? 'cumplido' : 'pendiente'}`}
          style={[styles.item, r.ok && styles.ok]}
        >
          {r.ok ? '✓' : '○'} {r.label}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: -6, marginBottom: 16, gap: 2 },
  item: { color: colors.muted, fontSize: 13 },
  ok: { color: colors.success, fontWeight: '600' },
});
