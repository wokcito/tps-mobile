# Fuentes orbitales, límites y fallback

**Fuente principal: CelesTrak GP JSON/OMM; Starlink usa el set suplementario SupGP.** Las posiciones se calculan localmente con satellite.js, no se solicitan a un servicio por cada refresco de mapa.

## Por qué SupGP para Starlink

Starlink no ofrece una API pública oficial que entregue las posiciones de su constelación. Las APIs Enterprise para clientes business administran cuentas, terminales, routers y telemetría, no un catálogo abierto de órbitas. La **Space Traffic Coordination API** está restringida a operadores satelitales y requiere certificado **mTLS firmado por SpaceX**; no es una opción pública para este trabajo.

CelesTrak distribuye elementos suplementarios derivados de las efemérides que SpaceX publica. Por ello se consume `https://celestrak.org/NORAD/elements/sup-gp.php?FILE=starlink&FORMAT=json`, en lugar de inventar un endpoint de Starlink o usar sus APIs comerciales como si fueran de seguimiento. Su precisión depende de época, maniobras y calidad de los elementos; no es telemetría GNSS en vivo.

OMM/JSON conserva NORAD de seis dígitos sin las restricciones del TLE de columnas fijas. Satellite.js instalado 6.0.2 proporciona `json2satrec`. Se conserva TLE para fuentes alternativas y fixtures históricos.

## Matriz de proveedores

| Proveedor | Uso y endpoint | Límite de referencia | Política implementada |
|---|---|---|---|
| CelesTrak | `gp.php?GROUP=...&FORMAT=json`, `CATNR=...`; Starlink SupGP | Fuentes actualizadas aproximadamente diariamente; evitar consultas continuas | Caché 24 h por defecto, ajustable 12–24 h; ventana conservadora de 1 solicitud/s para ráfagas distintas |
| Space-Track | POST `ajaxauth/login`; consulta `class/gp/.../format/json` | **<30/min y 300/h** | Ventanas estrictas de **29/min y 299/h**, incluyendo login y reintentos; sesión y cookie en backend |
| N2YO | `tle/:id`, `positions/:id/lat/lon/alt/1`, `visualpasses/...` | 1000/h TLE/posiciones; 100/h pases/above | Ventana conservadora 999/h general; 99/h adicional para pases; key exclusivamente en backend |
| Where the ISS at? | `/v1/satellites/25544`, `/tles` | Aproximadamente 1 solicitud/s; solo ISS 25544 | Ventana 1/s; rechaza otros NORAD antes de fetch; posiciones para validación, TLE para fallback |
| Proxy educativo | `/catalog`, `/orbital/:norad`, `/validate/:norad` | Cuota propia | 120 solicitudes/min por cliente/IP; 429 y Retry-After:60; máximo 10.000 clientes activos |

Los límites elegidos dejan margen en los proveedores con cuota. Son ventanas rodantes estrictas, no contadores reiniciados al cambiar de minuto: así se evita duplicar una ráfaga en los bordes. Todos los intentos HTTP de las operaciones sujetas a cuota se contabilizan. La espera se serializa en una cola, con reloj inyectable en la lógica de limitación y tests que no dependen del tiempo real. Las políticas deben revisarse antes de desplegar: los proveedores pueden modificarlas.

## Contrato común y flujo

`DataProvider` expone `getCatalog(group)`, `getOrbitalData(norad)` y `getValidationPosition(norad)`. Un método no soportado falla explícitamente para que el orquestador pruebe la siguiente fuente; no se devuelve una posición inventada ni se finge que todos los proveedores cubren todo.

Sin proxy:

1. CelesTrak obtiene catálogos y OMM.
2. Where the ISS at? permite validar y obtener TLE únicamente de ISS.
3. Si no hay red, se utiliza caché persistente anterior con marca de desactualización. Si nunca se descargaron datos, se muestra error/estado vacío; los fixtures de test no se inyectan como datos vivos.

Con proxy:

