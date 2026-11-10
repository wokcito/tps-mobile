import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CartScreen from './screens/CartScreen';
import ConfirmationScreen from './screens/ConfirmationScreen';
import PaymentScreen from './screens/PaymentScreen';
import ShippingScreen from './screens/ShippingScreen';

export type RootStackParamList = {
  Cart: undefined;
  Shipping: undefined;
  Payment: undefined;
  Confirmation: { orderId: string; last4: string; amount: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Cart">
        <Stack.Screen name="Cart" component={CartScreen} options={{ title: 'Shopping Cart' }} />
        <Stack.Screen name="Shipping" component={ShippingScreen} options={{ title: 'Envío' }} />
        <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Secure Payment' }} />
        <Stack.Screen
          name="Confirmation"
          component={ConfirmationScreen}
          options={{ title: 'Confirmación', headerBackVisible: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
