import { Redirect } from 'expo-router';
import { useAuth } from '../src/auth/AuthProvider';

export default function Index() {
  const { session } = useAuth();
  return <Redirect href={session ? '/home' : '/login'} />;
}
