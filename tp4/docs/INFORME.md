# AgroPulse — Informe del TP4

**Entrega académica · Desarrollo y Arquitectura en Aplicaciones Móviles · 2026**

AgroPulse integra una aplicación móvil con autenticación y datos aislados por establecimiento, telemetría simulada sobre un bus de eventos y órdenes de riego con acuse asíncrono. La entrega incluye seis páginas/secciones equivalentes, separadas para su exportación. Las capturas y las mediciones físicas se identifican como pendientes: no se ejecutó una defensa ni se accedió a un proyecto Supabase real durante la implementación.

## Página 1 de 6 — Problema, alcance y arquitectura

El problema didáctico es que una lectura aislada de humedad no basta para decidir si regar. Es necesario conocer qué lote se está observando, cuán reciente es el dato, quién puede operar y si una orden realmente llegó al actuador. La solución muestra polígonos, un semáforo, una serie corta y válvulas, separando explícitamente una intención de riego de su resultado. No pretende reemplazar instrumentos de campo ni generar recomendaciones agronómicas profesionales.

La arquitectura implementada es:

```text
Expo (Auth, GPS, UI, AsyncStorage)
    │ HTTPS con JWT de usuario / Realtime
    ▼
Supabase Auth + Postgres + RLS
    ▲                    │ consulta pending (750 ms)
    │ lecturas/acuse     ▼
Worker SQL/Kafka ← irrigation.commands
    ▲                       │
    │ soil.moisture         └→ valve.status
    │ weather.tick
Redpanda ← Simulador de estaciones (3–8 s)
```

Postgres es la fuente de verdad de permisos, lecturas y comandos. El broker transporta eventos del backend, no sesiones móviles. El worker tiene dos responsabilidades coordinadas: consumir telemetría y traducir órdenes pendientes a eventos para aplicar luego una transacción SQL. Esta segunda responsabilidad es un puente de polling deliberadamente sencillo, en lugar de una Edge Function adicional: el productor API/Edge de `irrigation.commands` era opcional en el PRD.

La aplicación usa Expo SDK 58, React 19.3, React Native 0.88.1, TypeScript strict y Expo Router. Sus tabs son Mapa, Lotes, Alertas y Cuenta. Desde detalle se navega a confirmación, historial, lectura manual y edición GeoJSON. Diagnóstico está accesible desde Cuenta. AsyncStorage persiste la sesión de Supabase y una cola manual separada por usuario. Nunca se almacena una service role en variables públicas ni se instala Kafka/MQTT en el móvil.

Las coordenadas de semilla son aproximadas a Concordia, Entre Ríos, pero **ficticias**: no identifican un predio real. La humedad también es ficticia y no calibrada. Cuenta, Diagnóstico, mapa y README hacen visible esta advertencia. La función “mi ubicación” usa, en cambio, la ubicación real autorizada del dispositivo. Si no hay permiso o hay error, muestra “ubicación no disponible” y permite seguir usando la app sin GPS.

La semilla incluye Costa 1 (citrus, óptimo), Costa 2 (citrus, seco), Monte A (soja, stale), un lote de otra organización y una estación/válvula por lote. Así la misma entrega permite explicar aislamiento, semáforo y dato vencido sin requerir hardware.

<div style="page-break-after: always;"></div>

## Página 2 de 6 — Modelo, seguridad y roles

El modelo mínimo sigue §9: `organizations`, `memberships`, `plots`, `stations`, `readings`, `valves`, `irrigation_commands` y `alerts`. `plots.geom` almacena un Polygon GeoJSON con coordenadas `[longitud, latitud]`. Se eligió JSONB para evitar requerir PostGIS en el proyecto de clase. El cliente valida formato, rango y área básica; no se implementa topología catastral avanzada. Los umbrales tienen defaults 25/45 y un check de orden y rango.

`memberships` define el perímetro de acceso. Un JWT válido no permite leer todas las filas: las políticas verifican la pertenencia a la organización del lote. Las funciones auxiliares consultan esa relación con `auth.uid()`, fijan `search_path` y evitan políticas recursivas sobre memberships. La vista `plot_status` y la serie agregada son `security_invoker`: no eluden las políticas de las tablas base al ser consultadas por un usuario.

| Actor | Lectura | Escritura |
|---|---|---|
| Productor | Solo organizaciones con membresía | Lote/umbrales, comandos, manuales y lectura de alertas |
| Operador | Igual perímetro | Mismas operaciones de demo, sin borrado de lotes |
| Asesor | Mapa, series, válvulas, alertas, historial | Ninguna: solo SELECT |
| Worker | Datos necesarios del backend | Telemetría, válvulas, resultados y mantenimiento |

