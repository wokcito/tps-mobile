# AgroPulse · TP4

Demo académica de agricultura de precisión: **Expo → Supabase (Auth/RLS/Realtime) → backend Kafka/Redpanda**. El móvil nunca se conecta al broker. **Humedad y GPS de semilla son ficticios**; no representan un predio real ni recomendaciones calibradas. El GPS del dispositivo, si se autoriza, sí es real.

## Estado de la entrega

Código, pruebas unitarias, migraciones, semilla e infraestructura incluidos. **No se ejecutó en dispositivo, Docker ni proyecto Supabase real** en este entorno; no hay Android SDK/JDK ni credenciales/proyecto de clase. No se afirman latencias medidas, RLS probada en servidor ni flujo H1 filmado. Ver [informe de seis páginas equivalentes](docs/INFORME.md) y [guion de aceptación](docs/ACEPTACION.md).

## 1. Preparar Supabase

Usar un proyecto de prueba nuevo, nunca uno productivo. En SQL Editor, ejecutar **en este orden**:

1. `supabase/migrations/202606010001_agropulse.sql`
2. `supabase/migrations/202606010002_series_weather.sql`
3. `supabase/seed.sql`

Las migraciones se aplican una vez; Supabase CLI también puede aplicarlas como migraciones versionadas. La semilla contiene dos organizaciones, cuatro lotes, una estación y válvula por lote y lecturas de siete horas cada diez minutos. Monte A termina hace veinte minutos para empezar stale. Ejecutar la semilla cerca de la defensa: los timestamps son relativos al momento de carga. No volver a cargarla rutinariamente, porque agrega otra serie histórica relativa.

Configurar Auth con email/password. El script administrativo confirma exclusivamente los usuarios de demostración; no desactivar validación de email globalmente para usuarios reales. Realtime se publica en las migraciones para `readings`, `valves`, `irrigation_commands` y `alerts`. Tablas de Supabase tienen RLS activada y la vista usa `security_invoker` (Postgres 15+).

## 2. Preparar backend y usuarios

Requisitos: Node 22+ (20+ para ejecución sin `--env-file` si exportás las variables), npm, Docker Compose v2 y conexión al proyecto Supabase.

Copiar **localmente** `infra/.env.example` a `infra/.env`, sin subirlo a Git. Completar:

| Variable | Uso |
|---|---|
| `SUPABASE_URL` | URL del proyecto, alcanzable desde los contenedores |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave administrativa **solo backend**, nunca `EXPO_PUBLIC_*` |
| `KAFKA_BROKERS` | `redpanda:9092` dentro de Compose |
| `DEMO_PASSWORD` | Contraseña privada de 12+ caracteres para los usuarios de demo |
| `DISABLED_STATION_IDS` | UUID separados por coma; usar el de Monte A para demo stale |

Provisionar las cuentas una vez; no imprime la contraseña ni claves:

```sh
cd infra/worker
npm i
node --env-file=../.env provision-users.js
```

| Cuenta | Rol | Membresías |
|---|---|---|
| productor@agropulse.test | producer | Estancia Didáctica Concordia y Estancia Aislada |
| operador@agropulse.test | operator | Concordia |
| asesor@agropulse.test | advisor (solo SELECT) | Concordia |
| aislado@agropulse.test | producer | Solo Estancia Aislada |

Cada usuario nuevo recibe el valor privado de `DEMO_PASSWORD`. El script es repetible para membresías; **no cambia la contraseña de usuarios ya existentes**. La segunda membresía del productor permite demostrar el selector. El aislado no puede leer Concordia. No hay passwords reales en código ni documentación.

Arrancar desde `tp4/infra`:

```sh
docker compose up --build
```

Esperar mensajes `produced soil.moisture`, `consumed soil.moisture` y `upsert reading`. Instrucciones y contratos completos: [infra/README.md](infra/README.md). La app no necesita puertos Kafka públicos. Si Supabase es local, `localhost` dentro del contenedor no es el host: configurar una URL alcanzable desde Docker. Se recomienda el proyecto de clase para simplificar redes.

## 3. Ejecutar la app

Copiar localmente `apps/agropulse/.env.example` a `apps/agropulse/.env`. Completar **solamente URL y anon/publishable key**; jamás service role. Reiniciar Metro si cambian variables.

```sh
cd apps/agropulse
npm i
npm start
```

Stack: Expo ~58, React 19.3, React Native 0.88.1, Expo Router, TypeScript strict. `.npmrc` configura `legacy-peer-deps=true`. No usar `expo install` para resolver arbitrariamente los peers del SDK del curso. Los lockfiles fijan lo resuelto.

