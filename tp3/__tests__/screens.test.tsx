import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ForgotPasswordScreen from '../src/screens/ForgotPasswordScreen';
import LoginScreen from '../src/screens/LoginScreen';
import PendingScreen from '../src/screens/PendingScreen';
import RegisterScreen from '../src/screens/RegisterScreen';
import ResetPasswordScreen from '../src/screens/ResetPasswordScreen';
import { clearCooldowns } from '../src/lib/cooldown';

const mockReplace = jest.fn();
const mockAuth = {
  signInWithPassword: jest.fn(),
  signUp: jest.fn(),
  resend: jest.fn(),
  resetPasswordForEmail: jest.fn(),
  updateUser: jest.fn(),
};
const mockAuthCtx = {
  notice: null as null | { type: 'success' | 'error'; message: string },
  setNotice: jest.fn(),
  recovery: 'ready' as 'ready' | 'invalid' | 'verifying' | 'none',
  finishRecovery: jest.fn(async () => undefined),
  cancelRecovery: jest.fn(async () => undefined),
};
let mockParams: { email?: string } = { email: 'ana@mail.com' };

jest.mock('../src/lib/supabase', () => ({
  supabase: {
    get auth() {
      return mockAuth;
    },
  },
}));
jest.mock('../src/auth/AuthProvider', () => ({ useAuth: () => mockAuthCtx }));
jest.mock('expo-linking', () => ({ createURL: (p: string) => `ibanktp://${p}` }));
jest.mock('expo-router', () => {
  const { Text } = require('react-native');
  return {
    useRouter: () => ({ replace: mockReplace }),
    useLocalSearchParams: () => mockParams,
    Link: ({ children }: { children: string }) => <Text>{children}</Text>,
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  clearCooldowns();
  mockAuthCtx.notice = null;
  mockAuthCtx.recovery = 'ready';
  mockParams = { email: 'ana@mail.com' };
});

const type = async (id: string, value: string) => fireEvent.changeText(screen.getByTestId(id), value);
const press = async (id: string) => fireEvent.press(screen.getByTestId(id));

describe('Login (6.1)', () => {
  it('deshabilita el botón hasta tener email válido y password', async () => {
    await render(<LoginScreen />);
    expect(screen.getByTestId('login-submit').props.accessibilityState.disabled).toBe(true);
    await type('login-email', 'ana@mail.com');
    expect(screen.getByTestId('login-submit').props.accessibilityState.disabled).toBe(true);
    await type('login-password', 'x');
    await waitFor(() =>
      expect(screen.getByTestId('login-submit').props.accessibilityState.disabled).toBe(false),
    );
  });

  it('muestra un único mensaje genérico ante credenciales inválidas', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ error: { code: 'invalid_credentials', status: 400 } });
    await render(<LoginScreen />);
    await type('login-email', 'ana@mail.com');
    await type('login-password', 'Mala1234!');
    await waitFor(() => expect(screen.getByTestId('login-submit').props.accessibilityState.disabled).toBe(false));
    await press('login-submit');
    expect(await screen.findByText('Email o contraseña incorrectos')).toBeTruthy();
  });

  it('redirige a Confirmación pendiente si el email no está confirmado', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ error: { code: 'email_not_confirmed', status: 400 } });
    await render(<LoginScreen />);
    await type('login-email', 'ana@mail.com');
    await type('login-password', 'x');
    await waitFor(() => expect(screen.getByTestId('login-submit').props.accessibilityState.disabled).toBe(false));
    await press('login-submit');
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith({ pathname: '/pending', params: { email: 'ana@mail.com' } }),
    );
  });

  it('ante 429 muestra "demasiados intentos" y un cooldown de 60 s en el botón', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ error: { code: 'over_request_rate_limit', status: 429 } });
    await render(<LoginScreen />);
    await type('login-email', 'ana@mail.com');
    await type('login-password', 'x');
    await waitFor(() => expect(screen.getByTestId('login-submit').props.accessibilityState.disabled).toBe(false));
    await press('login-submit');
    expect(await screen.findByText(/Demasiados intentos/)).toBeTruthy();
    expect(screen.getByText('Reintentar en 60s')).toBeTruthy();
    expect(screen.getByTestId('login-submit').props.accessibilityState.disabled).toBe(true);
  });

  it('no permite doble envío mientras la request está en curso', async () => {
    let resolve: (v: unknown) => void = () => undefined;
    mockAuth.signInWithPassword.mockReturnValue(new Promise((r) => (resolve = r)));
    await render(<LoginScreen />);
    await type('login-email', 'ana@mail.com');
    await type('login-password', 'x');
    await waitFor(() => expect(screen.getByTestId('login-submit').props.accessibilityState.disabled).toBe(false));
    void press('login-submit');
    await waitFor(() => expect(mockAuth.signInWithPassword).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('login-email').props.editable).toBe(false);
    expect(screen.getByTestId('login-submit').props.accessibilityState.disabled).toBe(true);
    void press('login-submit');
    await act(async () => new Promise((r) => setTimeout(r, 50)));
    expect(mockAuth.signInWithPassword).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ error: null }));
  });
});

