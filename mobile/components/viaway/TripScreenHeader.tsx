import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ViaColors, ViaFonts, ViaSpacing } from '@/constants/viaway-theme';
import { HeaderWave } from '@/components/viaway/HeaderWave';

/** Barra superior navy + onda, igual ao hub de checklist / câmbio. */
export function TripScreenHeader({ title }: { title: string }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <>
      <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.side}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color="#fff" />
          </Pressable>
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.side} />
      </View>
      <HeaderWave />
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ViaSpacing.margin,
    paddingBottom: 14,
    backgroundColor: ViaColors.navy,
  },
  side: { width: 40, alignItems: 'center', justifyContent: 'center' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: ViaFonts.h3,
    fontSize: 17,
    color: '#fff',
  },
});
