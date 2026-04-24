import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/viaway/AppHeader';
import { listLugaresViagem } from '@/lib/viaway-api';
import { ViaColors, ViaRadius, ViaShadows, ViaSpacing, textBody, textBodySm, textH3 } from '@/constants/viaway-theme';

export default function LugaresViagemScreen() {
  const p = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(p.id) ? p.id[0] : p.id;
  const insets = useSafeAreaInsets();
  const qClient = useQueryClient();
  const q = useQuery({
    queryKey: ['lugares', id!] as const,
    queryFn: () => listLugaresViagem(id!),
    enabled: Boolean(id),
  });
  return (
    <View style={styles.root}>
      <AppHeader left="back" showAvatar={false} title="Lugares" />
      {q.isLoading ? (
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
              refreshing={q.isFetching}
              onRefresh={() => id && qClient.invalidateQueries({ queryKey: ['lugares', id] })}
            />
          }>
          {q.isError && <Text style={styles.e}>Falha ao carregar.</Text>}
          {(q.data ?? []).map((l) => (
            <Pressable key={l.id} style={({ pressed }) => [styles.card, pressed && { opacity: 0.95 }]}>
              <MaterialIcons name="place" size={22} color={ViaColors.secondary} />
              <View style={styles.t}>
                <Text style={styles.tit}>{l.nome}</Text>
                <Text style={styles.tip}>{l.tipo} · {l.status}</Text>
                <Text style={styles.loc}>
                  {[l.cidade, l.pais].filter(Boolean).join(', ') || '—'}
                </Text>
              </View>
            </Pressable>
          ))}
          {q.isSuccess && (q.data?.length ?? 0) === 0 && (
            <Text style={styles.n}>Nenhum lugar vinculado a esta viagem.</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ViaColors.background },
  c: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sc: { padding: ViaSpacing.margin, gap: ViaSpacing.md },
  e: { color: '#ba1a1a' },
  n: { ...textBody, color: ViaColors.onSurfaceVariant },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ViaSpacing.md,
    backgroundColor: ViaColors.surfaceWhite,
    borderRadius: ViaRadius.lg,
    padding: ViaSpacing.md,
    ...ViaShadows.level1,
  },
  t: { flex: 1, minWidth: 0 },
  tit: { ...textH3, color: ViaColors.navy, marginBottom: 2 },
  tip: { ...textBodySm, color: ViaColors.onSurfaceVariant },
  loc: { ...textBodySm, marginTop: 4, color: ViaColors.outline },
});
