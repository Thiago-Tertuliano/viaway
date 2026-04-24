import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/viaway/AppHeader';
import { ScreenState } from '@/components/viaway/ScreenState';
import { SectionCard } from '@/components/viaway/SectionCard';
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
        <ScreenState kind="loading" title="Carregando lugares..." />
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
            <SectionCard key={l.id}>
            <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.95 }]}>
              <MaterialIcons name="place" size={22} color={ViaColors.secondary} />
              <View style={styles.t}>
                <Text style={styles.tit}>{l.nome}</Text>
                <Text style={styles.tip}>{l.tipo} · {l.status}</Text>
                <Text style={styles.loc}>
                  {[l.cidade, l.pais].filter(Boolean).join(', ') || '—'}
                </Text>
              </View>
            </Pressable>
            </SectionCard>
          ))}
          {q.isSuccess && (q.data?.length ?? 0) === 0 && (
            <ScreenState
              kind="empty"
              title="Nenhum lugar vinculado"
              subtitle="Salve lugares e associe à viagem para ter referência no roteiro."
            />
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ViaColors.background },
  sc: { padding: ViaSpacing.margin, gap: ViaSpacing.md },
  e: { color: '#ba1a1a' },
  n: { ...textBody, color: ViaColors.onSurfaceVariant },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ViaSpacing.md,
    paddingVertical: ViaSpacing.xs,
  },
  t: { flex: 1, minWidth: 0 },
  tit: { ...textH3, color: ViaColors.navy, marginBottom: 2 },
  tip: { ...textBodySm, color: ViaColors.onSurfaceVariant },
  loc: { ...textBodySm, marginTop: 4, color: ViaColors.outline },
});
