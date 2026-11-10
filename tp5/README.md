# TP5 — Network QoS Monitor

Aplicación **React Native CLI, sin Expo**, con backend de referencia para analizar QoS, guardar recorridos y visualizar cobertura personal. Incluye RF-01 a RF-09 en código, pruebas deterministas y configuración Android/iOS. **No se generó ni se probó un APK/IPA, ni se tomaron datos reales**: eso requiere SDK y dispositivo. No se presentan fixtures de pruebas como mediciones reales.

## Camino rápido

Requisitos de desarrollo JS: Node.js ≥22.11, npm y conectividad para instalar paquetes. Las versiones `react-native 0.88.1` / `react 19.3.0` y el esqueleto nativo siguen al proyecto hermano `tp6/NetDiag`; no se copió su dominio ni `node_modules`.

```bash
# Desde tp5/
cd backend
npm install --legacy-peer-deps
npm test
npm start
# Otra terminal, desde tp5/
cd app
npm install --legacy-peer-deps
npx tsc --noEmit
npx jest --runInBand
npm start
```

1. Dejá el backend accesible desde el teléfono. En **Ajustes**, configurá la URL: `http://10.0.2.2:3000` en el emulador Android, `http://IP_LAN:3000` en teléfono físico, o HTTPS en un despliegue remoto. `localhost` en el teléfono no es tu computadora.
2. Configurá al menos tres destinos TCP distintos como `1.1.1.1:443,8.8.8.8:443,example.com:443`. También podés incluir `IP_LAN:9000`, el servidor echo propio. No se envía tráfico de aplicación a los hosts de ping: se mide establecimiento TCP.
3. Configurá tu clave restringida de Google Maps en el entorno de compilación (ver más abajo). Sin clave válida puede verse una base cartográfica vacía; las pruebas no verifican los tiles.
4. Tocá **Medir ahora**, concedé permisos y recorré **Mapa**, **Historial**, **Filtros** y **Exportar**. Creá **Nueva sesión** para separar recorridos.
5. Background está **desactivado por defecto**. Activarlo consume aproximadamente 2 MB por prueba y batería. El intervalo es una solicitud al sistema operativo, no una garantía de ejecución.

## Estructura y arquitectura por capas

```text
tp5/
├── app/
│   ├── App.tsx, index.js             navegación y entrada Headless JS
│   ├── android/                     proyecto Gradle + Kotlin propio
│   ├── ios/                         proyecto Xcode + Swift/ObjC propio
│   ├── src/
│   │   ├── native/                  telefonía, NetInfo, sockets TCP
│   │   ├── engine/                  sondas puras, orquestación, score/histéresis
│   │   ├── persistence/             contrato Repository, SQLite, memoria, CSV/JSON
│   │   ├── geo/                     GPS y caché
│   │   ├── presentation/            seis pantallas y gráficos SVG
│   │   ├── runtime.ts               composición de dependencias, timeouts y alertas
│   │   ├── background.ts            tarea periódica + finalización segura
│   │   ├── store.ts                 Zustand reactivo
│   │   └── types.ts                 modelo común estricto
│   └── __tests__/                   pruebas sin dispositivo
└── backend/
    ├── src/app.js, src/server.js     HTTP y TCP echo
    ├── test/api.test.js              node:test + supertest
    └── Dockerfile, docker-compose.yml
```

