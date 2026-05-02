import { MaterialIcons } from '@expo/vector-icons';
import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderWave } from '@/components/viaway/HeaderWave';
import { ViaColors, ViaFonts, ViaRadius, ViaShadows, ViaSpacing } from '@/constants/viaway-theme';
import {
  deleteChecklistItem,
  listChecklist,
  listViagens,
  toggleChecklist,
  type ChecklistJson,
  type ViagemJson,
} from '@/lib/viaway-api';

function invalidateChecklistQueries(qClient: QueryClient, viagemId: string) {
  void qClient.invalidateQueries({ queryKey: ['checklist', viagemId] });
  void qClient.invalidateQueries({ queryKey: ['checklists', viagemId] });
  void qClient.invalidateQueries({ queryKey: ['trip-metas', viagemId] });
}

export default function ChecklistHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qClient = useQueryClient();
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [pullRefreshing, setPullRefreshing] = useState(false);

  const vq = useQuery({
    queryKey: ['viagens'] as const,
    queryFn: async () => (await listViagens(1)).data,
  });
  const rows = (vq.data ?? []) as ViagemJson[];

  const selectedTrip = useMemo(
    () => rows.find((v) => v.id === selectedTripId) ?? null,
    [rows, selectedTripId],
  );

  const cq = useQuery({
    queryKey: ['checklists', selectedTripId!] as const,
    queryFn: () => listChecklist(selectedTripId!),
    enabled: Boolean(selectedTripId),
  });
  const items = (cq.data ?? []) as ChecklistJson[];
  const sorted = useMemo(
    () => [...items].sort((a, b) => a.ordem - b.ordem || a.item.localeCompare(b.item)),
    [items],
  );
  const done = sorted.filter((i) => i.concluido).length;

  const deleteM = useMutation({
    mutationFn: (cid: string) => deleteChecklistItem(cid),
    onSuccess: () => {
      if (selectedTripId) invalidateChecklistQueries(qClient, selectedTripId);
    },
    onError: (err: Error) => {
      Alert.alert('Checklist', err.message || 'Não foi possível apagar o item.');
    },
  });

  const toggleM = useMutation({
    mutationFn: ({ cid, concluido }: { cid: string; concluido: boolean }) =>
      toggleChecklist(cid, concluido),
    onSuccess: () => {
      if (selectedTripId) invalidateChecklistQueries(qClient, selectedTripId);
    },
  });

  function confirmDelete(cid: string, label: string) {
    Alert.alert('Apagar item', `Remover “${label}” do checklist?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          deleteM.mutate(cid);
        },
      },
    ]);
  }

  const onPullRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await vq.refetch();
      if (selectedTripId) await cq.refetch();
    } finally {
      setPullRefreshing(false);
    }
  }, [vq, cq, selectedTripId]);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={pullRefreshing} onRefresh={() => void onPullRefresh()} tintColor={ViaColors.navy} />
        }>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backFab}>
            <MaterialIcons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Checklist</Text>
          <Text style={styles.headerSub}>Escolha a viagem e acompanhe tudo o que você adicionou</Text>
        </View>
        <HeaderWave />

        <View style={styles.body}>
          <Text style={styles.sectionTitle}>Selecionar viagem</Text>
          {vq.isLoading ? (
            <ActivityIndicator color={ViaColors.navy} style={{ marginVertical: 24 }} />
          ) : rows.length === 0 ? (
            <View style={styles.emptyBox}>
              <MaterialIcons name="flight-takeoff" size={40} color={ViaColors.outline} />
              <Text style={styles.emptyTitle}>Nenhuma viagem ainda</Text>
              <Text style={styles.emptySub}>Crie uma viagem para montar o checklist.</Text>
              <Pressable onPress={() => router.push('/criar-viagem')} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnTxt}>Nova viagem</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tripList}>
                {rows.map((v) => {
                  const on = selectedTripId === v.id;
                  return (
                    <Pressable
                      key={v.id}
                      onPress={() => setSelectedTripId(v.id)}
                      style={[styles.tripChip, on ? styles.tripChipOn : null]}>
                      <Text style={[styles.tripChipText, on ? styles.tripChipTextOn : null]} numberOfLines={1}>
                        {v.nome}
                      </Text>
                      <Text style={[styles.tripChipSub, on ? styles.tripChipTextOn : null]} numberOfLines={1}>
                        {v.destinoPrincipal}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {!selectedTrip ? (
                <Text style={styles.hint}>Toque em uma viagem para ver os itens do checklist.</Text>
              ) : cq.isLoading ? (
                <ActivityIndicator color={ViaColors.navy} style={{ marginTop: 24 }} />
              ) : sorted.length === 0 ? (
                <View style={styles.emptyBox}>
                  <MaterialIcons name="checklist" size={40} color={ViaColors.outline} />
                  <Text style={styles.emptyTitle}>Checklist vazio</Text>
                  <Text style={styles.emptySub}>
                    Nenhum item nesta viagem. Abra o checklist completo para adicionar.
                  </Text>
                  <Pressable
                    onPress={() =>
                      router.push({ pathname: '/trip/[id]/checklist', params: { id: selectedTrip.id } })
                    }
                    style={styles.primaryBtn}>
                    <Text style={styles.primaryBtnTxt}>Abrir checklist da viagem</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={styles.summary}>
                    <Text style={styles.summaryTxt}>
                      {done}/{sorted.length} concluídos
                    </Text>
                    <Pressable
                      onPress={() =>
                        router.push({ pathname: '/trip/[id]/checklist', params: { id: selectedTrip.id } })
                      }
                      style={styles.openFull}>
                      <Text style={styles.openFullTxt}>Abrir tela completa</Text>
                      <MaterialIcons name="open-in-new" size={16} color={ViaColors.coral} />
                    </Pressable>
                  </View>
                  <Text style={styles.swipeHint}>
                    Deslize para a direita para marcar feito; para a esquerda para apagar.
                  </Text>
                  <View style={styles.listOuter}>
                    {sorted.map((it) => (
                      <Swipeable
                        key={it.id}
                        containerStyle={styles.swipeContainer}
                        renderLeftActions={() => (
                          <Pressable
                            onPress={() => {
                              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              toggleM.mutate({ cid: it.id, concluido: !it.concluido });
                            }}
                            style={styles.doneSide}
                            accessibilityRole="button"
                            accessibilityLabel={it.concluido ? 'Desmarcar' : 'Marcar feito'}>
                            <MaterialIcons name={it.concluido ? 'undo' : 'task-alt'} size={24} color="#fff" />
                            <Text style={styles.sideLabel}>{it.concluido ? 'Desmarcar' : 'Feito'}</Text>
                          </Pressable>
                        )}
                        renderRightActions={() => (
                          <Pressable
                            onPress={() => confirmDelete(it.id, it.item)}
                            style={styles.deleteSide}
                            accessibilityRole="button"
                            accessibilityLabel="Apagar item">
                            <MaterialIcons name="delete-outline" size={24} color="#fff" />
                            <Text style={styles.sideLabel}>Apagar</Text>
                          </Pressable>
                        )}
                        overshootLeft={false}
                        overshootRight={false}
                        friction={2}>
                        <Pressable
                          onPress={() => toggleM.mutate({ cid: it.id, concluido: !it.concluido })}
                          style={({ pressed }) => [styles.itemRowSurface, pressed && { opacity: 0.92 }]}>
                          <MaterialIcons
                            name={it.concluido ? 'check-circle' : 'radio-button-unchecked'}
                            size={22}
                            color={it.concluido ? '#16A34A' : ViaColors.outline}
                          />
                          <View style={styles.itemBody}>
                            <Text style={[styles.itemTxt, it.concluido && styles.itemTxtDone]}>{it.item}</Text>
                            {it.categoria ? (
                              <Text style={styles.itemCat}>{it.categoria}</Text>
                            ) : null}
                          </View>
                        </Pressable>
                      </Swipeable>
                    ))}
                  </View>
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ViaColors.background },
  header: {
    backgroundColor: ViaColors.navy,
    paddingHorizontal: ViaSpacing.margin,
    paddingBottom: 16,
  },
  backFab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 26, color: '#fff', letterSpacing: -0.3 },
  headerSub: {
    fontFamily: ViaFonts.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 6,
    lineHeight: 20,
  },
  body: { paddingHorizontal: ViaSpacing.margin, paddingTop: ViaSpacing.lg, gap: 12 },
  sectionTitle: { fontFamily: ViaFonts.h3, fontSize: 16, color: ViaColors.navy },
  tripList: { gap: 8, paddingVertical: 4 },
  tripChip: {
    minWidth: 170,
    maxWidth: 220,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(226,209,179,0.7)',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tripChipOn: {
    backgroundColor: ViaColors.primaryContainer,
    borderColor: ViaColors.navy,
  },
  tripChipText: { fontFamily: ViaFonts.bodySemi, fontSize: 13, color: ViaColors.navy },
  tripChipSub: { fontFamily: ViaFonts.body, fontSize: 11, color: '#6B7280', marginTop: 2 },
  tripChipTextOn: { color: ViaColors.onPrimary },
  hint: { fontFamily: ViaFonts.body, fontSize: 13, color: '#6B7280', marginTop: 8 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  summaryTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 14, color: ViaColors.navy },
  openFull: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  openFullTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 13, color: ViaColors.coral },
  swipeHint: {
    fontFamily: ViaFonts.body,
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 17,
  },
  listOuter: { marginTop: 4, gap: 10 },
  swipeContainer: { overflow: 'visible' },
  itemRowSurface: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: ViaRadius.lg,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(226,209,179,0.5)',
    ...ViaShadows.level1,
  },
  doneSide: {
    backgroundColor: '#15803D',
    justifyContent: 'center',
    alignItems: 'center',
    width: 92,
    borderRadius: 12,
    marginRight: 10,
    gap: 4,
  },
  deleteSide: {
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    width: 92,
    borderRadius: 12,
    marginLeft: 10,
    gap: 4,
  },
  sideLabel: { fontFamily: ViaFonts.bodySemi, fontSize: 11, color: '#fff' },
  itemBody: { flex: 1 },
  itemTxt: { fontFamily: ViaFonts.body, fontSize: 15, color: ViaColors.onSurface },
  itemTxtDone: { textDecorationLine: 'line-through', color: ViaColors.onSurfaceVariant },
  itemCat: { fontFamily: ViaFonts.body, fontSize: 11, color: ViaColors.outline, marginTop: 2 },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
    paddingHorizontal: 16,
  },
  emptyTitle: { fontFamily: ViaFonts.bodySemi, fontSize: 17, color: ViaColors.navy },
  emptySub: { fontFamily: ViaFonts.body, fontSize: 13, color: ViaColors.onSurfaceVariant, textAlign: 'center' },
  primaryBtn: {
    marginTop: 12,
    backgroundColor: ViaColors.navy,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: ViaRadius.full,
  },
  primaryBtnTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 15, color: '#fff' },
});
