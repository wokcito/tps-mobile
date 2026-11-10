# Backend AgroPulse

Redpanda queda privado en la red de Compose. Solamente el simulador y el worker hablan Kafka; ambos acceden a Supabase con credenciales administrativas **del servidor**.

## Arranque

1. Aplicar ambas migraciones y `../supabase/seed.sql` según [README raíz](../README.md).
2. Copiar `.env.example` a `.env` local y completar URL, service role y contraseña privada de demostración. No versionar `.env`.
3. Aprovisionar usuarios: desde `worker/`, `npm i` y `node --env-file=../.env provision-users.js` (Node 22 recomendado).
4. Desde esta carpeta: `docker compose up --build`.
5. Observar logs en primer plano; en otra terminal `docker compose logs -f worker simulator` permite seguirlos. Detener con Ctrl+C y `docker compose stop` sin borrar volúmenes.

Variables coinciden con la plantilla existente: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `KAFKA_BROKERS`, `DEMO_PASSWORD`, `DISABLED_STATION_IDS`. Compose fija `KAFKA_BROKERS=redpanda:9092` dentro de su red. Nunca pasar la service role a Metro/Expo. La imagen usa Node 22 Alpine, instala solo producción con lockfile y ejecuta como usuario node. `.env` no se copia a la imagen.

El primer arranque necesita descargar imágenes/dependencias. La salud de Redpanda se comprueba antes de iniciar consumidores; restart policy permite recuperarse de una caída del proceso. No se publicó un puerto Kafka al host. Un Supabase local debe tener URL accesible desde los contenedores, no `localhost` del propio contenedor.

## Topics y contratos (§10)

Todos los UUID deben existir en la semilla, salvo mensajes deliberadamente inválidos para la prueba de descarte. Timestamps ISO-8601 UTC terminados en `Z`.

```json
{"station_id":"30000000-0000-4000-8000-000000000002","moisture_pct":18,"temp_c":24,"ts":"2026-06-01T12:00:00.000Z"}
```

`soil.moisture`: simulador → worker, upsert de `readings`, `source='sensor'`. Clave `(station_id, measured_at, source)` hace replay seguro.

```json
{"station_id":"30000000-0000-4000-8000-000000000002","rain_mm":0,"ts":"2026-06-01T12:00:00.000Z"}
```

`weather.tick`: simulador → worker, guarda `weather_readings` y actualiza lluvia de la lectura con igual estación/timestamp. La tabla auxiliar soporta que weather llegue antes que soil; no se inventa humedad a partir de lluvia.

```json
{"command_id":"50000000-0000-4000-8000-000000000001","valve_id":"40000000-0000-4000-8000-000000000002","action":"open","duration_min":30}
```

`irrigation.commands`: puente SQL del worker → consumer. La app inserta pending en Supabase; el puente consulta cada 750 ms. Para apertura sin temporizador o cierre, `duration_min` es `null`. Acción de cierre en comandos: `close`; estado de válvula cerrada: `closed`. No se agregan timestamps requeridos donde el contrato no los pide.

```json
{"valve_id":"40000000-0000-4000-8000-000000000002","status":"open","command_id":"50000000-0000-4000-8000-000000000001","ts":"2026-06-01T12:00:02.000Z"}
```

`valve.status`: worker → consumer de observabilidad. La RPC ya actualizó válvula y comando en una transacción. Reproducir este evento **no sobrescribe** una válvula con el estado de un comando viejo.

## Simulación y stale

Una tarea por estación espera aleatoriamente 3–8 s entre ticks; publica humedad con ruido, temperatura y lluvia. En campo real se usarían intervalos de minutos y hardware calibrado. Costa 2 inicia en 18 %, los otros sensores activos en 35 %; ruido acumulado puede modificar los colores durante ejecuciones largas.

UUID Monte A: `30000000-0000-4000-8000-000000000003`. Está deshabilitado por defecto en el simulador. Para activar todas las estaciones, poner `DISABLED_STATION_IDS=none` en el `.env` local y ejecutar `docker compose up -d --force-recreate simulator`. Para demostrar H4, volver a incluir el UUID y recrear solo el simulador; no recargar seed para esta prueba de transición. A los **más de quince minutos** queda gris. La semilla ya lo muestra stale desde el inicio para facilitar la defensa corta.

## Aplicación y recuperación

- Antes de procesar un sensor, busca `station_id`. Si no existe, log `discard unknown station_id` y continúa el loop. JSON/payload inválido también se descarta con log.
- Comandos se revalidan contra la fila SQL; un mensaje inventado o discordante no modifica una válvula. Espera 1–4 s y llama `apply_command`.
- La RPC bloquea la fila (`FOR UPDATE`). Si se canceló/aplicó/falló, devuelve null. Con 10 % marca `failed`/`valve_timeout`; en caso contrario cambia válvula, fija `close_at` si corresponde y marca `applied` con timestamp.
- El puente puede publicar varias veces un pending. Esto es intencional: tras una respuesta perdida o reinicio, SQL sigue siendo fuente de verdad. La RPC evita doble aplicación; no se promete exactly-once de Kafka.
- Cada pasada ejecuta mantenimiento: cierra válvulas cuyo temporizador venció, genera/resuelve alertas y recorta lecturas/weather de más de 48 h. Un reinicio posterior a `close_at` cierra al reanudar, no requiere un timer en memoria.
- Errores de base de datos no se convierten silenciosamente en éxito del mensaje: `eachMessage` lanza error para el mecanismo de reintento del consumer. Un fallo persistente necesita revisar logs y conectividad. El puente registra errores y vuelve a intentar.

## Logs esperados

```text
produced soil.moisture <station UUID> <UTC timestamp>
produced weather.tick <station UUID> <UTC timestamp>
consumed soil.moisture <station UUID>
upsert reading <station UUID> <UTC timestamp>
produced irrigation.commands <command UUID>
consumed irrigation.commands <command UUID>
produced valve.status <command UUID>
```

Estos son formatos esperados del código, **no una captura de ejecución real de Compose**. No se imprimen claves ni passwords. Los UUID y timestamps son datos didácticos de correlación.

## Verificación local

```sh
cd worker
npx tsc --noEmit
npx jest
```

Contratos puros en `domain.cjs`, tests en `domain.test.cjs`. La verificación no requiere credenciales ni conectarse al broker. Los tests no importan `shared.js` ni scripts de arranque. Para prueba integrada, seguir `../docs/ACEPTACION.md`.

## Límites operativos

La latencia ≤5 s es objetivo con un solo comando y red de clase, no garantía bajo congestión. El consumer procesa secuencialmente; colas largas aumentan demora. Kafka privado sin TLS/SASL es un recorte académico y no debe publicarse a Internet. La service role omite RLS, por lo que su acceso debe limitarse al host del backend. El puente por polling reemplaza al API/Edge productor opcional del PRD; no necesita credenciales Kafka en la app.
