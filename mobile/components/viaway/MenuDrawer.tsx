import { MaterialIcons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMenu } from '@/context/menu-context';
import { ViaColors, ViaFonts, ViaSpacing, textH2 } from '@/constants/viaway-theme';

const items: {
  key: string;
  label: string;
  href: Href;
  icon: keyof typeof MaterialIcons.glyphMap;
}[] = [
  { key: 'home', label: 'Início', href: '/(tabs)' as Href, icon: 'home' },
  { key: 'explore', label: 'Explorar', href: '/(tabs)/explore' as Href, icon: 'explore' },
  { key: 'profile', label: 'Perfil', href: '/(tabs)/profile' as Href, icon: 'person' },
  { key: 'nova', label: 'Nova viagem', href: '/criar-viagem' as Href, icon: 'add-circle-outline' },
];

export function MenuDrawer() {
  const { visible, close } = useMenu();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Fechar menu" />
        <View
          style={[
            styles.sheet,
            {
              paddingTop: insets.top + ViaSpacing.lg,
              paddingBottom: insets.bottom + ViaSpacing.lg,
            },
          ]}>
          <View style={styles.brandRow}>
            <Text style={styles.brand}>ViaWay</Text>
            <Pressable
              onPress={close}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
              accessibilityLabel="Fechar">
              <MaterialIcons name="close" size={28} color={ViaColors.navy} />
            </Pressable>
          </View>
          <View style={styles.list}>
            {items.map((it) => (
              <Pressable
                key={it.key}
                onPress={() => {
                  close();
                  setTimeout(() => {
                    if (it.key === 'home') {
                      router.replace('/(tabs)' as Href);
                    } else {
                      router.push(it.href);
                    }
                  }, 0);
                }}
                style={({ pressed }) => [styles.item, pressed && { backgroundColor: ViaColors.surfaceContainerLow }]}>
                <MaterialIcons name={it.icon} size={24} color={ViaColors.navy} />
                <Text style={styles.itemLabel}>{it.label}</Text>
                <MaterialIcons name="chevron-right" size={20} color={ViaColors.sand} />
              </Pressable>
            ))}
          </View>
          <Text style={styles.footer}>
            O backend precisa de `DISABLE_AUTH=true` em dev ou Clerk configurado para a API
            exigir JWT.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheet: {
    width: '84%',
    maxWidth: 360,
    backgroundColor: ViaColors.background,
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: ViaColors.sand,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: ViaSpacing.lg,
    paddingHorizontal: ViaSpacing.lg,
  },
  brand: { ...textH2, color: ViaColors.navy, fontSize: 26 },
  closeBtn: { padding: 4 },
  list: { gap: ViaSpacing.xs, paddingHorizontal: ViaSpacing.md },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ViaSpacing.md,
    paddingHorizontal: ViaSpacing.md,
    borderRadius: 12,
    gap: ViaSpacing.md,
  },
  itemLabel: {
    flex: 1,
    fontFamily: ViaFonts.bodySemi,
    fontSize: 16,
    color: ViaColors.navy,
  },
  footer: {
    fontFamily: ViaFonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: ViaColors.onSurfaceVariant,
    paddingHorizontal: ViaSpacing.lg,
    marginTop: ViaSpacing.xl,
  },
});
