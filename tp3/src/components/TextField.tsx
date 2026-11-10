import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { MIN_TOUCH, colors, radius } from '../theme';

interface Props extends TextInputProps {
  label: string;
  error?: string;
  secure?: boolean;
}

export function TextField({ label, error, secure, editable = true, onFocus, onBlur, ...props }: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.box,
          focused && styles.focused,
          !!error && styles.errorBox,
          !editable && styles.disabled,
        ]}
      >
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.muted}
          editable={editable}
          secureTextEntry={secure ? hidden : undefined}
          autoCapitalize="none"
          autoCorrect={false}
          {...props}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={styles.input}
        />
        {secure && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostrar contraseña' : 'Ocultar contraseña'}
            onPress={() => setHidden((h) => !h)}
            disabled={!editable}
            style={styles.eye}
          >
            <Text style={styles.eyeText}>{hidden ? 'Mostrar' : 'Ocultar'}</Text>
          </Pressable>
        )}
      </View>
      {!!error && (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 6 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH + 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.input,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
  },
  focused: { borderColor: colors.focus, backgroundColor: colors.background },
  errorBox: { borderColor: colors.danger },
  disabled: { opacity: 0.6 },
  input: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: 12 },
  eye: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, justifyContent: 'center', alignItems: 'flex-end' },
  eyeText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  error: { color: colors.danger, fontSize: 13, marginTop: 4 },
});
