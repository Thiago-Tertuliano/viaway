import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ViaColors, ViaFonts } from '@/constants/viaway-theme';
import { getBootState } from '@/lib/session';

const SPLASH_MS = 1200;

export default function SplashScreen() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const state = await getBootState();
      if (cancelled) return;

      if (state.onboardingDone) {
        router.replace('/auth');
        return;
      }

      timerRef.current = setTimeout(() => {
        if (!cancelled) router.replace('/onboarding');
      }, SPLASH_MS);
    })();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [router]);

  return (
    <View style={styles.root}>
      <Text style={styles.brand}>ViaWay</Text>
      <Text style={styles.sub}>Planeje suas viagens com contexto real</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: ViaColors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  brand: { fontFamily: ViaFonts.h1, fontSize: 42, color: ViaColors.onPrimary, letterSpacing: -1 },
  sub: { fontFamily: ViaFonts.body, fontSize: 14, color: 'rgba(255,255,255,0.82)' },
});
