import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/viaway/AppHeader';
import { ScreenState } from '@/components/viaway/ScreenState';
import { SectionCard } from '@/components/viaway/SectionCard';
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
        <ScreenState kind="loading" title="Carregando cotações..." />
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
            <SectionCard>
            <View style={styles.hi}>
              <Text style={styles.hiT}>Total: {comp.data.totalCotacoes} cotação(ões)</Text>
            </View>
            </SectionCard>
          )}
          {Object.entries(comp.data?.comparativo ?? {}).map(([tipo, arr]) => (
            <View key={tipo} style={styles.gr}>
              <Text style={styles.grT}>{tipo.replace(/_/g, ' ')}</Text>
              {(arr as CotacaoJson[]).map((c) => (
                <SectionCard key={c.id}>
                <View style={styles.row}>
                  <View>
                    <Text style={styles.tit}>{c.fornecedor}</Text>
                    <Text style={styles.st}>{c.status}</Text>
                  </View>
                  <Text style={styles.v}>{formatBrl(c.valorTotal)}</Text>
                </View>
                </SectionCard>
              ))}
            </View>
          ))}
          <Text style={styles.h2}>Todas</Text>
          {(list.data ?? []).map((c) => (
            <SectionCard key={c.id}>
            <View style={styles.card}>
              <Text style={styles.tit}>{c.fornecedor}</Text>
              <Text style={styles.tip}>
                {c.tipo} · {c.status}
              </Text>
              <Text style={styles.p}>{formatBrl(c.valorTotal)}</Text>
            </View>
            </SectionCard>
          ))}
          {list.isSuccess && (list.data?.length ?? 0) === 0 && !comp.isLoading && (
            <ScreenState
              kind="empty"
              title="Nenhuma cotação ainda"
              subtitle="Adicione cotações para comparar fornecedores e custos."
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
  hi: { backgroundColor: ViaColors.surfaceContainerLow, padding: ViaSpacing.md, borderRadius: ViaRadius.lg },
  hiT: { fontFamily: textH3.fontFamily, color: ViaColors.navy, fontSize: 15 },
  gr: { marginBottom: ViaSpacing.md },
  grT: { ...textLabel, color: ViaColors.coral, marginBottom: 6 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: ViaSpacing.xs,
  },
  h2: { ...textH3, marginTop: ViaSpacing.md, marginBottom: 4 },
  card: { paddingVertical: ViaSpacing.xs },
  tit: { ...textH3, color: ViaColors.navy, fontSize: 16 },
  st: { ...textBodySm, textTransform: 'capitalize' },
  tip: { ...textBodySm, marginTop: 2 },
  p: { ...textBody, marginTop: 6, fontWeight: '600' },
  v: { fontFamily: textH3.fontFamily, fontSize: 16, color: ViaColors.navy },
  n: { ...textBody, color: ViaColors.onSurfaceVariant },
});
