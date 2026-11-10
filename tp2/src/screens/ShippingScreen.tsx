import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useCart } from '../CartContext';
import { Field } from '../components/Field';
import { PrimaryButton } from '../components/PrimaryButton';
import type { RootStackParamList } from '../navigation';
import { ShippingErrors, ShippingForm, validateShipping } from '../shipping';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Shipping'>;

export default function ShippingScreen({ navigation }: Props) {
  const { shipping, setShipping } = useCart();
  const [form, setForm] = useState<ShippingForm>(
    shipping ?? { name: '', address: '', city: '', zip: '' },
  );
  const [errors, setErrors] = useState<ShippingErrors>({});
  const set = (k: keyof ShippingForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const next = () => {
    const e = validateShipping(form);
    setErrors(e);
    if (Object.keys(e).length === 0) {
      setShipping(form);
      navigation.navigate('Payment');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Field label="Nombre completo" testID="ship-name" value={form.name} onChangeText={set('name')} error={errors.name} />
        <Field label="Dirección" testID="ship-address" value={form.address} onChangeText={set('address')} error={errors.address} />
        <View style={styles.row}>
          <Field label="Ciudad" testID="ship-city" value={form.city} onChangeText={set('city')} error={errors.city} />
          <Field label="Código postal" testID="ship-zip" value={form.zip} onChangeText={set('zip')} error={errors.zip} autoCapitalize="characters" />
        </View>
        <PrimaryButton testID="go-payment" title="Continuar al pago" onPress={next} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  row: { flexDirection: 'row', gap: 12 },
});