Abrir en un cliente Expo compatible con SDK 58 o un development build. La app requiere módulos nativos de mapas, ubicación y SVG; **no se entrega versión web**. En un build Android propio se debe habilitar Maps SDK for Android y configurar una clave de mapas restringida mediante `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`; `app.config.ts` la pasa a la configuración nativa. Esa clave es pública/restringida y no es una clave Supabase. iOS usa mapas Apple por defecto. La compilación nativa y los permisos deben verificarse en la máquina/dispositivo de la defensa.

## 4. Uso rápido

1. Ingresar como productor. Mapa muestra Costa 1 óptimo, Costa 2 seco y Monte A sin datos confiables.
2. Tocar Costa 2. Ver última humedad, antigüedad, gráfico real de 6 h y umbrales. La semilla tiene más de 12 puntos; los ticks se agregan en buckets de cinco minutos para no descargar miles de filas al celular.
3. Elegir válvula → **Regar / abrir / cerrar** → **Abrir por minutos**, 30 → confirmar. La pantalla muestra lote, válvula y UUID antes de enviar.
4. Ver pending y luego applied/failed por Realtime o refresco de respaldo cada 2,5 s. El worker tiene 10 % de fallos `valve_timeout`. Historial permite cancelar pendientes y muestra los últimos veinte por lote.
5. Cuenta permite cambiar establecimiento, ver rol, cola y diagnóstico. El asesor no puede editar ni comandar; también lo impide SQL.
6. Lectura manual: ingresar humedad, nota y GPS opcional. Se guarda primero en AsyncStorage y se reintenta con el mismo UUID al volver la red. En un corte se conserva la cola; no cerrar sesión hasta comprobar la sincronización, aunque la cola queda asociada a su usuario para un próximo ingreso.
7. “Mi ubicación” solicita permiso. Sin permiso/error dice exactamente **“ubicación no disponible”**. Estar fuera de los polígonos ficticios es esperable en un dispositivo real.

## 5. Pruebas y tipos

Desde cada proyecto:

```sh
cd apps/agropulse
npx tsc --noEmit
npx jest
```

```sh
cd infra/worker
npx tsc --noEmit
npx jest
```

Jest app cubre semáforo y límites, antigüedad, validación, pending, GeoJSON, punto-en-polígono, cola e idempotencia, login, 401/403, asesor y confirmación. `render`/`fireEvent` son asíncronos (Testing Library 14). Worker cubre contratos, UTC, evento→fila, cancelación y frontera de fallo del 10 %. TypeScript del worker verifica todos sus archivos JS con `checkJs` y strict.

Estas pruebas **no sustituyen** la validación de políticas contra Postgres ni mediciones en red móvil. El guion de aceptación evita presentar mocks como pruebas de integración. npm informó vulnerabilidades transitivas durante instalación: requieren análisis aparte; no se ejecutó `npm audit fix --force` ni se cambiaron versiones fuera del stack pedido.

## Checklist PRD

**[x] implementado** significa que existe el artefacto, no que fue comprobado físicamente. “Pendiente integración” requiere Supabase/dispositivo. El PRD llama checklist de §17 a sus referencias; esta tabla mapea todos los RF/RNF enumerados realmente en §§6 y 13.

