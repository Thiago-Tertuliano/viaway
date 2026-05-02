import { MaterialIcons } from '@expo/vector-icons';
import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TripScreenHeader } from '@/components/viaway/TripScreenHeader';
import { ScreenState } from '@/components/viaway/ScreenState';
import { SectionCard } from '@/components/viaway/SectionCard';
import {
  createChecklistItem,
  deleteChecklistItem,
  listChecklist,
  toggleChecklist,
  type ChecklistJson,
} from '@/lib/viaway-api';
import { ViaColors, ViaRadius, ViaShadows, ViaSpacing, textBody, textH3 } from '@/constants/viaway-theme';

function invalidateChecklistQueries(qClient: QueryClient, viagemId: string) {
  void qClient.invalidateQueries({ queryKey: ['checklist', viagemId] });
  void qClient.invalidateQueries({ queryKey: ['checklists', viagemId] });
  void qClient.invalidateQueries({ queryKey: ['trip-metas', viagemId] });
}

export default function ChecklistViagemScreen() {
  const p = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(p.id) ? p.id[0] : p.id;
  const insets = useSafeAreaInsets();
  const qClient = useQueryClient();
  const [item, setItem] = useState('');

  const list = useQuery({
    queryKey: ['checklist', id!] as const,
    queryFn: () => listChecklist(id!),
    enabled: Boolean(id),
  });

  const sorted = useMemo(() => {
    const rows = list.data ?? [];
    return [...rows].sort((a, b) => a.ordem - b.ordem || a.item.localeCompare(b.item));
  }, [list.data]);

  const addM = useMutation({
    mutationFn: async () => {
      if (!id || !item.trim()) throw new Error('Digite o item.');
      const ord = (list.data?.length ?? 0) + 1;
      return createChecklistItem({ viagemId: id, item: item.trim(), ordem: ord });
    },
    onSuccess: () => {
      setItem('');
      if (id) invalidateChecklistQueries(qClient, id);
    },
  });

  const toggleM = useMutation({
    mutationFn: ({ cid, concluido }: { cid: string; concluido: boolean }) =>
      toggleChecklist(cid, concluido),
    onSuccess: () => {
      if (id) invalidateChecklistQueries(qClient, id);
    },
  });

  const deleteM = useMutation({
    mutationFn: (cid: string) => deleteChecklistItem(cid),
    onSuccess: () => {
      if (id) invalidateChecklistQueries(qClient, id);
    },
    onError: (err: Error) => {
      Alert.alert('Checklist', err.message || 'Não foi possível apagar o item.');
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

  /** Deslizar para a direita → concluir / desmarcar (ação à esquerda do cartão). */
  function renderLeftToggle(c: ChecklistJson) {
    const done = c.concluido;
    return (
      <Pressable
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          toggleM.mutate({ cid: c.id, concluido: !done });
        }}
        style={styles.doneSide}
        accessibilityRole="button"
        accessibilityLabel={done ? 'Desmarcar item' : 'Marcar como feito'}>
        <MaterialIcons name={done ? 'undo' : 'task-alt'} size={24} color="#fff" />
        <Text style={styles.sideLabel}>{done ? 'Desmarcar' : 'Feito'}</Text>
      </Pressable>
    );
  }

  /** Deslizar para a esquerda → apagar (ação à direita do cartão). */
  function renderRightDelete(c: ChecklistJson) {
    return (
      <Pressable
        onPress={() => confirmDelete(c.id, c.item)}
        style={styles.deleteSide}
        accessibilityRole="button"
        accessibilityLabel="Apagar item">
        <MaterialIcons name="delete-outline" size={24} color="#fff" />
        <Text style={styles.sideLabel}>Apagar</Text>
      </Pressable>
    );
  }

  function renderItem({ item: c }: { item: ChecklistJson }) {
    return (
      <Swipeable
        renderLeftActions={() => renderLeftToggle(c)}
        renderRightActions={() => renderRightDelete(c)}
        overshootLeft={false}
        overshootRight={false}
        friction={2}
        containerStyle={styles.swipeContainer}>
        <View style={styles.itemCard}>
          <Pressable
            onPress={() => toggleM.mutate({ cid: c.id, concluido: !c.concluido })}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.92 }]}>
            <MaterialIcons
              name={c.concluido ? 'check-box' : 'check-box-outline-blank'}
              size={26}
              color={c.concluido ? ViaColors.coral : ViaColors.outline}
            />
            <View style={styles.t}>
              <Text style={[styles.txt, c.concluido && styles.done]}>{c.item}</Text>
              {c.categoria ? <Text style={styles.sub}>{c.categoria}</Text> : null}
            </View>
          </Pressable>
        </View>
      </Swipeable>
    );
  }

  return (
    <View style={styles.root}>
      <TripScreenHeader title="Checklist" />

      <View style={[styles.formWrap, { paddingHorizontal: ViaSpacing.margin }]}>
        <SectionCard>
          <View style={styles.form}>
            <Text style={styles.hintSwipe}>
              Deslize para a direita para marcar feito; para a esquerda para apagar. Toque no item ou puxe a lista
              para atualizar.
            </Text>
            <TextInput
              value={item}
              onChangeText={setItem}
              placeholder="Novo item"
              placeholderTextColor={ViaColors.onSurfaceVariant}
              style={styles.inp}
              onSubmitEditing={() => addM.mutate()}
            />
            <Pressable
              onPress={() => addM.mutate()}
              style={({ pressed }) => [styles.add, pressed && { opacity: 0.9 }]}>
              <Text style={styles.addT}>Adicionar</Text>
            </Pressable>
            {addM.isError ? <Text style={styles.e}>{(addM.error as Error).message}</Text> : null}
          </View>
        </SectionCard>
      </View>

      {list.isLoading && !list.data ? (
        <ScreenState kind="loading" title="Carregando checklist..." />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          removeClippedSubviews={false}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingBottom: insets.bottom + ViaSpacing.xl,
              paddingHorizontal: ViaSpacing.margin,
              flexGrow: 1,
            },
          ]}
          ItemSeparatorComponent={() => <View style={{ height: ViaSpacing.sm }} />}
          refreshControl={
            <RefreshControl
              refreshing={list.isFetching && !list.isLoading}
              onRefresh={() => id && invalidateChecklistQueries(qClient, id)}
              tintColor={ViaColors.navy}
            />
          }
          ListEmptyComponent={
            list.isSuccess ? (
              <ScreenState
                kind="empty"
                title="Checklist vazio"
                subtitle="Adicione o que não pode faltar para esta viagem."
              />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ViaColors.background },
  swipeContainer: { overflow: 'visible' },
  formWrap: { paddingTop: ViaSpacing.sm },
  form: {},
  hintSwipe: {
    fontFamily: textBody.fontFamily,
    fontSize: 12,
    color: ViaColors.onSurfaceVariant,
    marginBottom: 10,
    lineHeight: 17,
  },
  inp: {
    fontFamily: textBody.fontFamily,
    fontSize: 16,
    borderBottomWidth: 1,
    borderColor: ViaColors.sand,
    paddingVertical: 8,
    marginBottom: 10,
    color: ViaColors.onSurface,
  },
  add: {
    backgroundColor: ViaColors.primaryContainer,
    borderRadius: 999,
    padding: 12,
    alignItems: 'center',
  },
  addT: { color: ViaColors.onPrimary, fontFamily: textBody.fontFamily, fontWeight: '600' },
  e: { color: '#ba1a1a', fontSize: 13, marginTop: 6 },
  listContent: { paddingTop: ViaSpacing.sm },
  itemCard: {
    backgroundColor: ViaColors.surfaceWhite,
    borderRadius: ViaRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(226,209,179,0.26)',
    padding: ViaSpacing.md,
    ...ViaShadows.level1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ViaSpacing.md,
    paddingVertical: ViaSpacing.xs,
  },
  t: { flex: 1, minWidth: 0 },
  txt: { fontFamily: textBody.fontFamily, fontSize: 16, color: ViaColors.onSurface },
  done: { textDecorationLine: 'line-through', color: ViaColors.onSurfaceVariant },
  sub: { fontSize: 12, color: ViaColors.outline, marginTop: 2 },
  doneSide: {
    backgroundColor: '#15803D',
    justifyContent: 'center',
    alignItems: 'center',
    width: 92,
    borderRadius: 12,
    marginRight: ViaSpacing.sm,
    gap: 4,
  },
  deleteSide: {
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    width: 92,
    borderRadius: 12,
    marginLeft: ViaSpacing.sm,
    gap: 4,
  },
  sideLabel: { fontFamily: textBody.fontFamily, fontSize: 11, color: '#fff', fontWeight: '600' },
});
