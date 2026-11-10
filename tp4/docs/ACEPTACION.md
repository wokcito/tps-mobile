# Guion de aceptación y defensa (pendiente de ejecución real)

Esta lista no es una prueba ya realizada. Ejecutarla con un Supabase de clase y un dispositivo iOS/Android compatible. Anotar fecha, SO, versión de app, red y resultado; adjuntar capturas al informe sin tokens, claves ni contraseñas.

## Preparación

- Aplicar migraciones en orden, seed y script de usuarios del README.
- Iniciar Compose y app. Confirmar las líneas produced / consumed / upsert reading.
- Asegurar al menos doce puntos en las seis horas del gráfico. No confundir el gráfico agregado con tick crudo.
- Deshabilitar Monte A en el simulador para mantener un ejemplo stale.
- No usar el reloj alterado del celular como evidencia de latencia; sincronizar reloj del host y dispositivo.

## Recorrido de 3–5 minutos

| Tiempo aproximado | Acción | Evidencia esperada |
|---|---|---|
| 0:00–0:30 | Login productor, mapa y leyenda | Tres polígonos Concordia, texto accesible además de color |
| 0:30–1:10 | Costa 2, lectura, edad, curva, umbral | Humedad bajo umbral y regla fija de sugerencia |
| 1:10–2:00 | Abrir 30 min y confirmar | UUID visible, pending, después applied o failed; logs correlacionados |
| 2:00–2:30 | Segundo comando mientras el primero sigue pending | Rechazo claro, solo un pending en SQL (RF-16) |
| 2:30–3:00 | Historial y Cuenta/Diagnóstico | Actor, resultado, user id, organización, tick y lag |
| 3:00–4:00 | Logout, login asesor | Mismos datos, botones de edición/comando deshabilitados |
| 4:00–5:00 | Explicar cola y Monte A | Manual idempotente y stale distinto de seco; mostrar evidencias preparadas |

La espera aleatoria de aplicación puede dejar una ventana breve para RF-16. Preparar dos sesiones y enviar simultáneamente, o detener temporalmente el worker (no el broker) para mantener pending y reanudarlo después. No afirmar aplicación en ≤5 s mientras el worker está detenido.

## Matriz funcional ampliada

### Sesión, aislamiento y roles

- [ ] Correo/password inválidos: error visible, botón vuelve a estar habilitado.
- [ ] Login válido, matar proceso y reabrir: sesión persiste.
- [ ] Productor cambia organización: se limpian datos anteriores; mapa, lotes, alertas e historial corresponden al nuevo perímetro.
- [ ] Aislado solo ve Estancia Aislada; nunca Costa 1/Costa 2/Monte A.
- [ ] Asesor intenta INSERT de comando y UPDATE de umbrales mediante el cliente REST con **su propio JWT**: acceso denegado y ninguna fila modificada.
- [ ] Un JWT authenticated intenta insertar `source='sensor'`: rechazado, contador sin cambios. Service role backend sí puede insertar.
- [ ] Advisor intenta lectura manual y marcar alerta: rechazado. No hay política de DELETE de lotes para operador.
- [ ] Tras logout se vuelve al login y no quedan pantallas protegidas accesibles.

Para probar REST usar un cliente HTTP local de confianza con variables privadas, sin pegar JWT ni claves en capturas o commits. Un SELECT de otro establecimiento debe devolver cero filas; la vista `plot_status` y `reading_series` también deben respetar el perímetro.

### Geo, estados y gráfico

- [ ] Tap en polígono abre el lote correcto.
- [ ] Denegar permiso GPS: “ubicación no disponible”, sin crash ni bloqueo del mapa.
- [ ] Autorizar GPS: marcador y mensaje de pertenencia o exterior (estar fuera es normal porque el seed es ficticio).
- [ ] Crear/editar lote con cuatro vértices GeoJSON; guardar y refrescar. Sin estación, aparece sin datos, no se inventa telemetría.
- [ ] Umbrales 0 ≤ mínimo ≤ máximo ≤ 100; valores inválidos no cambian SQL.
- [ ] Última lectura y antigüedad avanzan; gráfico tiene ≥12 puntos con semilla y se actualiza al refrescar/tick.
- [ ] Organización sin lotes: texto vacío claro. Caída de red: error y datos previos si ya se cargaron, sin spinner permanente.
- [ ] Lectura vieja siempre stale, aun si su humedad era 18 %. Límite exactamente 15 min aún no stale.

