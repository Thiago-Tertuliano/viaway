import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Svg, { Defs, LinearGradient as SvgGrad, Path, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiException } from '@/lib/api-client';
import { deleteViagem, listViagens, type ViagemJson } from '@/lib/viaway-api';
import { getProfile } from '@/lib/session';
import { ViaColors, ViaFonts, ViaShadows, ViaSpacing } from '@/constants/viaway-theme';

const { width: W } = Dimensions.get('window');
const FEATURED_H = Math.round(W * 0.56);
const CARD_W = Math.round(W * 0.4);

const AVATAR = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop';

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=85&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=900&q=85&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=900&q=85&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=900&q=85&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1500835556837-99ac94a94552?w=900&q=85&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=900&q=85&auto=format&fit=crop',
];

const INSPIRE = [
  { name: 'Paris', country: 'França',     tag: '🗼 Romântico', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80&fit=crop' },
  { name: 'Tóquio', country: 'Japão',    tag: '🌸 Cultura',   image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=80&fit=crop' },
  { name: 'Bali', country: 'Indonésia',  tag: '🌿 Natureza',  image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&q=80&fit=crop' },
  { name: 'Nova York', country: 'EUA',   tag: '🏙️ Urbano',    image: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=600&q=80&fit=crop' },
];

const ACTIONS = [
  { icon: 'add-circle-outline',      label: 'Nova Viagem', bg: ViaColors.navy,  fg: '#FFFFFF',           route: '/criar-viagem' },
  { icon: 'checklist',               label: 'Checklist',   bg: '#E8F5EE',       fg: '#1B6B44',           route: null },
  { icon: 'account-balance-wallet',  label: 'Gastos',      bg: '#EBF0FB',       fg: '#2851A3',           route: null },
  { icon: 'compare-arrows',          label: 'Cotações',    bg: '#FDF4E7',       fg: ViaColors.secondary, route: null },
] as const;

// ─── helpers ──────────────────────────────────────────────────────────────────
function tripImage(v: ViagemJson) {
  if (v.capaUrl) return v.capaUrl;
  return FALLBACK_IMAGES[v.id.charCodeAt(v.id.length - 1) % FALLBACK_IMAGES.length];
}
function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}
function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
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


// ─── component ────────────────────────────────────────────────────────────────
export default function InicioScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qClient = useQueryClient();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  const [firstName, setFirstName] = useState('');
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

  useEffect(() => {
    getProfile().then((p) => {
      if (p?.nome) setFirstName(p.nome.split(' ')[0]);
    });
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const q = useQuery({
    queryKey: ['viagens'] as const,
    queryFn: async () => (await listViagens(1)).data,
  });

  const rows = useMemo(() => (q.data ?? []) as ViagemJson[], [q.data]);
  const featured = rows.find((v) => v.status === 'em_andamento') ?? null;
  const restBase = featured ? rows.filter((v) => v.id !== featured.id) : rows;
  const rest = useMemo(() => {
    const pinned = restBase.filter((v) => pinnedIds.includes(v.id));
    const others = restBase.filter((v) => !pinnedIds.includes(v.id));
    return [...pinned, ...others];
  }, [pinnedIds, restBase]);
  const tripForQuickAccess = featured ?? rows[0] ?? null;

  function togglePinTrip(id: string) {
    setPinnedIds((prev) => {
      return prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev];
    });
  }

  function handleDeleteTrip(id: string) {
    Alert.alert(
      'Excluir viagem',
      'Tem certeza que deseja excluir esta viagem?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await deleteViagem(id);
            void qClient.invalidateQueries({ queryKey: ['viagens'] });
            setPinnedIds((prev) => prev.filter((x) => x !== id));
          },
        },
      ],
    );
  }

  function handleQuickAction(label: string, route: string | null) {
    if (route) {
      router.push(route as any);
      return;
    }
    if (label === 'Gastos') {
      router.push('/(tabs)/gastos');
      return;
    }
    if (!tripForQuickAccess) {
      router.push('/criar-viagem');
      return;
    }
    if (label === 'Cotações') {
      router.push({ pathname: '/trip/[id]/cotacoes', params: { id: tripForQuickAccess.id } });
      return;
    }
    if (label === 'Checklist') {
      router.push({ pathname: '/trip/[id]/checklist', params: { id: tripForQuickAccess.id } });
      return;
    }
  }

  return (
    <View style={s.root}>

      {/* ════════════════ BODY (scroll includes hero) ════════════════ */}
      {q.isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={ViaColors.navy} />
          <Text style={s.loadingTxt}>Carregando…</Text>
        </View>
      ) : q.isError ? (
        <View style={s.center}>
          <View style={s.errorIcon}>
            <MaterialIcons name="wifi-off" size={32} color={ViaColors.navy} />
          </View>
          <Text style={s.errTitle}>
            {q.error instanceof ApiException && (q.error as ApiException).status === 401
              ? 'API requer autenticação'
              : 'Não foi possível carregar'}
          </Text>
          <Text style={s.errSub}>
            {q.error instanceof ApiException && (q.error as ApiException).status === 401
              ? 'Configure DISABLE_AUTH=true no backend'
              : (q.error as Error).message}
          </Text>
          <Pressable
            onPress={() => void qClient.invalidateQueries({ queryKey: ['viagens'] })}
            style={({ pressed }) => [s.retryBtn, pressed && s.pressed]}>
            <Text style={s.retryLabel}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={s.scroll}
          bounces={false}
          alwaysBounceVertical={false}
          overScrollMode="never"
          contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={q.isFetching}
              onRefresh={() => void qClient.invalidateQueries({ queryKey: ['viagens'] })}
              tintColor={ViaColors.navy}
            />
          }>

          {/* ── Hero (inside scroll) ── */}
          <View style={[s.hero, { paddingTop: insets.top + 12 }]}>

            {/* brand + actions row */}
            <Animated.View style={[s.topBar, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <Text style={s.brandName}>Viaway</Text>
              <View style={s.topBarRight}>
                <Pressable style={({ pressed }) => [s.topBtn, pressed && s.pressed]}>
                  <MaterialIcons name="notifications-none" size={22} color="rgba(255,255,255,0.8)" />
                  <View style={s.notifBadge} />
                </Pressable>
                <Pressable style={({ pressed }) => [s.avatarRing, pressed && s.pressed]}>
                  <Image source={{ uri: AVATAR }} style={s.avatar} contentFit="cover" />
                </Pressable>
              </View>
            </Animated.View>

            {/* greeting block */}
            <Animated.View style={[s.greetingBlock, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <Text style={s.greetingLine}>{greeting()}</Text>
              <Text style={s.greetingName}>
                {firstName ? firstName : 'Viajante'} 👋
              </Text>
            </Animated.View>

            {featured && (
              <Animated.View style={{ opacity: fadeAnim }}>
                <View style={s.statPillGreen}>
                  <View style={s.greenDot} />
                  <Text style={s.statTextGreen}>Viagem em curso</Text>
                </View>
              </Animated.View>
            )}
          </View>

          {/* ── Wave (inside scroll, flows naturally) ── */}
          <Svg
            width={W}
            height={64}
            viewBox={`0 0 ${W} 64`}
            style={s.wave}>
            <Path
              d={`M0,0 L0,38 Q${W * 0.15},64 ${W * 0.35},50 Q${W * 0.55},30 ${W * 0.72},52 Q${W * 0.87},68 ${W},34 L${W},0 Z`}
              fill={ViaColors.navy}
            />
            <Path
              d={`M0,38 Q${W * 0.15},64 ${W * 0.35},50 Q${W * 0.55},30 ${W * 0.72},52 Q${W * 0.87},68 ${W},34 L${W},64 L0,64 Z`}
              fill="#F8FAFC"
            />
          </Svg>

          {/* ── Gap between wave and content ── */}
          <View style={{ height: 10 }} />

          {/* ── Quick actions ── */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Acesso rápido</Text>
            <View style={s.actionsRow}>
              {ACTIONS.map((a) => (
                <Pressable
                  key={a.label}
                  onPress={() => handleQuickAction(a.label, a.route)}
                  style={({ pressed }) => [
                    s.actionBtn,
                    { backgroundColor: a.bg },
                    pressed && { opacity: 0.82, transform: [{ scale: 0.96 }] },
                  ]}>
                  <View style={[s.actionIcon, { backgroundColor: a.fg + '1A' }]}>
                    <MaterialIcons name={a.icon as any} size={20} color={a.bg === ViaColors.navy ? '#FFFFFF' : a.fg} />
                  </View>
                  <Text style={[s.actionLabel, { color: a.bg === ViaColors.navy ? '#FFFFFF' : a.fg }]} numberOfLines={2}>
                    {a.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* ── Featured (em andamento) ── */}
          {featured && (
            <View style={s.section}>
              <View style={s.row}>
                <Text style={s.sectionTitle}>Em andamento</Text>
                <View style={s.chipGreen}>
                  <View style={s.greenDot} />
                  <Text style={s.chipGreenTxt}>Ao vivo</Text>
                </View>
              </View>
              <Pressable
                onPress={() => router.push({ pathname: '/trip/[id]', params: { id: featured.id } })}
                style={({ pressed }) => [s.featuredCard, pressed && { opacity: 0.94, transform: [{ scale: 0.987 }] }]}>
                <Image
                  source={{ uri: tripImage(featured) }}
                  style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                  contentFit="cover"
                />
                <Svg width="100%" height="100%" style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} pointerEvents="none">
                  <Defs>
                    <SvgGrad id="fg" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0.3" stopColor="#0F172A" stopOpacity="0" />
                      <Stop offset="1"   stopColor="#0F172A" stopOpacity="0.9" />
                    </SvgGrad>
                  </Defs>
                  <Rect width="100%" height="100%" fill="url(#fg)" rx="20" ry="20" />
                </Svg>
                <View style={s.featuredBody}>
                  <View style={s.liveBadge}>
                    <View style={s.greenDot} />
                    <Text style={s.liveBadgeTxt}>Em andamento</Text>
                  </View>
                  <Text style={s.featuredTitle} numberOfLines={2}>{featured.nome}</Text>
                  <View style={s.metaRow}>
                    <MaterialIcons name="place" size={13} color="rgba(255,255,255,0.75)" />
                    <Text style={s.metaTxt}>{featured.destinoPrincipal}</Text>
                    {(featured.dataIda || featured.dataVolta) && (
                      <>
                        <Text style={s.metaDot}>·</Text>
                        <MaterialIcons name="calendar-today" size={12} color="rgba(255,255,255,0.6)" />
                        <Text style={s.metaTxt}>
                          {fmtDate(featured.dataIda)}{featured.dataVolta ? ` → ${fmtDate(featured.dataVolta)}` : ''}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
                <View style={s.arrowBtn}>
                  <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
                </View>
              </Pressable>
            </View>
          )}

          {/* ── Trip list / empty ── */}
          {rows.length === 0 ? (
            <View style={s.section}>
              <View style={s.emptyCard}>
                <View style={s.emptyIconWrap}>
                  <MaterialIcons name="flight-takeoff" size={34} color={ViaColors.navy} />
                </View>
                <Text style={s.emptyTitle}>Ainda não tem planos?</Text>
                <Text style={s.emptySub}>Comece a planejar sua próxima aventura agora mesmo.</Text>
                <Pressable
                  onPress={() => router.push('/criar-viagem')}
                  style={({ pressed }) => [s.emptyBtn, pressed && { opacity: 0.85 }]}>
                  <MaterialIcons name="add" size={18} color="#FFFFFF" />
                  <Text style={s.emptyBtnTxt}>Criar minha primeira viagem</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={s.section}>
              <View style={s.row}>
                <Text style={s.sectionTitle}>
                  {featured ? 'Outras viagens' : 'Minhas viagens'}{' '}
                  <Text style={s.sectionCount}>({rest.length})</Text>
                </Text>
                <Pressable onPress={() => router.push('/criar-viagem')}>
                  <View style={s.addPill}>
                    <MaterialIcons name="add" size={13} color={ViaColors.navy} />
                    <Text style={s.addPillTxt}>Nova</Text>
                  </View>
                </Pressable>
              </View>
              {rest.map((v) => {
                const sc = statusColor(v.status);
                return (
                  <Swipeable
                    key={v.id}
                    friction={2}
                    leftThreshold={40}
                    rightThreshold={40}
                    overshootLeft={false}
                    overshootRight={false}
                    renderLeftActions={() => (
                      <Pressable onPress={() => togglePinTrip(v.id)} style={[s.swipeAction, s.swipePin]}>
                        <MaterialIcons name={pinnedIds.includes(v.id) ? 'push-pin' : 'outlined-flag'} size={18} color="#fff" />
                        <Text style={s.swipeTxt}>{pinnedIds.includes(v.id) ? 'Desfixar' : 'Fixar'}</Text>
                      </Pressable>
                    )}
                    renderRightActions={() => (
                      <Pressable onPress={() => handleDeleteTrip(v.id)} style={[s.swipeAction, s.swipeDelete]}>
                        <MaterialIcons name="delete-outline" size={18} color="#fff" />
                        <Text style={s.swipeTxt}>Excluir</Text>
                      </Pressable>
                    )}>
                    <Pressable
                      onPress={() => router.push({ pathname: '/trip/[id]', params: { id: v.id } })}
                      style={({ pressed }) => [s.tripCard, pressed && { opacity: 0.9, transform: [{ scale: 0.993 }] }]}>
                      <View style={s.tripThumb}>
                        <Image source={{ uri: tripImage(v) }} style={StyleSheet.absoluteFill} contentFit="cover" />
                        <View style={s.thumbDim} />
                      </View>
                      <View style={s.tripInfo}>
                        <View style={s.tripInfoTop}>
                          <Text style={s.tripName} numberOfLines={1}>{v.nome}</Text>
                          <View style={[s.statusBadge, { backgroundColor: sc + '18', borderColor: sc + '44' }]}>
                            <Text style={[s.statusTxt, { color: sc }]}>{statusLabel(v.status)}</Text>
                          </View>
                        </View>
                        <View style={s.infoRow}>
                          <MaterialIcons name="place" size={12} color="#9CA3AF" />
                          <Text style={s.infoTxt} numberOfLines={1}>{v.destinoPrincipal}</Text>
                        </View>
                        {(v.dataIda || v.dataVolta) && (
                          <View style={s.infoRow}>
                            <MaterialIcons name="calendar-today" size={11} color="#9CA3AF" />
                            <Text style={s.infoTxtMuted}>{fmtDate(v.dataIda)}{v.dataVolta ? ` → ${fmtDate(v.dataVolta)}` : ''}</Text>
                          </View>
                        )}
                      </View>
                      <MaterialIcons name="chevron-right" size={20} color={ViaColors.sand} style={s.tripChevron} />
                    </Pressable>
                  </Swipeable>
                );
              })}
            </View>
          )}

          {/* ── Inspire-se ── */}
          <View style={[s.section, { paddingHorizontal: 0 }]}>
            <View style={[s.row, { paddingHorizontal: ViaSpacing.margin }]}>
              <Text style={s.sectionTitle}>Inspire-se</Text>
              <Text style={s.sectionSub}>Destinos populares</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.inspireList}>
              {INSPIRE.map((d) => (
                <Pressable
                  key={d.name}
                  style={({ pressed }) => [s.inspireCard, pressed && { opacity: 0.88, transform: [{ scale: 0.96 }] }]}>
                  <Image
                    source={{ uri: d.image }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
                    contentFit="cover"
                  />
                  <Svg width="100%" height="100%" style={[StyleSheet.absoluteFill, { borderRadius: 18 }]} pointerEvents="none">
                    <Defs>
                      <SvgGrad id={`g_${d.name}`} x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0.35" stopColor="#0F172A" stopOpacity="0" />
                        <Stop offset="1"    stopColor="#0F172A" stopOpacity="0.88" />
                      </SvgGrad>
                    </Defs>
                    <Rect width="100%" height="100%" fill={`url(#g_${d.name})`} rx="18" ry="18" />
                  </Svg>
                  <View style={s.inspireBody}>
                    <Text style={s.inspireTag}>{d.tag}</Text>
                    <Text style={s.inspireName}>{d.name}</Text>
                    <Text style={s.inspireCountry}>{d.country}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: ViaColors.background },

  // ─ Hero
  hero: {
    backgroundColor: ViaColors.navy,
    paddingHorizontal: ViaSpacing.margin,
    paddingBottom: 10,
    gap: 12,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandName: {
    fontFamily: ViaFonts.bodySemi,
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.5)',
  },
  // greeting
  greetingBlock: { gap: 1, marginTop: 2 },
  greetingLine: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.2,
  },
  greetingName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 34,
    lineHeight: 42,
    letterSpacing: -0.5,
    color: '#FFFFFF',
  },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ViaColors.coral,
    borderWidth: 1.5,
    borderColor: ViaColors.navy,
  },
  avatarRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: ViaColors.sand,
  },
  avatar: { width: '100%', height: '100%' },

  // tagline
  tagline: {
    fontFamily: ViaFonts.h1,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.8,
    color: '#FFFFFF',
  },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  statPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontFamily: ViaFonts.body, fontSize: 11, color: 'rgba(255,255,255,0.38)' },
  statSep: { color: 'rgba(255,255,255,0.2)', fontSize: 12 },
  statPillGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  statTextGreen: { fontFamily: ViaFonts.bodySemi, fontSize: 11, color: '#22C55E' },

  // search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 4,
  },
  searchWrapFocused: {
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderColor: 'rgba(255,255,255,0.28)',
  },
  searchInput: {
    flex: 1,
    fontFamily: ViaFonts.body,
    fontSize: 14,
    color: '#FFFFFF',
    padding: 0,
  },
  wave: { display: 'flex' },

  // ─ Scroll
  scroll: { flex: 1 },
  scrollInner: { gap: 24 },

  // ─ Section
  section: { paddingHorizontal: ViaSpacing.margin, gap: 14, marginBottom: 22 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: {
    fontFamily: ViaFonts.h3,
    fontSize: 16,
    letterSpacing: -0.2,
    color: ViaColors.navy,
  },
  sectionCount: { fontFamily: ViaFonts.body, fontSize: 15, color: '#9CA3AF' },
  sectionSub: { fontFamily: ViaFonts.body, fontSize: 13, color: '#9CA3AF' },

  // ─ Actions
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    gap: 10,
    ...ViaShadows.level1,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontFamily: ViaFonts.bodySemi,
    fontSize: 11,
    lineHeight: 15,
  },

  // ─ Featured
  featuredCard: {
    height: FEATURED_H,
    borderRadius: 20,
    overflow: 'hidden',
    ...ViaShadows.level2,
  },
  featuredBody: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 18,
    gap: 6,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(34,197,94,0.22)',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.38)',
    marginBottom: 4,
  },
  liveBadgeTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 11, color: '#6EE7A0', letterSpacing: 0.2 },
  featuredTitle: {
    fontFamily: ViaFonts.h1,
    fontSize: 24,
    lineHeight: 29,
    letterSpacing: -0.5,
    color: '#FFFFFF',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaTxt: { fontFamily: ViaFonts.body, fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  metaDot: { color: 'rgba(255,255,255,0.35)', marginHorizontal: 1 },
  arrowBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },

  // ─ Live chip
  chipGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
  },
  chipGreenTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 11, color: '#16A34A' },

  // ─ Add pill
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: ViaColors.sand,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: 'rgba(226,209,179,0.15)',
  },
  addPillTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 12, color: ViaColors.navy },

  // ─ Trip cards
  tripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(226,209,179,0.5)',
    overflow: 'hidden',
    ...ViaShadows.level1,
  },
  tripThumb: {
    width: 88,
    height: 88,
    backgroundColor: '#E5E7EB',
  },
  thumbDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.08)' },
  tripInfo: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, gap: 4 },
  tripInfoTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 2 },
  tripName: { flex: 1, fontFamily: ViaFonts.h3, fontSize: 14, color: ViaColors.navy, letterSpacing: -0.1 },
  statusBadge: { borderRadius: 99, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
  statusTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 10, letterSpacing: 0.1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoTxt: { fontFamily: ViaFonts.body, fontSize: 12, color: '#6B7280', flex: 1 },
  infoTxtMuted: { fontFamily: ViaFonts.body, fontSize: 11, color: '#9CA3AF' },
  tripChevron: { marginRight: 10 },
  swipeAction: {
    width: 96,
    borderRadius: 16,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  swipePin: { backgroundColor: '#2563EB' },
  swipeDelete: { backgroundColor: '#DC2626' },
  swipeTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 12, color: '#FFFFFF' },

  // ─ Empty
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(226,209,179,0.5)',
    padding: 32,
    alignItems: 'center',
    gap: 12,
    ...ViaShadows.level1,
  },
  emptyIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: ViaColors.sand,
    marginBottom: 4,
  },
  emptyTitle: { fontFamily: ViaFonts.h2, fontSize: 19, color: ViaColors.navy, textAlign: 'center', letterSpacing: -0.2 },
  emptySub: { fontFamily: ViaFonts.body, fontSize: 14, lineHeight: 21, color: '#6B7280', textAlign: 'center', maxWidth: 250 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ViaColors.navy,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  emptyBtnTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 14, color: '#FFFFFF' },

  // ─ Inspire
  inspireList: { paddingHorizontal: ViaSpacing.margin, gap: 12 },
  inspireCard: {
    width: CARD_W,
    height: Math.round(CARD_W * 1.45),
    borderRadius: 18,
    overflow: 'hidden',
    ...ViaShadows.level1,
  },
  inspireBody: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14, gap: 2 },
  inspireTag: { fontFamily: ViaFonts.bodySemi, fontSize: 11, color: 'rgba(255,255,255,0.75)', marginBottom: 2 },
  inspireName: { fontFamily: ViaFonts.h2, fontSize: 16, color: '#FFFFFF', letterSpacing: -0.3 },
  inspireCountry: { fontFamily: ViaFonts.body, fontSize: 11, color: 'rgba(255,255,255,0.6)' },

  // ─ States
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  loadingTxt: { fontFamily: ViaFonts.body, fontSize: 14, color: '#6B7280' },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: ViaColors.sand,
  },
  errTitle: { fontFamily: ViaFonts.h3, fontSize: 16, color: ViaColors.navy, textAlign: 'center' },
  errSub: { fontFamily: ViaFonts.body, fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    backgroundColor: ViaColors.navy,
    borderRadius: 99,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginTop: 4,
  },
  retryLabel: { fontFamily: ViaFonts.bodySemi, fontSize: 14, color: '#FFFFFF' },

  // ─ Shared
  pressed: { opacity: 0.75 },

  
});

