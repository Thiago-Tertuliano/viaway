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
import { TripScreenHeader } from '@/components/viaway/TripScreenHeader';
import { ScreenState } from '@/components/viaway/ScreenState';
import { SectionCard } from '@/components/viaway/SectionCard';
import {
  formatBrl,
  formatDataPgtoBr,
  formatHoraRegistroBr,
  formatMoedaLegivel,
} from '@/lib/format';
import { type GastoJson, createGasto, listGastos } from '@/lib/viaway-api';
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

const CAT_META: Record<
  GastoJson['categoria'],
  { icon: keyof typeof MaterialIcons.glyphMap; label: string; cor: string; bg: string }
> = {
  alimentacao: { icon: 'restaurant', label: 'Alimentação', cor: '#F59E0B', bg: '#FFFBEB' },
  hospedagem: { icon: 'hotel', label: 'Hospedagem', cor: '#8B5CF6', bg: '#F5F3FF' },
  transporte: { icon: 'directions-car', label: 'Transporte', cor: '#10B981', bg: '#ECFDF5' },
  passeio: { icon: 'local-activity', label: 'Passeios', cor: '#EF4444', bg: '#FEF2F2' },
  compras: { icon: 'shopping-bag', label: 'Compras', cor: '#EC4899', bg: '#FDF2F8' },
  outro: { icon: 'wallet-travel', label: 'Outros', cor: '#3B82F6', bg: '#EFF6FF' },
};

const PAY_METHODS: GastoJson['metodoPagamento'][] = [
  'cartao_internacional',
  'cartao_nacional',
  'pix',
  'transferencia',
  'dinheiro',
  'outro',
];

function metodoLabel(m: GastoJson['metodoPagamento']) {
  const map: Record<GastoJson['metodoPagamento'], string> = {
    cartao_internacional: 'Cartão internacional',
    cartao_nacional: 'Cartão nacional',
    pix: 'Pix',
    dinheiro: 'Dinheiro',
    transferencia: 'Transferência',
    outro: 'Outro',
  };
  return map[m] ?? m;
}

function metodoIcon(m: GastoJson['metodoPagamento']): keyof typeof MaterialIcons.glyphMap {
  const map: Record<GastoJson['metodoPagamento'], keyof typeof MaterialIcons.glyphMap> = {
    pix: 'qr-code-2',
    dinheiro: 'payments',
    cartao_nacional: 'credit-card',
    cartao_internacional: 'credit-card',
    transferencia: 'account-balance',
    outro: 'more-horiz',
  };
  return map[m] ?? 'payment';
}

