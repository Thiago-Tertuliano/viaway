import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/viaway/AppHeader';
import { SectionCard } from '@/components/viaway/SectionCard';
import { useMenu } from '@/context/menu-context';
import { ViaColors, ViaRadius, ViaShadows, ViaSpacing, textBody, textH2 } from '@/constants/viaway-theme';

const AVATAR =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop';

const rows = [
  { icon: 'notifications-none' as const, label: 'Notificações' },
  { icon: 'credit-card' as const, label: 'Assinatura' },
  { icon: 'help-outline' as const, label: 'Ajuda' },
];

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const menu = useMenu();

  return (
    <View style={styles.root}>
      <AppHeader showAvatar={false} onMenuPress={() => menu.open()} />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: 100 + insets.bottom, paddingTop: ViaSpacing.lg },
        ]}>
        <Text style={styles.sectionTitle}>Sua conta</Text>
        <View style={styles.head}>
          <Image source={{ uri: AVATAR }} style={styles.bigAvatar} contentFit="cover" />
          <Text style={styles.nome}>Viajante</Text>
          <Text style={styles.email}>plano Grátis</Text>
        </View>
        {rows.map((r) => (
          <SectionCard key={r.label}>
          <Pressable
            key={r.label}
            onPress={() => {}}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: ViaColors.surfaceContainerLow }]}>
            <MaterialIcons name={r.icon} size={24} color={ViaColors.navy} />
            <Text style={styles.rowText}>{r.label}</Text>
            <MaterialIcons name="chevron-right" size={24} color={ViaColors.sand} />
          </Pressable>
          </SectionCard>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ViaColors.background },
  scroll: { paddingHorizontal: ViaSpacing.margin, gap: ViaSpacing.sm },
  sectionTitle: { ...textH2, color: ViaColors.navy, marginBottom: ViaSpacing.md },
  head: { alignItems: 'center', marginBottom: ViaSpacing.lg, gap: ViaSpacing.xs },
  bigAvatar: { width: 88, height: 88, borderRadius: 44, marginBottom: ViaSpacing.sm, backgroundColor: ViaColors.surfaceContainerLow },
  nome: { ...textH2, color: ViaColors.navy },
  email: { ...textBody, fontSize: 15, color: ViaColors.onSurfaceVariant },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ViaSpacing.md,
    paddingVertical: ViaSpacing.xs,
  },
  rowText: { ...textBody, flex: 1, color: ViaColors.navy, fontSize: 16 },
});