| Capa | Decisión e invariantes |
|---|---|
| Native Bridge | `TelephonyModule.kt` + `TelephonyPackage.kt`, registrado en `MainApplication`. Consulta `TelephonyManager`, `SignalStrength` y celdas registradas. Swift/CoreTelephony con `.m` exportador incluido en las fases Sources de Xcode. El wrapper TS devuelve `null` si falta el módulo o se revoca un permiso. No se inventa señal. |
| Adquisición de red | NetInfo identifica la **conexión activa**. Telefonía completa radio celular y operador, cuando existen. Un WiFi activo no se confunde con la radio del módem. NetInfo actualiza el Dashboard mediante suscripción; cada medición obtiene otro snapshot. |
| Measurement Engine | TypeScript sin dependencias RN. Sondas socket/fetch, reloj, ubicación, repositorio y emisor inyectables. Tres conexiones por host; hosts paralelos y muestras secuenciales por host. El orquestador impide dos ejecuciones simultáneas. |
| Persistence Layer | `Repository` compartido por SQLite y memoria. IDs únicos, sesión existente obligatoria, timestamps UTC en milisegundos, coordenadas opcionales. SQLite tiene índices por red/fecha, sesión y ubicación; consultas parametrizadas. Sesiones y preferencias sobreviven reinicios; no hay datos presembrados. |
| Geo Layer | Geolocation obtiene coordenadas, precisión y timestamp del fix. Caché de 30 segundos. Se conservan mediciones sin GPS con un error explícito, nunca con coordenadas ficticias `(0,0)`. La coordenada `(0,0)` sí es válida si la entrega el proveedor. |
| Presentation Layer | React Navigation Native Stack. Dashboard; mapa Google/Heatmap/markers; historial por sesión con tres gráficos SVG (RTT, bajada, subida); filtros; ajustes; exportación. Toda la UI está en español. |
| Background/alertas | Background Fetch + registro Headless JS Android. Mismo motor/repositorio que en foreground. El callback siempre llama `finish`, una sola vez incluso ante timeout. La histéresis se guarda en SQLite para sobrevivir un reinicio del proceso. Notifee emite sólo al entrar en degradación. |

### Flujo de datos

```text
NetInfo + bridge + GPS → motor async → Repository.save → Zustand → pantallas
                              ↓
                   score + histéresis persistida → Notifee
Repository.query(filtros) → mapa / series / CSV / JSON → Share de RN
```

No hay sincronización remota del historial: el backend sólo recibe payloads de throughput, **no** coordenadas ni operador. No hay autenticación porque es un backend de laboratorio; no lo expongas a Internet sin controles adicionales.

## Metodología de medición

### RF-02: RTT TCP, jitter y pérdida

- **RTT observado**: milisegundos entre crear la conexión y recibir el callback `connect`, usando `performance.now()` monotónico. Incluye resolución DNS si se usa un nombre y establecimiento TCP; no es ICMP ni un RTT de eco de aplicación. No se necesita privilegio raw socket.
- Cada host tiene tres intentos y timeout de **3 segundos por intento**. Errores/cierre prematuro/timeout cuentan como muestra fallida (`null`); abortar cancela la medición y **no** la guarda como pérdida.
- Se calculan mínimo/promedio/máximo sobre muestras exitosas. Con ninguna respuesta son `null`, no cero. Una respuesta tiene jitter cero.
- **Jitter = media aritmética de `|RTTᵢ − RTTᵢ₋₁|` entre respuestas sucesivas válidas**. Se omiten las muestras perdidas para este cálculo. Ejemplo `[10, 30, null, 20]`: mín 10, prom 20, máx 30, jitter 15 ms, pérdida 25 %.
- **Pérdida = intentos fallidos / intentos totales × 100**. Es una estimación de pérdida/indisponibilidad de las sondas TCP, **no** una medida directa de pérdida IP: TCP puede retransmitir y el destino puede rechazar conexiones.
- RFC 3550 inspira la variación entre observaciones consecutivas. Su estimador RTP de jitter suavizado `J += (|D| − J)/16` **no es** la media requerida aquí; no se afirma equivalencia con RTP. RFC 2544 es referencia conceptual de repetibilidad y control del tamaño, no se declara conformidad con un benchmark de laboratorio de equipos.

### RF-03: throughput corregido por bytes

1. GET `/download?bytes=1000000`; consumir por completo el `ArrayBuffer`.
2. Contar **los bytes reales del buffer**, no el tamaño pedido ni caracteres JS.
3. POST `/upload` con `Uint8Array(1000000)`, `application/octet-stream`.
4. Validar que el backend confirme exactamente los bytes enviados. Un conteo distinto es error, no una velocidad válida.
5. `Mbps = bytes × 8 / (tiempo_cliente_ms × 1000)`, unidades decimales. Ejemplo: 1.000.000 bytes en 1.000 ms = 8 Mbps.

