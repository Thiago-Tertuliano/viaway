import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, RefreshControl, TextInput, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/viaway/AppHeader';
import { ScreenState } from '@/components/viaway/ScreenState';
import { SectionCard } from '@/components/viaway/SectionCard';
import { formatBrl } from '@/lib/format';
import { converterMoeda, type CotacaoJson, getComparativo, listCotacoes, listMoedas } from '@/lib/viaway-api';
import { ViaColors, ViaRadius, ViaShadows, ViaSpacing, textBody, textBodySm, textH3, textLabel } from '@/constants/viaway-theme';

const TAX_PRESET_BY_CURRENCY: Record<string, { iof: string; taxa: string }> = {
  BRL: { iof: '0', taxa: '0' },
  USD: { iof: '3,38', taxa: '1,00' },
  EUR: { iof: '3,38', taxa: '1,00' },
  GBP: { iof: '3,38', taxa: '1,00' },
  ARS: { iof: '3,38', taxa: '1,00' },
  CLP: { iof: '3,38', taxa: '1,00' },
  COP: { iof: '3,38', taxa: '1,00' },
  UYU: { iof: '3,38', taxa: '1,00' },
  MXN: { iof: '3,38', taxa: '1,00' },
  AUD: { iof: '3,38', taxa: '1,00' },
  NZD: { iof: '3,38', taxa: '1,00' },
  CNY: { iof: '3,38', taxa: '1,00' },
};

export default function CotacoesViagemScreen() {
  const p = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(p.id) ? p.id[0] : p.id;
  const insets = useSafeAreaInsets();
  const qClient = useQueryClient();
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('BRL');
  const [amount, setAmount] = useState('100');
  const [iof, setIof] = useState('');
  const [taxa, setTaxa] = useState('');
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
  const moedas = useQuery({
    queryKey: ['moedas'] as const,
    queryFn: () => listMoedas(),
  });

  function applyTaxPreset(currency: string) {
    const preset = TAX_PRESET_BY_CURRENCY[currency] ?? { iof: '3,38', taxa: '1,00' };
    setIof(preset.iof);
    setTaxa(preset.taxa);
  }
  const convert = useMutation({
    mutationFn: () => {
      const a = Number.parseFloat(amount.replace(',', '.'));
      const i = Number.parseFloat(iof.replace(',', '.'));
      const t = Number.parseFloat(taxa.replace(',', '.'));
      if (!Number.isFinite(a) || a <= 0) {
        return Promise.reject(new Error('Informe um valor válido.'));
      }
      return converterMoeda({
        from: from.trim().toUpperCase(),
        to: to.trim().toUpperCase(),
        amount: a,
        iofPercentual: Number.isFinite(i) ? i : undefined,
        taxaPercentual: Number.isFinite(t) ? t : undefined,
      });
    },
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
              <Text style={styles.hiT}>Total de cotações: {comp.data.totalCotacoes}</Text>
            </View>
            </SectionCard>
          )}
          <SectionCard>
            <View style={styles.converter}>
              <Text style={styles.h2}>Conversor de moedas</Text>
              <Text style={styles.n}>Origem</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {(moedas.data ?? ['BRL', 'USD', 'EUR', 'GBP']).map((m) => {
                  const on = from === m;
                  return (
                    <Pressable
                      key={`from-${m}`}
                      onPress={() => setFrom(m)}
                      style={[styles.chip, on ? styles.chipOn : null]}>
                      <Text style={[styles.chipText, on ? styles.chipTextOn : null]}>{m}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Text style={styles.n}>Destino</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {(moedas.data ?? ['BRL', 'USD', 'EUR', 'GBP']).map((m) => {
                  const on = to === m;
                  return (
                    <Pressable
                      key={`to-${m}`}
                      onPress={() => {
                        setTo(m);
                        applyTaxPreset(m);
                      }}
                      style={[styles.chip, on ? styles.chipOn : null]}>
                      <Text style={[styles.chipText, on ? styles.chipTextOn : null]}>{m}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <View style={styles.converterRow}>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="Valor"
                  placeholderTextColor={ViaColors.onSurfaceVariant}
                  style={[styles.input, { flex: 1 }]}
                />
              </View>
              <View style={styles.converterRow}>
                <TextInput
                  value={iof}
                  onChangeText={setIof}
                  placeholder="IOF %"
                  placeholderTextColor={ViaColors.onSurfaceVariant}
                  keyboardType="decimal-pad"
                  style={[styles.input, { width: 100 }]}
                />
                <TextInput
                  value={taxa}
                  onChangeText={setTaxa}
                  placeholder="Taxa %"
                  placeholderTextColor={ViaColors.onSurfaceVariant}
                  keyboardType="decimal-pad"
                  style={[styles.input, { width: 100 }]}
                />
                <Pressable onPress={() => convert.mutate()} style={styles.btn}>
                  <Text style={styles.btnT}>{convert.isPending ? '...' : 'Converter'}</Text>
                </Pressable>
              </View>
              {convert.isSuccess ? (
                <Text style={styles.n}>
                  {convert.data.amount} {convert.data.from} = {convert.data.converted} {convert.data.to} · Total c/ taxas{' '}
                  {convert.data.totalWithTaxes} {convert.data.to}
                </Text>
              ) : null}
              {convert.isError ? <Text style={styles.err}>{(convert.error as Error).message}</Text> : null}
            </View>
          </SectionCard>
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
  converter: { gap: 8 },
  converterRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  chips: { gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: ViaColors.sand,
    borderRadius: ViaRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: ViaColors.surfaceWhite,
  },
  chipOn: {
    backgroundColor: ViaColors.primaryContainer,
    borderColor: ViaColors.navy,
  },
  chipText: { ...textBodySm, color: ViaColors.navy },
  chipTextOn: { color: ViaColors.onPrimary },
  input: {
    borderBottomWidth: 1,
    borderColor: ViaColors.sand,
    paddingVertical: 8,
    color: ViaColors.onSurface,
  },
  btn: {
    backgroundColor: ViaColors.primaryContainer,
    borderRadius: ViaRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  btnT: { ...textBodySm, color: ViaColors.onPrimary },
  err: { ...textBodySm, color: '#ba1a1a' },
});
