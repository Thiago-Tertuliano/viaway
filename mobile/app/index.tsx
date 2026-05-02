import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ViaColors } from '@/constants/viaway-theme';
import { getBootState } from '@/lib/session';

/**
 * Ponto de entrada: onboarding → autenticação → abas (ou assistente register-intent só se não houver sessão nem perfil salvo).
 */
export default function AppEntry() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const state = await getBootState();
      if (cancelled) return;

      if (!state.onboardingDone) {
        router.replace('/splash');
        return;
      }
      if (!state.authDone) {
        router.replace('/auth');
        return;
      }
      if (!state.hasProfile) {
        router.replace('/register-intent');
        return;
      }
      router.replace('/(tabs)');
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <View style={styles.root}>
      <ActivityIndicator size="large" color={ViaColors.coral} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ViaColors.background,
  },
});