Descarga y subida son secuenciales; cada duración incluye transferencia y respuesta completa. En subida se incluye el pequeño recibo JSON; `serverMs` es diagnóstico y **no** reemplaza el tiempo de cliente. Respuestas HTTP fallidas, descargas vacías o duraciones no medibles no se convierten en velocidades ficticias. El servidor y cliente deshabilitan cache; el backend no comprime el payload. La sonda de throughput tiene presupuesto total de 20 segundos, el ciclo completo 60 segundos, y los sockets se destruyen al terminar/cancelar. GPS espera como máximo 8 segundos. No se usan bucles de espera ni APIs síncronas de red en el hilo JS.

Esto estima throughput HTTP de extremo a extremo, no capacidad física del enlace: influyen señal, congestión, DNS, handshake, tamaño de payload, TLS, CPU del servidor, VPN y ahorro de energía. Un único payload de 1 MB puede ser demasiado pequeño para saturar redes muy rápidas. Se mantiene fijo para comparabilidad y consumo acotado; el motor permite otros tamaños hasta 16 MiB. No se resta overhead IP/TCP de bytes de aplicación ni se usa longitud UTF-16 como bytes.

### RF-04/05: GPS y score del mapa

Timestamp de medición: inicio del ciclo. El fix GPS conserva su propio timestamp y precisión. GPS ausente impide representar ese punto en el mapa pero no borrar la medición del historial.

`qualityScore(signalDbm, rttMs, downloadMbps)` normaliza y limita a `[0,1]`:

| Dimensión | Normalización | Peso |
|---|---|---|
| Señal | `clamp((dBm + 120) / 70)`; −120 malo, −50 bueno | 0,30 |
| RTT | `clamp(1 − ms / 300)`; 300 malo, 0 bueno | 0,40 |
| Descarga | `clamp(Mbps / 50)`; 0 malo, 50 bueno | 0,30 |

Se toma la media ponderada **sólo entre dimensiones disponibles** y se renormalizan sus pesos. Sin ninguna dimensión devuelve `null`. Con −85 dBm, 150 ms y 25 Mbps devuelve exactamente 0,5. El RTT de una medición es la media de los promedios disponibles por host. Son umbrales heurísticos configurados para este TP, no un MOS estandarizado. El score celular y WiFi no es estrictamente comparable cuando falta señal; para un estudio real se deben estratificar redes y dimensiones.

El Heatmap recibe `weight = score`, colores rojo/amarillo/verde y puntos con ubicación. **La librería acumula densidades y normaliza el calor por vista**, por lo que el color no debe leerse como valor absoluto del score; una zona con puntos densos puede parecer más intensa. Peso cero no aporta calor; el marcador sigue visible. Los marcadores conservan red, hora, RTT, descarga y sesión. Puntos sin métricas tienen marcador pero no contribuyen al calor. Los filtros comunes permiten comparar recorridos sin borrar datos.

### RF-07: degradación con histéresis

- Estado inicial: normal.
- Normal → degradado si `score ≤ low` (por defecto 0,30): **una notificación**.
- Degradado se mantiene mientras `score < recovery` (por defecto 0,50), sin repetir avisos.
- `score ≥ recovery` rearma el detector. `null` conserva el estado y no avisa.
- Validación: `0 ≤ low < recovery ≤ 1`.
- Estado guardado en SQLite tras cada evaluación. Si las notificaciones están denegadas, la medición se conserva; el estado sigue inhibiendo spam. No se promete entrega exactamente una vez si el proceso muere entre mostrar la notificación y persistir el estado.

## Persistencia, sesiones, filtros y exportación

