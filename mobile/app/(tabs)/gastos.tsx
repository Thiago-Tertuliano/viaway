import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderWave } from '@/components/viaway/HeaderWave';
import {
  formatBrl,
  formatDataPgtoBr,
  formatHoraRegistroBr,
  formatMoedaLegivel,
} from '@/lib/format';
import {
  createGasto,
  getPainelGastos,
  listGastos,
  listViagens,
  updateGasto,
  type CategoriaPlanejamentoGasto,
  type GastoJson,
  type PlanejamentoGastosJson,
  type ViagemJson,
} from '@/lib/viaway-api';
import { ViaColors, ViaFonts, ViaRadius, ViaShadows, ViaSpacing } from '@/constants/viaway-theme';

const ALL_CATS: GastoJson['categoria'][] = [
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

function fmtShortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

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

function PlanStatusBadge({ kind }: { kind: 'previsto' | 'parcial' | 'pago' }) {
  const cfg =
    kind === 'pago'
      ? { bg: '#DCFCE7', fg: '#15803D', label: 'pago' }
      : kind === 'parcial'
        ? { bg: '#FFEDD5', fg: '#C2410C', label: 'parcial' }
        : { bg: '#FEF3C7', fg: '#B45309', label: 'previsto' };
  return (
    <View style={[planBadgeStyles.wrap, { backgroundColor: cfg.bg }]}>
      <Text style={[planBadgeStyles.txt, { color: cfg.fg }]}>{cfg.label}</Text>
    </View>
  );
}

const planBadgeStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  txt: { fontFamily: ViaFonts.bodySemi, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.3 },
});

function normalizeCat(c: string): GastoJson['categoria'] {
  if (ALL_CATS.includes(c as GastoJson['categoria'])) return c as GastoJson['categoria'];
  return 'outro';
}

function parsePlanejamentoGastos(raw: unknown): PlanejamentoGastosJson | null {
  if (raw == null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const pcIn = o.porCategoria;
  if (pcIn == null || typeof pcIn !== 'object') return null;
  const pc = pcIn as Record<string, unknown>;
  const porCategoria = {
    hospedagem: typeof pc.hospedagem === 'number' && Number.isFinite(pc.hospedagem) ? Math.max(0, pc.hospedagem) : 0,
    transporte: typeof pc.transporte === 'number' && Number.isFinite(pc.transporte) ? Math.max(0, pc.transporte) : 0,
    alimentacao: typeof pc.alimentacao === 'number' && Number.isFinite(pc.alimentacao) ? Math.max(0, pc.alimentacao) : 0,
    passeio: typeof pc.passeio === 'number' && Number.isFinite(pc.passeio) ? Math.max(0, pc.passeio) : 0,
    compras: typeof pc.compras === 'number' && Number.isFinite(pc.compras) ? Math.max(0, pc.compras) : 0,
    outro: typeof pc.outro === 'number' && Number.isFinite(pc.outro) ? Math.max(0, pc.outro) : 0,
  };
  const itensIn = o.itens;
  const itens: NonNullable<PlanejamentoGastosJson['itens']> = [];
  if (Array.isArray(itensIn)) {
    for (const row of itensIn) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      const descricao = typeof r.descricao === 'string' ? r.descricao : '';
      const valorRaw = r.valor;
      const valor = typeof valorRaw === 'number' && Number.isFinite(valorRaw) ? Math.max(0, valorRaw) : 0;
      const cat = normalizeCat(String(r.categoria ?? ''));
      if (!descricao.trim() || valor <= 0) continue;
      itens.push({
        categoria: cat as CategoriaPlanejamentoGasto,
        descricao: descricao.trim(),
        valor,
      });
    }
  }
  const temAlgo =
    Object.values(porCategoria).some((n) => n > 0) || itens.length > 0;
  if (!temAlgo) return null;
  return { porCategoria, itens };
}

const PLAN_META_KEY = '__VIAWAY_PLANO__:';

type ViawayPlanMeta = { v: 1; sig: string; parcelaAtual: number; parcelasTotal: number };

function makePlanSig(categoria: string, descricao: string, valor: number) {
  return `${categoria}|${descricao}|${Number(valor.toFixed(2))}`;
}

function stringifyPlanMeta(meta: ViawayPlanMeta): string {
  return `\n${PLAN_META_KEY}${JSON.stringify(meta)}`;
}

function parsePlanMetaFromNotas(notas: string | null | undefined): ViawayPlanMeta | null {
  if (!notas || !notas.includes(PLAN_META_KEY)) return null;
  const i = notas.lastIndexOf(PLAN_META_KEY);
  try {
    const raw = notas.slice(i + PLAN_META_KEY.length).trim();
    const o = JSON.parse(raw) as ViawayPlanMeta;
    if (o.v !== 1 || typeof o.sig !== 'string') return null;
    return {
      v: 1,
      sig: o.sig,
      parcelaAtual: Math.max(1, Math.floor(Number(o.parcelaAtual) || 1)),
      parcelasTotal: Math.max(1, Math.floor(Number(o.parcelasTotal) || 1)),
    };
  } catch {
    return null;
  }
}

function notasComMeta(human: string, meta: ViawayPlanMeta): string {
  return `${human.trim()}${stringifyPlanMeta(meta)}`;
}

function mergePlanMeta(notas: string | null | undefined, meta: ViawayPlanMeta): string {
  const base =
    (notas && notas.split(`\n${PLAN_META_KEY}`)[0]?.trim()) ||
    'Registrado a partir do valor previsto da viagem.';
  return notasComMeta(base, meta);
}

function isGastoLigadoAoPlano(g: GastoJson): boolean {
  return parsePlanMetaFromNotas(g.notas) != null;
}

function findGastoDoPlano(gastos: GastoJson[], sig: string): GastoJson | null {
  for (const g of gastos) {
    const m = parsePlanMetaFromNotas(g.notas);
    if (m?.sig === sig) return g;
  }
  return null;
}

type DetailSheet =
  | { kind: 'gasto'; g: GastoJson }
  | {
      kind: 'plano';
      planSig: string;
      descricao: string;
      valor: number;
      categoria: GastoJson['categoria'];
    };

type PlanPayContext = {
  planSig: string;
  descricao: string;
  valor: number;
  categoria: GastoJson['categoria'];
};

type PayWizardStep = 'metodo' | 'cartaoTipo' | 'parcelas';

