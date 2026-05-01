import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SectionCard } from '@/components/viaway/SectionCard';
import { HeaderWave } from '@/components/viaway/HeaderWave';
import { listViagens, type ViagemJson } from '@/lib/viaway-api';
import {
  ViaColors,
  ViaFonts,
  ViaRadius,
  ViaShadows,
  ViaSpacing,
  textBody,
  textBodySm,
  textLabel,
} from '@/constants/viaway-theme';

const HERO_CARD = {
  image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&h=720&fit=crop',
  title: 'Lugares no app, rota no mapa do celular',
  description:
    'Monte a lista de lugares na viagem e abra no Google Maps ou Apple Maps com paradas na ordem — sem mapa embutido no Viaway.',
};

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=85&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=900&q=85&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=900&q=85&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=900&q=85&auto=format&fit=crop',
];

const DESTINOS = [
  {
    id: 'patagonia',
    name: 'Patagônia',
    subtitle: 'natureza e trilhas',
    image: 'https://images.unsplash.com/photo-1530841377377-3ff06c0ca713?w=800&h=520&fit=crop',
  },
  {
    id: 'lisboa',
    name: 'Lisboa',
    subtitle: 'cidade histórica',
    image: 'https://images.unsplash.com/photo-1558370781-d6196949e317?w=800&h=520&fit=crop',
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    subtitle: 'urbano contemporâneo',
    image: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800&h=520&fit=crop',
  },
];

const TIPS = [
  'Defina seu teto de orçamento antes de reservar hospedagem.',
  'Sempre vincule lugares salvos ao itinerário da viagem.',
  'Use checklist para itens críticos com prazo e prioridade.',
];

function tripImage(v: ViagemJson) {
  if (v.capaUrl) return v.capaUrl;
  return FALLBACK_IMAGES[v.id.charCodeAt(v.id.length - 1) % FALLBACK_IMAGES.length];
}

function statusLabel(s: string) {
  if (s === 'em_andamento') return 'Em andamento';
  if (s === 'planejando') return 'Planejando';
  if (s === 'concluida') return 'Concluída';
  return s;
}

function statusColor(s: string) {
  if (s === 'em_andamento') return '#22C55E';
  if (s === 'planejando') return '#F59E0B';
  return '#6B7280';
}

