/**
 * Los enlaces ibanktp://confirm y ibanktp://reset-password llevan tokens en el hash y los procesa
 * AuthProvider a mano (detectSessionInUrl: false). Acá se evita que el router intente navegar a
 * una ruta protegida antes de que la sesión esté resuelta.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  if (/(^|\/)(confirm|reset-password)(\/|\?|#|$)/.test(path)) return '/';
  return path;
}