export default function GastosScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const q = useQuery({
    queryKey: ['viagens'] as const,
    queryFn: async () => (await listViagens(1)).data,
  });
  const rows = (q.data ?? []) as ViagemJson[];
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [paidByTrip, setPaidByTrip] = useState<Record<string, Record<string, boolean>>>({});
  const [detailSheet, setDetailSheet] = useState<DetailSheet | null>(null);
  const [planPay, setPlanPay] = useState<PlanPayContext | null>(null);
  const [payStep, setPayStep] = useState<PayWizardStep>('metodo');

  const selectedTrip = useMemo(
    () => rows.find((v) => v.id === selectedTripId) ?? null,
    [rows, selectedTripId],
  );
  const tripId = selectedTrip?.id ?? null;
  const planejamento = useMemo(
    () => parsePlanejamentoGastos(selectedTrip?.planejamentoGastos ?? null),
    [selectedTrip?.planejamentoGastos],
  );

  const listQ = useQuery({
    queryKey: ['gastos', tripId!] as const,
    queryFn: () => listGastos(tripId!),
    enabled: Boolean(tripId),
  });
  const painelQ = useQuery({
    queryKey: ['painel', tripId!] as const,
    queryFn: () => getPainelGastos(tripId!),
    enabled: Boolean(tripId),
  });

  const gastos = (listQ.data ?? []) as GastoJson[];
  const paidMap = (tripId && paidByTrip[tripId]) || {};

  const totalLancado = useMemo(
    () => gastos.reduce((acc, g) => acc + (g.valor ?? 0), 0),
    [gastos],
  );
  const totalPago = useMemo(
    () => gastos.reduce((acc, g) => acc + (paidMap[g.id] ? g.valor : 0), 0),
    [gastos, paidMap],
  );
  const totalPagoComParcelas = useMemo(() => {
    let extra = 0;
    for (const g of gastos) {
      const m = parsePlanMetaFromNotas(g.notas);
      if (!m || m.parcelasTotal <= 1 || paidMap[g.id]) continue;
      extra += (g.valor * m.parcelaAtual) / m.parcelasTotal;
    }
    return totalPago + extra;
  }, [gastos, paidMap, totalPago]);
  const orcamento = selectedTrip?.orcamentoTotal ?? painelQ.data?.orcamentoTotal ?? totalLancado;
  const progresso = orcamento > 0 ? Math.min(1, totalPagoComParcelas / orcamento) : 0;

  const categoriasVisao = useMemo(() => {
    const buckets: Record<GastoJson['categoria'], GastoJson[]> = {
      alimentacao: [],
      hospedagem: [],
      transporte: [],
      passeio: [],
      compras: [],
      outro: [],
    };
    for (const g of gastos) {
      if (isGastoLigadoAoPlano(g)) continue;
      const k = normalizeCat(g.categoria);
      buckets[k].push(g);
    }
    for (const k of ALL_CATS) {
      buckets[k].sort((a, b) => (a.data < b.data ? 1 : -1));
    }
    return ALL_CATS.map((key: GastoJson['categoria']) => {
      const items = buckets[key];
      const total = gastos
        .filter((g) => normalizeCat(g.categoria) === key)
        .reduce((acc, g) => acc + g.valor, 0);
      const previsto = planejamento?.porCategoria[key as CategoriaPlanejamentoGasto] ?? 0;
      const planItens = (planejamento?.itens ?? []).filter((i) => i.categoria === key);
      return { key, ...CAT_META[key], items, total, previsto, planItens };
    });
  }, [gastos, planejamento]);

  const recentesPagos = useMemo(() => {
    return gastos
      .filter((g) => paidMap[g.id])
      .slice()
      .sort((a, b) => (a.data < b.data ? 1 : -1))
      .slice(0, 8);
  }, [gastos, paidMap]);

  function togglePaid(g: GastoJson) {
    if (!tripId) return;
    setPaidByTrip((prev) => ({
      ...prev,
      [tripId]: {
        ...(prev[tripId] ?? {}),
        [g.id]: !prev[tripId]?.[g.id],
      },
    }));
  }

  const createFromPlano = useMutation({
    mutationFn: async (payload: {
      ctx: PlanPayContext;
      metodo: GastoJson['metodoPagamento'];
      descricaoPagamento: string;
      parcelas: number;
    }) => {
      if (!tripId) throw new Error('viagem');
      const hoje = new Date().toISOString().slice(0, 10);
      const meta: ViawayPlanMeta = {
        v: 1,
        sig: payload.ctx.planSig,
        parcelaAtual: 1,
        parcelasTotal: Math.max(1, payload.parcelas),
      };
      return createGasto({
        viagemId: tripId,
        descricao: payload.ctx.descricao,
        categoria: payload.ctx.categoria,
        valor: payload.ctx.valor,
        data: hoje,
        metodoPagamento: payload.metodo,
        descricaoPagamento: payload.descricaoPagamento,
        parcelas: payload.parcelas,
        notas: notasComMeta('Registrado a partir do previsto da viagem.', meta),
      });
    },
    onSuccess: (g) => {
      if (tripId) {
        void queryClient.invalidateQueries({ queryKey: ['gastos', tripId] });
        if ((g.parcelas ?? 1) <= 1) {
          setPaidByTrip((prev) => ({
            ...prev,
            [tripId]: { ...(prev[tripId] ?? {}), [g.id]: true },
          }));
        }
      }
      setPlanPay(null);
      setPayStep('metodo');
      setDetailSheet(null);
    },
  });

  const avancarParcelaPlano = useMutation({
    mutationFn: async ({ gastoId, notas }: { gastoId: string; notas: string }) =>
      updateGasto(gastoId, { notas }),
    onSuccess: () => {
      if (tripId) void queryClient.invalidateQueries({ queryKey: ['gastos', tripId] });
    },
  });

  function openTripGastos() {
    if (rows.length === 0) {
      router.push('/criar-viagem');
      return;
    }
    if (!selectedTrip) {
      return;
    }
    router.push({ pathname: '/trip/[id]/gastos', params: { id: selectedTrip.id } });
  }

  const detailGasto = detailSheet?.kind === 'gasto' ? detailSheet.g : null;
  const modalPaid =
    detailGasto && tripId ? Boolean(paidMap[detailGasto.id]) : false;

  const planDetailLinked =
    detailSheet?.kind === 'plano' ? findGastoDoPlano(gastos, detailSheet.planSig) : null;
  const planDetailMeta = planDetailLinked
    ? parsePlanMetaFromNotas(planDetailLinked.notas)
    : null;

  const [creditParcelasPick, setCreditParcelasPick] = useState(1);

  function handleProximaParcela(g: GastoJson) {
    const m = parsePlanMetaFromNotas(g.notas);
    if (!m || m.parcelaAtual >= m.parcelasTotal) return;
    const next: ViawayPlanMeta = {
      v: 1,
      sig: m.sig,
      parcelaAtual: m.parcelaAtual + 1,
      parcelasTotal: m.parcelasTotal,
    };
    const notas = mergePlanMeta(g.notas, next);
    avancarParcelaPlano.mutate(
      { gastoId: g.id, notas },
      {
        onSuccess: () => {
          if (tripId && next.parcelaAtual >= next.parcelasTotal) {
            setPaidByTrip((prev) => ({
              ...prev,
              [tripId]: { ...(prev[tripId] ?? {}), [g.id]: true },
            }));
          }
        },
      },
    );
  }

  function abrirPagamentoPlano() {
    const d = detailSheet;
    if (d?.kind !== 'plano') return;
    setCreditParcelasPick(1);
    setPlanPay({
      planSig: d.planSig,
      descricao: d.descricao,
      valor: d.valor,
      categoria: d.categoria,
    });
    setPayStep('metodo');
    // Um Modal por vez: com dois Modals visíveis, Android/iOS costumam não exibir o segundo.
    setDetailSheet(null);
  }

  function fecharPagamentoPlano() {
    setPlanPay(null);
    setPayStep('metodo');
  }

  function enviarPagamentoPlano(
    metodo: GastoJson['metodoPagamento'],
    descricaoPagamento: string,
    parcelas: number,
  ) {
    if (!planPay) return;
    createFromPlano.mutate(
      { ctx: planPay, metodo, descricaoPagamento, parcelas },
      {
        onError: (e: unknown) => {
          Alert.alert(
            'Não foi possível registrar',
            e instanceof Error ? e.message : 'Tente novamente.',
          );
        },
      },
    );
  }

  function notasSemMeta(notas: string | null | undefined) {
    if (!notas) return null;
    const i = notas.indexOf(`\n${PLAN_META_KEY}`);
    const cut = i >= 0 ? notas.slice(0, i).trim() : notas;
    return cut || null;
  }

  return (
    <View style={s.root}>
      <ScrollView
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}>

        <View style={[s.header, { paddingTop: insets.top + 12 }]}>
          <Text style={s.headerTitle}>Gastos</Text>
          <Text style={s.headerSub}>Controle financeiro das viagens</Text>
        </View>
        <HeaderWave />

        <View style={s.bodyWrap}>
          <View style={s.section}>
            <Text style={s.sectionTitle}>Selecionar viagem</Text>
            {rows.length === 0 ? (
              <Text style={s.helperText}>Crie uma viagem para começar a registrar gastos.</Text>
            ) : (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tripList}>
                  {rows.map((v) => {
                    const on = selectedTripId === v.id;
                    return (
                      <Pressable
                        key={v.id}
                        onPress={() => setSelectedTripId(v.id)}
                        style={[s.tripChip, on ? s.tripChipOn : null]}>
                        <Text style={[s.tripChipText, on ? s.tripChipTextOn : null]} numberOfLines={1}>
                          {v.nome}
                        </Text>
                        <Text style={[s.tripChipSub, on ? s.tripChipTextOn : null]} numberOfLines={1}>
                          {v.destinoPrincipal}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <Text style={s.helperText}>
                  {selectedTrip
                    ? `Viagem selecionada: ${selectedTrip.nome}.`
                    : 'Selecione uma viagem para abrir os gastos.'}
                </Text>
              </>
            )}
          </View>

          {!selectedTrip ? null : (
            <>
              <View style={s.section}>
                <View style={s.budgetCard}>
                  <View style={s.budgetRow}>
                    <View>
                      <Text style={s.budgetLabel}>Total pago</Text>
                      <Text style={s.budgetValor}>{formatBrl(totalPagoComParcelas)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={s.budgetLabel}>Orçamento</Text>
                      <Text style={s.budgetOrc}>{formatBrl(orcamento)}</Text>
                    </View>
                  </View>
                  <View style={s.barTrack}>
                    <View style={[s.barFill, { width: `${Math.round(Math.min(100, progresso * 100))}%` }]} />
                  </View>
                  <Text style={s.barLabel}>
                    {Math.round(progresso * 100)}% pago · {formatBrl(totalLancado)} lançado
                    {totalPagoComParcelas !== totalPago ? ' · inclui parcelas em andamento' : ''}
                  </Text>
                </View>
              </View>

              <View style={s.section}>
                <Text style={s.sectionTitle}>Por categoria</Text>
                <Text style={s.sectionHint}>
                  Valores previstos na criação da viagem aparecem em cada categoria. Nos lançamentos reais, toque para
                  ver pagamento, parcelas e marcar como pago.
                </Text>
                {listQ.isLoading ? (
                  <Text style={s.helperText}>Carregando gastos...</Text>
                ) : (
                  <View style={s.catStack}>
                    {categoriasVisao.map((block) => (
                      <View
                        key={block.key}
                        style={[s.catBlock, { borderLeftColor: block.cor, backgroundColor: block.bg }]}>
                        <View style={s.catBlockHead}>
                          <View style={[s.catIcon, { backgroundColor: block.cor + '22' }]}>
                            <MaterialIcons name={block.icon} size={22} color={block.cor} />
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={s.catBlockTitle}>{block.label}</Text>
                            <Text style={s.catBlockSub}>
                              Previsto {formatBrl(block.previsto)} · {block.items.length}{' '}
                              {block.items.length === 1 ? 'lançamento' : 'lançamentos'} · Lançado{' '}
                              {formatBrl(block.total)}
                            </Text>
                          </View>
                        </View>
                        {block.items.length === 0 && block.planItens.length === 0 && block.previsto <= 0 ? (
                          <Text style={s.catEmpty}>Nenhum valor previsto nem lançamento nesta categoria.</Text>
                        ) : null}
                        {block.items.length > 0 ? (
                          <View style={[s.catItems, block.planItens.length > 0 && { marginBottom: 8 }]}>
                            {block.items.map((g, idx) => {
                              const paid = Boolean(paidMap[g.id]);
                              return (
                                <View
                                  key={g.id}
                                  style={[s.catItemRow, idx < block.items.length - 1 && s.catItemBorder]}>
                                  <Pressable
                                    onPress={() => togglePaid(g)}
                                    style={[s.checkBtn, s.checkBtnInRow, paid && s.checkBtnOn]}>
                                    <MaterialIcons
                                      name={paid ? 'check' : 'radio-button-unchecked'}
                                      size={16}
                                      color={paid ? '#fff' : ViaColors.navy}
                                    />
                                  </Pressable>
                                  <Pressable
                                    onPress={() => setDetailSheet({ kind: 'gasto', g })}
                                    style={({ pressed }) => [
                                      s.catItemMain,
                                      pressed && { opacity: 0.88 },
                                    ]}>
                                    <View style={{ flex: 1, minWidth: 0 }}>
                                      <Text style={s.catItemTitle} numberOfLines={1}>
                                        {g.descricao}
                                      </Text>
                                      <Text style={s.catItemMeta}>
                                        {fmtShortDate(g.data)} · {metodoLabel(g.metodoPagamento)}
                                        {g.parcelas != null && g.parcelas > 1 ? ` · ${g.parcelas}x` : ''}
                                      </Text>
                                    </View>
                                    <Text style={[s.catItemValor, paid && { color: '#16A34A' }]}>
                                      {formatBrl(g.valor)}
                                    </Text>
                                    <MaterialIcons name="chevron-right" size={18} color={ViaColors.outline} />
                                  </Pressable>
                                </View>
                              );
                            })}
                          </View>
                        ) : block.previsto > 0 || block.planItens.length > 0 ? (
                          <Text style={s.catEmpty}>
                            Nenhum gasto registrado ainda — abaixo está o que você planejou na viagem.
                          </Text>
                        ) : null}
                        {block.planItens.length > 0 || block.previsto > 0 ? (
                          <View style={s.planSection}>
                            <Text style={s.planSectionTitle}>Planejado na viagem</Text>
                            <View style={s.catItems}>
                              {block.planItens.length > 0
                                ? block.planItens.map((p, idx) => {
                                    const planSig = makePlanSig(block.key, p.descricao, p.valor);
                                    const linked = findGastoDoPlano(gastos, planSig);
                                    const meta = linked ? parsePlanMetaFromNotas(linked.notas) : null;
                                    const badge =
                                      meta && meta.parcelaAtual >= meta.parcelasTotal
                                        ? 'pago'
                                        : meta
                                          ? 'parcial'
                                          : 'previsto';
                                    const sub =
                                      meta && meta.parcelasTotal > 1
                                        ? `Pago parcialmente · parcela ${meta.parcelaAtual}/${meta.parcelasTotal}`
                                        : linked
                                          ? 'Previsto quitado à vista'
                                          : 'Toque para registrar pagamento';
                                    return (
                                      <Pressable
                                        key={`plan-${block.key}-${idx}-${p.descricao}`}
                                        onPress={() =>
                                          setDetailSheet({
                                            kind: 'plano',
                                            planSig,
                                            descricao: p.descricao,
                                            valor: p.valor,
                                            categoria: block.key,
                                          })
                                        }
                                        style={({ pressed }) => [
                                          s.planItemRow,
                                          idx < block.planItens.length - 1 && s.catItemBorder,
                                          pressed && { opacity: 0.88 },
                                        ]}>
                                        <PlanStatusBadge kind={badge} />
                                        <View style={{ flex: 1, minWidth: 0 }}>
                                          <Text style={s.catItemTitle} numberOfLines={2}>
                                            {p.descricao}
                                          </Text>
                                          <Text style={[s.catItemMeta, meta && meta.parcelasTotal > 1 && s.planMetaParcial]}>
                                            {sub}
                                          </Text>
                                        </View>
                                        <View style={s.planValorEye}>
                                          <MaterialIcons name="visibility" size={16} color={ViaColors.navy} />
                                          <Text style={s.catItemValor}>{formatBrl(p.valor)}</Text>
                                        </View>
                                        <MaterialIcons name="chevron-right" size={18} color={ViaColors.outline} />
                                      </Pressable>
                                    );
                                  })
                                : (() => {
                                    const planSig = makePlanSig(block.key, '__resumo__', block.previsto);
                                    const linked = findGastoDoPlano(gastos, planSig);
                                    const meta = linked ? parsePlanMetaFromNotas(linked.notas) : null;
                                    const badge =
                                      meta && meta.parcelaAtual >= meta.parcelasTotal
                                        ? 'pago'
                                        : meta
                                          ? 'parcial'
                                          : 'previsto';
                                    const sub =
                                      meta && meta.parcelasTotal > 1
                                        ? `Pago parcialmente · parcela ${meta.parcelaAtual}/${meta.parcelasTotal}`
                                        : linked
                                          ? 'Previsto quitado à vista'
                                          : 'Toque para registrar pagamento';
                                    return (
                                      <Pressable
                                        onPress={() =>
                                          setDetailSheet({
                                            kind: 'plano',
                                            planSig,
                                            descricao: `Total planejado — ${block.label}`,
                                            valor: block.previsto,
                                            categoria: block.key,
                                          })
                                        }
                                        style={({ pressed }) => [s.planItemRow, pressed && { opacity: 0.88 }]}>
                                        <PlanStatusBadge kind={badge} />
                                        <View style={{ flex: 1, minWidth: 0 }}>
                                          <Text style={s.catItemTitle} numberOfLines={2}>
                                            Resumo da categoria (sem detalhamento salvo)
                                          </Text>
                                          <Text
                                            style={[
                                              s.catItemMeta,
                                              meta && meta.parcelasTotal > 1 && s.planMetaParcial,
                                            ]}>
                                            {sub}
                                          </Text>
                                        </View>
                                        <View style={s.planValorEye}>
                                          <MaterialIcons name="visibility" size={16} color={ViaColors.navy} />
                                          <Text style={s.catItemValor}>{formatBrl(block.previsto)}</Text>
                                        </View>
                                        <MaterialIcons name="chevron-right" size={18} color={ViaColors.outline} />
                                      </Pressable>
                                    );
                                  })()}
                            </View>
                          </View>
                        ) : null}
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={s.section}>
                <View style={s.sectionRow}>
                  <Text style={s.sectionTitle}>Recentes pagos</Text>
                  <Pressable onPress={openTripGastos}>
                    <Text style={s.seeAll}>Ver todas</Text>
                  </Pressable>
                </View>
                <View style={s.transCard}>
                  {recentesPagos.length === 0 ? (
                    <View style={s.transRow}>
                      <Text style={s.helperText}>Marque gastos como pagos para aparecer aqui.</Text>
                    </View>
                  ) : (
                    recentesPagos.map((g, i) => {
                      const cm = CAT_META[normalizeCat(g.categoria)];
                      const parc = g.parcelas != null && g.parcelas > 1;
                      return (
                        <View key={`paid-${g.id}`} style={[s.transRow, i < recentesPagos.length - 1 && s.transBorder]}>
                          <View style={[s.transIcon, { backgroundColor: cm.bg }]}>
                            <MaterialIcons name={cm.icon} size={18} color={cm.cor} />
                          </View>
                          <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
                            <Text style={s.transLabel} numberOfLines={1}>
                              {g.descricao}
                            </Text>
                            <View style={s.transMetaLine}>
                              <MaterialIcons name="event" size={12} color="#9CA3AF" />
                              <Text style={s.transData}>{formatDataPgtoBr(g.data)}</Text>
                              <Text style={s.transDot}>·</Text>
                              <MaterialIcons
                                name={metodoIcon(g.metodoPagamento)}
                                size={12}
                                color="#9CA3AF"
                              />
                              <Text style={s.transData} numberOfLines={1}>
                                {metodoLabel(g.metodoPagamento)}
                              </Text>
                            </View>
                            {parc ? (
                              <View style={s.transParcelPill}>
                                <MaterialIcons name="stacked-line-chart" size={12} color="#C2410C" />
                                <Text style={s.transParcelTxt}>{g.parcelas}x</Text>
                              </View>
                            ) : null}
                          </View>
                          <Text style={[s.transValor, { color: '#16A34A' }]}>{formatBrl(g.valor)}</Text>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            </>
          )}

          <View style={s.section}>
            <Pressable
              onPress={openTripGastos}
              style={({ pressed }) => [
                s.ctaBtn,
                pressed && { opacity: 0.85 },
                !selectedTrip ? s.ctaDisabled : null,
              ]}>
              <MaterialIcons name="add-circle-outline" size={20} color="#FFFFFF" />
              <Text style={s.ctaBtnTxt}>Registrar novo gasto</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={detailSheet != null}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailSheet(null)}>
        <View style={s.modalWrap}>
          <Pressable style={s.modalBackdropFill} onPress={() => setDetailSheet(null)} />
          <View style={[s.modalCard, { paddingBottom: insets.bottom + ViaSpacing.md }]}>
            {detailSheet?.kind === 'plano' ? (
              <>
                <View style={s.modalHead}>
                  <Text style={s.modalTitle} numberOfLines={3}>
                    {detailSheet.descricao}
                  </Text>
                  <View style={s.modalHeadActions}>
                    <Pressable
                      onPress={() =>
                        Alert.alert(
                          'Sobre o previsto',
                          'É o valor que você indicou ao criar a viagem. Registrar o pagamento aqui gera o lançamento com forma de pagamento e parcelas, e você acompanha o quitado na lista.',
                        )
                      }
                      hitSlop={12}>
                      <MaterialIcons name="info-outline" size={22} color={ViaColors.navy} />
                    </Pressable>
                    <Pressable onPress={() => setDetailSheet(null)} hitSlop={12}>
                      <MaterialIcons name="close" size={24} color={ViaColors.navy} />
                    </Pressable>
                  </View>
                </View>
                <ScrollView
                  style={s.modalScroll}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled">
                  <View style={s.modalInfoRow}>
                    <View style={[s.modalInfoIconBg, { backgroundColor: '#FFF7ED' }]}>
                      <MaterialIcons name="account-balance-wallet" size={22} color={ViaColors.coral} />
                    </View>
                    <View style={s.modalInfoTextCol}>
                      <Text style={s.modalInfoLabel}>Valor previsto</Text>
                      <Text style={s.modalInfoValueLarge}>{formatBrl(detailSheet.valor)}</Text>
                    </View>
                  </View>
                  <View style={s.modalInfoRow}>
                    <View
                      style={[
                        s.modalInfoIconBg,
                        { backgroundColor: CAT_META[detailSheet.categoria].bg },
                      ]}>
                      <MaterialIcons
                        name={CAT_META[detailSheet.categoria].icon}
                        size={22}
                        color={CAT_META[detailSheet.categoria].cor}
                      />
                    </View>
                    <View style={s.modalInfoTextCol}>
                      <Text style={s.modalInfoLabel}>Categoria</Text>
                      <Text style={s.modalInfoValue}>{CAT_META[detailSheet.categoria].label}</Text>
                    </View>
                  </View>
                  {planDetailLinked ? (
                    <>
                      <View style={s.modalInfoRow}>
                        <View style={[s.modalInfoIconBg, { backgroundColor: '#EFF6FF' }]}>
                          <MaterialIcons
                            name={metodoIcon(planDetailLinked.metodoPagamento)}
                            size={22}
                            color="#2563EB"
                          />
                        </View>
                        <View style={s.modalInfoTextCol}>
                          <Text style={s.modalInfoLabel}>Pagamento</Text>
                          <Text style={s.modalInfoValue}>
                            {metodoLabel(planDetailLinked.metodoPagamento)}
                          </Text>
                        </View>
                      </View>
                      <View style={s.modalInfoRow}>
                        <View
                          style={[
                            s.modalInfoIconBg,
                            {
                              backgroundColor:
                                planDetailLinked.parcelas != null && planDetailLinked.parcelas > 1
                                  ? '#FFEDD5'
                                  : '#ECFDF5',
                            },
                          ]}>
                          <MaterialIcons
                            name={
                              planDetailLinked.parcelas != null && planDetailLinked.parcelas > 1
                                ? 'stacked-line-chart'
                                : 'done-all'
                            }
                            size={22}
                            color={
                              planDetailLinked.parcelas != null && planDetailLinked.parcelas > 1
                                ? '#C2410C'
                                : '#15803D'
                            }
                          />
                        </View>
                        <View style={s.modalInfoTextCol}>
                          <Text style={s.modalInfoLabel}>Parcelamento</Text>
                          <Text
                            style={[
                              s.modalInfoValue,
                              planDetailLinked.parcelas != null && planDetailLinked.parcelas > 1
                                ? { color: '#C2410C' }
                                : { color: '#15803D' },
                            ]}>
                            {planDetailLinked.parcelas != null && planDetailLinked.parcelas > 1
                              ? `${planDetailLinked.parcelas}x no cartão`
                              : 'À vista'}
                          </Text>
                        </View>
                      </View>
                      {planDetailLinked.descricaoPagamento ? (
                        <View style={s.modalInfoRow}>
                          <View style={[s.modalInfoIconBg, { backgroundColor: '#F5F3FF' }]}>
                            <MaterialIcons name="notes" size={22} color="#7C3AED" />
                          </View>
                          <View style={s.modalInfoTextCol}>
                            <Text style={s.modalInfoLabel}>Detalhes</Text>
                            <Text style={s.modalInfoValue}>{planDetailLinked.descricaoPagamento}</Text>
                          </View>
                        </View>
                      ) : null}
                      {planDetailMeta && planDetailMeta.parcelasTotal > 1 ? (
                        <View style={s.modalInfoRow}>
                          <View style={[s.modalInfoIconBg, { backgroundColor: '#FEF3C7' }]}>
                            <MaterialIcons name="timeline" size={22} color="#B45309" />
                          </View>
                          <View style={s.modalInfoTextCol}>
                            <Text style={s.modalInfoLabel}>Acompanhamento</Text>
                            <Text style={[s.modalInfoValue, { color: '#B45309' }]}>
                              Parcela {planDetailMeta.parcelaAtual} de {planDetailMeta.parcelasTotal}
                            </Text>
                          </View>
                        </View>
                      ) : null}
                    </>
                  ) : null}
                </ScrollView>
                {planDetailLinked && planDetailMeta && planDetailMeta.parcelasTotal > 1 ? (
                  planDetailMeta.parcelaAtual >= planDetailMeta.parcelasTotal ? (
                    <Text style={s.modalFootNote}>Todas as parcelas foram registradas.</Text>
                  ) : (
                    <Pressable
                      onPress={() => handleProximaParcela(planDetailLinked)}
                      disabled={avancarParcelaPlano.isPending}
                      style={({ pressed }) => [
                        s.modalPaidBtn,
                        pressed && { opacity: 0.9 },
                        avancarParcelaPlano.isPending && { opacity: 0.6 },
                      ]}>
                      {avancarParcelaPlano.isPending ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <MaterialIcons name="add-task" size={20} color="#fff" />
                          <Text style={s.modalPaidTxt}>Paguei a próxima parcela</Text>
                        </>
                      )}
                    </Pressable>
                  )
                ) : !planDetailLinked ? (
                  <Pressable
                    onPress={abrirPagamentoPlano}
                    style={({ pressed }) => [s.modalPaidBtn, pressed && { opacity: 0.9 }]}>
                    <MaterialIcons name="payment" size={20} color="#fff" />
                    <Text style={s.modalPaidTxt}>Registrar pagamento</Text>
                  </Pressable>
                ) : (
                  <Text style={s.modalFootNote}>Pagamento registrado. Toque de novo no item para ver parcelas.</Text>
                )}
              </>
            ) : null}
            {detailSheet?.kind === 'gasto' && detailGasto ? (
              <>
                <View style={s.modalHead}>
                  <Text style={s.modalTitle} numberOfLines={2}>
                    {detailGasto.descricao}
                  </Text>
                  <Pressable onPress={() => setDetailSheet(null)} hitSlop={12}>
                    <MaterialIcons name="close" size={24} color={ViaColors.navy} />
                  </Pressable>
                </View>
                <ScrollView
                  style={s.modalScroll}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled">
                  <View style={s.modalInfoRow}>
                    <View style={[s.modalInfoIconBg, { backgroundColor: '#ECFDF5' }]}>
                      <MaterialIcons name="paid" size={22} color="#15803D" />
                    </View>
                    <View style={s.modalInfoTextCol}>
                      <Text style={s.modalInfoLabel}>Valor (R$)</Text>
                      <Text style={s.modalInfoValueLarge}>{formatBrl(detailGasto.valor)}</Text>
                    </View>
                  </View>
                  <View style={s.modalInfoRow}>
                    <View style={[s.modalInfoIconBg, { backgroundColor: '#F0F9FF' }]}>
                      <MaterialIcons name="event" size={22} color="#0369A1" />
                    </View>
                    <View style={s.modalInfoTextCol}>
                      <Text style={s.modalInfoLabel}>Data do pagamento</Text>
                      <Text style={s.modalInfoValue}>{formatDataPgtoBr(detailGasto.data)}</Text>
                    </View>
                  </View>
                  <View style={s.modalInfoRow}>
                    <View style={[s.modalInfoIconBg, { backgroundColor: '#F5F3FF' }]}>
                      <MaterialIcons name="schedule" size={22} color="#6D28D9" />
                    </View>
                    <View style={s.modalInfoTextCol}>
                      <Text style={s.modalInfoLabel}>Registrado às</Text>
                      <Text style={s.modalInfoValue}>
                        {formatHoraRegistroBr(detailGasto.criadoEm) || '—'}
                      </Text>
                    </View>
                  </View>
                  <View style={s.modalInfoRow}>
                    <View
                      style={[
                        s.modalInfoIconBg,
                        { backgroundColor: CAT_META[normalizeCat(detailGasto.categoria)].bg },
                      ]}>
                      <MaterialIcons
                        name={CAT_META[normalizeCat(detailGasto.categoria)].icon}
                        size={22}
                        color={CAT_META[normalizeCat(detailGasto.categoria)].cor}
                      />
                    </View>
                    <View style={s.modalInfoTextCol}>
                      <Text style={s.modalInfoLabel}>Categoria</Text>
                      <Text style={s.modalInfoValue}>
                        {CAT_META[normalizeCat(detailGasto.categoria)].label}
                      </Text>
                    </View>
                  </View>
                  <View style={s.modalInfoRow}>
                    <View style={[s.modalInfoIconBg, { backgroundColor: '#EFF6FF' }]}>
                      <MaterialIcons
                        name={metodoIcon(detailGasto.metodoPagamento)}
                        size={22}
                        color="#2563EB"
                      />
                    </View>
                    <View style={s.modalInfoTextCol}>
                      <Text style={s.modalInfoLabel}>Forma de pagamento</Text>
                      <Text style={s.modalInfoValue}>
                        {metodoLabel(detailGasto.metodoPagamento)}
                      </Text>
                    </View>
                  </View>
                  <View style={s.modalInfoRow}>
                    <View
                      style={[
                        s.modalInfoIconBg,
                        {
                          backgroundColor:
                            detailGasto.parcelas != null && detailGasto.parcelas > 1
                              ? '#FFEDD5'
                              : '#ECFDF5',
                        },
                      ]}>
                      <MaterialIcons
                        name={
                          detailGasto.parcelas != null && detailGasto.parcelas > 1
                            ? 'credit-card'
                            : 'done-all'
                        }
                        size={22}
                        color={
                          detailGasto.parcelas != null && detailGasto.parcelas > 1
                            ? '#C2410C'
                            : '#15803D'
                        }
                      />
                    </View>
                    <View style={s.modalInfoTextCol}>
                      <Text style={s.modalInfoLabel}>Parcelamento</Text>
                      <Text
                        style={[
                          s.modalInfoValue,
                          detailGasto.parcelas != null && detailGasto.parcelas > 1
                            ? { color: '#C2410C', fontFamily: ViaFonts.bodySemi }
                            : { color: '#15803D' },
                        ]}>
                        {detailGasto.parcelas != null && detailGasto.parcelas > 1
                          ? `${detailGasto.parcelas}x parcelado`
                          : 'À vista'}
                      </Text>
                    </View>
                  </View>
                  {detailGasto.cartaoNome ? (
                    <View style={s.modalInfoRow}>
                      <View style={[s.modalInfoIconBg, { backgroundColor: '#F8FAFC' }]}>
                        <MaterialIcons name="badge" size={22} color={ViaColors.navy} />
                      </View>
                      <View style={s.modalInfoTextCol}>
                        <Text style={s.modalInfoLabel}>Cartão</Text>
                        <Text style={s.modalInfoValue}>{detailGasto.cartaoNome}</Text>
                      </View>
                    </View>
                  ) : null}
                  {detailGasto.descricaoPagamento ? (
                    <View style={s.modalInfoRow}>
                      <View style={[s.modalInfoIconBg, { backgroundColor: '#FDF4FF' }]}>
                        <MaterialIcons name="description" size={22} color="#A21CAF" />
                      </View>
                      <View style={s.modalInfoTextCol}>
                        <Text style={s.modalInfoLabel}>Obs. pagamento</Text>
                        <Text style={s.modalInfoValue}>{detailGasto.descricaoPagamento}</Text>
                      </View>
                    </View>
                  ) : null}
                  {detailGasto.valorOriginal != null ? (
                    <View style={s.modalInfoRow}>
                      <View style={[s.modalInfoIconBg, { backgroundColor: '#FFFBEB' }]}>
                        <MaterialIcons name="currency-exchange" size={22} color="#B45309" />
                      </View>
                      <View style={s.modalInfoTextCol}>
                        <Text style={s.modalInfoLabel}>Valor original</Text>
                        <Text style={s.modalInfoValue}>
                          {formatMoedaLegivel(detailGasto.moeda)}{' '}
                          {detailGasto.valorOriginal.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View style={s.modalInfoRow}>
                      <View style={[s.modalInfoIconBg, { backgroundColor: '#FFFBEB' }]}>
                        <MaterialIcons name="language" size={22} color="#B45309" />
                      </View>
                      <View style={s.modalInfoTextCol}>
                        <Text style={s.modalInfoLabel}>Moeda</Text>
                        <Text style={s.modalInfoValue}>{formatMoedaLegivel(detailGasto.moeda)}</Text>
                      </View>
                    </View>
                  )}
                  {detailGasto.iofPercentual != null ? (
                    <View style={s.modalInfoRow}>
                      <View style={[s.modalInfoIconBg, { backgroundColor: '#FEF2F2' }]}>
                        <MaterialIcons name="percent" size={22} color="#DC2626" />
                      </View>
                      <View style={s.modalInfoTextCol}>
                        <Text style={s.modalInfoLabel}>IOF</Text>
                        <Text style={s.modalInfoValue}>{detailGasto.iofPercentual}%</Text>
                      </View>
                    </View>
                  ) : null}
                  {detailGasto.taxaPercentual != null ? (
                    <View style={s.modalInfoRow}>
                      <View style={[s.modalInfoIconBg, { backgroundColor: '#FEF2F2' }]}>
                        <MaterialIcons name="receipt-long" size={22} color="#DC2626" />
                      </View>
                      <View style={s.modalInfoTextCol}>
                        <Text style={s.modalInfoLabel}>Taxa</Text>
                        <Text style={s.modalInfoValue}>{detailGasto.taxaPercentual}%</Text>
                      </View>
                    </View>
                  ) : null}
                  {detailGasto.milhasEstimadas != null ? (
                    <View style={s.modalInfoRow}>
                      <View style={[s.modalInfoIconBg, { backgroundColor: '#EEF2FF' }]}>
                        <MaterialIcons name="flight" size={22} color="#4F46E5" />
                      </View>
                      <View style={s.modalInfoTextCol}>
                        <Text style={s.modalInfoLabel}>Milhas (estim.)</Text>
                        <Text style={s.modalInfoValue}>{detailGasto.milhasEstimadas}</Text>
                      </View>
                    </View>
                  ) : null}
                  {notasSemMeta(detailGasto.notas) ? (
                    <View style={s.modalInfoRow}>
                      <View style={[s.modalInfoIconBg, { backgroundColor: '#F1F5F9' }]}>
                        <MaterialIcons name="sticky-note-2" size={22} color={ViaColors.navy} />
                      </View>
                      <View style={s.modalInfoTextCol}>
                        <Text style={s.modalInfoLabel}>Notas</Text>
                        <Text style={s.modalInfoValue}>{notasSemMeta(detailGasto.notas)}</Text>
                      </View>
                    </View>
                  ) : null}
                </ScrollView>
                {tripId ? (
                  <Pressable
                    onPress={() => {
                      togglePaid(detailGasto);
                    }}
                    style={({ pressed }) => [s.modalPaidBtn, pressed && { opacity: 0.9 }]}>
                    <MaterialIcons
                      name={modalPaid ? 'check-circle' : 'radio-button-unchecked'}
                      size={20}
                      color="#fff"
                    />
                    <Text style={s.modalPaidTxt}>{modalPaid ? 'Marcado como pago' : 'Marcar como pago'}</Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={planPay != null}
        transparent
        animationType="fade"
        onRequestClose={fecharPagamentoPlano}>
        <View style={s.modalWrap}>
          <Pressable style={s.modalBackdropFill} onPress={fecharPagamentoPlano} />
          <View style={[s.modalCard, { paddingBottom: insets.bottom + ViaSpacing.md }]}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Como foi o pagamento?</Text>
              <Pressable onPress={fecharPagamentoPlano} hitSlop={12}>
                <MaterialIcons name="close" size={24} color={ViaColors.navy} />
              </Pressable>
            </View>
            {planPay ? (
              <Text style={s.modalLineSub}>{formatBrl(planPay.valor)} · {planPay.descricao}</Text>
            ) : null}
            <ScrollView
              style={s.modalScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              {payStep === 'metodo' ? (
                <View style={s.payGrid}>
                  <Pressable
                    disabled={createFromPlano.isPending}
                    onPress={() => enviarPagamentoPlano('pix', 'Pix à vista', 1)}
                    style={[s.payOpt, createFromPlano.isPending && s.payOptDisabled]}>
                    <MaterialIcons name="qr-code-2" size={22} color={ViaColors.navy} />
                    <Text style={s.payOptTxt}>Pix</Text>
                  </Pressable>
                  <Pressable
                    disabled={createFromPlano.isPending}
                    onPress={() => enviarPagamentoPlano('dinheiro', 'Dinheiro à vista', 1)}
                    style={[s.payOpt, createFromPlano.isPending && s.payOptDisabled]}>
                    <MaterialIcons name="payments" size={22} color={ViaColors.navy} />
                    <Text style={s.payOptTxt}>Dinheiro</Text>
                  </Pressable>
                  <Pressable
                    disabled={createFromPlano.isPending}
                    onPress={() => setPayStep('cartaoTipo')}
                    style={[s.payOpt, createFromPlano.isPending && s.payOptDisabled]}>
                    <MaterialIcons name="credit-card" size={22} color={ViaColors.navy} />
                    <Text style={s.payOptTxt}>Cartão</Text>
                  </Pressable>
                  <Pressable
                    disabled={createFromPlano.isPending}
                    onPress={() => enviarPagamentoPlano('transferencia', 'Transferência à vista', 1)}
                    style={[s.payOpt, createFromPlano.isPending && s.payOptDisabled]}>
                    <MaterialIcons name="account-balance" size={22} color={ViaColors.navy} />
                    <Text style={s.payOptTxt}>Transferência</Text>
                  </Pressable>
                </View>
              ) : null}
              {payStep === 'cartaoTipo' ? (
                <View style={s.payCol}>
                  <Text style={s.modalLine}>Cartão débito é à vista; crédito permite parcelar em até 12x.</Text>
                  <Pressable
                    disabled={createFromPlano.isPending}
                    onPress={() => enviarPagamentoPlano('cartao_nacional', 'Cartão débito à vista', 1)}
                    style={[s.modalPaidBtn, createFromPlano.isPending && { opacity: 0.6 }]}>
                    {createFromPlano.isPending ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={s.modalPaidTxt}>Débito · à vista</Text>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setCreditParcelasPick(1);
                      setPayStep('parcelas');
                    }}
                    style={s.paySecondaryBtn}>
                    <Text style={s.paySecondaryTxt}>Crédito · parcelar</Text>
                  </Pressable>
                  <Pressable onPress={() => setPayStep('metodo')} style={s.payBackBtn}>
                    <Text style={s.payBackTxt}>Voltar</Text>
                  </Pressable>
                </View>
              ) : null}
              {payStep === 'parcelas' ? (
                <View style={s.payCol}>
                  <Text style={s.modalLine}>Número de parcelas</Text>
                  <View style={s.parcelGrid}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                      <Pressable
                        key={n}
                        onPress={() => setCreditParcelasPick(n)}
                        style={[s.parcelChip, creditParcelasPick === n && s.parcelChipOn]}>
                        <Text
                          style={[
                            s.parcelChipTxt,
                            creditParcelasPick === n && s.parcelChipTxtOn,
                          ]}>
                          {n}x
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Pressable
                    onPress={() =>
                      enviarPagamentoPlano(
                        'cartao_nacional',
                        `Cartão crédito em ${creditParcelasPick}x`,
                        creditParcelasPick,
                      )
                    }
                    disabled={createFromPlano.isPending}
                    style={[
                      s.modalPaidBtn,
                      { marginTop: ViaSpacing.md },
                      createFromPlano.isPending && { opacity: 0.6 },
                    ]}>
                    {createFromPlano.isPending ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={s.modalPaidTxt}>Concluir</Text>
                    )}
                  </Pressable>
                  <Pressable onPress={() => setPayStep('cartaoTipo')} style={s.payBackBtn}>
                    <Text style={s.payBackTxt}>Voltar</Text>
                  </Pressable>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: ViaColors.background },
  header: {
    backgroundColor: ViaColors.navy,
    paddingHorizontal: ViaSpacing.margin,
    paddingBottom: 24,
    gap: 4,
  },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 28, color: '#FFFFFF', letterSpacing: -0.5 },
  headerSub: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: 'rgba(255,255,255,0.85)', marginBottom: 16 },

  budgetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(226,209,179,0.5)',
    gap: 10,
    ...ViaShadows.level1,
  },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  budgetLabel: { fontFamily: ViaFonts.body, fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.4 },
  budgetValor: { fontFamily: ViaFonts.h1, fontSize: 26, color: ViaColors.navy, letterSpacing: -0.5, marginTop: 2 },
  budgetOrc: { fontFamily: ViaFonts.h3, fontSize: 18, color: ViaColors.onSurfaceVariant, marginTop: 2 },
  barTrack: { height: 6, backgroundColor: 'rgba(15,23,42,0.08)', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: ViaColors.coral, borderRadius: 3 },
  barLabel: { fontFamily: ViaFonts.body, fontSize: 11, color: '#6B7280' },

  bodyWrap: { paddingTop: 20, gap: 20 },
  section: { paddingHorizontal: ViaSpacing.margin, gap: 12 },
  helperText: { fontFamily: ViaFonts.body, fontSize: 12, color: '#6B7280' },
  sectionHint: { fontFamily: ViaFonts.body, fontSize: 12, color: '#6B7280', lineHeight: 17 },
  tripList: { gap: 8 },
  tripChip: {
    minWidth: 170,
    maxWidth: 220,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(226,209,179,0.7)',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tripChipOn: {
    backgroundColor: ViaColors.primaryContainer,
    borderColor: ViaColors.navy,
  },
  tripChipText: { fontFamily: ViaFonts.bodySemi, fontSize: 13, color: ViaColors.navy },
  tripChipSub: { fontFamily: ViaFonts.body, fontSize: 11, color: '#6B7280', marginTop: 2 },
  tripChipTextOn: { color: ViaColors.onPrimary },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: ViaFonts.h3, fontSize: 16, color: ViaColors.navy, letterSpacing: -0.2 },
  seeAll: { fontFamily: ViaFonts.bodySemi, fontSize: 13, color: ViaColors.coral },

  catStack: { gap: ViaSpacing.md },
  catBlock: {
    borderRadius: ViaRadius.lg,
    borderLeftWidth: 4,
    padding: ViaSpacing.md,
    overflow: 'hidden',
    ...ViaShadows.level1,
  },
  catBlockHead: { flexDirection: 'row', alignItems: 'center', gap: ViaSpacing.sm, marginBottom: ViaSpacing.sm },
  catIcon: { width: 44, height: 44, borderRadius: ViaRadius.md, alignItems: 'center', justifyContent: 'center' },
  catBlockTitle: { fontFamily: ViaFonts.bodySemi, fontSize: 16, color: ViaColors.navy },
  catBlockSub: { fontFamily: ViaFonts.body, fontSize: 12, color: ViaColors.onSurfaceVariant, marginTop: 2 },
  catEmpty: { fontFamily: ViaFonts.body, fontSize: 12, color: ViaColors.onSurfaceVariant, fontStyle: 'italic' },
  planSection: { gap: 8 },
  planSectionTitle: {
    fontFamily: ViaFonts.bodySemi,
    fontSize: 11,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  planItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  planValorEye: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  planMetaParcial: { color: '#B45309', fontFamily: ViaFonts.bodySemi },
  payGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  payOpt: {
    width: '47%',
    paddingVertical: 16,
    borderRadius: ViaRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(226,209,179,0.7)',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
  },
  payOptDisabled: { opacity: 0.45 },
  payOptTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 13, color: ViaColors.navy },
  payCol: { gap: 12 },
  paySecondaryBtn: {
    paddingVertical: 14,
    borderRadius: ViaRadius.md,
    borderWidth: 1,
    borderColor: ViaColors.navy,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  paySecondaryTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 15, color: ViaColors.navy },
  payBackBtn: { paddingVertical: 8, alignItems: 'center' },
  payBackTxt: { fontFamily: ViaFonts.body, color: ViaColors.coral, fontSize: 14 },
  parcelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  parcelChip: {
    width: '22%',
    minWidth: 56,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.15)',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  parcelChipOn: { backgroundColor: ViaColors.navy, borderColor: ViaColors.navy },
  parcelChipTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 13, color: ViaColors.navy },
  parcelChipTxtOn: { color: '#FFFFFF' },
  catItems: {
    backgroundColor: '#FFFFFF',
    borderRadius: ViaRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(226,209,179,0.45)',
    overflow: 'hidden',
  },
  catItemRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    paddingVertical: 4,
    paddingLeft: 8,
    paddingRight: 4,
  },
  catItemMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingRight: 8,
    minWidth: 0,
  },
  catItemBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(226,209,179,0.35)' },
  catItemTitle: { fontFamily: ViaFonts.bodySemi, fontSize: 13, color: ViaColors.navy },
  catItemMeta: { fontFamily: ViaFonts.body, fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  catItemValor: { fontFamily: ViaFonts.bodySemi, fontSize: 14, color: ViaColors.navy },

  transCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(226,209,179,0.5)',
    overflow: 'hidden',
    ...ViaShadows.level1,
  },
  transRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  transBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(226,209,179,0.3)' },
  transIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  checkBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkBtnInRow: { alignSelf: 'center' },
  checkBtnOn: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  transLabel: { fontFamily: ViaFonts.bodySemi, fontSize: 13, color: ViaColors.navy },
  transData: { fontFamily: ViaFonts.body, fontSize: 11, color: '#9CA3AF' },
  transMetaLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  transDot: { fontSize: 11, color: '#D1D5DB' },
  transParcelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  transParcelTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 10, color: '#C2410C' },
  transValor: { fontFamily: ViaFonts.h3, fontSize: 14, letterSpacing: -0.2 },

  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ViaColors.navy,
    borderRadius: 14,
    paddingVertical: 15,
  },
  ctaDisabled: { opacity: 0.8 },
  ctaBtnTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 15, color: '#FFFFFF' },

  modalWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: ViaSpacing.margin,
  },
  modalBackdropFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.45)',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: ViaRadius.lg,
    padding: ViaSpacing.lg,
    maxHeight: '85%',
    ...ViaShadows.level2,
  },
  modalScroll: { maxHeight: 420 },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 4,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.08)',
  },
  modalInfoIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalInfoTextCol: { flex: 1, minWidth: 0, gap: 2 },
  modalInfoLabel: {
    fontFamily: ViaFonts.body,
    fontSize: 11,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  modalInfoValue: {
    fontFamily: ViaFonts.body,
    fontSize: 15,
    color: ViaColors.navy,
    lineHeight: 22,
  },
  modalInfoValueLarge: {
    fontFamily: ViaFonts.h2,
    fontSize: 22,
    color: ViaColors.navy,
    letterSpacing: -0.3,
  },
  modalHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: ViaSpacing.sm },
  modalHeadActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  modalTitle: { flex: 1, fontFamily: ViaFonts.h3, fontSize: 18, color: ViaColors.navy },
  modalLineSub: {
    fontFamily: ViaFonts.body,
    fontSize: 13,
    color: ViaColors.onSurfaceVariant,
    marginBottom: ViaSpacing.sm,
  },
  modalFootNote: {
    fontFamily: ViaFonts.body,
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: ViaSpacing.sm,
    lineHeight: 18,
  },
  modalValor: { fontFamily: ViaFonts.h2, fontSize: 22, color: ViaColors.navy, marginTop: ViaSpacing.sm, marginBottom: ViaSpacing.sm },
  modalLine: { fontFamily: ViaFonts.body, fontSize: 14, color: ViaColors.onSurfaceVariant, marginBottom: 6, lineHeight: 20 },
  modalPaidBtn: {
    marginTop: ViaSpacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ViaColors.navy,
    borderRadius: ViaRadius.md,
    paddingVertical: ViaSpacing.md,
  },
  modalPaidTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 15, color: '#fff' },
});
