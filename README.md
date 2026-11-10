# Trabajos prácticos — Desarrollo y Arquitectura de Aplicaciones Móviles 2026

| Carpeta | Trabajo | Stack |
|---|---|---|
| `tp1/` | Práctica base de React Native (contador + To-Do) | Expo, TypeScript |
| `tp2/` | Flujo de checkout de tienda | Expo, TypeScript |
| `tp3/` | Login iBank × Supabase | Expo Router, Supabase Auth |
| `tp4/` | AgroPulse | Expo, Supabase, Redpanda |
| `tp5/` | Network QoS Monitor | React Native CLI, módulo nativo Kotlin |
| `tp6/` | Network Diagnostics Suite | React Native CLI |
| `tp7/` | Satellite Tracker | Expo, satellite.js |

Cada carpeta tiene su propio README con instrucciones de instalación y ejecución, y el enunciado original en PDF.

## Estado y verificación
Todo se verificó con `tsc` y Jest (y los tests de cada backend) en un entorno sin Android SDK/JDK, sin dispositivo y sin credenciales reales. Falta de tu lado: compilar los APK, probar en dispositivo, grabar los videos pedidos y completar las validaciones que dependen de credenciales (N2YO, Space-Track, proyecto Supabase). Cada README de TP lista sus pendientes concretos.

- Sobre el Figma (TP2, TP3): requiere navegador/sesión y no pudo inspeccionarse; los diseños son equivalentes y los valores de estilo están centralizados en cada `theme` (ver README de cada TP).
