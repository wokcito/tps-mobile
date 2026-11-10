export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  colors: { name: string; hex: string }[];
  sizes: string[];
  color: string;
  size: string;
  qty: number;
}

export const MIN_QTY = 1;
export const MAX_QTY = 10;
export const FREE_SHIPPING_FROM = 150;
export const SHIPPING_COST = 9.9;

export const initialItems: CartItem[] = [
  {
    id: 'p1',
    name: 'Zapatillas Urban Run',
    price: 89.9,
    image: '👟',
    colors: [
      { name: 'Negro', hex: '#1B1F2A' },
      { name: 'Blanco', hex: '#F2F2F2' },
      { name: 'Rojo', hex: '#D32F2F' },
    ],
    sizes: ['38', '39', '40', '41', '42'],
    color: 'Negro',
    size: '40',
    qty: 1,
  },
  {
    id: 'p2',
    name: 'Campera Térmica',
    price: 129,
    image: '🧥',
    colors: [
      { name: 'Azul', hex: '#1E4FD8' },
      { name: 'Verde', hex: '#2E7D32' },
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    color: 'Azul',
    size: 'M',
    qty: 1,
  },
  {
    id: 'p3',
    name: 'Mochila Trekking 30L',
    price: 54.5,
    image: '🎒',
    colors: [
      { name: 'Gris', hex: '#757575' },
      { name: 'Naranja', hex: '#EF6C00' },
    ],
    sizes: ['Única'],
    color: 'Gris',
    size: 'Única',
    qty: 2,
  },
];

export type CartAction =
  | { type: 'setColor'; id: string; color: string }
  | { type: 'setSize'; id: string; size: string }
  | { type: 'setQty'; id: string; qty: number }
  | { type: 'remove'; id: string }
  | { type: 'clear' };

export function clampQty(qty: number): number {
  if (!Number.isFinite(qty)) return MIN_QTY;
  return Math.min(MAX_QTY, Math.max(MIN_QTY, Math.trunc(qty)));
}

export function cartReducer(items: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'setColor':
      return items.map((i) =>
        i.id === action.id && i.colors.some((c) => c.name === action.color)
          ? { ...i, color: action.color }
          : i,
      );
    case 'setSize':
      return items.map((i) =>
        i.id === action.id && i.sizes.includes(action.size) ? { ...i, size: action.size } : i,
      );
    case 'setQty':
      return items.map((i) => (i.id === action.id ? { ...i, qty: clampQty(action.qty) } : i));
    case 'remove':
      return items.filter((i) => i.id !== action.id);
    case 'clear':
      return [];
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function subtotal(items: CartItem[]): number {
  return round2(items.reduce((acc, i) => acc + i.price * i.qty, 0));
}

export function shippingCost(items: CartItem[]): number {
  const sub = subtotal(items);
  return sub === 0 || sub >= FREE_SHIPPING_FROM ? 0 : SHIPPING_COST;
}

export function total(items: CartItem[]): number {
  return round2(subtotal(items) + shippingCost(items));
}

export function itemCount(items: CartItem[]): number {
  return items.reduce((acc, i) => acc + i.qty, 0);
}

export const money = (n: number) => `$${n.toFixed(2)}`;
