import { classifyAuthError, mapAuthError } from '../src/lib/authErrors';
import { clearCooldowns, cooldownRemaining, startCooldown } from '../src/lib/cooldown';
import { isRecoveryUrl, parseAuthLink } from '../src/lib/deepLink';
import { evaluatePassword, isPasswordValid } from '../src/lib/passwordRules';
import { forgotSchema, loginSchema, registerSchema, resetSchema } from '../src/lib/validation';

describe('reglas de contraseña', () => {
  it('evalúa cada requisito por separado', () => {
    const r = Object.fromEntries(evaluatePassword('abc').map((x) => [x.id, x.ok]));
    expect(r).toEqual({ length: false, upper: false, lower: true, digit: false, symbol: false });
  });
  it('exige longitud, mayúscula, minúscula, dígito y símbolo', () => {
    expect(isPasswordValid('Abcdef1!')).toBe(true);
    expect(isPasswordValid('Abcdef1')).toBe(false);
    expect(isPasswordValid('abcdef1!')).toBe(false);
    expect(isPasswordValid('ABCDEF1!')).toBe(false);
    expect(isPasswordValid('Abcdefg!')).toBe(false);
    expect(isPasswordValid('Abcdefg1')).toBe(false);
  });
});

describe('validaciones de formularios', () => {
  it('login: email con formato y password no vacía', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'a@b', password: 'x' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'a@b.co', password: '' }).success).toBe(false);
  });

  const reg = {
    fullName: 'Ana Gómez',
    email: 'ana@mail.com',
    password: 'Abcdef1!',
    confirmPassword: 'Abcdef1!',
    acceptTerms: true,
  };
  it('registro: valida todo junto', () => {
    expect(registerSchema.safeParse(reg).success).toBe(true);
  });
  it('registro: confirmación distinta, términos sin aceptar y contraseña débil fallan', () => {
    expect(registerSchema.safeParse({ ...reg, confirmPassword: 'Abcdef1?' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...reg, acceptTerms: false }).success).toBe(false);
    expect(
      registerSchema.safeParse({ ...reg, password: 'abc', confirmPassword: 'abc' }).success,
    ).toBe(false);
  });
  it('forgot solo valida el formato del email; reset exige complejidad y confirmación', () => {
    expect(forgotSchema.safeParse({ email: 'x@y.com' }).success).toBe(true);
    expect(forgotSchema.safeParse({ email: 'x' }).success).toBe(false);
    expect(resetSchema.safeParse({ password: 'Abcdef1!', confirmPassword: 'Abcdef1!' }).success).toBe(true);
    expect(resetSchema.safeParse({ password: 'Abcdef1!', confirmPassword: 'otra' }).success).toBe(false);
  });
});

describe('mapeo de errores', () => {
  it('traduce los códigos de Supabase', () => {
    expect(mapAuthError({ code: 'invalid_credentials' }).message).toBe('Email o contraseña incorrectos');
    expect(classifyAuthError({ code: 'email_not_confirmed' })).toBe('email_not_confirmed');
    expect(classifyAuthError({ code: 'over_request_rate_limit' })).toBe('rate_limit');
    expect(classifyAuthError({ code: 'over_email_send_rate_limit' })).toBe('rate_limit');
    expect(classifyAuthError({ status: 429 })).toBe('rate_limit');
    expect(classifyAuthError({ code: 'weak_password' })).toBe('weak_password');
    expect(classifyAuthError({ code: 'user_already_exists' })).toBe('user_already_exists');
    expect(classifyAuthError({ name: 'AuthRetryableFetchError', status: 0 })).toBe('network');
    expect(classifyAuthError(new TypeError('Network request failed'))).toBe('network');
    expect(classifyAuthError({ code: 'otp_expired' })).toBe('otp_expired');
    expect(classifyAuthError(null)).toBe('unknown');
  });
  it('nunca devuelve el mensaje crudo del servidor', () => {
    expect(mapAuthError({ code: 'x', message: 'secreto interno' }).message).not.toContain('secreto');
  });
});

describe('cooldown', () => {
  it('cuenta regresiva por clave', () => {
    clearCooldowns();
    startCooldown('k', 60, 1000);
    expect(cooldownRemaining('k', 1000)).toBe(60);
    expect(cooldownRemaining('k', 31000)).toBe(30);
    expect(cooldownRemaining('k', 61000)).toBe(0);
    expect(cooldownRemaining('otra', 1000)).toBe(0);
  });
});

describe('deep links', () => {
  it('lee tokens del hash (flujo implícito)', () => {
    const l = parseAuthLink('ibanktp://reset-password#access_token=a&refresh_token=r&type=recovery');
    expect(l).toEqual({ kind: 'session', accessToken: 'a', refreshToken: 'r', type: 'recovery' });
    expect(isRecoveryUrl('ibanktp://reset-password#access_token=a&refresh_token=r&type=recovery')).toBe(true);
  });
  it('lee el code de PKCE y los errores de enlace vencido', () => {
    expect(parseAuthLink('ibanktp://confirm?code=abc')).toEqual({ kind: 'code', code: 'abc' });
    const e = parseAuthLink(
      'ibanktp://reset-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid',
    );
    expect(e).toEqual({ kind: 'error', code: 'otp_expired', description: 'Email link is invalid' });
  });
  it('ignora URLs sin datos de auth', () => {
    expect(parseAuthLink(null)).toEqual({ kind: 'none' });
    expect(parseAuthLink('ibanktp://home')).toEqual({ kind: 'none' });
    expect(isRecoveryUrl('ibanktp://confirm#access_token=a&refresh_token=r&type=signup')).toBe(false);
    expect(isRecoveryUrl('exp://192.168.0.2:8081/--/reset-password')).toBe(true);
  });
});
