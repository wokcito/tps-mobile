import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

export type ThemeName = 'light' | 'dark';

export interface Palette {
  background: string;
  card: string;
  text: string;
  mutedText: string;
  primary: string;
  primaryText: string;
  border: string;
  danger: string;
}

export const palettes: Record<ThemeName, Palette> = {
  light: {
    background: '#F2F4F8',
    card: '#FFFFFF',
    text: '#1B1F2A',
    mutedText: '#5B6475',
    primary: '#3461FF',
    primaryText: '#FFFFFF',
    border: '#D9DEE8',
    danger: '#C62828',
  },
  dark: {
    background: '#10131A',
    card: '#1D222D',
    text: '#F1F3F8',
    mutedText: '#9AA3B5',
    primary: '#7C9BFF',
    primaryText: '#10131A',
    border: '#343B4B',
    danger: '#FF6B6B',
  },
};

export function getStyles(theme: ThemeName) {
  const p = palettes[theme];
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: p.background },
    content: { flexGrow: 1, padding: 16, justifyContent: 'center' },
    card: {
      backgroundColor: p.card,
      borderColor: p.border,
      borderWidth: 1,
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
    },
    title: { color: p.mutedText, fontSize: 16, marginBottom: 8 },
    counter: {
      color: p.text,
      fontSize: 96,
      fontWeight: '800',
      textAlign: 'center',
      minHeight: 112,
    },
    notice: { color: p.danger, fontSize: 14, marginBottom: 12, textAlign: 'center' },
    row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
    button: {
      backgroundColor: p.primary,
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderRadius: 10,
      minWidth: 96,
      alignItems: 'center',
    },
    buttonSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: p.primary,
    },
    buttonDisabled: { opacity: 0.4 },
    buttonText: { color: p.primaryText, fontWeight: '700', fontSize: 16 },
    buttonTextSecondary: { color: p.primary },
  });
}

/** Devuelve los estilos de la pantalla condicionados por el tema (sin duplicar pantallas). */
export function useThemeStyles(theme: ThemeName) {
  return useMemo(() => ({ styles: getStyles(theme), palette: palettes[theme] }), [theme]);
}
