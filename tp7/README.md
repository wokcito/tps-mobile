# TP7 · Satellite Tracker

Aplicación React Native/Expo con **propagación SGP4 local**, mapa, predicción de pases y arquitectura de proveedores intercambiables. Incluye proxy sin dependencias, tests deterministas y validación **real** de ISS contra Where the ISS at?. No se generó APK/TestFlight ni se simularon pruebas de dispositivo o resultados de N2YO.

## Arranque rápido

### App: Metro y dev client

Requisitos: Node 24 (también para ejecutar el script de validación que importa TypeScript), npm y un dev client compatible con Expo SDK 58. Stack: Expo ~58, React 19.3.0, React Native 0.88.1, TypeScript strict, expo-router 58. `package-lock.json` fija las versiones resueltas; satellite.js instalado **6.0.2**, con soporte OMM `json2satrec` verificado.

```bash
cd tp7/app
npm i
npm start
```

`.npmrc` contiene `legacy-peer-deps=true`; no hace falta `npx expo install`. `npm start` ejecuta `expo start --dev-client`; abrir el enlace/QR desde el dev client en la misma red. No confundir un dev client con Expo Go: notificaciones/background y configuración del mapa requieren un binario nativo adecuado.

Para crear ese binario en una máquina preparada (estos comandos **no se ejecutaron aquí**):

```bash
# En app/, Android Studio/JDK/SDK configurados:
npx expo run:android
# O en macOS con Xcode:
npx expo run:ios
```

Después, usar Metro con `npm start`. Los directorios nativos generados quedan dentro de app/ e ignorados. No se requieren credenciales de Space-Track/N2YO para catálogo, propagación y validación de ISS.

**Mapa Android:** react-native-maps utiliza Google Maps SDK. Configurar la clave pública **restringida por paquete y firma** antes de construir el dev client:

```bash
EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY='<clave-restringida-del-SDK>' npm start
```

La misma variable debe estar en el entorno al ejecutar `npx expo run:android` para que el plugin la integre en el manifest. No basta con reiniciar Metro si cambió el manifest: reconstruir. Sin clave la pantalla muestra advertencia y lat/lon/alt textual, no inicializa un mapa que pueda fallar. **iOS usa Apple Maps y no necesita esa clave.** No se dispone de una clave real aquí.

### Backend opcional (para N2YO y Space-Track)

```bash
cd tp7/backend
npm start
```

Node 22+ para el servidor (Node 24 usado en tests); no necesita `npm install`. Escucha en puerto 3000. Inyectar secretos desde el entorno seguro del proceso; nunca agregarlos al repositorio. En otro terminal:

```bash
cd tp7/app
EXPO_PUBLIC_PROXY_URL=http://192.168.1.100:3000 npm start
```

Reemplazar por la IP LAN de la máquina. En teléfono, `localhost` es el propio teléfono, no la computadora. También se puede configurar URL en **Ajustes** sin recompilar. Para despliegue usar HTTPS; las políticas de HTTP local pueden requerir configuración nativa de desarrollo. Ver [backend/README.md](backend/README.md) para Docker y endpoints.

## Variables de entorno

Se intentó crear `.env.example` en app/backend, pero la herramienta de seguridad bloqueó esas rutas. Se aplica la alternativa solicitada: **nombres y placeholders aquí**, sin insistir ni incluir secretos reales.

| Variable | Dónde | Placeholder/uso |
|---|---|---|
| `EXPO_PUBLIC_PROXY_URL` | App / Metro | `http://192.168.1.100:3000`; opcional, también en Ajustes |
| `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY` | App / build Android + Metro | Clave restringida de Google Maps SDK; opcional para iOS |
| `PORT` | Solo backend | `3000` |
| `SPACETRACK_IDENTITY` | Solo backend | `<email-de-tu-cuenta>` |
| `SPACETRACK_PASSWORD` | Solo backend | `<password-de-tu-cuenta>` |
| `N2YO_API_KEY` | Solo backend | `<tu-api-key>` |

**Nunca** poner contraseña de Space-Track ni key de N2YO en variables EXPO_PUBLIC_: entrarían al bundle. La clave de Google Maps SDK es un identificador público de cliente restringido, no un sustituto de secretos de servidor. El proxy no recibe secretos desde la app.

## Uso

1. **Catálogo:** elegir ISS/estaciones, Starlink, GPS, meteorológicos, activos o GEO; buscar por nombre/NORAD. Se puede abrir un NORAD fuera de la lista filtrada.
2. **Mapa:** posición SGP4 cada 2 s, marcador interpolado, ground track pasado/cian y futuro/dorado (una órbita a cada lado), cobertura verde según elevación mínima. Activar Starlink con límite configurable.
3. **Pases:** detalle de altitud, velocidad, período, az/el y ventanas AOS/TCA/LOS para la ubicación del observador. Pedir un aviso N minutos antes; se solicita permiso del sistema.
4. **Cielo:** sky chart del pase elegido, anillos de elevación y puntos cardinales; posición actual dorada si está sobre el horizonte.
5. **Brújula:** flecha y giro/elevación relativos. Sin sensores, usar azimut/elevación manualmente. Norte magnético, sin declinación.
6. **Validar:** WTIA solo ISS; N2YO para cualquier satélite a través del proxy configurado. El cálculo se sincroniza con el timestamp de la fuente.
7. **Ajustes:** elevación 0–89°, aviso 0–120 min, TTL 12–24 h, horizonte 1–10 días, Starlink 1–300 objetos, observador manual y URL pública del proxy.

