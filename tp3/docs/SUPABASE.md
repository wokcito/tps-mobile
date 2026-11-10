# Configuración de Supabase (Authentication)

| Ítem | Valor usado |
|---|---|
| Confirm email | **Activo** |
| Longitud mínima de contraseña | 8 |
| Complejidad | mayúscula, minúscula, dígito y símbolo (*Lowercase, uppercase letters, digits and symbols*) |
| Leaked password protection | Activar si el plan es Pro o superior (no disponible en Free) |
| Expiración de enlace/OTP | 3600 s |
| Rate limits | por defecto (60 s de cooldown por usuario en signup/recover) — no modificados |
| SMTP | Custom SMTP en producción (el incluido limita a 2 emails/hora) |
| Redirect URLs | `ibanktp://confirm`, `ibanktp://reset-password` (y `exp://…/--/confirm`, `exp://…/--/reset-password` solo para desarrollo en Expo Go) |
| Claves en el cliente | solo anon/publishable key; la `service_role` nunca se incluye |
| CAPTCHA | no activado (bonus) |

Las reglas de contraseña del cliente (`src/lib/passwordRules.ts`) replican esta política.

## Extra opcional: tabla `profiles`
Los datos del registro viajan en `user_metadata` (`full_name`). Si hay que consultarlos desde otras tablas, `supabase/profiles.sql` los sincroniza a una tabla pública con RLS (`auth.uid() = id`).