export default function ExplorarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qClient = useQueryClient();

  const q = useQuery({
    queryKey: ['viagens'] as const,
    queryFn: async () => (await listViagens(1)).data,
  });

  const viagens = (q.data ?? []) as ViagemJson[];

  return (
    <View style={styles.root}>
      <ScrollView
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={q.isFetching && !q.isLoading}
            onRefresh={() => qClient.invalidateQueries({ queryKey: ['viagens'] })}
            colors={[ViaColors.navy]}
            tintColor={ViaColors.navy}
          />
        }
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}>

        <View style={[styles.simpleHeader, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.headerTitle}>Explorar</Text>
          <Text style={styles.headerSub}>Roteiros, lugares e ideias</Text>
        </View>
        <HeaderWave />
        <View style={[styles.scroll, { paddingTop: ViaSpacing.lg }]}>

          <SectionCard padded={false}>
            <View style={styles.heroCard}>
              <Image source={{ uri: HERO_CARD.image }} style={styles.heroImg} contentFit="cover" />
              <View style={styles.heroOverlay} />
              <View style={styles.heroBody}>
                <Text style={styles.heroBadge}>Viaway</Text>
                <Text style={styles.heroTitle}>{HERO_CARD.title}</Text>
                <Text style={styles.heroSub}>{HERO_CARD.description}</Text>
              </View>
            </View>
          </SectionCard>

          <SectionCard>
            <View style={styles.blockHead}>
              <Text style={styles.blockTitle}>Meus roteiros</Text>
              <Text style={styles.blockSub}>
                Viagens que você criou. Use os botões para itinerário ou lugares (a lista abre a rota nos mapas do
                celular).
              </Text>
            </View>
            {q.isLoading ? (
              <View style={styles.loadRow}>
                <ActivityIndicator color={ViaColors.navy} />
                <Text style={styles.loadTxt}>Carregando viagens…</Text>
              </View>
            ) : viagens.length === 0 ? (
              <View style={styles.emptyRoteiros}>
                <MaterialIcons name="route" size={32} color={ViaColors.navy} />
                <Text style={styles.emptyTitle}>Nenhum roteiro ainda</Text>
                <Text style={styles.emptySub}>Crie uma viagem e o roteiro aparece aqui para acesso rápido.</Text>
                <Pressable
                  onPress={() => router.push('/criar-viagem')}
                  style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: 0.88 }]}>
                  <MaterialIcons name="add" size={18} color="#fff" />
                  <Text style={styles.emptyBtnTxt}>Nova viagem</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hScroll}>
                {viagens.map((v) => {
                  const sc = statusColor(v.status);
                  return (
                    <View key={v.id} style={styles.tripCardWrap}>
                      <View style={styles.tripCard}>
                        <Image
                          source={{ uri: tripImage(v) }}
                          style={styles.tripImg}
                          contentFit="cover"
                        />
                        <View style={styles.tripBody}>
                          <View style={[styles.statusPill, { borderColor: sc }]}>
                            <View style={[styles.statusDot, { backgroundColor: sc }]} />
                            <Text style={[styles.statusTxt, { color: sc }]}>{statusLabel(v.status)}</Text>
                          </View>
                          <Text style={styles.tripNome} numberOfLines={1}>
                            {v.nome}
                          </Text>
                          <Text style={styles.tripDest} numberOfLines={2}>
                            {v.destinoPrincipal}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.tripActions}>
                        <Pressable
                          onPress={() =>
                            router.push({ pathname: '/trip/[id]/itinerario', params: { id: v.id } })
                          }
                          style={({ pressed }) => [styles.miniBtn, pressed && { opacity: 0.85 }]}>
                          <MaterialIcons name="route" size={18} color={ViaColors.navy} />
                          <Text style={styles.miniBtnTxt}>Itinerário</Text>
                        </Pressable>
                        <Pressable
                          onPress={() =>
                            router.push({ pathname: '/trip/[id]/lugares', params: { id: v.id } })
                          }
                          style={({ pressed }) => [styles.miniBtn, pressed && { opacity: 0.85 }]}>
                          <MaterialIcons name="place" size={18} color={ViaColors.navy} />
                          <Text style={styles.miniBtnTxt}>Lugares</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </SectionCard>

          <SectionCard>
            <Text style={styles.blockTitle}>Ideias para a próxima viagem</Text>
            <View style={styles.grid}>
              {DESTINOS.map((item) => (
                <View key={item.id} style={styles.destinationCard}>
                  <Image source={{ uri: item.image }} style={styles.destinationImg} contentFit="cover" />
                  <View style={styles.destinationBody}>
                    <Text style={styles.destinationTitle}>{item.name}</Text>
                    <Text style={styles.destinationSubtitle}>{item.subtitle}</Text>
                  </View>
                </View>
              ))}
            </View>
          </SectionCard>

          <SectionCard>
            <Text style={styles.blockTitle}>Checklist rápido de planejamento</Text>
            <View style={styles.tipList}>
              {TIPS.map((tip) => (
                <View key={tip} style={styles.tipRow}>
                  <View style={styles.tipDot} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </SectionCard>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ViaColors.background },
  simpleHeader: {
    backgroundColor: ViaColors.navy,
    paddingHorizontal: ViaSpacing.margin,
    paddingBottom: 20,
    gap: 4,
  },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 28, color: '#FFFFFF', letterSpacing: -0.5 },
  headerSub: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  scroll: { paddingHorizontal: ViaSpacing.margin, gap: ViaSpacing.md },
  heroCard: { borderRadius: ViaRadius.lg, overflow: 'hidden', minHeight: 210, ...ViaShadows.level1 },
  heroImg: { ...StyleSheet.absoluteFillObject },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.44)' },
  heroBody: { padding: ViaSpacing.md, minHeight: 210, justifyContent: 'flex-end', gap: 6 },
  heroBadge: { ...textLabel, color: 'rgba(255,255,255,0.84)' },
  heroTitle: { fontFamily: ViaFonts.h3, fontSize: 22, lineHeight: 29, color: ViaColors.onPrimary },
  heroSub: { ...textBodySm, color: 'rgba(255,255,255,0.94)', maxWidth: 320 },
  blockHead: { marginBottom: ViaSpacing.md, gap: 4 },
  blockTitle: { fontFamily: ViaFonts.bodySemi, fontSize: 16, color: ViaColors.navy },
  blockSub: { ...textBodySm, color: ViaColors.onSurfaceVariant },
  loadRow: { flexDirection: 'row', alignItems: 'center', gap: ViaSpacing.sm, paddingVertical: ViaSpacing.md },
  loadTxt: { ...textBodySm, color: ViaColors.onSurfaceVariant },
  emptyRoteiros: { alignItems: 'center', paddingVertical: ViaSpacing.lg, gap: ViaSpacing.sm },
  emptyTitle: { fontFamily: ViaFonts.bodySemi, fontSize: 16, color: ViaColors.navy },
  emptySub: { ...textBodySm, color: ViaColors.onSurfaceVariant, textAlign: 'center', maxWidth: 280 },
  emptyBtn: {
    marginTop: ViaSpacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ViaColors.navy,
    paddingHorizontal: ViaSpacing.lg,
    paddingVertical: ViaSpacing.sm,
    borderRadius: ViaRadius.md,
  },
  emptyBtnTxt: { fontFamily: ViaFonts.bodySemi, color: '#fff', fontSize: 15 },
  hScroll: { gap: ViaSpacing.md, paddingVertical: 2 },
  tripCardWrap: { width: 260 },
  tripCard: {
    borderRadius: ViaRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(226,209,179,0.5)',
    backgroundColor: ViaColors.surfaceWhite,
    ...ViaShadows.level1,
  },
  tripImg: { width: '100%', height: 112 },
  tripBody: { padding: ViaSpacing.sm, gap: 6 },
  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: ViaRadius.sm,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { fontSize: 11, fontFamily: ViaFonts.bodySemi },
  tripNome: { fontFamily: ViaFonts.bodySemi, fontSize: 15, color: ViaColors.navy },
  tripDest: { ...textBodySm, color: ViaColors.onSurfaceVariant },
  tripActions: { flexDirection: 'row', gap: ViaSpacing.xs, marginTop: ViaSpacing.sm },
  miniBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: ViaSpacing.xs,
    borderRadius: ViaRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(226,209,179,0.6)',
    backgroundColor: ViaColors.surfaceWhite,
  },
  miniBtnTxt: { ...textBodySm, color: ViaColors.navy, fontFamily: ViaFonts.bodySemi },
  grid: { gap: ViaSpacing.sm, marginTop: ViaSpacing.sm },
  destinationCard: {
    borderRadius: ViaRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(226,209,179,0.5)',
    overflow: 'hidden',
    backgroundColor: ViaColors.surfaceWhite,
  },
  destinationImg: { width: '100%', height: 120 },
  destinationBody: { padding: ViaSpacing.sm, gap: 2 },
  destinationTitle: { fontFamily: ViaFonts.bodySemi, fontSize: 15, color: ViaColors.navy },
  destinationSubtitle: { ...textBodySm, color: ViaColors.onSurfaceVariant, textTransform: 'capitalize' },
  tipList: { gap: ViaSpacing.sm, marginTop: ViaSpacing.sm },
  tipRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  tipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 7,
    backgroundColor: ViaColors.coral,
  },
  tipText: { ...textBodySm, color: ViaColors.onSurfaceVariant, flex: 1 },
});