GPS denegado/error → ubicación manual, Concordia por defecto. La visibilidad es **geométrica**, no garantía de pase óptico iluminado. Loading, listas vacías, errores de red y caché antigua se muestran explícitamente. La edad visible es desde la época de los elementos, no desde su descarga. Sin red, los datos previamente obtenidos siguen disponibles; el primer arranque sin datos no usa un fixture como falsa posición en vivo.

## Verificación reproducible

```bash
cd tp7/app
npx tsc --noEmit
npx jest
# Medición externa real (requiere red; guarda tp7/docs/validation-real.json):
node scripts/validate-iss.mjs

cd ../backend
npm test
```

Las pruebas no necesitan credenciales ni dispositivo y no consultan APIs reales. Jest prueba fixtures OMM/TLE reales, invariantes físicos, cortes de trayectoria, cobertura polar/antimeridiano, refinamiento de pases, planificación, TTL, backoff, cuotas y fallback. Incluye una prueba de presentación con `await render` / `await fireEvent`. Node:test prueba proxy, login/cookie simulados, parsing de N2YO y cuotas. Evidencia RED inicial: suites fallaron al faltar los módulos; también se observó RED de cuota propia del proxy (121.ª solicitud respondía 200 en vez de 429), luego se implementó y pasó. Proyecto nuevo: no había comandos previos con los que hacer una comparación diferencial histórica.

Resultados de la ejecución de entrega se reportan en el mensaje final. La instalación advirtió **22 vulnerabilidades (1 low, 21 moderate)** del árbol de dependencias. No se aplicó `audit fix --force` ni se alteraron versiones del stack solicitado para ocultar la advertencia.

## Validación externa observada

Las dos APIs públicas respondieron HTTP 200 a las pruebas iniciales con curl. La ejecución definitiva del script se archivó en [docs/validation-real.json](docs/validation-real.json), importando el mismo motor que la app.

| Referencia | Fecha/hora UTC | Edad OMM | Error combinado |
|---|---|---|---|
| Where the ISS at? / ISS | 10/11/2026 01:15:05 | 14,079508 h | 9,511136 km |
| Where the ISS at? / ISS | 10/11/2026 01:15:07 | 14,080064 h | 9,510983 km |
| Where the ISS at? / ISS | 10/11/2026 01:15:09 | 14,080619 h | 9,510829 km |
| N2YO | — | — | **PENDIENTE: API key** |

Es una discrepancia real de aproximadamente **9,51 km**, no precisión subkilométrica. No se ajustaron parámetros para aparentar menor error. Son tres muestras muy cercanas en el tiempo, insuficientes para generalizar. El [informe](docs/INFORME_VALIDACION.md) explica sincronización, fórmula, limitaciones y la ejecución inicial que obtuvo datos pero falló al guardar por directorio ausente (repetida con éxito).

## Checklist RF-01…RF-16

**Implementado** significa código presente y lógica verificable; no equivale a una demostración nativa en hardware. Donde hace falta dispositivo/credencial, se indica.

| RF | Implementación / evidencia | Estado honesto |
|---|---|---|
| 01 | Catálogo CelesTrak/Space-Track, búsqueda nombre/NORAD y selección | Implementado; interacción probada con mocks |
| 02 | SGP4 OMM/TLE, posición geodésica y velocidad | Probado; validación real ISS archivada |
| 03 | Observer GPS/manual, azimut y elevación topocéntricos | Matemática probada; GPS real pendiente |
| 04 | Predictor grueso→fino, bisección <1 s, máximo refinado | Probado con ISS y ventanas ordenadas |
| 05 | SVG polar, anillos 0/30/60°, cardinales, trayectoria y posición | Implementado; aspecto nativo pendiente |
| 06 | Planificador puro + expo-notifications, permiso/canal y deduplicación | Planificador probado; entrega efectiva pendiente |
| 07 | Magnetometer/DeviceMotion, flecha y orientación relativa | Matemática probada; sensores/calibración pendientes |
| 08 | Filtros ISS/Starlink/GPS/weather/active/GEO | Implementado; selección UI probada con mocks |
| 09 | TTL configurable, refresco primer plano, tarea en background | Caché/TTL probados; ejecución del SO pendiente |
| 10 | react-native-maps, posición cada 2 s, interpolación aislada | Implementado; dispositivo pendiente; Android necesita clave de mapa |
| 11 | Una órbita pasada + futura, paso 30–60 s, segmentos antimeridiano | Probado geométricamente |
| 12 | Radio geométrico por altura/elevación y casquete teselado sin saltos | Probado, incluyendo latitudes ±85°; dibujo pendiente |
| 13 | Starlink SupGP por lotes de 20, estado cada 5 s, límite hasta 300 | Implementado; FPS en hardware pendiente |
| 14 | DataProvider, cache Storage/AsyncStorage, fallback, ventanas y retry | Probado con fetch/reloj/Storage inyectables |
| 15 | Comparación a timestamp de WTIA/N2YO, error km y edad | WTIA medido; N2YO pendiente de key |
| 16 | Edad desde EPOCH, alerta >TTL y stale offline | Lógica de caché probada; UI implementada |

