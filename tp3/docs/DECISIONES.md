# Decisiones de diseño y alcance

## Figma
El archivo *iBank — Banking & E-Money Management App* (node 2-20347) requiere el navegador/Dev Mode y no se pudo inspeccionar desde el entorno donde se desarrolló el TP. **Qué se hizo:** se respetaron las cinco pantallas y sus estados (vacío, foco, error, deshabilitado, cargando); la paleta, radios y tipografía están centralizados en `src/theme.ts` (azul primario `#3F51F5`, superficies claras, radios de 12–14 px, fuente del sistema). **Pendiente para fidelidad 100%:** reemplazar los valores de `theme.ts` por los hex/pesos reales extraídos en Dev Mode y cargar la tipografía del kit.

## Persistencia de sesión: AsyncStorage vs SecureStore
Se eligió **AsyncStorage**, como en el quickstart oficial de Supabase para React Native. `expo-secure-store` limita cada valor a ~2 KB y el JSON de sesión de Supabase (access + refresh token + usuario) lo supera, lo que obliga a cifrar/trocear con una capa adicional. Se documenta el riesgo: el refresh token queda en almacenamiento no cifrado del sandbox de la app; para producción se recomienda el patrón `LargeSecureStore` (clave AES en SecureStore + datos cifrados en AsyncStorage).

## Qué se mapeó tal cual / se adaptó
- Tal cual: flujo de 5 pantallas, textos de reglas de negocio de la consigna, mensajes neutros.
- Adaptado: login social, OTP/2FA y PIN/biometría del kit **no se implementan** (fuera de alcance).
- Adaptado: el botón "Mostrar/Ocultar" de contraseña es texto (no ícono) para mantener un touch target de 48 px sin dependencias.

## Decisiones técnicas
- **Anti-enumeración**: login con mensaje único; registro trata `user_already_exists` como éxito; recuperación muestra el mismo mensaje ante cualquier respuesta salvo rate-limit/red (que no revelan nada de la cuenta).
- **Cooldown**: 60 s en memoria por clave (`login`, `signup`, `resend:<email>`, `recover:<email>`); sobrevive a cambios de pantalla.
- **PASSWORD_RECOVERY**: con el flujo implícito (tokens en el hash) `setSession` emite `SIGNED_IN` en lugar de `PASSWORD_RECOVERY`; el provider espera el evento real (flujo PKCE) y, como respaldo, habilita el formulario cuando el enlace era de recuperación y `setSession` tuvo éxito. Un enlace con error o sin tokens muestra el estado "Enlace no válido".
- **+native-intent**: `ibanktp://confirm` y `ibanktp://reset-password` se redirigen a `/`, y el `AuthProvider` procesa los tokens a mano, para que el router no navegue a rutas protegidas antes de tener sesión.

## Fuera de alcance
Login social, OTP como segundo factor, PIN/biometría, CAPTCHA (bonus) y tabla `profiles` con trigger/RLS (ver `docs/SUPABASE.md`, documentado como extra).