1. El proxy usa CelesTrak → Space-Track si hay cuenta → N2YO si hay key → Where the ISS at? para los métodos aplicables.
2. La app prueba proxy y luego fuentes públicas directas si falla; los adaptadores `SpaceTrackProvider` y `N2yoProvider` del móvil delegan al servidor, no aceptan claves.
3. La pantalla de validación fija explícitamente la fuente (N2YO o WTIA): **no debe comparar una posición propia contra sí misma** ni ocultar un fallo cambiando silenciosamente de referencia. CelesTrak/Space-Track no proveen referencias de posición para ese modo.

Filtros: estaciones/ISS, Starlink, GPS (`gps-ops` en CelesTrak), meteorológicos, activos y GEO. Búsqueda por nombre/NORAD sobre el catálogo del grupo y apertura explícita de NORAD permite objetos fuera de la lista visible. Space-Track usa filtros alternativos de nombre para GPS/NOAA: son aproximaciones de agrupación, no una taxonomía oficial completa de todas las constelaciones meteorológicas.

## Caché, antigüedad y retry

- App: AsyncStorage a través de `Storage`; implementación en memoria para tests. Claves separadas para catálogo/grupo y órbita/NORAD. Entrada `{value,savedAt,source,stale}`; la interfaz conserva OMM/TLE y EPOCH.
- TTL de descarga 12–24 h, 24 h por defecto. En primer plano se consulta la órbita seleccionada cada minuto, pero no se hace fetch hasta vencer el TTL. Background refresca satélites con avisos activos; el SO decide cuándo ejecuta la tarea.
- El orquestador colapsa solicitudes simultáneas para la misma clave, mantiene datos vigentes sin red y aplica fallback ante error. Si todas las fuentes fallan devuelve caché vencida con `stale:true` **sin modificar savedAt ni EPOCH**.
- La UI indica además edad desde **época orbital** y alerta cuando supera el TTL. Re-descargar elementos con la misma época no elimina esa alerta.
- HTTP tiene timeout 15 s y hasta 3 intentos con esperas exponenciales de 500 y 1000 ms, pasando por limitación en cada intento. La limitación evita ráfagas durante reintentos. Es una cola de trabajo en memoria, no un job queue durable tras reiniciar la app.
- Backend: memoria, TTL 24 h para catálogo/órbita y 5 s para validación; hasta 2000 entradas con expulsión de la más antigua. Colapsa trabajo concurrente. Al reiniciar se vacía; la app conserva su caché persistente. El proxy no devuelve caché orbital vencida como si fuera fresca; ante fallo total responde 503 y la app decide el uso offline.

## Credenciales y despliegue

`SPACETRACK_IDENTITY`, `SPACETRACK_PASSWORD` y `N2YO_API_KEY` son variables del **proceso backend**, jamás `EXPO_PUBLIC_*`. No se aceptan desde el móvil, no se escriben a disco y los errores públicos no contienen URLs upstream, cookies ni secretos. `EXPO_PUBLIC_PROXY_URL` es pública y solo identifica el proxy.

La clave opcional **restringida** de Google Maps SDK Android es otra categoría: identificador público de aplicación, embebido necesariamente en el cliente nativo; restringirla al package/SHA del dev client y al SDK de Android. No reutilizarla como secreto de servicios backend. Apple Maps en iOS no la necesita.

Las herramientas bloquearon la creación de `.env.example`; no se insistió. Los nombres y ejemplos sin valores reales se encuentran en el README raíz. Para producción se necesita TLS, autenticación y política de ingreso de reverse proxy; la demo no es un servicio público endurecido. No registrar URLs de N2YO (incluyen key), cookies de Space-Track ni cuerpos de login.

## Referencias

- CelesTrak: https://celestrak.org/NORAD/elements/ y https://celestrak.org/NORAD/elements/supplemental/
- Space-Track: https://www.space-track.org/documentation
- N2YO: https://www.n2yo.com/api/
- Where the ISS at?: https://wheretheiss.at/w/developer
- Satellite.js: https://github.com/shashwatak/satellite-js
- Vallado, *Fundamentals of Astrodynamics and Applications*: modelo SGP4 y marcos de referencia.
