# Diseño técnico · Satellite Tracker

La app propaga las órbitas **localmente**, usando elementos reales; internet obtiene elementos y referencias independientes, no anima el mapa. UI en español, código TypeScript en inglés con `strict: true`.

## Recorrido de arquitectura

| Capa | Implementación | Responsabilidad |
|---|---|---|
| Orbital Engine | `app/src/orbital.ts` | OMM/TLE → SatRec, SGP4, geodesia, az/el, velocidad, período, ground track y cobertura |
| Prediction Service | `app/src/prediction.ts` | Ventanas completas AOS/TCA/LOS, refinamiento y planificación pura de avisos |
| Data Provider | `app/src/data.ts`, `providers.ts` | Contrato intercambiable, límites, retry/backoff, caché y fallback |
| Proxy | `backend/server.mjs` | Autenticación y secretos de Space-Track/N2YO, caché y cuotas independientes |
| Observer | `app/src/observer.ts` | GPS con permiso, ubicación manual, Magnetometer/DeviceMotion |
| Geo/Map | `app/app/map.tsx`, `AnimatedSatelliteMarker.tsx` | Mapa, marcador interpolado, segmentos y cobertura; Starlink por lotes |
| Notifications | `app/src/runtime.ts` | Permisos, programación idempotente y tarea de actualización |
| Validation | `orbital.positionError`, `app/app/validation.tsx` | Comparación sincronizada por timestamp y antigüedad orbital |
| Presentation | `app/app/*`, `state.tsx`, `ui.tsx` | Catálogo, mapa, pases/detalle, polar, brújula, validación, ajustes y estados |

`TrackerProvider` comparte la selección, posición, observador, ajustes y predicción. Las pantallas no hacen llamadas a APIs para cada posición. Los adaptadores reciben `fetch`; el almacenamiento y el reloj tienen interfaces sustituibles. `MemoryStorage` y relojes virtuales se usan en pruebas; en móvil se utiliza AsyncStorage.

## Modelo de propagación y coordenadas

**satellite.js 6.0.2**, versión comprobada en la instalación y fijada por `package-lock.json`, exporta **json2satrec** y **twoline2satrec**. OMM/JSON es principal; no se convierte a TLE y permite catálogos de seis dígitos. El TLE sigue disponible como fallback. Se interpretan las épocas sin sufijo como UTC, según GP de CelesTrak.

SGP4 utiliza elementos medios de NORAD y el modelo estándar compatible con TLE/OMM. La librería incorpora las ramas de espacio profundo habitualmente denominadas SDP4 para períodos grandes; no se selecciona un integrador ad hoc para GEO. Sus constantes de propagación por defecto son WGS-72, como en el modelo NORAD, **no** debe confundirse eso con el elipsoide de salida.

Cadena conceptual:

1. SGP4/SDP4 genera posición y velocidad en **TEME**, el marco ECI empleado por el modelo (km, km/s).
2. `gstime` obtiene tiempo sidéreo Greenwich; `eciToEcf` rota TEME al marco terrestre aproximado. No se aplican parámetros EOP de precisión, movimiento polar ni UT1−UTC externo.
3. `eciToGeodetic` produce latitud geodésica, longitud y altura sobre **WGS-84**: a = 6378,137 km, b = 6356,7523142 km, valores verificados en satellite.js. No se confunde latitud geocéntrica con geodésica.
4. Observador en lat/lon y altura **km**; expo-location entrega metros y se convierte al entrar. `ecfToLookAngles` calcula azimut [0,360), elevación y distancia topocéntrica.
5. La velocidad indicada es la norma del vector TEME, no velocidad sobre el terreno. Período aproximado = 2π / movimiento medio corregido de SatRec (minutos).

Errores de propagación y valores no finitos se rechazan y se muestran sin cerrar la app. El paso temporal de la posición principal es 2 s.

## Ground track y footprint

**Ground track:** se muestrea desde ahora menos un período hasta ahora y desde ahora hasta ahora más un período, con paso por defecto 60 s, configurable entre 30 y 60 s y con multiplicador de órbitas ≥1. Para MEO/GEO el intervalo crece con el período; no se limita artificialmente a 90 min. Se separan pasado/cian y futuro/dorado. Cada salto |Δlongitud| >180° inicia un segmento nuevo; no hay línea recta a través del mapa. Se omiten del dibujo los segmentos de un solo punto.

**Cobertura geométrica esférica:** con radio terrestre R=6371,0088 km, altura h y elevación mínima ε:

```
ψ = acos((R / (R + h)) · cos(ε)) − ε
radio superficial = R · max(0, ψ)
```

Los ángulos de la fórmula están en radianes. Para h=420 km y ε=0°, el radio es de aproximadamente 2250 km (el test exige 2200–2300 km). A mayor elevación mínima, menor cobertura; a 90° se reduce a cero. No implica que toda el área esté iluminada, tenga capacidad de enlace o autorización de servicio.

Para no unir artificialmente +180° con −180°, `footprintRings` **tesela el casquete esférico en bandas de latitud de hasta 1°** y recorta intervalos longitudinales contra franjas [-180,0] y [0,180]. Cada cuadrilátero tiene ancho ≤180°, incluso cuando el casquete incluye un polo. No se unen puntos alrededor del polo con una arista que cruce el mundo. Es una aproximación gráfica por integración al punto medio (error de borde de orden 1°), no un contorno geodésico exacto. Se dibuja con polígonos semitransparentes sin borde. El radio matemático es independiente de esa aproximación. Pruebas incluyen longitudes próximas a 180° y latitudes ±85°.