No hay política de escritura para un asesor. Deshabilitar el botón es una ayuda de UX, no la barrera de seguridad: un cliente modificado también debe ser rechazado por RLS. Los usuarios no pueden autoasignarse memberships. Las estaciones y válvulas se aprovisionan administrativamente. Solo se conceden columnas de actualización necesarias: cancelar un comando permite actualizar `status`, no cambiar su válvula, actor, acción ni UUID.

Para `readings`, un usuario autenticado solo puede insertar `source='manual'`, dentro de su perímetro y con `requested_by=auth.uid()`. Las lecturas `sensor` se escriben mediante service role desde el worker. El RPC manual comprueba además el actor esperado para no sincronizar una cola de otro usuario tras cambiar de sesión. Una colisión de UUID ajena no devuelve datos de esa fila.

`client_request_id` es UNIQUE. En comandos, un índice único parcial sobre `valve_id WHERE status='pending'` resuelve la carrera de dos clientes: no basta con consultar el estado antes del insert. En lecturas sensor, `(station_id, measured_at, source)` hace seguro el replay del evento. El índice `(station_id, measured_at DESC)` facilita buscar la lectura más reciente.

Se incluye un usuario aislado con acceso solamente a Estancia Aislada. El productor tiene una segunda membresía para probar el selector; el asesor y operador solo pertenecen a Concordia. La evidencia real de RLS queda pendiente de ejecutar el guion de aceptación con sus JWT. Revisar SQL o pasar pruebas con mocks no demuestra aislamiento en un servidor desplegado.

<div style="page-break-after: always;"></div>

## Página 3 de 6 — Por qué el teléfono no usa Kafka

La frontera móvil/API/broker es una decisión central del TP. El teléfono consume una API orientada a usuarios y cambios autorizados; el backend consume un stream orientado a infraestructura. Aunque ambos reciben eventos, no son responsabilidades intercambiables.

**Red móvil.** La conectividad cambia, el sistema operativo suspende procesos y las direcciones de red no son estables. Mantener una sesión de consumidor Kafka, heartbeats, particiones y reconexiones en segundo plano agrega fragilidad y consumo. HTTPS y Realtime se ajustan mejor al ciclo de vida de una pantalla, con una consulta de respaldo cuando se pierde un cambio. No se promete entrega de push mientras la aplicación está cerrada.

**Autenticación y aislamiento.** Supabase Auth emite JWT de usuario y Postgres evalúa membresía por fila. Kafka autentica productores/consumidores de infraestructura; entregar credenciales del broker al teléfono expondría un privilegio difícil de reducir por lote. Las ACL por topic no equivalen a RLS por organización. Eliminar ese acceso también reduce la superficie de ataque del dispositivo perdido o modificado.

**Backpressure y reproducción.** El broker puede acumular telemetría para que un consumer retome desde un offset. Un teléfono no debería reprocesar horas de eventos para reconstruir su mapa ni competir en el consumer group que persiste datos. El worker absorbe ese trabajo y publica el estado consolidado en SQL. La pantalla consulta una última lectura y agregados de cinco minutos, no miles de ticks crudos. Si hay retraso, Diagnóstico muestra lag aparente y el semáforo marca stale.

**Contrato y evolución del esquema.** `soil.moisture`, `weather.tick`, `irrigation.commands` y `valve.status` son contratos técnicos con UUID y fechas UTC. El worker valida antes de persistir y descarta una estación desconocida con log. La app usa el dominio público de tablas/RPC, no depende de particiones ni formatos de serialización del bus. Cambiar un productor de sensores no debería obligar a publicar una nueva versión móvil.

**Operación y seguridad.** El broker queda en la red privada de Compose, sin puerto público al teléfono. TLS/SASL, cuotas, monitoreo y retención del broker son preocupaciones del backend. La clave administrativa se limita a contenedores/scripts de servidor; el cliente solo conoce URL y anon key. Las políticas completan la seguridad: una anon key por sí sola no es una autorización de lectura ilimitada.

La consecuencia observable es que no hay dependencia `kafkajs` en la app. Sí existe en `infra/worker`, donde su costo operativo tiene sentido. El flujo end-to-end queda explícito: evento → fila SQL → Realtime → UI. Para los comandos, intención SQL → evento → transacción de aplicación → Realtime. Esta separación permite razonar sobre fallas sin confundir “mensaje enviado” con “válvula aplicada”.

<div style="page-break-after: always;"></div>

## Página 4 de 6 — H1, comando asíncrono y acuse

### H1: productor por la mañana

