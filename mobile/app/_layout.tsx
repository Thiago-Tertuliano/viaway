import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useViawayFonts } from '@/hooks/use-viaway-fonts';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ViaColors } from '@/constants/viaway-theme';
import { ViawayQueryProvider } from '@/context/query-provider';

const navLight = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: ViaColors.background,
    card: ViaColors.surfaceWhite,
    text: ViaColors.onSurface,
    border: ViaColors.sand,
    primary: ViaColors.navy,
  },
};

const navDark = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0f1115',
    card: '#1a1d24',
    text: '#f3f0f2',
    border: '#2a2d35',
    primary: ViaColors.sand,
  },
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const loaded = useViawayFonts();

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? navDark : navLight}>
        <ViawayQueryProvider>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="splash" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="auth" options={{ headerShown: false }} />
            <Stack.Screen name="register-intent" options={{ headerShown: false }} />
            <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="criar-viagem" options={{ headerShown: false }} />
            <Stack.Screen name="viagem-criada" options={{ headerShown: false }} />
            <Stack.Screen name="trip/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
        </ViawayQueryProvider>
        <StatusBar style="light" backgroundColor={ViaColors.navy} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return <RootLayoutNav />;
}
