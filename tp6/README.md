# TP6 — Network Diagnostics Suite

- `NetDiag/` — app React Native 0.88 (TypeScript, CLI bare; no corre en Expo Go).
- `backend/` — backend stub de sincronización (Node, sin dependencias).
- `DOCUMENTO_TECNICO.md` — SNMP, credenciales SSH, cola offline.

## Correr
```bash
# Backend
cd backend && npm start            # :3000   (tests: npm test)

# App (requiere JDK 17 + Android SDK)
cd NetDiag && npm install --legacy-peer-deps
# editar src/config/index.ts -> BACKEND_URL con la IP LAN de tu PC
npx react-native run-android       # o: cd android && ./gradlew assembleRelease  (APK)
npm test && npx tsc --noEmit
```
Fichas de prueba para QR: generá un QR con el texto `ONT-0001` o `RTR-0042`.

## Pendiente de tu lado
Compilar el APK, probar en un dispositivo real (escaneo, SNMP contra un equipo real, SSH, GPS) y grabar el video demo.
