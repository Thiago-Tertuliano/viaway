import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SectionCard } from '@/components/viaway/SectionCard';
import { ViaColors, ViaFonts, ViaRadius, ViaSpacing } from '@/constants/viaway-theme';
import {
  CURRENCY_NAMES,
  fetchFrankfurterLatest,
  formatConvertedAmount,
  formatRate,
  parseLocaleAmount,
  type FrankfurterLatest,
} from '@/lib/exchange-rates';

const BASE_OPTIONS = ['BRL', 'USD', 'EUR'] as const;

export default function CambioScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [base, setBase] = useState<string>('BRL');
  const [amountInput, setAmountInput] = useState('');
  const [compareOpen, setCompareOpen] = useState(false);

  const q = useQuery({
    queryKey: ['frankfurter', base] as const,
    queryFn: () => fetchFrankfurterLatest(base),
  });

  const rows = useMemo(() => {
    const data = q.data;
    if (!data) return [];
    return Object.entries(data.rates)
      .map(([code, rate]) => ({
        code,
        name: CURRENCY_NAMES[code] ?? code,
        /** 1 base = rate unidades da moeda */
        direct: rate,
        /** 1 unidade da moeda = quantos base */
        inverse: rate > 0 ? 1 / rate : 0,
      }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [q.data]);

  const amountBase = useMemo(() => parseLocaleAmount(amountInput), [amountInput]);

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.topTitle}>Câmbio</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}
        refreshControl={
          <RefreshControl
            refreshing={q.isFetching}
            onRefresh={() => void q.refetch()}
            tintColor={ViaColors.navy}
          />
        }
        showsVerticalScrollIndicator={false}>
        <Text style={styles.lead}>
          Cotações de referência (Banco Central Europeu / Frankfurter). Úteis para comparar moedas antes
          da viagem — não são taxas de compra em banco ou casa de câmbio.
        </Text>

        <View style={styles.baseRow}>
          {BASE_OPTIONS.map((b) => {
            const on = base === b;
            return (
              <Pressable
                key={b}
                onPress={() => setBase(b)}
                style={[styles.baseChip, on && styles.baseChipOn]}>
                <Text style={[styles.baseChipTxt, on && styles.baseChipTxtOn]}>{b}</Text>
              </Pressable>
            );
          })}
        </View>

        {q.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={ViaColors.navy} />
            <Text style={styles.muted}>Carregando cotações…</Text>
          </View>
        ) : q.isError ? (
          <SectionCard>
            <MaterialIcons name="error-outline" size={28} color="#B91C1C" />
            <Text style={styles.errTitle}>Não foi possível carregar</Text>
            <Text style={styles.errBody}>
              {(q.error as Error)?.message ?? 'Verifique a conexão e tente puxar para atualizar.'}
            </Text>
            <Pressable onPress={() => void q.refetch()} style={styles.retry}>
              <Text style={styles.retryTxt}>Tentar novamente</Text>
            </Pressable>
          </SectionCard>
        ) : (
          <>
            <View style={styles.metaRow}>
              <MaterialIcons name="today" size={16} color={ViaColors.outline} />
              <Text style={styles.metaTxt}>
                Data de referência: {(q.data as FrankfurterLatest)?.date ?? '—'}
              </Text>
            </View>

            <SectionCard>
              <View style={styles.calcHead}>
                <MaterialIcons name="calculate" size={22} color={ViaColors.navy} />
                <Text style={styles.cardTitle}>Calculadora</Text>
              </View>
              <Text style={styles.cardSub}>
                Digite um valor em <Text style={styles.bold}>{base}</Text> para ver o equivalente nas
                outras moedas (mesma taxa de referência da lista).
              </Text>
              <Text style={styles.inputLabel}>Valor em {base}</Text>
              <TextInput
                value={amountInput}
                onChangeText={setAmountInput}
                placeholder="Ex.: 500 ou 1.250,50"
                placeholderTextColor={ViaColors.outline}
                keyboardType="decimal-pad"
                style={styles.amountInput}
              />
              {Number.isFinite(amountBase) && amountBase > 0 ? (
                <View style={styles.calcResults}>
                  {rows.map((r) => (
                    <View key={r.code} style={styles.calcRow}>
                      <Text style={styles.calcCode}>{r.code}</Text>
                      <Text style={styles.calcName} numberOfLines={1}>
                        {r.name}
                      </Text>
                      <Text style={styles.calcValue}>
                        {formatConvertedAmount(amountBase * r.direct, r.code)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.calcHint}>Informe um valor maior que zero para ver a conversão.</Text>
              )}
            </SectionCard>

            <SectionCard>
              <Pressable
                onPress={() => setCompareOpen((o) => !o)}
                style={styles.dropdownHead}
                accessibilityRole="button"
                accessibilityState={{ expanded: compareOpen }}
                accessibilityLabel={
                  compareOpen ? 'Recolher comparativo de taxas' : 'Abrir comparativo de taxas'
                }>
                <View style={styles.dropdownHeadText}>
                  <Text style={styles.cardTitle}>Comparativo de taxas</Text>
                  <Text style={styles.dropdownSub}>
                    {rows.length} moedas · 1 {base} e inverso
                  </Text>
                </View>
                <MaterialIcons
                  name={compareOpen ? 'expand-less' : 'expand-more'}
                  size={28}
                  color={ViaColors.navy}
                />
              </Pressable>
              {compareOpen ? (
                <>
                  <Text style={[styles.cardSub, styles.dropdownBodyIntro]}>
                    Para cada moeda: quanto vale <Text style={styles.bold}>1 {base}</Text> e o inverso (
                    <Text style={styles.bold}>1 unidade estrangeira</Text> em {base}).
                  </Text>
                  {rows.map((r) => (
                    <View key={r.code} style={styles.rateRow}>
                      <View style={styles.rateHead}>
                        <Text style={styles.rateCode}>{r.code}</Text>
                        <Text style={styles.rateName} numberOfLines={1}>
                          {r.name}
                        </Text>
                      </View>
                      <Text style={styles.rateLine}>
                        1 {base} = {formatRate(r.direct)} {r.code}
                      </Text>
                      <Text style={styles.rateLineMuted}>
                        1 {r.code} = {formatRate(r.inverse)} {base}
                      </Text>
                    </View>
                  ))}
                </>
              ) : null}
            </SectionCard>

            <SectionCard>
              <View style={styles.taxHead}>
                <MaterialIcons name="info-outline" size={22} color={ViaColors.navy} />
                <Text style={styles.cardTitle}>Impostos e custos reais (Brasil)</Text>
              </View>
              <Text style={styles.taxP}>
                • <Text style={styles.bold}>IOF:</Text> em compras no exterior com cartão de crédito em
                moeda estrangeira costuma incidir IOF (alíquota pode mudar; em muitos casos fica em torno
                de poucos por cento a mais que operações em reais). Cartão de débito e saques também podem
                ter regras diferentes.
              </Text>
              <Text style={styles.taxP}>
                • <Text style={styles.bold}>Spread:</Text> bancos e bandeiras aplicam margem sobre a taxa
                de conversão — o valor do app <Text style={styles.bold}>não</Text> inclui esse spread.
              </Text>
              <Text style={styles.taxP}>
                • <Text style={styles.bold}>PTAX / turismo:</Text> para valores oficiais e regulamentação,
                consulte o Banco Central do Brasil e o contrato do seu cartão ou banco.
              </Text>
              <Text style={styles.disclaimer}>
                Conteúdo informativo. Não é recomendação financeira, fiscal ou jurídica.
              </Text>
            </SectionCard>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ViaColors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ViaSpacing.margin,
    paddingBottom: 14,
    backgroundColor: ViaColors.navy,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontFamily: ViaFonts.h3, fontSize: 17, color: '#fff' },
  scroll: { paddingHorizontal: ViaSpacing.margin, paddingTop: ViaSpacing.lg, gap: ViaSpacing.md },
  lead: {
    fontFamily: ViaFonts.body,
    fontSize: 14,
    color: ViaColors.onSurfaceVariant,
    lineHeight: 20,
  },
  baseRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  baseChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.15)',
    backgroundColor: '#fff',
  },
  baseChipOn: { backgroundColor: ViaColors.navy, borderColor: ViaColors.navy },
  baseChipTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 14, color: ViaColors.navy },
  baseChipTxtOn: { color: '#fff' },
  center: { paddingVertical: 40, alignItems: 'center', gap: 12 },
  muted: { fontFamily: ViaFonts.body, fontSize: 13, color: ViaColors.onSurfaceVariant },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaTxt: { fontFamily: ViaFonts.body, fontSize: 12, color: ViaColors.onSurfaceVariant },
  cardTitle: { fontFamily: ViaFonts.h3, fontSize: 16, color: ViaColors.navy, marginBottom: 6 },
  cardSub: { fontFamily: ViaFonts.body, fontSize: 13, color: ViaColors.onSurfaceVariant, marginBottom: 14, lineHeight: 18 },
  bold: { fontFamily: ViaFonts.bodySemi, color: ViaColors.navy },
  rateRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.08)',
  },
  rateHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 4 },
  rateCode: { fontFamily: ViaFonts.h3, fontSize: 15, color: ViaColors.navy },
  rateName: { fontFamily: ViaFonts.body, fontSize: 12, color: ViaColors.onSurfaceVariant, flex: 1 },
  rateLine: { fontFamily: ViaFonts.bodySemi, fontSize: 14, color: ViaColors.onSurface },
  rateLineMuted: { fontFamily: ViaFonts.body, fontSize: 12, color: ViaColors.onSurfaceVariant, marginTop: 2 },
  calcHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  inputLabel: {
    fontFamily: ViaFonts.bodySemi,
    fontSize: 12,
    color: ViaColors.navy,
    marginBottom: 6,
    marginTop: 4,
  },
  amountInput: {
    fontFamily: ViaFonts.h3,
    fontSize: 22,
    color: ViaColors.onSurface,
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.12)',
    borderRadius: ViaRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  calcResults: { marginTop: 16, gap: 0 },
  calcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.08)',
    gap: 8,
  },
  calcCode: { fontFamily: ViaFonts.h3, fontSize: 14, color: ViaColors.navy, width: 44 },
  calcName: { fontFamily: ViaFonts.body, fontSize: 12, color: ViaColors.onSurfaceVariant, flex: 1 },
  calcValue: { fontFamily: ViaFonts.bodySemi, fontSize: 14, color: ViaColors.onSurface },
  calcHint: {
    fontFamily: ViaFonts.body,
    fontSize: 13,
    color: ViaColors.onSurfaceVariant,
    marginTop: 12,
    fontStyle: 'italic',
  },
  dropdownHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dropdownHeadText: { flex: 1 },
  dropdownSub: { fontFamily: ViaFonts.body, fontSize: 12, color: ViaColors.onSurfaceVariant, marginTop: 2 },
  dropdownBodyIntro: { marginTop: 12, marginBottom: 4 },
  taxHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  taxP: { fontFamily: ViaFonts.body, fontSize: 13, color: ViaColors.onSurface, lineHeight: 20, marginBottom: 10 },
  disclaimer: {
    fontFamily: ViaFonts.body,
    fontSize: 11,
    color: ViaColors.outline,
    fontStyle: 'italic',
    marginTop: 4,
  },
  errTitle: { fontFamily: ViaFonts.bodySemi, fontSize: 16, color: '#B91C1C', marginTop: 8 },
  errBody: { fontFamily: ViaFonts.body, fontSize: 13, color: ViaColors.onSurfaceVariant, marginTop: 6 },
  retry: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: ViaRadius.full,
    backgroundColor: ViaColors.navy,
  },
  retryTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 13, color: '#fff' },
});