function normalizeCat(c: string): GastoJson['categoria'] {
  if (CATS.includes(c as GastoJson['categoria'])) return c as GastoJson['categoria'];
  return 'outro';
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function GastosViagemScreen() {
  const p = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(p.id) ? p.id[0] : p.id;
  const insets = useSafeAreaInsets();
  const qClient = useQueryClient();
  const [showNovoGasto, setShowNovoGasto] = useState(false);
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
        void qClient.invalidateQueries({ queryKey: ['trip-metas', id] });
      }
    },
  });

  const rows = (list.data ?? []) as GastoJson[];
  const sorted = [...rows].sort((a, b) => (a.data < b.data ? 1 : -1));

  return (
    <View style={styles.root}>
      <TripScreenHeader title="Gastos" />
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
                if (id) void qClient.invalidateQueries({ queryKey: ['gastos', id] });
              }}
            />
          }>
          <Text style={styles.sectionTitle}>Lançamentos</Text>
          <Text style={styles.sectionHint}>
            Valores em real (R$). Toque em &quot;Novo gasto&quot; abaixo para expandir o formulário.
          </Text>

          {sorted.length === 0 ? (
            <ScreenState
              kind="empty"
              title="Nenhum gasto lançado"
              subtitle="Expanda &quot;Novo gasto&quot; para cadastrar o primeiro."
            />
          ) : (
            <View style={styles.listGap}>
              {sorted.map((g) => {
                const c = normalizeCat(g.categoria);
                const meta = CAT_META[c];
                const parcelado = g.parcelas != null && g.parcelas > 1;
                return (
                  <View
                    key={g.id}
                    style={[
                      styles.launchCard,
                      { borderLeftColor: parcelado ? '#EA580C' : '#16A34A' },
                    ]}>
                    <View style={styles.launchTop}>
                      <View style={[styles.launchIcon, { backgroundColor: meta.bg }]}>
                        <MaterialIcons name={meta.icon} size={22} color={meta.cor} />
                      </View>
                      <View style={styles.launchMain}>
                        <Text style={styles.launchTitle} numberOfLines={2}>
                          {g.descricao}
                        </Text>
                        <View style={styles.launchMetaRow}>
                          <MaterialIcons name="label" size={14} color="#6B7280" />
                          <Text style={styles.launchMetaText}>{meta.label}</Text>
                        </View>
                        <View style={styles.launchMetaRow}>
                          <MaterialIcons name="event" size={14} color="#6B7280" />
                          <Text style={styles.launchMetaText}>{formatDataPgtoBr(g.data)}</Text>
                          <Text style={styles.launchMetaDot}>·</Text>
                          <MaterialIcons name="schedule" size={14} color="#6B7280" />
                          <Text style={styles.launchMetaText}>
                            {formatHoraRegistroBr(g.criadoEm) || '—'}
                          </Text>
                        </View>
                        <View style={styles.payRow}>
                          <View
                            style={[
                              styles.payPill,
                              { backgroundColor: parcelado ? '#FFEDD5' : '#DCFCE7' },
                            ]}>
                            <MaterialIcons
                              name={metodoIcon(g.metodoPagamento)}
                              size={16}
                              color={parcelado ? '#C2410C' : '#15803D'}
                            />
                            <Text
                              style={[
                                styles.payPillTxt,
                                { color: parcelado ? '#C2410C' : '#15803D' },
                              ]}>
                              {metodoLabel(g.metodoPagamento)}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.payPill,
                              { backgroundColor: parcelado ? '#FFF7ED' : '#F0FDF4' },
                            ]}>
                            <MaterialIcons
                              name={parcelado ? 'stacked-line-chart' : 'done-all'}
                              size={16}
                              color={parcelado ? '#EA580C' : '#15803D'}
                            />
                            <Text
                              style={[
                                styles.payPillTxt,
                                { color: parcelado ? '#EA580C' : '#15803D' },
                              ]}>
                              {parcelado ? `${g.parcelas}x parcelado` : 'À vista'}
                            </Text>
                          </View>
                        </View>
                        {g.valorOriginal != null ? (
                          <Text style={styles.launchOriginal}>
                            Original: {formatMoedaLegivel(g.moeda)}{' '}
                            {g.valorOriginal.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{' '}
                            → {formatBrl(g.valor)}
                          </Text>
                        ) : (
                          <Text style={styles.launchOriginalMuted}>
                            Moeda: {formatMoedaLegivel(g.moeda)}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.launchValor}>{formatBrl(g.valor)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <SectionCard>
            <Pressable
              onPress={() => setShowNovoGasto((v) => !v)}
              style={({ pressed }) => [styles.expandHead, pressed && { opacity: 0.9 }]}>
              <View style={styles.expandHeadLeft}>
                <MaterialIcons name="add-circle-outline" size={24} color={ViaColors.navy} />
                <View>
                  <Text style={styles.expandTitle}>Novo gasto</Text>
                  <Text style={styles.expandSub}>
                    {showNovoGasto ? 'Toque para ocultar o formulário' : 'Toque para mostrar e cadastrar'}
                  </Text>
                </View>
              </View>
              <MaterialIcons
                name={showNovoGasto ? 'expand-less' : 'expand-more'}
                size={28}
                color={ViaColors.navy}
              />
            </Pressable>

            {showNovoGasto ? (
              <View style={styles.form}>
                <Text style={styles.helper}>
                  Registre o essencial. Campos avançados são opcionais.
                </Text>
                <TextInput
                  value={desc}
                  onChangeText={setDesc}
                  placeholder="Descrição (ex.: jantar no centro)"
                  placeholderTextColor={ViaColors.onSurfaceVariant}
                  style={styles.inp}
                />
                <View style={styles.r2}>
                  <TextInput
                    value={valor}
                    onChangeText={setValor}
                    placeholder="Valor em R$ (ex.: 45,90)"
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
                        cat === c && {
                          backgroundColor: ViaColors.primaryContainer,
                          borderColor: ViaColors.navy,
                        },
                      ]}>
                      <Text style={[styles.chipT, cat === c && { color: ViaColors.onPrimary }]}>
                        {CAT_META[c].label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <Pressable
                  onPress={() => setShowAdvanced((v) => !v)}
                  style={({ pressed }) => [styles.advancedToggle, pressed && { opacity: 0.85 }]}>
                  <MaterialIcons
                    name={showAdvanced ? 'expand-less' : 'tune'}
                    size={18}
                    color={ViaColors.navy}
                  />
                  <Text style={styles.advancedText}>
                    {showAdvanced ? 'Ocultar pagamento e moeda' : 'Pagamento, parcelas e moeda'}
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
                            <Text
                              style={[
                                styles.chipT,
                                metodoPagamento === mtd && { color: ViaColors.onPrimary },
                              ]}>
                              {metodoLabel(mtd)}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                      <TextInput
                        value={descricaoPagamento}
                        onChangeText={setDescricaoPagamento}
                        placeholder="Descrição do pagamento (opcional)"
                        placeholderTextColor={ViaColors.onSurfaceVariant}
                        style={styles.inp}
                      />
                      <View style={styles.r2}>
                        <TextInput
                          value={cartaoNome}
                          onChangeText={setCartaoNome}
                          placeholder="Nome no cartão (opcional)"
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
                          placeholder="Valor original (outra moeda)"
                          placeholderTextColor={ViaColors.onSurfaceVariant}
                          keyboardType="decimal-pad"
                          style={[styles.inp, { flex: 1 }]}
                        />
                        <TextInput
                          value={moeda}
                          onChangeText={setMoeda}
                          placeholder="Código (BRL)"
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
                  style={({ pressed }) => [
                    styles.add,
                    pressed && { opacity: 0.9 },
                    m.isPending && { opacity: 0.6 },
                  ]}>
                  {m.isPending ? (
                    <ActivityIndicator color={ViaColors.onPrimary} />
                  ) : (
                    <Text style={styles.addT}>Adicionar gasto</Text>
                  )}
                </Pressable>
                {m.isError ? <Text style={styles.e}>{(m.error as Error).message}</Text> : null}
              </View>
            ) : null}
          </SectionCard>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ViaColors.background },
  sc: { padding: ViaSpacing.margin, gap: ViaSpacing.md },
  sectionTitle: { ...textH3, color: ViaColors.navy, marginBottom: 4 },
  sectionHint: { ...textBodySm, color: ViaColors.onSurfaceVariant, marginBottom: ViaSpacing.sm, lineHeight: 18 },
  listGap: { gap: ViaSpacing.sm },
  launchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: ViaRadius.lg,
    padding: ViaSpacing.md,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: 'rgba(226,209,179,0.45)',
    ...ViaShadows.level1,
  },
  launchTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  launchIcon: {
    width: 48,
    height: 48,
    borderRadius: ViaRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  launchMain: { flex: 1, minWidth: 0, gap: 6 },
  launchTitle: { fontFamily: ViaFonts.bodySemi, fontSize: 16, color: ViaColors.navy, lineHeight: 22 },
  launchMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  launchMetaText: { ...textBodySm, color: '#6B7280', fontSize: 12 },
  launchMetaDot: { color: '#9CA3AF', marginHorizontal: 2 },
  payRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  payPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  payPillTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 11 },
  launchOriginal: { ...textBodySm, fontSize: 11, color: ViaColors.navy, marginTop: 2 },
  launchOriginalMuted: { ...textBodySm, fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  launchValor: {
    fontFamily: ViaFonts.bodySemi,
    fontSize: 17,
    color: ViaColors.navy,
    letterSpacing: -0.3,
  },
  expandHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  expandHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  expandTitle: { ...textH3, fontSize: 17, color: ViaColors.navy },
  expandSub: { ...textBodySm, color: ViaColors.onSurfaceVariant, marginTop: 2 },
  form: { marginTop: ViaSpacing.md, gap: 2 },
  helper: { ...textBodySm, color: ViaColors.onSurfaceVariant, marginBottom: 8 },
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
    paddingHorizontal: 12,
    marginRight: 6,
  },
  chipT: { fontFamily: ViaFonts.body, fontSize: 12, color: ViaColors.navy },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ViaColors.sand,
    paddingVertical: 8,
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
    marginTop: 8,
  },
  addT: { color: ViaColors.onPrimary, fontFamily: ViaFonts.bodySemi, fontSize: 16 },
  e: { color: '#ba1a1a', marginTop: 6, fontSize: 13 },
});
