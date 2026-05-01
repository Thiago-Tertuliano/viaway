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
import { ProgressBarCoral } from '@/components/viaway/ProgressBarCoral';
import { ScreenState } from '@/components/viaway/ScreenState';
import { SectionCard } from '@/components/viaway/SectionCard';
import { formatBrl } from '@/lib/format';
import { type GastoJson, createGasto, getPainelGastos, listGastos } from '@/lib/viaway-api';
import {
  ViaColors,
  ViaFonts,
  ViaRadius,
  ViaShadows,
  ViaSpacing,
  textBody,
  textBodySm,
  textH3,
} from '@/constants/viaway-theme';

const CATS: GastoJson['categoria'][] = [
  'alimentacao',
  'hospedagem',
  'transporte',
  'passeio',
  'compras',
  'outro',
];

const PAY_METHODS: GastoJson['metodoPagamento'][] = [
  'cartao_internacional',
  'cartao_nacional',
  'pix',
  'transferencia',
  'dinheiro',
  'outro',
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function GastosViagemScreen() {
  const p = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(p.id) ? p.id[0] : p.id;
  const insets = useSafeAreaInsets();
  const qClient = useQueryClient();
  const [desc, setDesc] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(todayIso());
  const [cat, setCat] = useState<GastoJson['categoria']>('outro');
  const [moeda, setMoeda] = useState('BRL');
  const [valorOriginal, setValorOriginal] = useState('');
  const [metodoPagamento, setMetodoPagamento] = useState<GastoJson['metodoPagamento']>('outro');
  const [cartaoNome, setCartaoNome] = useState('');
  const [parcelas, setParcelas] = useState('');
  const [iof, setIof] = useState('');
  const [taxa, setTaxa] = useState('');
  const [milhas, setMilhas] = useState('');
  const [descricaoPagamento, setDescricaoPagamento] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const list = useQuery({
    queryKey: ['gastos', id!] as const,
    queryFn: () => listGastos(id!),
    enabled: Boolean(id),
  });
  const painel = useQuery({
    queryKey: ['painel', id!] as const,
    queryFn: () => getPainelGastos(id!),
    enabled: Boolean(id),
  });

  const m = useMutation({
    mutationFn: () => {
      const v = parseFloat(valor.replace(',', '.'));
      const vOrig = parseFloat(valorOriginal.replace(',', '.'));
      const parcelasNum = Number.parseInt(parcelas, 10);
      const iofNum = parseFloat(iof.replace(',', '.'));
      const taxaNum = parseFloat(taxa.replace(',', '.'));
      const milhasNum = Number.parseInt(milhas, 10);
      if (!id || !desc.trim() || Number.isNaN(v) || v <= 0) {
        if (Number.isNaN(vOrig) || vOrig <= 0) {
          return Promise.reject(new Error('Preencha descrição e valor (ou valor original).'));
        }
      }
      return createGasto({
        viagemId: id,
        descricao: desc.trim(),
        categoria: cat,
        valor: Number.isNaN(v) ? undefined : v,
        moeda: moeda.trim().toUpperCase(),
        valorOriginal: Number.isNaN(vOrig) ? null : vOrig,
        metodoPagamento,
        cartaoNome: cartaoNome.trim() || null,
        parcelas: Number.isNaN(parcelasNum) ? null : parcelasNum,
        iofPercentual: Number.isNaN(iofNum) ? null : iofNum,
        taxaPercentual: Number.isNaN(taxaNum) ? null : taxaNum,
        milhasEstimadas: Number.isNaN(milhasNum) ? null : milhasNum,
        descricaoPagamento: descricaoPagamento.trim() || null,
        data,
      });
    },
    onSuccess: () => {
      setDesc('');
      setValor('');
      setValorOriginal('');
      setCartaoNome('');
      setParcelas('');
      setIof('');
      setTaxa('');
      setMilhas('');
      setDescricaoPagamento('');
      if (id) {
        void qClient.invalidateQueries({ queryKey: ['gastos', id] });
        void qClient.invalidateQueries({ queryKey: ['painel', id] });
        void qClient.invalidateQueries({ queryKey: ['trip-metas', id] });
      }
    },
  });

  const orc = painel.data?.orcamentoTotal ?? 0;
  const comp = (painel.data?.jaGasto ?? 0) + (painel.data?.cotacoesConfirmadas ?? 0);
  const prog = orc > 0 ? Math.min(1, comp / orc) : 0;

  return (
    <View style={styles.root}>
      <AppHeader left="back" showAvatar={false} title="Gastos" />
      {list.isLoading ? (
        <ScreenState kind="loading" title="Carregando gastos..." />
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
                  void qClient.invalidateQueries({ queryKey: ['gastos', id] });
                  void qClient.invalidateQueries({ queryKey: ['painel', id] });
                }
              }}
            />
          }>
          {painel.data && (
            <SectionCard>
              <View style={styles.pan}>
                <Text style={styles.kicker}>Saude financeira da viagem</Text>
                <Text style={styles.panT}>
                  {formatBrl(painel.data.jaGasto)} gasto · {formatBrl(painel.data.saldoDisponivel)} saldo
                </Text>
                {orc > 0 && <ProgressBarCoral progress={prog} />}
              </View>
            </SectionCard>
          )}
          <SectionCard>
            <View style={styles.form}>
              <View style={styles.headRow}>
                <Text style={styles.h2}>Novo gasto</Text>
                <Text style={styles.stepTag}>passo 2 da viagem</Text>
              </View>
              <Text style={styles.helper}>Registre o essencial em segundos. Campos avancados sao opcionais.</Text>
              <TextInput
                value={desc}
                onChangeText={setDesc}
                placeholder="Descricao (ex: jantar no centro)"
                placeholderTextColor={ViaColors.onSurfaceVariant}
                style={styles.inp}
              />
              <View style={styles.r2}>
                <TextInput
                  value={valor}
                  onChangeText={setValor}
                  placeholder="Valor final em BRL (ex: 45,90)"
                  placeholderTextColor={ViaColors.onSurfaceVariant}
                  keyboardType="decimal-pad"
                  style={[styles.inp, { flex: 1 }]}
                />
                <TextInput
                  value={data}
                  onChangeText={setData}
                  placeholder="AAAA-MM-DD"
                  style={[styles.inp, { width: 124 }]}
                />
              </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cats}>
              {CATS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setCat(c)}
                  style={[
                    styles.chip,
                    cat === c && { backgroundColor: ViaColors.primaryContainer, borderColor: ViaColors.navy },
                  ]}>
                  <Text style={[styles.chipT, cat === c && { color: ViaColors.onPrimary }]}>{c}</Text>
                </Pressable>
              ))}
            </ScrollView>
              <Pressable
                onPress={() => setShowAdvanced((v) => !v)}
                style={({ pressed }) => [styles.advancedToggle, pressed && { opacity: 0.85 }]}>
                <Text style={styles.advancedText}>
                  {showAdvanced ? 'Ocultar campos avancados' : 'Mostrar campos avancados'}
                </Text>
              </Pressable>
              {showAdvanced && (
                <View style={styles.advancedWrap}>
                  <View style={styles.subSection}>
                    <Text style={styles.subSectionLabel}>Pagamento</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cats}>
                      {PAY_METHODS.map((mtd) => (
                        <Pressable
                          key={mtd}
                          onPress={() => setMetodoPagamento(mtd)}
                          style={[
                            styles.chip,
                            metodoPagamento === mtd && {
                              backgroundColor: ViaColors.primaryContainer,
                              borderColor: ViaColors.navy,
                            },
                          ]}>
                          <Text style={[styles.chipT, metodoPagamento === mtd && { color: ViaColors.onPrimary }]}>
                            {mtd.replace(/_/g, ' ')}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                    <TextInput
                      value={descricaoPagamento}
                      onChangeText={setDescricaoPagamento}
                      placeholder="Descricao do pagamento"
                      placeholderTextColor={ViaColors.onSurfaceVariant}
                      style={styles.inp}
                    />
                    <View style={styles.r2}>
                      <TextInput
                        value={cartaoNome}
                        onChangeText={setCartaoNome}
                        placeholder="Cartao"
                        placeholderTextColor={ViaColors.onSurfaceVariant}
                        style={[styles.inp, { flex: 1 }]}
                      />
                      <TextInput
                        value={parcelas}
                        onChangeText={setParcelas}
                        placeholder="Parcelas"
                        keyboardType="number-pad"
                        style={[styles.inp, { width: 96 }]}
                      />
                    </View>
                  </View>
                  <View style={styles.subSection}>
                    <Text style={styles.subSectionLabel}>Moeda e taxas</Text>
                    <View style={styles.r2}>
                      <TextInput
                        value={valorOriginal}
                        onChangeText={setValorOriginal}
                        placeholder="Valor original"
                        placeholderTextColor={ViaColors.onSurfaceVariant}
                        keyboardType="decimal-pad"
                        style={[styles.inp, { flex: 1 }]}
                      />
                      <TextInput
                        value={moeda}
                        onChangeText={setMoeda}
                        placeholder="Moeda"
                        placeholderTextColor={ViaColors.onSurfaceVariant}
                        autoCapitalize="characters"
                        style={[styles.inp, { width: 104 }]}
                      />
                    </View>
                    <View style={styles.r2}>
                      <TextInput
                        value={iof}
                        onChangeText={setIof}
                        placeholder="IOF %"
                        keyboardType="decimal-pad"
                        style={[styles.inp, { width: 96 }]}
                      />
                      <TextInput
                        value={taxa}
                        onChangeText={setTaxa}
                        placeholder="Taxa %"
                        keyboardType="decimal-pad"
                        style={[styles.inp, { width: 96 }]}
                      />
                      <TextInput
                        value={milhas}
                        onChangeText={setMilhas}
                        placeholder="Milhas"
                        keyboardType="number-pad"
                        style={[styles.inp, { flex: 1 }]}
                      />
                    </View>
                  </View>
                </View>
              )}
            <Pressable
              onPress={() => m.mutate()}
              style={({ pressed }) => [styles.add, pressed && { opacity: 0.9 }, m.isPending && { opacity: 0.6 }]}>
              <Text style={styles.addT}>{m.isPending ? 'Salvando…' : 'Adicionar'}</Text>
            </Pressable>
            {m.isError && (
              <Text style={styles.e}>{(m.error as Error).message}</Text>
            )}
            </View>
          </SectionCard>
          <Text style={styles.h2}>Lançamentos</Text>
          {(list.data ?? []).map((g) => (
            <SectionCard key={g.id}>
            <View style={styles.card}>
              <View>
                <Text style={styles.tit}>{g.descricao}</Text>
                <Text style={styles.tip}>
                  {g.categoria} · {g.data}
                </Text>
                <Text style={styles.tip}>
                  {g.moeda} {g.valorOriginal != null ? g.valorOriginal.toFixed(2) : g.valor.toFixed(2)} ·{' '}
                  {g.metodoPagamento.replace(/_/g, ' ')}
                </Text>
              </View>
              <Text style={styles.v}>{formatBrl(g.valor)}</Text>
            </View>
            </SectionCard>
          ))}
          {(list.data?.length ?? 0) === 0 && (
            <ScreenState
              kind="empty"
              title="Nenhum gasto lançado"
              subtitle="Cadastre o primeiro gasto para acompanhar o orçamento."
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
  pan: {},
  kicker: { ...textBodySm, fontFamily: ViaFonts.bodySemi, color: ViaColors.outline, marginBottom: 4, textTransform: 'uppercase', fontSize: 11 },
  panT: { ...textBody, marginBottom: 8, color: ViaColors.navy },
  form: {},
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  stepTag: {
    fontFamily: ViaFonts.bodySemi,
    fontSize: 11,
    color: ViaColors.onPrimary,
    backgroundColor: ViaColors.coral,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    textTransform: 'uppercase',
  },
  helper: { ...textBodySm, color: ViaColors.onSurfaceVariant, marginBottom: 8 },
  h2: { ...textH3, color: ViaColors.navy, marginBottom: ViaSpacing.sm },
  inp: {
    fontFamily: ViaFonts.body,
    fontSize: 16,
    borderBottomWidth: 1,
    borderColor: ViaColors.sand,
    paddingVertical: 10,
    marginBottom: 10,
    color: ViaColors.onSurface,
  },
  r2: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  cats: { marginBottom: 10, maxHeight: 44 },
  chip: {
    borderWidth: 1,
    borderColor: ViaColors.sand,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 6,
  },
  chipT: { fontFamily: ViaFonts.body, fontSize: 12, color: ViaColors.navy, textTransform: 'capitalize' },
  advancedToggle: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ViaColors.sand,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  advancedText: { fontFamily: ViaFonts.bodySemi, fontSize: 12, color: ViaColors.navy },
  advancedWrap: {
    borderWidth: 1,
    borderColor: 'rgba(226,209,179,0.45)',
    borderRadius: ViaRadius.md,
    padding: ViaSpacing.sm,
    marginBottom: 10,
    gap: 12,
    backgroundColor: ViaColors.surfaceContainerLow,
  },
  subSection: { gap: 2 },
  subSectionLabel: { ...textBodySm, fontFamily: ViaFonts.bodySemi, color: ViaColors.navy, fontSize: 12 },
  add: {
    backgroundColor: ViaColors.primaryContainer,
    borderRadius: ViaRadius.full,
    padding: ViaSpacing.md,
    alignItems: 'center',
  },
  addT: { color: ViaColors.onPrimary, fontFamily: ViaFonts.bodySemi, fontSize: 16 },
  e: { color: '#ba1a1a', marginTop: 6, fontSize: 13 },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: ViaSpacing.xs,
  },
  tit: { ...textH3, fontSize: 16, color: ViaColors.navy },
  tip: { ...textBodySm, marginTop: 2, textTransform: 'capitalize' },
  v: { fontFamily: ViaFonts.bodySemi, fontSize: 16, color: ViaColors.navy },
});
