import { Redirect } from 'expo-router';

import { useAuth } from '@/contexts/auth-context';

export default function Index() {
  const { isLoggedIn, needsUsername } = useAuth();
  const href = !isLoggedIn ? '/login' : needsUsername ? '/onboarding' : '/private';
  return <Redirect href={href} />;
}