- La primera apertura crea una sesión; **Nueva sesión** crea otra. Background usa la sesión más reciente. El historial permite elegir sesión y grafica sólo sus mediciones dentro de los filtros vigentes.
- RF-09 combina por AND tipo de red, fecha inicial/final inclusivas y bounding box geográfica. Entradas UTC `AAAA-MM-DD` o ISO `AAAA-MM-DDTHH:mm:ssZ` (también milisegundos). Una fecha sin hora es medianoche UTC, no fin de día. Se rechazan fechas imposibles y rangos invertidos.
- Zona = `sur,oeste,norte,este`, latitud ±90 y longitud ±180. `oeste > este` cruza el antimeridiano. Sin GPS, una medición queda fuera de un filtro geográfico.
- SQLite utiliza placeholders, no concatena valores proporcionados por el usuario. Las filas se ordenan por timestamp e ID. Consultas del repositorio también admiten `sessionId`.
- RF-08 comparte texto mediante **Share de React Native**, sin dependencias de archivos ni permisos de almacenamiento. La app receptora puede copiarlo, enviarlo o guardarlo como `.csv`/`.json`; no se afirma que se adjunte un archivo automáticamente.
- CSV: encabezado fijo, CRLF entre filas, escape doble de comillas y campos entrecomillados ante comas/saltos/comillas. Campos ausentes vacíos. Una fila por medición con RTT agregado. JSON preserva todas las muestras por host, coordenadas, precisión, sesión y errores. El menú usa los filtros vigentes; para todo el historial primero limpiá filtros.
- Los datos permanecen en el sandbox local. Desinstalar borra la base. No hay cifrado extra ni política automática de retención; coordenadas/exportaciones son sensibles y requieren manejo responsable.

## Backend de referencia

```bash
cd tp5/backend
npm install --legacy-peer-deps
npm test
npm start
# Verificar en otra terminal:
curl -i http://localhost:3000/health
curl -i http://localhost:3000/ping
curl -sS 'http://localhost:3000/download?bytes=64' | wc -c
# 64
curl -sS -H 'Content-Type: application/octet-stream' --data-binary 'á☀' http://localhost:3000/upload
# {"bytes":5,"serverMs":...}
```

| Endpoint / parámetro | Contrato |
|---|---|
| GET `/health`, `/ping` | 200 `{"ok":true}`, `Cache-Control: no-store` |
| GET `/download?bytes=N` | N bytes ASCII `a` de tipo octet-stream, `Content-Length` exacto, sin cache. Cero es válido. Falta/parámetro repetido/negativo/fraccionario/notación exponencial/no numérico → 400 `{"error":"bytes debe ser un entero no negativo"}`. Sobre el límite → 413 `{"error":"Payload demasiado grande"}`. |
| POST `/upload` | Consume stream sin acumular el cuerpo, cuenta bytes (también binarios y UTF-8), responde `{"bytes":N,"serverMs":...}`. Vacío permitido. Sobre el límite → 413, sin respuesta de éxito posterior. Tiempo de servidor desde recibir la petición hasta terminar el cuerpo. |
| `PORT` | 3000 por defecto, escucha en 0.0.0.0 |
| `MAX_BYTES` | 16777216 por defecto (16 MiB), configurable de 1 a 256 MiB |
| `TCP_PORT` | Echo TCP byte por byte, puerto 9000; `0` lo desactiva. Conexiones ociosas cierran a los 10 s. |

El TCP echo es opcional. El motor actual mide **handshake** y sólo necesita que el puerto acepte conexiones; no espera el echo ni envía un mensaje. `/ping` sirve para comprobar HTTP, no reemplaza las tres sondas TCP.

### Docker

```bash
cd tp5/backend
docker compose up --build
# HTTP localhost:3000; TCP localhost:9000
```

Imagen Node 22 Alpine, instalación reproducible mediante lockfile y usuario no root. El compose limita por configuración el tamaño del payload. El servicio no implementa autenticación, rate limiting ni TLS: para acceso público agregá proxy HTTPS, cuotas/concurrencia y controles de acceso. Los downloads reservan N bytes por petición y no deben exponerse sin controles de recursos. No se ejecutó Docker en esta entrega.

## Build nativo (pendiente de verificar)

### Android

Necesitás **JDK 17 o versión compatible con el Gradle/AGP de RN 0.88.1**, Android SDK, NDK y herramientas de la plantilla. `android/build.gradle` conserva las versiones del hermano: compileSdk 37, build-tools 37.0.0, targetSdk 36, NDK 27.1.12297006. Instalá esas plataformas/herramientas con Android Studio o ajustalas de forma compatible. Configurá `ANDROID_HOME`, `JAVA_HOME`, PATH y/o `android/local.properties` en tu máquina. No se incluye configuración personal ni keystore privado.

Google Maps Android requiere habilitar Maps SDK y clave restringida por applicationId `ar.edu.netqos` y certificado. Pasala como propiedad Gradle; no la confirmes en Git. La identidad del componente RN es `NetQosMonitor`.