1. El productor ingresa con email/password. Auth persiste la sesión; si falla, se muestra un error en español y el formulario se habilita nuevamente. La app obtiene las membresías y el establecimiento activo.
2. En Mapa aparecen los polígonos. Costa 2 está seco porque su lectura reciente está cerca de 18 %, por debajo del mínimo 25 %. Costa 1 está óptimo. Monte A aparece gris: sin datos confiables tiene prioridad sobre cualquier porcentaje viejo.
3. Al tocar Costa 2 se abre Detalle. El usuario ve texto/ícono de estado además del color, lectura, antigüedad, temperatura, lluvia y gráfico de seis horas. Puede cambiar umbrales si tiene rol de escritura. La sugerencia es una sola regla fija: “Humedad bajo umbral: considerar riego”; no es ML.
4. Selecciona la válvula y abrir por treinta minutos. Confirmación presenta lote, válvula, duración y `client_request_id` UUID antes del envío. Puede elegir abrir sin temporizador o cerrar. Duración fraccionaria, cero o mayor a 120 se rechaza antes de escribir, y SQL repite la restricción.
5. La app crea `pending`. Desde ese momento no se habilita otro pending para la válvula. El índice parcial protege también la carrera entre dos celulares. Ante una respuesta perdida, el reintento de esta confirmación conserva UUID y consulta si ya existe.
6. El puente del worker observa la intención y produce `irrigation.commands`. El consumer valida y compara la fila original, espera entre uno y cuatro segundos y llama al RPC de aplicación.
7. La transacción bloquea el comando y vuelve a revisar pending. Si ya fue cancelado, no opera. Si falla la simulación, registra `failed` y `valve_timeout`. Si tiene éxito, abre la válvula, guarda `close_at` y marca applied con timestamp en la misma transacción.
8. Realtime actualiza la UI; una consulta cada 2,5 segundos sirve como respaldo. El historial muestra fecha, actor UUID, acción y resultado. Al volver al mapa se ve el estado de humedad más reciente; **abrir una válvula no inventa inmediatamente una humedad óptima**. El color solo cambia si cambia una lectura o umbral. El temporizador se cierra mediante mantenimiento del worker.

### Capturas pendientes, no evidencias fabricadas

- **[PENDIENTE CAPTURA H1-A]** Login exitoso y mapa de Concordia con leyenda.
- **[PENDIENTE CAPTURA H1-B]** Costa 2 seco, 18 % aproximado, umbral y gráfico.
- **[PENDIENTE CAPTURA H1-C]** Confirmación “abrir 30 min” con UUID visible.
- **[PENDIENTE CAPTURA H1-D]** Historial applied y válvula abierta, con timestamps para medir ≤5 s.
- **[PENDIENTE CAPTURA RF-16]** Segundo intento rechazado mientras existe pending.

El objetivo ≤5 s requiere medición real y poca congestión. El consumer es secuencial y la red agrega latencia; no se declara cumplido ese tiempo sin observación. El 10 % de fallos es parte de la demo, no evidencia de un sensor real defectuoso.

<div style="page-break-after: always;"></div>

## Página 5 de 6 — H2/H3/H4, offline y presentación

### H2: asesor

El asesor ve los mismos lotes y colores dentro de su membresía. En Detalle se explica el modo solo lectura y los botones de editar/comandar están deshabilitados. No puede crear manuales ni marcar alertas. La demostración debe incluir un intento HTTP directo con su JWT, porque probar únicamente un botón deshabilitado no verifica RLS. Una respuesta 403/42501 se transforma en un mensaje comprensible; las acciones terminan su estado busy mediante `finally`.

### H3: lectura de campo sin señal

La lectura manual incluye humedad estimada, nota y GPS opcional. Se genera un UUID cliente por lectura y se guarda primero en AsyncStorage, en una clave específica del usuario. Una promesa serializa acceso a la cola: agregar y sincronizar no pueden pisarse. Se confirma el guardado local sin esperar que haya red. Esto evita perder el dato al salir de la pantalla y permite repetir un envío con la misma identidad.

El sincronizador recorre en orden. Al primer error conserva ese elemento y todo el resto, evitando multiplicar timeouts durante un corte. Al recuperar señal, `submit_manual` inserta o devuelve la lectura existente. Si el servidor guardó pero se perdió la respuesta, el próximo intento no genera otra fila. La cola elimina solo elementos confirmados. Si cambia la sesión, no envía una lectura bajo la identidad de otro usuario; la conserva para su autor. Los errores permanentes de permisos dejan el dato pendiente, no lo borran silenciosamente.

La prueba determinista reconstruye la cola serializada y simula respuesta perdida/reconexión. Un corte físico de treinta segundos sigue pendiente de dispositivo. La cola no está cifrada por la aplicación y puede contener coordenadas reales si el usuario las adjuntó: es un límite académico que debe informarse. No se implementó cola de comandos, porque sería riesgoso ejecutar un riego mucho después sin confirmación actual. RNF-07 se aborda con lecturas manuales.

### H4: estación caída

