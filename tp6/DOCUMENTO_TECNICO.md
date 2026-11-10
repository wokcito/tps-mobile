# Network Diagnostics Suite — Documento técnico

## 1. Subset SNMP implementado

Archivo: `NetDiag/src/protocol/snmp/snmp.ts` (codec puro, sin dependencias) y `src/protocol/snmpClient.ts` (UDP/161 con `react-native-udp`).

| Aspecto | Soportado | No soportado |
|---|---|---|
| Versiones | v1 (`version=0`), v2c (`version=1`) | v3 (sin autenticación ni cifrado por usuario) |
| PDUs | `GetRequest` (0xA0) → `GetResponse` (0xA2) | GetNext, GetBulk, Set, Trap, Inform |
| Tipos BER decodificados | INTEGER, OCTET STRING, NULL, OID, Counter32, Gauge32, TimeTicks, Counter64 (como `number`) | IpAddress, Opaque, BITS |
| Excepciones v2c | noSuchObject / noSuchInstance / endOfMibView → `null` | — |
| Errores v1 | `error-status ≠ 0` → `SnmpError` (noSuchName, etc.) | — |

OIDs usados (MIB-II, RFC 1213): `sysDescr 1.3.6.1.2.1.1.1.0`, `sysUpTime ...1.3.0`, `sysName ...1.5.0`, `ifInOctets ...2.2.1.10.<n>`, `ifOutOctets ...2.2.1.16.<n>`.

Decisiones de implementación:
- Longitudes BER en forma corta y larga (hasta 4 bytes); entradas truncadas o malformadas lanzan `SnmpError`, nunca leen fuera del buffer.
- Counter32 se decodifica sin signo (valores > 2³¹ correctos); INTEGER con signo.
- El tráfico se calcula con dos muestras separadas por un intervalo (`trafficRate`), tolerando un wrap de Counter32.
- La respuesta se acepta solo si el `request-id` coincide; hay timeout (2 s) y el socket se cierra siempre.

### Limitaciones de seguridad
SNMP v1/v2c envía la *community string* en **texto plano** y sin integridad: cualquiera en la LAN puede capturarla. Por eso el alcance es solo lectura (sin SET), sobre redes de gestión confiables. En producción se debe migrar a SNMPv3 (authPriv). La community se pide por pantalla y **no se persiste**.

## 2. Manejo de credenciales SSH

- Las contraseñas se guardan **solo** en Android Keystore / iOS Keychain vía `react-native-keychain` (`src/security/credentials.ts`), una entrada por host (`netdiag.ssh.<host>`), con `ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY`.
- Nunca se escriben en WatermelonDB, en el outbox, en logs ni en los PDF. La pantalla vacía el campo contraseña luego de guardarlo.
- Solo se pueden ejecutar comandos de una **allowlist** (`src/diagnostics/commands.ts`); `runDiagnostic` rechaza cualquier otra cadena (incluye intentos de encadenar `; cmd`). Tests: `logic.test.ts`.
- Limitación conocida: `react-native-ssh-sftp` (v1.0.3) está poco mantenida y no verifica claves de host (riesgo de MITM); documentado como deuda. Se recomienda fijar el fingerprint por equipo.

## 3. Diseño de la cola offline (Outbox)

Archivos: `src/sync/outbox.ts` (motor, agnóstico de almacenamiento), `src/storage/database.ts` (store persistente sobre WatermelonDB/SQLite), `src/sync/transport.ts` (HTTP), `src/sync/syncManager.ts` (NetInfo).

1. **Escritura local primero:** generar un reporte guarda la instalación en SQLite y llama a `outbox.enqueue(...)`. Nunca toca la red.
2. **Persistencia:** cada acción es una fila de la tabla `outbox`; sobrevive al cierre de la app.
3. **Disparo:** `NetInfo` detecta la transición offline→online y llama `flush()`; además hay un reintento cada 30 s y un botón manual.
4. **Orden FIFO:** el envío es secuencial. Ante un fallo de red se corta la corrida (no se saltea la acción fallida) para preservar el orden.
5. **Reintentos:** backoff exponencial `2s·2^(n-1)` con tope de 5 min; tras 8 intentos pasa a `failed` y deja de reintentarse.
6. **Idempotencia:** el `id` de la acción viaja al backend, que responde `duplicate` si ya lo procesó (un ack perdido no duplica datos).
7. **Conflictos básicos:** el backend responde `409` con `serverVersion` cuando `baseVersion` es vieja. La acción pasa a `conflict` (no bloquea las siguientes) y queda visible en la pantalla "Cola de sync". Un 4xx distinto de 409 se trata como rechazo permanente. Política: *server-wins con revisión manual*; no hay merge automático.
8. **Sin concurrencia:** dos `flush()` simultáneos comparten la misma ejecución.

## 4. Arquitectura (resumen)

| Capa | Código |
|---|---|
| Discovery | `src/discovery/` — barrido TCP por subred (22/80/443/161; "connection refused" también cuenta como host vivo) + mDNS (`react-native-zeroconf`) |
| Protocol | `src/protocol/` — SNMP propio y SSH |
| Evidence | `src/evidence/location.ts`, `QrScreen` (vision-camera `useCodeScanner`), `react-native-image-picker` |
| Local store | `src/storage/` — WatermelonDB (devices, diagnostics, installations, outbox) |
| Sync | `src/sync/` |
| Reporting | `src/reporting/` — HTML escapado → PDF con foto y GPS |

Limitación de RF-01: desde Android 10 una app no puede leer la tabla ARP ni la MAC de otros equipos; el escaneo es "ARP-like" por conexiones TCP, y la MAC se muestra como `n/d` salvo que se obtenga por otra vía (p. ej. SNMP `ifPhysAddress`, no implementado).

## 5. Verificación realizada

- `npm test` (NetDiag): 32 tests Jest (codec SNMP, outbox, subredes, allowlist, HTML del reporte, tasa de tráfico, esquema).
- `node --test` (backend): 5 tests.
- `npx tsc --noEmit`: sin errores.
- **No verificado:** compilación del APK y ejecución en dispositivo (el entorno de desarrollo no tenía JDK ni Android SDK). Las capas nativas (UDP, TCP, SSH, cámara, GPS, PDF, SQLite) están sin probar en hardware.
