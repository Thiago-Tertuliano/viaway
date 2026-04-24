import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/viaway/AppHeader';
import { formatBrl } from '@/lib/format';
import { type CotacaoJson, getComparativo, listCotacoes } from '@/lib/viaway-api';
import { ViaColors, ViaRadius, ViaShadows, ViaSpacing, textBody, textBodySm, textH3, textLabel } from '@/constants/viaway-theme';

export default function CotacoesViagemScreen() {
  const p = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(p.id) ? p.id[0] : p.id;
  const insets = useSafeAreaInsets();
  const qClient = useQueryClient();
  const list = useQuery({
    queryKey: ['cotacoes', id!] as const,
    queryFn: () => listCotacoes(id!),
    enabled: Boolean(id),
  });
  const comp = useQuery({
    queryKey: ['comparativo', id!] as const,
    queryFn: () => getComparativo(id!),
    enabled: Boolean(id),
  });
  return (
    <View style={styles.root}>
      <AppHeader left="back" showAvatar={false} title="Cotações" />
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
              onRefresh={() => {
                if (id) {
                  void qClient.invalidateQueries({ queryKey: ['cotacoes', id] });
                  void qClient.invalidateQueries({ queryKey: ['comparativo', id] });
                }
              }}
            />
          }>
          {comp.data && (
            <View style={styles.hi}>
              <Text style={styles.hiT}>Total: {comp.data.totalCotacoes} cotação(ões)</Text>
            </View>
          )}
          {Object.entries(comp.data?.comparativo ?? {}).map(([tipo, arr]) => (
            <View key={tipo} style={styles.gr}>
              <Text style={styles.grT}>{tipo.replace(/_/g, ' ')}</Text>
              {(arr as CotacaoJson[]).map((c) => (
                <View key={c.id} style={styles.row}>
                  <View>
                    <Text style={styles.tit}>{c.fornecedor}</Text>
                    <Text style={styles.st}>{c.status}</Text>
                  </View>
                  <Text style={styles.v}>{formatBrl(c.valorTotal)}</Text>
                </View>
              ))}
            </View>
          ))}
          <Text style={styles.h2}>Todas</Text>
          {(list.data ?? []).map((c) => (
            <View key={c.id} style={styles.card}>
              <Text style={styles.tit}>{c.fornecedor}</Text>
              <Text style={styles.tip}>
                {c.tipo} · {c.status}
              </Text>
              <Text style={styles.p}>{formatBrl(c.valorTotal)}</Text>
            </View>
          ))}
          {list.isSuccess && (list.data?.length ?? 0) === 0 && !comp.isLoading && (
            <Text style={styles.n}>Nenhuma cotação ainda.</Text>
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
  hi: { backgroundColor: ViaColors.surfaceContainerLow, padding: ViaSpacing.md, borderRadius: ViaRadius.lg, marginBottom: ViaSpacing.sm },
  hiT: { fontFamily: textH3.fontFamily, color: ViaColors.navy, fontSize: 15 },
  gr: { marginBottom: ViaSpacing.md },
  grT: { ...textLabel, color: ViaColors.coral, marginBottom: 6 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: ViaColors.surfaceWhite,
    padding: ViaSpacing.md,
    borderRadius: ViaRadius.md,
    marginBottom: 4,
  },
  h2: { ...textH3, marginTop: ViaSpacing.md, marginBottom: 4 },
  card: {
    backgroundColor: ViaColors.surfaceWhite,
    borderRadius: ViaRadius.lg,
    padding: ViaSpacing.md,
    ...ViaShadows.level1,
  },
  tit: { ...textH3, color: ViaColors.navy, fontSize: 16 },
  st: { ...textBodySm, textTransform: 'capitalize' },
  tip: { ...textBodySm, marginTop: 2 },
  p: { ...textBody, marginTop: 6, fontWeight: '600' },
  v: { fontFamily: textH3.fontFamily, fontSize: 16, color: ViaColors.navy },
  n: { ...textBody, color: ViaColors.onSurfaceVariant },
});
