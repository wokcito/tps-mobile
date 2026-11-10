import { StatusBar } from 'expo-status-bar';
import { CartProvider } from './src/CartContext';
import { RootNavigator } from './src/navigation';

export default function App() {
  return (
    <CartProvider>
      <RootNavigator />
      <StatusBar style="auto" />
    </CartProvider>
  );
}