El simulador permite deshabilitar UUID de estaciones por configuración. Monte A está apagado por defecto y la semilla termina su serie hace veinte minutos. Para demostrar transición real, primero se activa, se confirma un tick y luego se deshabilita. A exactamente quince minutos aún se clasifica por humedad; solo al superar ese tiempo pasa a stale. Un timer de UI actualiza la edad aunque no llegue ningún Realtime. El mantenimiento también genera una alerta stale distinguible de dry.

### Accesibilidad y estados de interfaz

Color no es el único canal: el semáforo muestra ícono y texto. Hay estados de carga, organización sin lotes, falta de estación/válvula, errores de red, cola pendiente y comando en vuelo. El gráfico informa cantidad de puntos y última humedad en texto accesible. No inventa doce puntos si la base está vacía. Los formularios tienen etiquetas y los botones describen disabled/busy. El permiso de ubicación no es requisito de navegación. Contraste, tamaños y lector de pantalla todavía deben evaluarse en dispositivo; la implementación no equivale a una certificación de accesibilidad.

<div style="page-break-after: always;"></div>

## Página 6 de 6 — Verificación, decisiones y límites

### Estrategia de pruebas

Los módulos puros separan semáforo, antigüedad, rango de duración, regla pending, parseo GeoJSON, punto-en-polígono y cola. Los casos cubren las fronteras explícitas del PRD: 25 y 45, exactamente quince minutos y un milisegundo más, ausencia de lectura, doce segundos, dos horas, duración 1/120 frente a 0/121/fracciones, punto interior/exterior/borde y repetición del UUID. Las pruebas de UI usan las APIs asíncronas de Testing Library 14 y verifican mensajes y liberación de busy ante errores de login/comandos, además de ausencia de escrituras inválidas.

Se observó RED inicial por falta de módulos antes de implementarlos y un RED de comportamiento para detener la cola al primer error. Se corrigió también una incompatibilidad de matchers de accesibilidad del entorno de pruebas: ahora se comprueba el estado expuesto por el componente. La suite del worker verifica payloads, fechas UTC, rangos, mapeo sensor→fila, ignorar cancelados y el corte exacto de probabilidad del fallo. El typecheck del worker incluye todos sus archivos de ejecución con `checkJs`, no solamente el módulo puro.

Los cuatro comandos de aceptación local son `npx tsc --noEmit` y `npx jest` dentro de app y worker. Sus resultados finales se informan en la entrega. No se ejecutaron compilaciones Android/iOS, Docker Compose ni migraciones sobre un proyecto real. El guion separado de aceptación enumera la evidencia todavía necesaria: login persistente, lectura entre organizaciones, permisos reales, carreras de comandos, llegada de Realtime y latencias.

### Decisiones que reducen complejidad

- **GeoJSON en JSONB:** suficiente para polígonos simples de una demo; no requiere una extensión espacial. El cliente calcula pertenencia con ray casting y borde incluido.
- **Estado derivado:** no hay una columna editable que permita forzar arbitrariamente un color. SQL y TypeScript usan stale primero, luego mínimo/máximo. El cliente mantiene la edad visual aun sin ticks.
- **Gráfico agregado:** la serie de cinco minutos limita tamaño manteniendo datos reales. La semilla cada diez minutos aporta más de doce puntos de seis horas; un proyecto nuevo vacío se informa como vacío.
- **Entrega al menos una vez:** el puente puede duplicar eventos y el worker puede repetir después de un reinicio. Unicidad y transacciones SQL aportan idempotencia, sin prometer exactly-once end-to-end.
- **Weather separado:** una tabla auxiliar conserva lluvia si llega antes que soil en otro topic. Se une por estación y timestamp, no se actualiza indiscriminadamente la última lectura.
- **Retención de 48 horas:** el mantenimiento recorta lecturas y weather, cierra temporizadores y gestiona alertas. Requiere worker activo; si está apagado, reanuda tareas al volver.

### Límites y próximos pasos

La entrega no incluye hardware, LoRa, MQTT móvil, NDVI, comentarios del asesor, campaña completa, notificaciones push del SO ni modelos ML. Un lote creado desde la app necesita aprovisionamiento administrativo de estación/válvula. No se valida toda la topología de un GeoJSON ni se hace cartografía legal. El historial expone UUID del actor, no correo de otros miembros.

Para producción harían falta migraciones ejercitadas en staging, auditoría de políticas con JWT, outbox dedicado, control de carga, TLS/SASL del broker, alarmas operativas, cifrado y manejo de errores permanentes de la cola, pruebas E2E y políticas de privacidad para GPS. Los objetivos mapa <3 s y tick ≤3 s quedan explícitamente sin medir. El video de tres a cinco minutos y las capturas de H1 quedan pendientes del equipo. Esta distinción entre artefacto implementado y evidencia observada es parte de la honestidad de la entrega.