describe('Registro (6.2)', () => {
  const fill = async (over: Partial<Record<string, string>> = {}) => {
    await type('register-name', over.name ?? 'Ana Gómez');
    await type('register-email', over.email ?? 'ana@mail.com');
    await type('register-password', over.password ?? 'Abcdef1!');
    await type('register-confirm', over.confirm ?? 'Abcdef1!');
  };

  it('tilda el checklist mientras se escribe', async () => {
    await render(<RegisterScreen />);
    await type('register-password', 'abc');
    expect(screen.getByTestId('rule-lower').props.accessibilityLabel).toMatch(/cumplido/);
    expect(screen.getByTestId('rule-upper').props.accessibilityLabel).toMatch(/pendiente/);
    await type('register-password', 'Abcdef1!');
    for (const id of ['length', 'upper', 'lower', 'digit', 'symbol']) {
      expect(screen.getByTestId(`rule-${id}`).props.accessibilityLabel).toMatch(/cumplido/);
    }
  });

  it('exige los términos para habilitar el botón y que las contraseñas coincidan', async () => {
    await render(<RegisterScreen />);
    await fill({ confirm: 'Otra1234!' });
    await press('register-terms');
    await waitFor(() => expect(screen.getByText('Las contraseñas no coinciden')).toBeTruthy());
    expect(screen.getByTestId('register-submit').props.accessibilityState.disabled).toBe(true);
    await type('register-confirm', 'Abcdef1!');
    await waitFor(() => expect(screen.getByTestId('register-submit').props.accessibilityState.disabled).toBe(false));
    await press('register-terms'); // desmarca
    await waitFor(() => expect(screen.getByTestId('register-submit').props.accessibilityState.disabled).toBe(true));
  });

  it('llama a signUp con user_metadata y emailRedirectTo, y va a Confirmación pendiente', async () => {
    mockAuth.signUp.mockResolvedValue({ error: null });
    await render(<RegisterScreen />);
    await fill();
    await press('register-terms');
    await waitFor(() => expect(screen.getByTestId('register-submit').props.accessibilityState.disabled).toBe(false));
    await press('register-submit');
    await waitFor(() =>
      expect(mockAuth.signUp).toHaveBeenCalledWith({
        email: 'ana@mail.com',
        password: 'Abcdef1!',
        options: { data: { full_name: 'Ana Gómez' }, emailRedirectTo: 'ibanktp://confirm' },
      }),
    );
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/pending', params: { email: 'ana@mail.com' } });
  });

  it('anti-enumeración: un email ya existente produce el mismo resultado de éxito', async () => {
    mockAuth.signUp.mockResolvedValue({ error: { code: 'user_already_exists', status: 422 } });
    await render(<RegisterScreen />);
    await fill();
    await press('register-terms');
    await waitFor(() => expect(screen.getByTestId('register-submit').props.accessibilityState.disabled).toBe(false));
    await press('register-submit');
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith({ pathname: '/pending', params: { email: 'ana@mail.com' } }));
    expect(screen.queryByTestId('register-error')).toBeNull();
  });
});

