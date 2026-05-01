import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ViaColors } from '@/constants/viaway-theme';
import { getBootState } from '@/lib/session';

export default function AppEntry() {
  const router = useRouter();

  useEffect(() => {
    // 🚧 DEV: pulando auth para testes de UI — restaurar depois
    // if (!state.onboardingDone) router.replace('/splash');
    // if (!state.authDone) router.replace('/auth');
    // if (!state.hasProfile) router.replace('/register-intent');
    router.replace('/(tabs)');
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