```bash
cd tp5/app
npm install --legacy-peer-deps
npm start
# En otra terminal:
npm run android
# Alternativa, construcción del APK:
cd android
./gradlew assembleDebug -PMAPS_API_KEY="$MAPS_API_KEY"
# app/build/outputs/apk/debug/app-debug.apk
./gradlew assembleRelease -PMAPS_API_KEY="$MAPS_API_KEY"
# app/build/outputs/apk/release/app-release-unsigned.apk
```

La variante debug usa la firma local que genera AGP. Release está deliberadamente **sin firma de distribución**: para instalar/distribuir configurá firma propia fuera del repositorio o usá `apksigner` con tu keystore privado. No se incluye contraseña, certificado o clave privada de producción. `npm run android` necesita que el entorno Gradle reciba la propiedad de Maps (por ejemplo `ORG_GRADLE_PROJECT_MAPS_API_KEY` o configuración de usuario local). El debug requiere Metro; release empaqueta JS.

### iOS

Necesitás macOS, Xcode, CocoaPods y firma para dispositivo. La app usa Google Maps también en iOS para soportar Heatmap. El Podfile agrega `react-native-maps/Google`; definí `MAPS_API_KEY` en los Build Settings locales de Xcode (Info.plist lo sustituye), con Maps SDK for iOS habilitado y bundle `ar.edu.netqos` restringido. La clave no está en el repositorio.

```bash
cd tp5/app
npm install --legacy-peer-deps
cd ios
pod install
# Abrí NetQosMonitor.xcworkspace en Xcode; seleccioná tu Team y ejecutá.
```

El bridge Swift + ObjC está incluido en el proyecto Xcode. `AppDelegate` inicializa Google Maps y registra Background Fetch; `SceneDelegate` inicia React Native. No se instalaron Pods ni se compiló iOS en este entorno. Un simulador no sustituye pruebas celulares/GPS reales.

## Permisos y límites de plataforma

| Plataforma | Comportamiento |
|---|---|
| Android | Manifest declara INTERNET, ACCESS_NETWORK_STATE, FINE/COARSE/BACKGROUND_LOCATION, READ_PHONE_STATE, POST_NOTIFICATIONS, FOREGROUND_SERVICE. Antes de medir se piden ubicación y estado de teléfono; negar telefonía mantiene null. Ubicación aproximada puede impedir CellInfo aunque permita GPS aproximado. Notifee solicita notificaciones al activar background. |
| Android 10+ | La ubicación en segundo plano requiere autorización separada. Android 11+ suele exigir elegir **Permitir siempre** en la configuración del sistema; el botón de Ajustes abre esa pantalla. No se pide ubicación always junto con foreground ni se fuerza un diálogo inválido. Doze, batería y políticas del fabricante retrasan o impiden muestreos. Se usa job/fetch, no un servicio de ubicación continua. |
| Android cerrado | `enableHeadless`, `startOnBoot` y `stopOnTerminate:false` permiten tareas después de terminar la UI cuando el SO lo permite. **Forzar detención** desde Ajustes bloquea tareas hasta volver a abrir. No se garantiza periodicidad exacta. |
| iOS | CoreTelephony sólo permite operador/radio y puede devolver datos genéricos o nada, especialmente iOS 16+. **RSSI es null**: no hay API pública admitida para ello. Multi-SIM y 5G NSA pueden informar radio diferente de la red efectiva. No se usan APIs privadas. |
| iOS background | Info.plist declara ubicación when-in-use/always, red local, modos fetch/processing/location y `com.transistorsoft.fetch`. Se solicita autorización always al habilitar muestreo. Background App Refresh debe estar activo. iOS puede tardar días en programar fetch y no lo ejecuta tras cierre forzado. No se puede prometer muestreo con app terminada en iOS. |
| HTTP de laboratorio | Android permite cleartext y ATS iOS permite cargas arbitrarias para backend LAN. **Para distribución usá HTTPS y deshabilitá esas excepciones**. No se intercepta ni modifica tráfico ajeno. |

WiFi, Ethernet y dispositivos sin SIM pueden no tener operador ni señal celular. El módulo Android consulta valores cacheados del sistema, no fuerza un escaneo de radio. La identificación NR depende de lo que expongan operador/dispositivo. No se garantiza exactitud en dual-SIM. Google Maps necesita una clave propia (la ausencia no es un secreto omitido por accidente).

