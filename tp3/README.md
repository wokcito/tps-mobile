# TP3 — Login iBank × Supabase

Flujo completo de autenticación (iniciar sesión, registro, confirmación pendiente, recuperar contraseña y nueva contraseña) sobre **Supabase Auth**, con React Native + Expo (Expo Router), `react-hook-form` + `zod`.

## Instalación
```bash
npm install
cp .env.example .env     # completar con la URL y la anon key de TU proyecto Supabase
npx expo start           # Expo Go no soporta deep links con scheme propio: usar dev build (ver abajo)
npm test && npm run typecheck
```

Variables de entorno (`.env`):

| Variable | Descripción |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | URL del proyecto (`https://xxxx.supabase.co`) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key. **Nunca** la `service_role`. |

Antes de correr, configurar el dashboard según [`docs/SUPABASE.md`](docs/SUPABASE.md) (Confirm email, política de contraseñas, Redirect URLs `ibanktp://confirm` y `ibanktp://reset-password`).

Deep links: scheme `ibanktp` (`app.json`). Para probarlos de punta a punta usar un development build (`npx expo run:android` / `run:ios`); en Expo Go el esquema es `exp://…` y hay que agregar esa URL a la allowlist de Redirect URLs.

## Estructura
```
app/                    rutas (Expo Router): (auth)/login|register|pending|forgot-password, (app)/home, reset-password
src/lib/supabase.ts     cliente (AsyncStorage, autoRefresh, detectSessionInUrl:false)
src/lib/authErrors.ts   ÚNICO punto de mapeo de errores de Supabase -> mensajes en español (7.4)
src/lib/passwordRules   reglas de contraseña = política del dashboard
src/lib/validation.ts   esquemas zod
src/lib/deepLink.ts     parseo de enlaces de confirmación / recuperación
src/lib/cooldown.ts + hooks/useCooldown   cooldown de 60 s
src/auth/AuthProvider   sesión, rutas protegidas, deep links, estado de recuperación
src/screens/*           las 5 pantallas + Home
docs/                   decisiones y configuración de Supabase
```

## Cobertura de la consigna
| Sección | Implementación |
|---|---|
| 6.1 Login | botón deshabilitado (no oculto) hasta email válido + password; inputs bloqueados y spinner en la request; mensaje genérico `Email o contraseña incorrectos`; `email_not_confirmed` → Confirmación pendiente; 429 → mensaje + cooldown visual de 60 s |
| 6.2 Registro | checklist visual en vivo (longitud, mayúscula, minúscula, dígito, símbolo); confirmación idéntica; checkbox de términos obligatorio; `options.data` (`full_name`) y `emailRedirectTo`; mismo resultado exista o no la cuenta |
| 6.3 Confirmación pendiente | muestra el email (no editable), `auth.resend({type:'signup'})` con cooldown 60 s; al volver del deep link con sesión válida el guard lleva a Home |
| 6.4 Recuperar | solo email con validación de formato; mensaje neutro idéntico; cooldown 60 s por email |
| 6.5 Nueva contraseña | solo se llega por deep link; espera la sesión de recuperación (`PASSWORD_RECOVERY`); enlace vencido → estado de error con link para pedir otro; `updateUser` y luego `signOut` + vuelta a Login con mensaje |
| 7.1 Carga uniforme | submit con spinner + disabled, inputs deshabilitados, sin doble envío (ref `busy`) |
| 7.2 Rutas protegidas | `Stack.Protected`; pantalla de carga mientras se resuelve la sesión |
| 7.3 Logout | `supabase.auth.signOut()` |
| 7.4 Errores | `src/lib/authErrors.ts` |
| 7.5 Logs | no hay `console.*`; las contraseñas viven solo en el estado del formulario |

## Pruebas realizadas
- Automáticas (`npm test`, 27 tests): reglas de contraseña, validaciones, mapeo de errores, cooldown, parseo de deep links y comportamiento de cada pantalla con Supabase mockeado (credenciales inválidas, email no confirmado, 429, anti-enumeración, doble envío, enlace vencido).
- **No** se probó contra un proyecto real de Supabase ni en dispositivo/emulador desde el entorno de desarrollo (sin credenciales ni Android SDK). Falta correr el flujo de punta a punta en una plataforma (Android o iOS) y adjuntar las capturas/grabación pedidas en los entregables.