## Predictor: precisión, costo y límites

`predictPasses` evalúa elevación cada 60 s. Al detectar cruces del umbral, biseca el intervalo hasta ancho ≤250 ms, por debajo del requisito de 1 s. Refina el máximo de elevación por búsqueda ternaria con resolución temporal ≤250 ms dentro del pase. Devuelve AOS, TCA, LOS y elevación máxima. El umbral es 0–89°, horizonte 1–10 días en UI; los parámetros de la función permiten experimentar con pasos menores.

Costo aproximado: **O(H / Δt + P · log(Δt / δ) + P · log(duraciónPase / δ))**, con H horizonte en segundos, Δt paso grueso, δ=0,25 s y P número de pases. Dos días con 60 s son unas 2880 propagaciones de muestreo, más refinamientos. No se busca ingenuamente cada segundo durante diez días. Se omiten ventanas incompletas al comienzo/final del horizonte; un GEO siempre sobre el umbral puede no tener AOS/LOS finitos en ese horizonte. Un pase rasante que supere el umbral durante menos que el paso grueso puede escapar al muestreo: reducir el paso para estudiar ese caso. Visibilidad **geométrica/radio**, no garantía de visibilidad óptica; no se modela sombra terrestre para filtrar pases.

La variante async procesa bloques de 6 h con solapamiento de un período para no perder cruces de frontera y cede a JS entre bloques. Las predicciones se recalculan al cambiar órbita, observador o ajustes, y al refrescar elementos en primer plano. El sky chart muestrea el pase elegido cada 5 s; radio polar `(90° − elevación)/90°`, azimut horario desde Norte. El punto actual solo se dibuja si elevación ≥0°.

## Rendimiento y funcionamiento offline

- Posición principal: SGP4 cada 2 s, interpolación visual del marcador cada 100 ms durante 1,8 s. La interpolación vive en un componente aislado, no re-renderiza el conjunto del mapa.
- Trayectoria/cobertura: cada 30 s y al cambiar órbita/umbral, no por frame. LEO implica unas 190 muestras; GEO unas 2880 para pasado+futuro con paso 60 s.
- Starlink: límite configurable hasta 300 objetos, por defecto 100; propagación por tandas de 20 con cesión al event loop. Un único `setState` por lote completo cada 5 s; no una actualización por satélite ni cálculo dentro de JSX. Los objetos decaídos se omiten.
- La implementación es **cooperativa sobre el hilo JS**, no un Web Worker ni un TurboModule. Reduce bloqueos, no demuestra ausencia de jank. Faltan perfilado y medición de FPS reales. Si el perfilado lo exige, mover propagación a un worker/JSI es la mejora siguiente.
- Límites por proveedor y colapso de solicitudes concurrentes; caché persistente evita tráfico cuando todavía está vigente. En error se devuelve caché anterior con marca `stale`, sin cambiar su timestamp.
- La antigüedad visible se calcula desde **EPOCH orbital**, no desde descarga. Una descarga reciente de elementos viejos sigue mostrando alerta.

## GPS, brújula, tareas y avisos

Permiso GPS denegado o error → observador manual; predeterminado Concordia, Entre Ríos (-31,392°, -58,021°, 30 m). Los ajustes permiten reemplazar latitud, longitud y altitud sin GPS. La brújula usa magnetómetro y pitch de DeviceMotion, normaliza el giro firmado a [-180,180) y resta el pitch de la elevación objetivo. Supone teléfono retrato y calibrado. **Se ignoran declinación magnética y calibración fina**; no es una antena de precisión. Sin sensores se muestran azimut/elevación manuales.

El planificador puro excluye avisos ya pasados y deduplica por NORAD+AOS. Antes de programar se pide permiso y se crea canal Android. Se reemplazan solo avisos de ese satélite; los de otros se conservan. Se conservan suscripciones con observador en AsyncStorage. La tarea BackgroundTask/TaskManager consulta datos TTL-aware, recalcula pases y sustituye avisos próximos (máximo 24 por satélite para evitar llenar la cola del sistema). La app vuelve a hacerlo al regresar a primer plano; **la hora de ejecución de background la determina el sistema**, no se garantiza una frecuencia exacta. Background usa la última ubicación del observador guardada, no rastrea ubicación permanentemente. El primer plano consulta la órbita seleccionada cada minuto, pero la caché evita llamadas durante el TTL.

## Limitaciones explícitas

Sin refracción atmosférica fina, sin corrección ionosférica/troposférica, sin perturbaciones externas a SGP4 ni efemérides de maniobras de alta precisión. Cobertura esférica y teselada; conversión geodésica elipsoidal; error de validación es aproximado. Sin demostración de notificación efectiva, mapas nativos, sensores o background en hardware en este entorno. Android requiere clave restringida de Google Maps SDK para su mapa nativo; sin ella se muestra posición textual y aviso, evitando inicializar un mapa que podría fallar. iOS usa Apple Maps sin esa clave. Metro es la entrega ejecutable, no se fabricó APK/TestFlight ni video.