| ID | Implementación | Evidencia / pendiente |
|---|---|---|
| RF-01 | [x] Login/logout y sesión AsyncStorage | Tests login/error; kill/reapertura pendiente dispositivo |
| RF-02 | [x] Membership/RLS y usuario aislado | Políticas SQL; prueba de acceso cruzado pendiente servidor |
| RF-03 | [x] Selector de organización | Cuenta y filtrado de todos los datos; pendiente integración |
| RF-04 | [x] Lista con nombre/cultivo/estado | Tres lotes Concordia + uno aislado en seed |
| RF-05 | [x] Polígonos coloreados, tap a detalle | MapView/Polygon; pendiente dispositivo |
| RF-06 | [x] GPS opcional y punto-en-polígono | Test interior/exterior/borde; permiso pendiente dispositivo |
| RF-07 | [x] Alta/edición GeoJSON | Polygon/Feature, cuatro vértices sin cierre admitidos |
| RF-08 | [x] Estación, humedad/temp/lluvia | Simulador soil + weather, una estación/lote |
| RF-09 | [x] Última lectura/antigüedad/stale | Tests 12 s, 2 h, 15 min exactos y >15 min |
| RF-10 | [x] Gráfico SVG 6 h | Seed >12 puntos, agregación 5 min, pull/Realtime; pendiente integración |
| RF-11 | [x] Umbrales persistentes | SQL defaults/checks y formulario; pendiente servidor |
| RF-12 | [x] Semáforo SQL + TS | Tests secos/límites/óptimo/húmedo/stale |
| RF-13 | [x] Válvulas abiertas/cerradas | Seed y detalle |
| RF-14 | [x] Abrir/cerrar/1–120 min | Confirmación UUID, constraint SQL y tests UI/límites |
| RF-15 | [x] Acuse aplicado/fallido | RPC atómica, Realtime + polling; ≤5 s pendiente medición |
| RF-16 | [x] Un pending por válvula | Índice parcial + UI + test puro; concurrencia pendiente servidor |
| RF-17 | [x] Cancelar pending | RLS por columna, worker revalida bajo lock; carrera pendiente servidor |
| RF-18 | [x] Historial 20 por lote | Fecha, actor UUID, resultado; consulta acotada por lote |
| RF-19 | [x] Alertas dry in-app | Inbox SQL + sugerencia en detalle; pendiente integración |
| RF-20 | [x] Alerta stale diferenciada | Maintenance + semáforo local; esperar 15 min en defensa |
| RF-21 | [x] Manual/nota/GPS/cola/idempotencia | Persistencia por usuario + RPC + tests; corte real pendiente |
| RF-22 | [x] Una regla fija | “Humedad bajo umbral: considerar riego” |
| RF-23 | [x] Diagnóstico | Usuario, establecimiento, tick, lag aparente, cola |
| RF-24 | [x] Logs de worker | produced / consumed / upsert reading; compose pendiente ejecución |
| RNF-01 | [x] Stack solicitado/strict/router | Typecheck y manifests |
| RNF-02 | [x] Anon cliente, service role backend | RLS y plantillas separadas; no auditoría de binario |
| RNF-03 | [ ] Medir mapa inicial <3 s | Consultas acotadas y carga visible implementadas; no medido |
| RNF-04 | [ ] Medir tick ≤3 s desde insert | Realtime + polling 2,5 s implementados; no medido |
| RNF-05 | [x] Manejo de error sin spinner infinito | finally, timeout HTTP 12 s, tests de rechazos 401/403 |
| RNF-06 | [x] Reproducción | Este README, plantillas provistas, compose, seed y usuarios |
| RNF-07 | [x] Offline parcial | Cola persistente de lecturas, no cola de comandos; corte 30 s pendiente dispositivo |
| RNF-08 | [x] Tests unitarios | Semáforo/idempotencia app + contratos worker |
| RNF-09 | [x] Español UI, inglés código/SQL | Roles/payload conservan contratos ingleses |
| RNF-10 | [x] Ética explícita | README, Cuenta, Diagnóstico, mapa y seed |

### Entregables §15

- [x] App en `apps/agropulse/`.
- [x] Migraciones/RLS y semilla en `supabase/`.
- [x] Compose, simulador y worker en `infra/`.
- [x] Informe 4–8 páginas equivalentes en `docs/INFORME.md` (seis secciones paginadas).
- [ ] Video de 3–5 minutos o defensa presencial: pendiente del equipo; guion en `docs/ACEPTACION.md`.
- [x] Checklist RF/RNF honesto, con pendientes de integración identificados.

## Limitaciones deliberadas

No hay hardware, push del SO, campaña completa, comentarios del asesor, ML ni Kafka/MQTT móvil. Alertas son in-app y requieren el worker en marcha. GPS se puede omitir sin bloquear una lectura. GeoJSON admite un solo anillo; no valida topología avanzada/autointersecciones. Un lote creado requiere estación y válvula administrativas para tener telemetría. Las lecturas manuales participan del semáforo como la lectura más reciente. UUID de actor se muestra en historial en lugar de exponer correos entre miembros.

La entrega académica no incluye hardening productivo (TLS/SASL del broker privado, auditoría integral, SLO, cifrado propio de cola, límites de tasa, outbox transaccional dedicado). Los objetivos temporales dependen de red y carga; no son garantías certificadas.

## Verificación adicional del esquema SQL
Las migraciones y el seed se aplicaron sobre un Postgres 16 local (con roles `anon`/`authenticated`/`service_role` y `auth.uid()` simulados) y se comprobó: semáforo `Costa 1 = optimal`, `Costa 2 = dry`, `Monte A = stale`; un usuario de otro establecimiento solo ve sus lotes (RF-02); el asesor no puede insertar comandos (403/RLS); un segundo comando `pending` sobre la misma válvula es rechazado por el índice `one_pending_per_valve` (RF-16). No reemplaza la prueba contra un proyecto Supabase real.
