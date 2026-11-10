import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { isRecoveryUrl, parseAuthLink } from '../lib/deepLink';
import { supabase } from '../lib/supabase';

export type RecoveryState = 'none' | 'verifying' | 'ready' | 'invalid';

export interface Notice {
  type: 'success' | 'error';
  message: string;
}

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  recovery: RecoveryState;
  notice: Notice | null;
  setNotice: (n: Notice | null) => void;
  signOut: () => Promise<void>;
  finishRecovery: () => Promise<void>;
  cancelRecovery: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Refresh del token solo mientras la app está en foreground (sección 5)
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState<RecoveryState>('none');
  const [notice, setNotice] = useState<Notice | null>(null);

  const handleUrl = useCallback(async (url: string | null) => {
    const link = parseAuthLink(url);
    const recoveryLink = isRecoveryUrl(url);
    if (link.kind === 'none' && !recoveryLink) return;

    if (recoveryLink) setRecovery('verifying');

    if (link.kind === 'error') {
      if (recoveryLink) setRecovery('invalid');
      else setNotice({ type: 'error', message: 'El enlace venció o ya no es válido' });
      return;
    }
    if (link.kind === 'none') {
      // enlace de recuperación sin tokens: no hay sesión temporal posible
      setRecovery('invalid');
      return;
    }

    const { error } =
      link.kind === 'session'
        ? await supabase.auth.setSession({
            access_token: link.accessToken,
            refresh_token: link.refreshToken,
          })
        : await supabase.auth.exchangeCodeForSession(link.code);

    if (error) {
      if (recoveryLink) setRecovery('invalid');
      else setNotice({ type: 'error', message: 'El enlace venció o ya no es válido' });
      return;
    }
    // Con tokens en el hash supabase-js emite SIGNED_IN en vez de PASSWORD_RECOVERY:
    // el evento real (PKCE) o este respaldo habilitan el formulario.
    if (recoveryLink) setRecovery('ready');
  }, []);

  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setRecovery('ready');
      if (event === 'SIGNED_OUT') setRecovery('none');
    });

    (async () => {
      try {
        const initial = await Linking.getInitialURL();
        await handleUrl(initial);
        const { data } = await supabase.auth.getSession();
        if (active) setSession(data.session);
      } finally {
        if (active) setLoading(false);
      }
    })();

    const linkSub = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
      linkSub.remove();
    };
  }, [handleUrl]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut(); // limpia el storage local
    setSession(null);
    setRecovery('none');
  }, []);

  const finishRecovery = useCallback(async () => {
    // cierra la sesión temporal de recuperación: el usuario debe loguearse con la nueva clave
    await supabase.auth.signOut();
    setSession(null);
    setRecovery('none');
    setNotice({ type: 'success', message: 'Contraseña actualizada. Iniciá sesión con la nueva.' });
  }, []);

  const cancelRecovery = useCallback(async () => {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
    setSession(null);
    setRecovery('none');
  }, []);

  const value = useMemo(
    () => ({ session, loading, recovery, notice, setNotice, signOut, finishRecovery, cancelRecovery }),
    [session, loading, recovery, notice, signOut, finishRecovery, cancelRecovery],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
