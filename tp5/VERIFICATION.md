# Evidencia de verificación — TP5

Verificación realizada en Node.js **v24.22.1**, sin JDK/Android SDK, Xcode ni dispositivo. Todos los archivos creados están bajo `tp5/`. El PDF original se preservó. Se leyó íntegra su extracción `/tmp/spec/tp5.txt`.

## Resultados finales observados

### Aplicación

Directorio: `tp5/app`.

```text
$ npx tsc --noEmit
(sin salida)
exit code: 0

$ npx jest --runInBand
PASS __tests__/components.test.tsx
PASS __tests__/background.test.ts
PASS __tests__/core.test.ts
PASS __tests__/native.test.ts
PASS __tests__/sqlite.test.ts
PASS __tests__/orchestrator.test.ts
PASS __tests__/settings.test.ts

Test Suites: 7 passed, 7 total
Tests:       24 passed, 24 total
Snapshots:   0 total
Time:        1.078 s, estimated 2 s
Ran all test suites.
exit code: 0
```

### Backend

Directorio: `tp5/backend`. Usa JavaScript ESM (no tiene paso de TypeScript/Jest).

```text
$ npm test
> net-qos-backend@1.0.0 test
> node --test

✔ health y ping existentes responden JSON sin cache (26.776216ms)
✔ download exacto, cero y límite inclusive (4.997998ms)
✔ bytes inválidos 400, límite excedido 413, siguiente solicitud intacta (12.024101ms)
✔ upload cuenta bytes binarios, UTF8, vacío y rechaza exceso (9.241415ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 222.559059
exit code: 0
```

### HTTP real con curl

Se inició `node src/server.js` como proceso local con `PORT=31375`, `TCP_PORT=0`, se esperó su arranque y se ejecutaron estas solicitudes con `curl` (un controlador foreground comprobó la salida y terminó el servidor con SIGTERM en `finally`; no quedó servidor ni archivo temporal):

```text
curl --fail --silent --show-error --write-out '\nHTTP %{http_code} bytes=%{size_download}' 'http://127.0.0.1:31375/download?bytes=64'

aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
HTTP 200 bytes=64

curl --fail --silent --show-error -H 'Content-Type: application/octet-stream' --data-binary 'á☀' http://127.0.0.1:31375/upload

{"bytes":5,"serverMs":0.357578999999987}
```

Se verificó con aserciones que el cuerpo de descarga tiene exactamente 64 bytes y el recibo de subida informa exactamente 5 bytes. Estas velocidades/tiempos de loopback **no** representan QoS móvil.

## Evidencia RED → GREEN y correcciones

1. Las pruebas del dominio se escribieron antes de `probes`, `quality`, repositorios y exportadores. RED observado por `Cannot find module '../src/engine/probes'`; no había implementación todavía. Tras implementarlos: 8 tests pasaron. Esto es RED de construcción de un módulo nuevo, no un fallo funcional aislado.
2. Las pruebas del orquestador y validación de formularios se agregaron antes de sus módulos. RED por módulos ausentes; luego 12 tests pasaron en total.
3. Backend: pruebas anteriores a `src/app.js`, RED `ERR_MODULE_NOT_FOUND`; luego 4 tests funcionales pasaron.
4. **RED de comportamiento**: el test de timeout background esperaba una única finalización. Observado: `Expected number of calls: 1 / Received number of calls: 2`. Se centralizó la finalización con estado idempotente por tarea; GREEN enfocado: 3/3 tests background. La suite final conserva esa regresión.
5. Al configurar el runner se eliminó un mock de una ruta interna de Animated que RN 0.88 ya no publica. También se corrigieron declaraciones del reloj monotónico/tipado fetch y del recibo Share según los tipos de RN, y la normalización de espacios del extractor de texto del test de componentes. Los resultados anteriores fallidos no se presentan como validaciones finales.

No había código previo de app/backend en `tp5/` ni comandos existentes que comparar diferencialmente. Las pruebas de preservación cubren vacío/sin respuesta, errores y solicitud posterior, falta de GPS, exportación vacía y limpieza de filtros.

## Instalación

- `npm install --legacy-peer-deps` en app: 650 paquetes agregados; audit informó **9 vulnerabilidades de severidad baja**, además de avisos de deprecación `inflight`/`glob` transitivos. No se ejecutó `npm audit fix --force` ni se cambiaron versiones exigidas para ocultarlos.
- Backend: 85 paquetes agregados; **0 vulnerabilidades** informadas por esa instalación.
- Caché de instalación bajo `node_modules/.cache/npm`, dentro del directorio permitido e ignorado por Git. No se incluyeron `node_modules` en los entregables.

## Qué NO acredita esta verificación

- No se ejecutó Gradle ni se generó APK/AAB, debug o release.
- No se ejecutó CocoaPods/Xcode ni se generó IPA.
- No se probó compatibilidad binaria/autolinking real de módulos nativos con RN 0.88.1.
- No se probaron permisos, llamadas a TelephonyManager/CoreTelephony, GPS real, tiles/Heatmap de Google Maps, Share o Notifee en un teléfono.
- SQLite usa el SQL real con un driver en memoria en tests; no se verificó el binding nativo Android/iOS.
- No se observó background real, Doze, pantalla bloqueada, arranque después de reinicio ni tareas tras terminar la UI. Las garantías de iOS/Android dependen del SO.
- No se ejecutó Docker ni se verificó el servidor TCP echo en una red real.
- No hay mediciones reales ni video. Ver el checklist y guion en [README.md](README.md).