## Verificación reproducible sin dispositivo

```bash
cd tp5/app
npx tsc --noEmit
npx jest --runInBand
cd ../backend
npm test
```

- Tests puros: valores exactos min/avg/max/jitter/pérdida, hosts inyectados, bytes reales y conversión Mbps, errores HTTP, cancelación, score, histéresis, CSV exacto con comas/comillas/saltos, JSON, filtros inclusive/antimeridiano y rechazo sin mutaciones.
- Integración del motor: snapshot completo guardado y emitido exactamente una vez, fallos parciales GPS/backend, cancelación sin filas nuevas.
- Repositorios: memoria y **SQL de producción con SQLite real en memoria** vía `node:sqlite` (Node 22 reciente/24). Se simula únicamente el driver RN para no necesitar dispositivo. No verifica el enlace nativo del paquete SQLite. Base en memoria, sin archivos temporales.
- Componentes: seis pantallas con mocks nativos (mapa, SVG, geolocalización, Notifee); Dashboard, series por sesión, filtros sin query ante error, Share exacto y validación de ajustes.
- Adapters/background: bridge ausente/permisos revocados, timeout/cancelación liberan sockets/timers; Headless, desactivación y finalización exactamente una vez incluso al expirar.
- Backend: endpoints, bytes exactos/límites, parámetros inválidos, UTF-8 y binarios, rechazo de exceso y solicitud posterior intacta.

Se observó RED antes de implementación por módulos faltantes (no fue un pase de pruebas funcionales); luego GREEN de los casos de dominio. Adicionalmente se observó **RED de comportamiento** en background: el timeout llamaba `finish` dos veces; se corrigió y el test ahora exige exactamente una llamada. No había comandos anteriores en `tp5/` para comparar diferencialmente: todo el código de app/backend es nuevo y se preservó el PDF.

Resultados observados y alcance exacto se registran en [`VERIFICATION.md`](VERIFICATION.md). Typecheck y mocks **no certifican** compatibilidad binaria de módulos nativos con RN 0.88.1 ni renderizado real del mapa, permisos, GPS, telefonía o ejecución del SO.

## Checklist RF y entregables

**“Implementado” significa código + verificaciones locales indicadas, no validación en dispositivo.**

| Requisito | Estado | Evidencia / pendiente nativo |
|---|---|---|
| RF-01 red/operador | Implementado | NetInfo + Kotlin/Swift + Dashboard; bridge seguro probado. Falta dispositivo con SIM y permisos. |
| RF-02 ≥3 hosts, RTT/jitter | Implementado | Ajustes valida 3–10 destinos distintos; TCP con timeout; estadísticas exactas en Jest. Falta comparar en red real. |
| RF-03 descarga/subida Mbps | Implementado | Motor inyectable + backend; pruebas de bytes y HTTP local con curl. Falta medir desde teléfono. |
| RF-04 timestamp/GPS | Implementado con ausencia explícita | Modelo, cache GPS y persistencia. Falta conceder permisos y registrar fixes reales. |
| RF-05 mapa/heatmap | Implementado | Google Maps, pesos 0–1, markers y filtros; props comprobados con mocks. Falta clave propia/renderizado y recorridos reales. |
| RF-06 series por sesión | Implementado | Selector de sesiones + SVG con eje temporal y latencia/bajada/subida; vacíos/gaps explícitos. Falta revisar UX en pantalla física. |
| RF-07 background/alertas | Implementado, sujeto al SO | Headless registrado, configuración, cancelación, Notifee, histéresis persistida. Falta Doze/lock/reinicio/segundo plano y notificaciones reales. |
| RF-08 CSV/JSON | Implementado | Funciones puras + Share; escape exacto y menú mockeado probados. Falta comprobar app receptora en dispositivo. |
| RF-09 filtros red/fecha/zona | Implementado | Queries SQLite parametrizadas y memoria, validación de fechas/bbox/antimeridiano, aplicados a mapa/historial/exportar. |

