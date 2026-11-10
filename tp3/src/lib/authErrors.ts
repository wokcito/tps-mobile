/**
 * Único punto que traduce los errores de Supabase Auth a mensajes en español (7.4).
 * Las pantallas nunca muestran `error.message` crudo.
 */
export type AuthErrorKind =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'rate_limit'
  | 'weak_password'
  | 'user_already_exists'
  | 'network'
  | 'otp_expired'
  | 'unknown';

export interface MappedAuthError {
  kind: AuthErrorKind;
  message: string;
}

interface ErrorLike {
  code?: string | null;
  status?: number | null;
  name?: string;
  message?: string;
}

export const COOLDOWN_SECONDS = 60;

const MESSAGES: Record<AuthErrorKind, string> = {
  invalid_credentials: 'Email o contraseña incorrectos',
  email_not_confirmed: 'Tenés que confirmar tu email antes de iniciar sesión',
  rate_limit: 'Demasiados intentos. Esperá un minuto antes de volver a intentar',
  weak_password: 'La contraseña es demasiado débil. Elegí una más segura',
  user_already_exists: 'Revisá tu email para continuar',
  network: 'No pudimos conectarnos. Revisá tu conexión e intentá de nuevo',
  otp_expired: 'El enlace venció o ya no es válido',
  unknown: 'Ocurrió un error inesperado. Intentá de nuevo',
};

export function classifyAuthError(error: unknown): AuthErrorKind {
  const e = (error ?? {}) as ErrorLike;
  const code = e.code ?? '';
  if (code === 'invalid_credentials') return 'invalid_credentials';
  if (code === 'email_not_confirmed') return 'email_not_confirmed';
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit' || e.status === 429) {
    return 'rate_limit';
  }
  if (code === 'weak_password') return 'weak_password';
  if (code === 'user_already_exists' || code === 'email_exists') return 'user_already_exists';
  if (code === 'otp_expired' || code === 'flow_state_expired') return 'otp_expired';
  if (
    e.name === 'AuthRetryableFetchError' ||
    e.status === 0 ||
    (e.name === 'TypeError' && /network|fetch/i.test(e.message ?? ''))
  ) {
    return 'network';
  }
  // Compatibilidad con respuestas viejas que solo traen el texto
  const msg = (e.message ?? '').toLowerCase();
  if (msg.includes('invalid login credentials')) return 'invalid_credentials';
  if (msg.includes('email not confirmed')) return 'email_not_confirmed';
  if (msg.includes('network request failed')) return 'network';
  return 'unknown';
}

export function mapAuthError(error: unknown): MappedAuthError {
  const kind = classifyAuthError(error);
  return { kind, message: MESSAGES[kind] };
}

export const NEUTRAL_SIGNUP_MESSAGE = 'Revisá tu email para continuar';
export const NEUTRAL_RESET_MESSAGE =
  'Si el email existe en nuestro sistema, vas a recibir instrucciones';
