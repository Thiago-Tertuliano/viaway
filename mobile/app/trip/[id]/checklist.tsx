import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/viaway/AppHeader';
import { createChecklistItem, listChecklist, toggleChecklist } from '@/lib/viaway-api';
import {
  ViaColors,
  ViaRadius,
  ViaShadows,
  ViaSpacing,
  textBody,
  textH3,
} from '@/constants/viaway-theme';

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

  const addM = useMutation({
    mutationFn: async () => {
      if (!id || !item.trim()) throw new Error('Digite o item.');
      const ord = (list.data?.length ?? 0) + 1;
      return createChecklistItem({ viagemId: id, item: item.trim(), ordem: ord });
    },
    onSuccess: () => {
      setItem('');
      if (id) {
        void qClient.invalidateQueries({ queryKey: ['checklist', id] });
        void qClient.invalidateQueries({ queryKey: ['trip-metas', id] });
      }
    },
  });

  const toggleM = useMutation({
    mutationFn: ({ cid, concluido }: { cid: string; concluido: boolean }) =>
      toggleChecklist(cid, concluido),
    onSuccess: () => {
      if (id) void qClient.invalidateQueries({ queryKey: ['checklist', id] });
    },
  });

  return (
    <View style={styles.root}>
      <AppHeader left="back" showAvatar={false} title="Checklist" />
      {list.isLoading ? (
        <View style={styles.c}>
          <ActivityIndicator size="large" color={ViaColors.coral} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.sc,
            { paddingBottom: insets.bottom + ViaSpacing.xl },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={list.isFetching}
              onRefresh={() => id && qClient.invalidateQueries({ queryKey: ['checklist', id] })}
            />
          }>
          <View style={styles.form}>
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
            {addM.isError && (
              <Text style={styles.e}>{(addM.error as Error).message}</Text>
            )}
          </View>
          {(list.data ?? []).map((c) => (
            <Pressable
              key={c.id}
              onPress={() => toggleM.mutate({ cid: c.id, concluido: !c.concluido })}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.92 }]}>
              <MaterialIcons
                name={c.concluido ? 'check-box' : 'check-box-outline-blank'}
                size={26}
                color={c.concluido ? ViaColors.coral : ViaColors.outline}
              />
              <View style={styles.t}>
                <Text style={[styles.txt, c.concluido && styles.done]}>{c.item}</Text>
                {c.categoria && <Text style={styles.sub}>{c.categoria}</Text>}
              </View>
            </Pressable>
          ))}
          {list.isSuccess && (list.data?.length ?? 0) === 0 && (
            <Text style={styles.n}>Lista vazia. Adicione o que não pode faltar.</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ViaColors.background },
  c: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sc: { padding: ViaSpacing.margin, gap: ViaSpacing.sm },
  form: {
    backgroundColor: ViaColors.surfaceWhite,
    borderRadius: ViaRadius.lg,
    padding: ViaSpacing.md,
    marginBottom: ViaSpacing.md,
    ...ViaShadows.level1,
  },
  h2: { ...textH3, marginBottom: 8, color: ViaColors.navy },
  inp: {
    fontFamily: textBody.fontFamily,
    fontSize: 16,
    borderBottomWidth: 1,
    borderColor: ViaColors.sand,
    paddingVertical: 8,
    marginBottom: 10,
    color: ViaColors.onSurface,
  },
  add: { backgroundColor: ViaColors.primaryContainer, borderRadius: 999, padding: 12, alignItems: 'center' },
  addT: { color: ViaColors.onPrimary, fontFamily: textBody.fontFamily, fontWeight: '600' },
  e: { color: '#ba1a1a', fontSize: 13, marginTop: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ViaSpacing.md,
    backgroundColor: ViaColors.surfaceWhite,
    borderRadius: ViaRadius.lg,
    padding: ViaSpacing.md,
    ...ViaShadows.level1,
  },
  t: { flex: 1, minWidth: 0 },
  txt: { fontFamily: textBody.fontFamily, fontSize: 16, color: ViaColors.onSurface },
  done: { textDecorationLine: 'line-through', color: ViaColors.onSurfaceVariant },
  sub: { fontSize: 12, color: ViaColors.outline, marginTop: 2 },
  n: { ...textBody, color: ViaColors.onSurfaceVariant, textAlign: 'center', marginTop: ViaSpacing.lg },
});
