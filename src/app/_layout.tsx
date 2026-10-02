import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
} from '@expo-google-fonts/hanken-grotesk';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Palette } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/contexts/auth-context';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { isLoggedIn, initializing, profileLoaded, needsUsername } = useAuth();

  if (initializing || (isLoggedIn && !profileLoaded)) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Palette.page } }}>
      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="login" />
      </Stack.Protected>

      <Stack.Protected guard={isLoggedIn && needsUsername}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>

      <Stack.Protected guard={isLoggedIn && !needsUsername}>
        <Stack.Screen name="private" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AnimatedSplashOverlay />
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
