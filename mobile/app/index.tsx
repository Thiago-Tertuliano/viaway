import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ViaColors } from '@/constants/viaway-theme';
import { getBootState } from '@/lib/session';

export default function AppEntry() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const state = await getBootState();
      if (!mounted) return;

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
      mounted = false;
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