| Entregable | Estado honesto |
|---|---|
| Código completo | Incluido en `tp5/app` y `tp5/backend`, con lockfiles. Sin commits por instrucción expresa; el historial significativo deberá gestionarse aparte. |
| Documento técnico | Este README, metodología, límites, build y guía de demo. |
| Backend desplegable | Código, Dockerfile, compose y tests; HTTP local comprobado. Docker no ejecutado. |
| APK/IPA | **Pendiente**, no hay JDK/SDK/dispositivo en este entorno. |
| Video 3–5 min con ≥2 sesiones reales | **Pendiente**, guion debajo; no se simulan mediciones reales. |

## Guion del video demo (4 minutos)

1. **0:00–0:35 — Contexto y detección.** Mostrar versión instalada, permisos y Dashboard con WiFi; desactivar WiFi y mostrar LTE/NR/operador cuando el dispositivo lo permita. Explicar RSSI nulo en iOS.
2. **0:35–1:25 — Medición.** Mostrar URL del backend y ≥3 hosts. Ejecutar “Medir ahora”, mostrar RTT min/prom/máx/jitter/pérdida y Mbps de subida/bajada; explicar RTT TCP versus ICMP y costo en datos.
3. **1:25–2:20 — Dos sesiones reales.** Mostrar primer recorrido ya capturado, crear/seleccionar segundo recorrido y capturar en otra zona. Mostrar Heatmap, marcadores y filtros por red/fecha/zona. No atribuir a datos reales fixtures ni mediciones inventadas.
4. **2:20–2:55 — Historial.** Cambiar entre ambas sesiones, mostrar series de latencia y throughput y un punto con GPS/precisión.
5. **2:55–3:35 — Background y alertas.** Mostrar configuración y umbrales, bloquear/enviar a segundo plano; incluir segmento de captura real posterior (el SO puede tardar ≥15 min). Mostrar notificación si efectivamente ocurrió degradación, sin fingir un evento. Si no ocurre, explicar el estado y evidenciar el test de histéresis por separado.
6. **3:35–4:00 — Exportación y límites.** Compartir CSV/JSON, mostrar contenido guardado con dos sesiones. Cerrar con límites iOS/Android y mención de las pruebas automatizadas.

## Pendiente de tu lado

- [ ] Instalar JDK compatible + Android SDK/NDK y compilar **APK debug/release**; configurar firma de release propia si vas a distribuir. No se hizo aquí.
- [ ] Configurar clave de Google Maps restringida y, para iOS, Pods/Xcode/Team; verificar ambos bridges y autolinking con RN 0.88.1.
- [ ] Probar en **dispositivo real**: SIM, radio/operador/señal, permisos concedidos/denegados/revocados, GPS aproximado/preciso, mapas y exportación.
- [ ] Medir con **datos reales en al menos dos sesiones**, zonas y tipos de conexión; confirmar latencia/throughput contra el backend y conservar exportaciones.
- [ ] Probar background con pantalla bloqueada, proceso terminado, reinicio, batería/Doze; registrar las restricciones reales del modelo de teléfono. No forzar una promesa que el SO no puede cumplir.
- [ ] Verificar notificaciones, histéresis entre reinicios y recuperación; comparar datos en el historial.
- [ ] Grabar el **video demo de 3–5 minutos** con esas evidencias, no con mocks.
- [ ] Ejecutar Docker si se usará el contenedor; usar HTTPS/controles de acceso si se publica el backend y revisar avisos de dependencias.

## Referencias

- Enunciado íntegro: [`TP5 Network_QoS_Monitor.pdf`](TP5%20Network_QoS_Monitor.pdf).
- [React Native: Native Modules](https://reactnative.dev/docs/legacy/native-modules-intro).
- [Android TelephonyManager](https://developer.android.com/reference/android/telephony/TelephonyManager) y [permisos de ubicación background](https://developer.android.com/develop/sensors-and-location/location/permissions/background).
- [Apple CoreTelephony](https://developer.apple.com/documentation/coretelephony).
- [RFC 2544](https://www.rfc-editor.org/rfc/rfc2544), [RFC 3550 §6.4.1](https://www.rfc-editor.org/rfc/rfc3550#section-6.4.1).
- [Background Fetch](https://github.com/transistorsoft/react-native-background-fetch), [React Native Maps](https://github.com/react-native-maps/react-native-maps).
