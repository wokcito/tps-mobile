# TP1 — Práctica Base de React Native

App Expo (TypeScript) con los dos ejercicios del enunciado, en dos pestañas.

## 01-A Contador + Toggle de tema
- Estado inicial `count = 0`, tema claro; ambos con `useState`.
- `+1`, `Reset` y `Toggle de tema` (fondo, tipografía y tarjeta cambian por tema, una sola pantalla).
- Valor grande y centrado; el layout usa `ScrollView` + `flexWrap`, por lo que no se rompe en pantallas chicas.
- Bonus: `+1` se deshabilita al llegar a 10 con aviso, `useThemeStyles()` tipado y `Pressable` con feedback visual (opacidad en iOS, ripple en Android).

## 02-B To-Do con FlatList + persistencia
- Input con trim (no agrega vacías), listado con `FlatList` y `keyExtractor` estable (id único).
- Tap: completar/descompletar. Long press: elimina de inmediato. Doble tap: edición inline.
- Persistencia en `@react-native-async-storage/async-storage`; se restaura al reiniciar.
- Contador total/completadas y filtro Todas / Activas / Completadas (no pierde estado).
- `LayoutAnimation` al completar/agregar/eliminar.
- Estado local en el componente (sin Redux/MobX).
- Nota: el bonus "confirmación con Alert" no se aplica porque el criterio de aceptación exige que el long press elimine inmediatamente.

## Correr
```bash
npm install
npx expo start      # Android / iOS / Expo Go
npm test            # Jest (lógica de tareas + pantallas)
npm run typecheck
```
