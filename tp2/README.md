# TP2 — Flujo de checkout de tienda

App Expo (TypeScript, React Navigation) con el flujo **Shopping Cart → Envío → Secure Payment → Confirmación**.

> **Nota sobre el diseño de Figma:** el archivo de la comunidad ("A Checkout Flow") requiere navegador/sesión y no pudo inspeccionarse desde el entorno de desarrollo. Se respetaron los nombres de pantalla del enunciado (*Shopping Cart*, *Secure Payment*) y se armó un diseño equivalente; los colores y espaciados están centralizados en `src/theme.ts` para ajustarlos al archivo si hace falta.

## Requerimientos de negocio
1. **Shopping Cart: seleccionar Color, Size y Qty** — por producto: muestras de color, chips de talle y stepper de cantidad (1–10). Solo se aceptan opciones válidas del producto.
2. **Eliminar productos** — botón de eliminar por ítem; carrito vacío muestra estado vacío. Totales y envío (gratis desde $150) se recalculan.
3. **Secure Payment con tipos de tarjeta** — opciones **Visa**, **Master** y **Otras**. Se valida que el número corresponda al tipo elegido (prefijo + Luhn); "Otras" acepta el resto (p. ej. Amex, con CVV de 4 dígitos). Vencimiento MM/AA vigente y titular obligatorios.

## Estructura
- `src/cart.ts`, `src/payment.ts`, `src/shipping.ts`: lógica pura, sin dependencias de UI.
- `src/CartContext.tsx`: estado del carrito (`useReducer`).
- `src/screens/*`: pantallas. `src/components/*`: Chip, Field, PrimaryButton.

## Correr
```bash
npm install
npx expo start
npm test && npm run typecheck
```
Tarjetas de prueba: Visa `4111 1111 1111 1111`, Master `5555 5555 5555 4444`, Amex (Otras) `3782 822463 10005`. Es una demo: no se procesa ningún pago real.