### Comandos, carrera y reintento

- [ ] Abrir sin temporizador, cerrar y abrir 1/30/120 minutos funcionan.
- [ ] 0/121/fracciones: error, contador de comandos/estado de válvula sin cambios.
- [ ] Dos inserts pending simultáneos sobre una válvula: uno solo aceptado por el índice parcial.
- [ ] Repetir `client_request_id`: no nueva fila, no segunda aplicación. Una respuesta perdida en la misma confirmación conserva UUID.
- [ ] Applied cambia válvula y applied_at atómicamente. Failed conserva válvula y registra valve_timeout; no queda busy activo.
- [ ] Cancelar pending: cancelled; después de que el consumer despierte no se aplica. Si applied ganó antes, UI informa cambio de estado y no finge cancelación.
- [ ] Abrir por 1 min, esperar cierre por maintenance; repetir con reinicio de worker durante el intervalo.
- [ ] Historial muestra como máximo veinte comandos del lote correcto, con fecha, actor y resultado.
- [ ] JWT vencido/403: error visible, busy termina. Solicitud sin respuesta: timeout HTTP a 12 s y posibilidad de reintentar.

### Offline, alertas y streaming

- [ ] Con el lote ya cargado, cortar red por treinta segundos y guardar manual 22 %, nota y GPS opcional. Hay confirmación de guardado local y contador de cola.
- [ ] Cerrar/reabrir proceso durante el corte; reconectar: lectura se sincroniza con el mismo UUID una sola vez.
- [ ] Interrumpir la respuesta después del insert, reintentar: mismo resultado, una fila en SQL.
- [ ] Cambiar de usuario con cola pendiente: no se envía bajo la nueva identidad; al volver su autor puede sincronizarla.
- [ ] Humedad seca genera alerta in-app y sugerencia; stale genera un tipo diferente. Al resolver condición, maintenance resuelve alerta vieja.
- [ ] Activar Monte A, comprobar tick, deshabilitar estación y esperar **más** de quince minutos sin recargar seed: gris y alerta stale.
- [ ] Evento con UUID de estación inexistente: log discard y siguiente evento válido se consume correctamente.
- [ ] Reproducir soil con igual estación/timestamp: no duplica lectura. Weather antes/después de soil conserva rain_mm correcto.
- [ ] Verificar retención >48 h sin borrar lecturas recientes.

## Mediciones todavía pendientes

| Objetivo | Inicio | Fin | Resultado real |
|---|---|---|---|
| RNF-03 mapa <3 s | Contexto/session listo al abrir mapa | Polígonos usables | PENDIENTE |
| RNF-04 tick ≤3 s | Insert confirmado en Postgres | Lectura visible en UI | PENDIENTE |
| RF-15 comando ≤5 s | Pending creado | Applied/failed visible | PENDIENTE |

Registrar red y carga; una consulta de respaldo cada 2,5 s más latencia **no demuestra** por sí sola el requisito ≤3 s. Diagnóstico presenta lag aparente desde measured_at, que puede incluir antigüedad del sensor y desajuste de reloj: no sustituye la medición insert→pantalla.

## Evidencia pendiente para cerrar la entrega

- Capturas H1-A/B/C/D y RF-16 del informe.
- Video o defensa de H1/H2/RF-16.
- Resultados reales del aislamiento RLS, corte offline, permisos GPS, cierre temporizado y recuperación.
- Mediciones RNF-03/RNF-04/RF-15, errores de dispositivo y configuración nativa de mapas.
