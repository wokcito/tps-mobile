import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { money } from '../cart';
import { PrimaryButton } from '../components/PrimaryButton';
import type { RootStackParamList } from '../navigation';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Confirmation'>;

export default function ConfirmationScreen({ route, navigation }: Props) {
  const { orderId, last4, amount } = route.params;
  return (
    <View style={styles.screen}>
      <Text style={styles.check}>✅</Text>
      <Text style={styles.title}>¡Pago exitoso!</Text>
      <Text style={styles.text}>Pedido {orderId}</Text>
      <Text style={styles.text}>
        Se cobraron {money(amount)} a la tarjeta terminada en {last4}
      </Text>
      <View style={{ height: 24 }} />
      <PrimaryButton
        title="Volver a la tienda"
        onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Cart' }] })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  check: { fontSize: 64 },
  title: { fontSize: 24, fontWeight: '800', color: colors.success, marginVertical: 8 },
  text: { color: colors.text, fontSize: 15, textAlign: 'center', marginTop: 4 },
});
