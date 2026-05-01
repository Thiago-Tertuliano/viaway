import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator } from 'react-native';
import { HeaderWave } from '@/components/viaway/HeaderWave';
import { deleteViagem, listViagens, type ViagemJson } from '@/lib/viaway-api';
import { ViaColors, ViaFonts, ViaShadows, ViaSpacing } from '@/constants/viaway-theme';

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=85&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=900&q=85&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=900&q=85&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=900&q=85&auto=format&fit=crop',
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
function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

const FILTERS = ['Todas', 'Planejando', 'Em curso', 'Concluídas'] as const;

export default function ViagensScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qClient = useQueryClient();
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

  const q = useQuery({
    queryKey: ['viagens'] as const,
    queryFn: async () => (await listViagens(1)).data,
  });

  const rows = useMemo(() => (q.data ?? []) as ViagemJson[], [q.data]);
  const orderedRows = useMemo(() => {
    const pinned = rows.filter((v) => pinnedIds.includes(v.id));
    const others = rows.filter((v) => !pinnedIds.includes(v.id));
    return [...pinned, ...others];
  }, [rows, pinnedIds]);

  function togglePinTrip(id: string) {
    setPinnedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]));
  }

  function handleDeleteTrip(id: string) {
    Alert.alert('Excluir viagem', 'Tem certeza que deseja excluir esta viagem?', [
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
    ]);
  }

  return (
    <View style={s.root}>
      {q.isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={ViaColors.navy} />
        </View>
      ) : (
        <ScrollView
          bounces={false}
          alwaysBounceVertical={false}
          overScrollMode="never"
          contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
          showsVerticalScrollIndicator={false}>

          {/* Header inside scroll */}
          <View style={[s.header, { paddingTop: insets.top + 12 }]}>
            <View>
              <Text style={s.headerTitle}>Minhas Viagens</Text>
              <Text style={s.headerSub}>{orderedRows.length} {orderedRows.length === 1 ? 'viagem registrada' : 'viagens registradas'}</Text>
            </View>
            <Pressable
              onPress={() => router.push('/criar-viagem')}
              style={({ pressed }) => [s.addBtn, pressed && { opacity: 0.8 }]}>
              <MaterialIcons name="add" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
          <HeaderWave />

          <View style={s.scroll}>
            {orderedRows.length === 0 ? (
              <View style={s.emptyWrap}>
                <View style={s.emptyIcon}>
                  <MaterialIcons name="luggage" size={36} color={ViaColors.navy} />
                </View>
                <Text style={s.emptyTitle}>Nenhuma viagem ainda</Text>
                <Text style={s.emptySub}>Crie sua primeira viagem e comece a planejar.</Text>
                <Pressable
                  onPress={() => router.push('/criar-viagem')}
                  style={({ pressed }) => [s.emptyBtn, pressed && { opacity: 0.85 }]}>
                  <MaterialIcons name="add" size={18} color="#fff" />
                  <Text style={s.emptyBtnTxt}>Nova viagem</Text>
                </Pressable>
              </View>
            ) : (
              orderedRows.map((v) => {
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
                      style={({ pressed }) => [s.card, pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]}>
                      <View style={s.cardThumb}>
                        <Image source={{ uri: tripImage(v) }} style={StyleSheet.absoluteFill} contentFit="cover" />
                        <View style={s.thumbDim} />
                        <View style={[s.imgBadge, { backgroundColor: sc + 'CC' }]}>
                          <Text style={s.imgBadgeTxt}>{statusLabel(v.status)}</Text>
                        </View>
                      </View>
                      <View style={s.cardBody}>
                        <Text style={s.cardTitle} numberOfLines={1}>{v.nome}</Text>
                        <View style={s.metaRow}>
                          <MaterialIcons name="place" size={13} color="#9CA3AF" />
                          <Text style={s.metaTxt} numberOfLines={1}>{v.destinoPrincipal}</Text>
                        </View>
                        {(v.dataIda || v.dataVolta) && (
                          <View style={s.metaRow}>
                            <MaterialIcons name="calendar-today" size={12} color="#9CA3AF" />
                            <Text style={s.metaTxtMuted}>
                              {fmtDate(v.dataIda)}{v.dataVolta ? ` → ${fmtDate(v.dataVolta)}` : ''}
                            </Text>
                          </View>
                        )}
                        {v.numViajantes > 0 && (
                          <View style={s.metaRow}>
                            <MaterialIcons name="group" size={12} color="#9CA3AF" />
                            <Text style={s.metaTxtMuted}>{v.numViajantes} {v.numViajantes === 1 ? 'viajante' : 'viajantes'}</Text>
                          </View>
                        )}
                      </View>
                      <MaterialIcons name="chevron-right" size={20} color={ViaColors.sand} style={{ marginRight: 12 }} />
                    </Pressable>
                  </Swipeable>
                );
              })
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: ViaColors.background },
  header: {
    backgroundColor: ViaColors.navy,
    paddingHorizontal: ViaSpacing.margin,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 28, color: '#FFFFFF', letterSpacing: -0.5 },
  headerSub: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: ViaSpacing.margin, paddingTop: 20, gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(226,209,179,0.5)',
    overflow: 'hidden',
    ...ViaShadows.level1,
  },
  cardThumb: { width: 90, height: 90 },
  thumbDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.08)' },
  imgBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    borderRadius: 99,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  imgBadgeTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 9, color: '#FFFFFF', letterSpacing: 0.2 },
  cardBody: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, gap: 4 },
  cardTitle: { fontFamily: ViaFonts.h3, fontSize: 14, color: ViaColors.navy, marginBottom: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt: { fontFamily: ViaFonts.body, fontSize: 12, color: '#6B7280', flex: 1 },
  metaTxtMuted: { fontFamily: ViaFonts.body, fontSize: 11, color: '#9CA3AF' },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 32 },
  emptyIcon: {
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
  emptyTitle: { fontFamily: ViaFonts.h2, fontSize: 19, color: ViaColors.navy, textAlign: 'center' },
  emptySub: { fontFamily: ViaFonts.body, fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ViaColors.navy,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  emptyBtnTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 14, color: '#FFFFFF' },
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
});