describe('Confirmación pendiente (6.3)', () => {
  it('muestra el email, reenvía con resend() y aplica cooldown de 60 s', async () => {
    mockAuth.resend.mockResolvedValue({ error: null });
    await render(<PendingScreen />);
    expect(screen.getByTestId('pending-email').props.children).toBe('ana@mail.com');
    await press('pending-resend');
    await waitFor(() =>
      expect(mockAuth.resend).toHaveBeenCalledWith({
        type: 'signup',
        email: 'ana@mail.com',
        options: { emailRedirectTo: 'ibanktp://confirm' },
      }),
    );
    expect(await screen.findByText('Revisá tu email para continuar')).toBeTruthy();
    expect(screen.getByText('Reenviar en 60s')).toBeTruthy();
    expect(screen.getByTestId('pending-resend').props.accessibilityState.disabled).toBe(true);
  });
});

describe('Recuperar contraseña (6.4)', () => {
  const NEUTRAL = 'Si el email existe en nuestro sistema, vas a recibir instrucciones';

  it('muestra el mismo mensaje exista o no la cuenta', async () => {
    mockAuth.resetPasswordForEmail.mockResolvedValueOnce({ error: null });
    const first = await render(<ForgotPasswordScreen />);
    await type('forgot-email', 'existe@mail.com');
    await waitFor(() => expect(screen.getByTestId('forgot-submit').props.accessibilityState.disabled).toBe(false));
    await press('forgot-submit');
    expect(await screen.findByText(NEUTRAL)).toBeTruthy();
    expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith('existe@mail.com', {
      redirectTo: 'ibanktp://reset-password',
    });
    await first.unmount();

    mockAuth.resetPasswordForEmail.mockResolvedValueOnce({ error: { code: 'user_not_found', status: 400 } });
    await render(<ForgotPasswordScreen />);
    await type('forgot-email', 'noexiste@mail.com');
    await waitFor(() => expect(screen.getByTestId('forgot-submit').props.accessibilityState.disabled).toBe(false));
    await press('forgot-submit');
    expect(await screen.findByText(NEUTRAL)).toBeTruthy();
    expect(screen.queryByText(/no encontrado/i)).toBeNull();
  });

  it('solo valida el formato y bloquea 60 s los reintentos del mismo email', async () => {
    mockAuth.resetPasswordForEmail.mockResolvedValue({ error: null });
    await render(<ForgotPasswordScreen />);
    await type('forgot-email', 'mal');
    expect(screen.getByTestId('forgot-submit').props.accessibilityState.disabled).toBe(true);
    await type('forgot-email', 'ana@mail.com');
    await waitFor(() => expect(screen.getByTestId('forgot-submit').props.accessibilityState.disabled).toBe(false));
    await press('forgot-submit');
    await waitFor(() => expect(screen.getByText('Reintentar en 60s')).toBeTruthy());
    expect(screen.getByTestId('forgot-submit').props.accessibilityState.disabled).toBe(true);
  });
});

describe('Nueva contraseña (6.5)', () => {
  it('actualiza la contraseña y cierra la sesión de recuperación', async () => {
    mockAuth.updateUser.mockResolvedValue({ error: null });
    await render(<ResetPasswordScreen />);
    await type('reset-password', 'Abcdef1!');
    await type('reset-confirm', 'Abcdef1!');
    await waitFor(() => expect(screen.getByTestId('reset-submit').props.accessibilityState.disabled).toBe(false));
    await press('reset-submit');
    await waitFor(() => expect(mockAuth.updateUser).toHaveBeenCalledWith({ password: 'Abcdef1!' }));
    await waitFor(() => expect(mockAuthCtx.finishRecovery).toHaveBeenCalled());
  });

  it('con enlace vencido muestra un estado de error con link para pedir otro, no el formulario', async () => {
    mockAuthCtx.recovery = 'invalid';
    await render(<ResetPasswordScreen />);
    expect(screen.getByTestId('reset-invalid')).toBeTruthy();
    expect(screen.queryByTestId('reset-password')).toBeNull();
    await press('reset-request-new');
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/forgot-password'));
  });

  it('muestra un estado de carga mientras se verifica el enlace', async () => {
    mockAuthCtx.recovery = 'verifying';
    await render(<ResetPasswordScreen />);
    expect(screen.getByTestId('reset-verifying')).toBeTruthy();
    expect(screen.queryByTestId('reset-password')).toBeNull();
  });
});
