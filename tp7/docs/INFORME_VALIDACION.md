# Informe de validación

## Estado

Validación real de ISS contra **Where the ISS at?** ejecutada el 10/11/2026 (UTC) desde este entorno con acceso a internet. N2YO queda **PENDIENTE**: no se proporcionó API key. No se presentan fixtures de tests como mediciones externas ni se afirma validación en dispositivo.

La ejecución inicial obtuvo tres muestras reales de aproximadamente **9,515 km**, pero terminó con ENOENT al guardar en un directorio aún no creado. Se corrigió la preparación del directorio y se repitió la ejecución; la evidencia definitiva está en `validation-real.json`. La tabla siguiente se actualiza con esa ejecución definitiva, no con datos sintéticos.

## Metodología reproducible

1. `cd tp7/app && node scripts/validate-iss.mjs` (Node 24; soporte nativo de TypeScript sin transpilar). El script importa **el mismo motor** `src/orbital.ts` usado en la app.
2. Descargar GP JSON de `https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=json`; conservar OMM íntegro y EPOCH UTC.
3. Descargar tres muestras independientes de `https://api.wheretheiss.at/v1/satellites/25544`, separadas por al menos 1,2 s. No se consulta la API por frame.
4. Propagar SGP4 **al timestamp de cada respuesta**, no al momento de recepción ni a Date.now(). Comparar latitud, longitud y altitud en km.
5. Distancia superficial haversine con R=6371,0088 km; error combinado `sqrt(distanciaSuperficial² + diferenciaAltitud²)`. Esta es la aproximación 3D solicitada, no distancia euclídea entre vectores ECEF.
6. Antigüedad orbital = `(timestampReferencia − EPOCH)/3600000`; no confundir con edad desde descarga en caché. Archivar los valores originales de ambas fuentes en `validation-real.json`.

## Mediciones

Ejecución definitiva: `2026-11-10T01:15:03.171Z`. EPOCH CelesTrak: `2026-11-09T11:10:18.771456Z`.

| Fuente | NORAD | Timestamp referencia UTC | Edad orbital (h) | Error combinado (km) |
|---|---:|---|---:|---:|
| Where the ISS at? | 25544 | 2026-11-10 01:15:05 | 14,079508 | 9,511136 |
| Where the ISS at? | 25544 | 2026-11-10 01:15:07 | 14,080064 | 9,510983 |
| Where the ISS at? | 25544 | 2026-11-10 01:15:09 | 14,080619 | 9,510829 |

Rango observado: **9,510829–9,511136 km**. La diferencia de altitud fue de aproximadamente **0,0009 km**; domina la discrepancia horizontal. No se impone una tolerancia ficticia ni se describe este resultado como precisión subkilométrica. N2YO no se midió.

## Interpretación y límites

Tres muestras durante pocos segundos no prueban exactitud global, ni incluyen maniobras, otros satélites o diferentes edades de elementos. Las fuentes pueden usar elementos de épocas diferentes; la precisión temporal reportada por WTIA es de un segundo y tampoco equivale a una verdad GNSS certificada. Un error significativo se reporta tal cual, sin desplazar artificialmente tiempos ni ajustar parámetros para mejorarlo. La medición no separa las contribuciones del modelo, de la fuente orbital y del timestamp de la API.

La órbita actual de ISS tiene una época de unas 14 horas al medir; con TTL de 12 h la UI advertirá que está desactualizada aunque la descarga sea reciente. Cambiar TTL a 24 h no hace más precisa la posición.

## Pendiente con N2YO

Configurar `N2YO_API_KEY` solo en el backend y URL del proxy en Ajustes; seleccionar cualquier NORAD, abrir Validar y elegir N2YO. Registrar fuente, timestamp UTC, EPOCH, edad y error. Para ISS, repetir también WTIA y contrastar las tres fuentes. No rellenar esta fila con el fixture ni inferir resultados de WTIA.

| Fuente | Satélite | Hora UTC | Edad orbital | Error km | Estado |
|---|---|---|---|---|---|
| N2YO | ISS / otros | — | — | — | PENDIENTE: API key |

## Pruebas deterministas complementarias

El fixture OMM es una respuesta real de CelesTrak archivada (09/11/2026), además de un TLE real de ISS de 2021. Jest verifica altitud LEO, inclinación, período, velocidad, latitud, azimut, continuidad por segmentos y radio de cobertura. Las predicciones verifican AOS < TCA < LOS y elevación cerca del umbral. Estas pruebas prueban invariantes físicos y consistencia, **no sustituyen** la comparación externa. No hay resultados inventados de Android, iOS, magnetómetro o entrega efectiva de notificaciones.
