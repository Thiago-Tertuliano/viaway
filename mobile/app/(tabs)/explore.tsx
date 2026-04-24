import { Image } from 'expo-image';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/viaway/AppHeader';
import { SectionCard } from '@/components/viaway/SectionCard';
import { useMenu } from '@/context/menu-context';
import { ViaColors, ViaRadius, ViaShadows, ViaSpacing, textBody, textH2 } from '@/constants/viaway-theme';

const CARD_IMG =
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&h=360&fit=crop';

export default function ExplorarScreen() {
  const insets = useSafeAreaInsets();
  const menu = useMenu();

  return (
    <View style={styles.root}>
      <AppHeader showAvatar onMenuPress={() => menu.open()} />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: 100 + insets.bottom, paddingTop: ViaSpacing.lg },
        ]}>
        <Text style={styles.heading}>Explorar</Text>
        <Text style={styles.p}>
          Inspire-se com destinos e dicas. Em breve conectaremos a recomendações com base no seu
          perfil e nas suas viagens.
        </Text>
        <SectionCard padded={false}>
        <View style={styles.card}>
          <Image source={{ uri: CARD_IMG }} style={styles.cardImg} contentFit="cover" />
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Estrada real</Text>
            <Text style={styles.cardSub}>
              Curadoria editorial: menos ruído, mais clareza para o próximo roteiro.
            </Text>
          </View>
        </View>
        </SectionCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ViaColors.background },
  scroll: { paddingHorizontal: ViaSpacing.margin, gap: ViaSpacing.md },
  heading: { ...textH2, color: ViaColors.navy, marginBottom: ViaSpacing.xs },
  p: { ...textBody, color: ViaColors.onSurfaceVariant, marginBottom: ViaSpacing.lg },
  card: { borderRadius: ViaRadius.lg, overflow: 'hidden' },
  cardImg: { width: '100%', height: 180 },
  cardBody: { padding: ViaSpacing.md, gap: ViaSpacing.sm },
  cardTitle: { fontFamily: textH2.fontFamily, fontSize: 18, color: ViaColors.navy },
  cardSub: { ...textBody, fontSize: 14, color: ViaColors.onSurfaceVariant },
});
