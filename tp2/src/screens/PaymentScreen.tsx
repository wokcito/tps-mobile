import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCart } from '../CartContext';
import { money, total } from '../cart';
import { Chip } from '../components/Chip';
import { Field } from '../components/Field';
import { PrimaryButton } from '../components/PrimaryButton';
import type { RootStackParamList } from '../navigation';
import {
  CARD_TYPES,
  CardErrors,
  CardForm,
  digitsOnly,
  expectedCvvLength,
  formatCardNumber,
  formatExpiry,
  validateCard,
} from '../payment';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Payment'>;

export default function PaymentScreen({ navigation }: Props) {
  const { items, dispatch } = useCart();
  const [form, setForm] = useState<CardForm>({
    type: 'visa',
    number: '',
    holder: '',
    expiry: '',
    cvv: '',
  });
  const [errors, setErrors] = useState<CardErrors>({});
  const amount = total(items);

  const pay = () => {
    const e = validateCard(form);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
    const last4 = digitsOnly(form.number).slice(-4);
    dispatch({ type: 'clear' });
    navigation.reset({
      index: 0,
      routes: [{ name: 'Confirmation', params: { orderId, last4, amount } }],
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Tipo de tarjeta</Text>
        <View style={styles.types}>
          {CARD_TYPES.map((t) => (
            <Chip
              key={t.key}
              testID={`card-type-${t.key}`}
              label={t.label}
              selected={form.type === t.key}
              onPress={() => {
                setForm((f) => ({ ...f, type: t.key }));
                setErrors({});
              }}
            />
          ))}
        </View>
        <Field
          label="Número de tarjeta"
          testID="card-number"
          keyboardType="number-pad"
          value={form.number}
          onChangeText={(v) => setForm((f) => ({ ...f, number: formatCardNumber(v) }))}
          placeholder="0000 0000 0000 0000"
          error={errors.number}
        />
        <Field
          label="Titular"
          testID="card-holder"
          autoCapitalize="characters"
          value={form.holder}
          onChangeText={(v) => setForm((f) => ({ ...f, holder: v }))}
          error={errors.holder}
        />
        <View style={styles.row}>
          <Field
            label="Vencimiento"
            testID="card-expiry"
            keyboardType="number-pad"
            value={form.expiry}
            onChangeText={(v) => setForm((f) => ({ ...f, expiry: formatExpiry(v) }))}
            placeholder="MM/AA"
            error={errors.expiry}
          />
          <Field
            label="CVV"
            testID="card-cvv"
            keyboardType="number-pad"
            secureTextEntry
            maxLength={expectedCvvLength(form.number)}
            value={form.cvv}
            onChangeText={(v) => setForm((f) => ({ ...f, cvv: digitsOnly(v) }))}
            error={errors.cvv}
          />
        </View>
        <PrimaryButton testID="pay" title={`Pagar ${money(amount)}`} onPress={pay} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  title: { color: colors.muted, marginBottom: 8 },
  types: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },
});
