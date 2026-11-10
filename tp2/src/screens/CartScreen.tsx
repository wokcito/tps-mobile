import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useCart } from '../CartContext';
import {
  CartItem,
  FREE_SHIPPING_FROM,
  MAX_QTY,
  MIN_QTY,
  itemCount,
  money,
  shippingCost,
  subtotal,
  total,
} from '../cart';
import { Chip } from '../components/Chip';
import { PrimaryButton } from '../components/PrimaryButton';
import type { RootStackParamList } from '../navigation';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Cart'>;

function CartRow({ item }: { item: CartItem }) {
  const { dispatch } = useCart();
  return (
    <View style={styles.card} testID={`item-${item.id}`}>
      <View style={styles.head}>
        <View style={styles.thumb}>
          <Text style={styles.emoji}>{item.image}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.price}>{money(item.price)}</Text>
        </View>
        <Pressable
          testID={`remove-${item.id}`}
          accessibilityLabel={`Eliminar ${item.name}`}
          accessibilityRole="button"
          onPress={() => dispatch({ type: 'remove', id: item.id })}
          style={styles.remove}
        >
          <Text style={styles.removeText}>🗑</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>Color: {item.color}</Text>
      <View style={styles.row}>
        {item.colors.map((c) => (
          <Pressable
            key={c.name}
            testID={`color-${item.id}-${c.name}`}
            accessibilityLabel={`Color ${c.name}`}
            accessibilityState={{ selected: item.color === c.name }}
            onPress={() => dispatch({ type: 'setColor', id: item.id, color: c.name })}
            style={[styles.swatchWrap, item.color === c.name && styles.swatchSelected]}
          >
            <View style={[styles.swatch, { backgroundColor: c.hex }]} />
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Talle: {item.size}</Text>
      <View style={styles.row}>
        {item.sizes.map((s) => (
          <Chip
            key={s}
            testID={`size-${item.id}-${s}`}
            label={s}
            selected={item.size === s}
            onPress={() => dispatch({ type: 'setSize', id: item.id, size: s })}
          />
        ))}
      </View>

      <Text style={styles.label}>Cantidad</Text>
      <View style={styles.qty}>
        <Pressable
          testID={`qty-minus-${item.id}`}
          accessibilityLabel="Restar uno"
          disabled={item.qty <= MIN_QTY}
          onPress={() => dispatch({ type: 'setQty', id: item.id, qty: item.qty - 1 })}
          style={[styles.qtyBtn, item.qty <= MIN_QTY && styles.qtyDisabled]}
        >
          <Text style={styles.qtyText}>−</Text>
        </Pressable>
        <Text style={styles.qtyValue} testID={`qty-${item.id}`}>
          {item.qty}
        </Text>
        <Pressable
          testID={`qty-plus-${item.id}`}
          accessibilityLabel="Sumar uno"
          disabled={item.qty >= MAX_QTY}
          onPress={() => dispatch({ type: 'setQty', id: item.id, qty: item.qty + 1 })}
          style={[styles.qtyBtn, item.qty >= MAX_QTY && styles.qtyDisabled]}
        >
          <Text style={styles.qtyText}>+</Text>
        </Pressable>
        <Text style={styles.lineTotal}>{money(item.price * item.qty)}</Text>
      </View>
    </View>
  );
}

export default function CartScreen({ navigation }: Props) {
  const { items } = useCart();

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>🛒</Text>
        <Text style={styles.emptyText}>Tu carrito está vacío</Text>
      </View>
    );
  }

  const ship = shippingCost(items);
  return (
    <View style={styles.screen}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => <CartRow item={item} />}
        ListFooterComponent={
          <View style={styles.summary}>
            <Text style={styles.sumLine}>
              Productos ({itemCount(items)}): <Text testID="subtotal">{money(subtotal(items))}</Text>
            </Text>
            <Text style={styles.sumLine}>
              Envío:{' '}
              <Text testID="shipping">{ship === 0 ? 'Gratis' : money(ship)}</Text>
            </Text>
            {ship > 0 && (
              <Text style={styles.hint}>Envío gratis desde {money(FREE_SHIPPING_FROM)}</Text>
            )}
            <Text style={styles.totalLine}>
              Total: <Text testID="total">{money(total(items))}</Text>
            </Text>
          </View>
        }
      />
      <View style={styles.footer}>
        <PrimaryButton
          testID="go-checkout"
          title="Continuar al envío"
          onPress={() => navigation.navigate('Shipping')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 30 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  price: { color: colors.muted, marginTop: 2 },
  remove: { padding: 10, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  removeText: { fontSize: 20 },
  label: { color: colors.muted, fontSize: 13, marginTop: 12, marginBottom: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatchWrap: { padding: 3, borderRadius: 20, borderWidth: 2, borderColor: 'transparent' },
  swatchSelected: { borderColor: colors.primary },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  qty: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyDisabled: { opacity: 0.35 },
  qtyText: { fontSize: 20, color: colors.text },
  qtyValue: { fontSize: 18, fontWeight: '700', minWidth: 24, textAlign: 'center', color: colors.text },
  lineTotal: { marginLeft: 'auto', fontWeight: '700', fontSize: 16, color: colors.text },
  summary: { paddingVertical: 8, gap: 4 },
  sumLine: { color: colors.text, fontSize: 15 },
  hint: { color: colors.muted, fontSize: 12 },
  totalLine: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 6 },
  footer: { padding: 16, backgroundColor: colors.card, borderTopWidth: 1, borderColor: colors.border },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  emptyEmoji: { fontSize: 56 },
  emptyText: { marginTop: 8, color: colors.muted, fontSize: 16 },
});
