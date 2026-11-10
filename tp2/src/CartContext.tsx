import { createContext, ReactNode, useContext, useMemo, useReducer, useState } from 'react';
import { CartAction, CartItem, cartReducer, initialItems } from './cart';
import { ShippingForm } from './shipping';

interface CartContextValue {
  items: CartItem[];
  dispatch: (a: CartAction) => void;
  shipping: ShippingForm | null;
  setShipping: (s: ShippingForm) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  children,
  initial = initialItems,
}: {
  children: ReactNode;
  initial?: CartItem[];
}) {
  const [items, dispatch] = useReducer(cartReducer, initial);
  const [shipping, setShipping] = useState<ShippingForm | null>(null);
  const value = useMemo(() => ({ items, dispatch, shipping, setShipping }), [items, shipping]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider');
  return ctx;
}
