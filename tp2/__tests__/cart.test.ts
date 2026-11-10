import {
  CartItem,
  cartReducer,
  clampQty,
  initialItems,
  itemCount,
  shippingCost,
  subtotal,
  total,
} from '../src/cart';

describe('cartReducer', () => {
  it('cambia color y talle solo si son opciones válidas del producto', () => {
    let items = cartReducer(initialItems, { type: 'setColor', id: 'p1', color: 'Rojo' });
    expect(items[0].color).toBe('Rojo');
    items = cartReducer(items, { type: 'setColor', id: 'p1', color: 'Violeta' });
    expect(items[0].color).toBe('Rojo');
    items = cartReducer(items, { type: 'setSize', id: 'p1', size: '42' });
    expect(items[0].size).toBe('42');
    items = cartReducer(items, { type: 'setSize', id: 'p1', size: '99' });
    expect(items[0].size).toBe('42');
  });

  it('cambia la cantidad dentro de los límites', () => {
    expect(clampQty(0)).toBe(1);
    expect(clampQty(99)).toBe(10);
    expect(clampQty(3.7)).toBe(3);
    expect(clampQty(NaN)).toBe(1);
    const items = cartReducer(initialItems, { type: 'setQty', id: 'p2', qty: 4 });
    expect(items[1].qty).toBe(4);
  });

  it('elimina productos sin tocar los demás', () => {
    const items = cartReducer(initialItems, { type: 'remove', id: 'p2' });
    expect(items.map((i) => i.id)).toEqual(['p1', 'p3']);
    expect(cartReducer(items, { type: 'clear' })).toEqual([]);
  });
});

describe('totales', () => {
  const one = (price: number, qty: number): CartItem => ({ ...initialItems[0], price, qty });

  it('calcula subtotal y cantidad', () => {
    const items = [one(10.1, 2), one(0.2, 1)];
    expect(subtotal(items)).toBe(20.4);
    expect(itemCount(items)).toBe(3);
  });

  it('cobra envío bajo el mínimo y es gratis desde 150 o con carrito vacío', () => {
    expect(shippingCost([one(100, 1)])).toBe(9.9);
    expect(total([one(100, 1)])).toBe(109.9);
    expect(shippingCost([one(150, 1)])).toBe(0);
    expect(shippingCost([])).toBe(0);
    expect(total([])).toBe(0);
  });
});
