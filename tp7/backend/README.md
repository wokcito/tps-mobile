# Proxy de datos orbitales

Node 22+; sin dependencias externas. `npm test` ejecuta node:test; `npm start` escucha en 0.0.0.0:3000. Variables documentadas en el README de TP7. Inyectarlas desde el entorno del proceso o un gestor de secretos, nunca desde EXPO_PUBLIC_.

- `GET /catalog?group=stations|starlink|gps|weather|active|geo`
- `GET /orbital/:norad`
- `GET /validate/:norad`
- `source=spacetrack|n2yo|wheretheiss|CelesTrak` selecciona una fuente (sin fallback deliberadamente para validar independientemente).

Por defecto: CelesTrak → Space-Track si está configurado → N2YO si está configurado → Where the ISS at? (solo ISS). Caché de catálogo/órbitas 24 h y posiciones de validación 5 s; colapso de solicitudes concurrentes; 2000 entradas máximas. Los errores públicos no contienen URLs ni credenciales. Las ventanas estrictas de proveedores cuentan cada intento, login y reintentos; N2YO visualpasses tiene ventana adicional de 99/h.

Docker: `docker build -t satellite-proxy .` y `docker run --env-file /ruta/segura/variables -p 3000:3000 satellite-proxy`. No se construyó aquí (sin Docker/dispositivo requeridos). Para producción: TLS, autenticación y cuota de ingreso en reverse proxy; no exponer este servidor educativo sin protección. CORS abierto solo para desarrollo. Space-Track renueva sesión al vencer/tras error, sin guardar password/cookie en disco. No hay endpoint que reciba credenciales desde el móvil.
