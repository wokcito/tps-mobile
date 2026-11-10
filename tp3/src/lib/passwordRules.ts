/** Mismas reglas que la política de contraseñas configurada en el dashboard de Supabase. */
export const MIN_PASSWORD_LENGTH = 8;

export interface PasswordRule {
  id: 'length' | 'upper' | 'lower' | 'digit' | 'symbol';
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: `Al menos ${MIN_PASSWORD_LENGTH} caracteres`, test: (p) => p.length >= MIN_PASSWORD_LENGTH },
  { id: 'upper', label: 'Una letra mayúscula', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'Una letra minúscula', test: (p) => /[a-z]/.test(p) },
  { id: 'digit', label: 'Un número', test: (p) => /\d/.test(p) },
  { id: 'symbol', label: 'Un símbolo (!@#$%…)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function evaluatePassword(password: string) {
  return PASSWORD_RULES.map((r) => ({ id: r.id, label: r.label, ok: r.test(password) }));
}

export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(password));
}
