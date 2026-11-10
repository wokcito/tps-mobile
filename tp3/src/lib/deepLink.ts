export type AuthLink =
  | { kind: 'session'; accessToken: string; refreshToken: string; type: string | null }
  | { kind: 'code'; code: string }
  | { kind: 'error'; code: string; description: string }
  | { kind: 'none' };

function parseParams(part: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!part) return out;
  for (const pair of part.split('&')) {
    if (!pair) continue;
    const [k, ...rest] = pair.split('=');
    try {
      out[decodeURIComponent(k)] = decodeURIComponent(rest.join('=').replace(/\+/g, ' '));
    } catch {
      out[k] = rest.join('=');
    }
  }
  return out;
}

/** Extrae lo que Supabase manda en el deep link (hash implícito o query PKCE). */
export function parseAuthLink(url: string | null | undefined): AuthLink {
  if (!url) return { kind: 'none' };
  const hashIdx = url.indexOf('#');
  const hash = hashIdx >= 0 ? url.slice(hashIdx + 1) : '';
  const beforeHash = hashIdx >= 0 ? url.slice(0, hashIdx) : url;
  const qIdx = beforeHash.indexOf('?');
  const query = qIdx >= 0 ? beforeHash.slice(qIdx + 1) : '';
  const params = { ...parseParams(query), ...parseParams(hash) };

  if (params.error || params.error_code) {
    return {
      kind: 'error',
      code: params.error_code ?? params.error ?? 'unknown',
      description: params.error_description ?? '',
    };
  }
  if (params.access_token && params.refresh_token) {
    return {
      kind: 'session',
      accessToken: params.access_token,
      refreshToken: params.refresh_token,
      type: params.type ?? null,
    };
  }
  if (params.code) return { kind: 'code', code: params.code };
  return { kind: 'none' };
}

/** ¿El enlace entrante es de recuperación de contraseña? */
export function isRecoveryUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const link = parseAuthLink(url);
  if (link.kind === 'session' && link.type === 'recovery') return true;
  return /^[a-z][a-z0-9+.-]*:\/\/(?:[^/?#]*\/)*reset-password(?:[/?#]|$)/i.test(url);
}