## Entregables y estructura

```text
tp7/
├── app/
│   ├── app/                  # siete pantallas y layout de tabs
│   ├── src/                  # capas puras + adaptadores nativos
│   │   └── __tests__/        # fixtures reales y pruebas deterministas
│   ├── scripts/validate-iss.mjs
│   ├── app.config.ts        # integración opcional de clave de mapa Android
│   └── package-lock.json
├── backend/                  # http Node, proveedores con secretos server-side
│   ├── server.mjs
│   ├── test/proxy.test.mjs
│   └── Dockerfile
├── docs/
│   ├── DOCUMENTO_TECNICO.md
│   ├── FUENTES_DE_DATOS.md
│   ├── INFORME_VALIDACION.md
│   └── validation-real.json  # referencias y cálculos medidos, sin secretos
└── TP7_Satellite_Tracker.pdf # especificación original preservada
```

Código/proyecto Metro, documentación y medición pública: entregados. APK/TestFlight y video: **pendientes de tu lado**, no se afirma haberlos producido.

## Criterios de evaluación

| Criterio del PDF | Peso | Evidencia / alcance |
|---|---:|---|
| Cálculo y validación de posiciones | 25% | Motor testeado y tres mediciones WTIA; N2YO pendiente, error observado ≈9,51 km |
| Predicción | 15% | Cruces refinados, máximo, horizonte/umbral y pruebas de continuidad entre bloques |
| Mapa y constelación | 20% | Código completo, geometría testeada; mapa/FPS pendientes de hardware |
| Sky chart y UX | 10% | Pantallas españolas y SVG; interacción de catálogo probada; revisión visual pendiente |
| APIs, caché, fallback, credenciales | 15% | Interfaces, proxy, cuotas, almacenamiento y tests; cuentas reales no ensayadas |
| Background y notificaciones | 5% | Adaptadores y lógica pura; permisos/entrega en sistema real pendientes |
| Código, arquitectura, rendimiento, docs | 10% | Capas separadas, TS strict y docs; cooperativo JS, sin medición real de rendimiento |

No se asignan puntajes ficticios ni se declara aprobada una rúbrica que debe evaluar el docente.

## Guion del video demo (a grabar)

1. **00:00–00:25:** abrir Catálogo, buscar ISS/25544, mostrar época de los datos y observador GPS/manual.
2. **00:25–01:00:** Mapa con ISS moviéndose, ground track pasado/futuro, zoom en un cruce del antimeridiano y footprint. Cambiar elevación mínima para ver la reducción de cobertura.
3. **01:00–01:25:** activar Starlink y mostrar el límite configurado, no toda la constelación sin control.
4. **01:25–02:00:** abrir Pases; explicar AOS/TCA/LOS y elevación máxima; elegir un pase y verlo en Cielo con anillos/cardinales. Mostrar Brújula si hay sensores.
5. **02:00–02:30:** programar el recordatorio con permiso concedido. Para **demostrar entrega real**, elegir un pase cuyo aviso ocurra durante la grabación (o grabar ese momento después y aclarar el salto temporal). El ajuste de N admite decimales: puede elegirse `(AOS − ahora − 30 s)/60 s` cuando esté entre 0 y 120. Grabar la notificación efectivamente disparada; no sustituirla por un banner dibujado ni afirmar que se disparó aquí.
6. **02:30–03:00:** abrir Validar, comparar WTIA a su timestamp; mostrar error y antigüedad. Si se configuró key del servidor, repetir N2YO. Cerrar con modo avión/caché y alerta de antigüedad, sin fingir fallos reales del proveedor.

## Pendiente de tu lado

- Preparar un dev client y probar en dispositivo: permisos GPS denegados/concedidos, ubicación manual, sensores, mapas, notificaciones en foreground/background y tarea del sistema. Sin JDK/SDK/dispositivo aquí no se validó ese camino ni se generó APK.
- Para Android: obtener/restringir la clave de Google Maps SDK e integrarla antes de reconstruir. iOS usa Apple Maps; no exige esa clave.
- Revisar FPS y tiempos con 100–300 marcadores; si no alcanza, trasladar trabajo a worker/JSI. La versión entregada cede al event loop, pero no es multihilo.
- Configurar N2YO en el backend, ejecutar comparación independiente y agregar resultados **reales** al informe. También probar login real de Space-Track si se usará como fallback.
- Grabar el video con el guion anterior y entregar build si lo pide el docente.
- Revisar advisories de dependencias antes de publicar; proteger el proxy con TLS/autenticación/cuotas de ingreso. No publicar secretos ni `.env`.
