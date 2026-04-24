import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ViaColors, ViaFonts } from '@/constants/viaway-theme';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => {
      router.replace('/onboarding');
    }, 1200);
    return () => clearTimeout(t);
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

