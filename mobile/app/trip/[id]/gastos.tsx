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
      if (!id || !desc.trim() || Number.isNaN(v) || v <= 0) {
        return Promise.reject(new Error('Preencha descrição e valor.'));
      }
      return createGasto({
        viagemId: id,
        descricao: desc.trim(),
        categoria: cat,
        valor: v,
        data,
      });
    },
    onSuccess: () => {
      setDesc('');
      setValor('');
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
              <Text style={styles.panT}>
                {formatBrl(painel.data.jaGasto)} gasto · {formatBrl(painel.data.saldoDisponivel)} saldo
              </Text>
              {orc > 0 && <ProgressBarCoral progress={prog} />}
              </View>
            </SectionCard>
          )}
          <SectionCard>
          <View style={styles.form}>
            <Text style={styles.h2}>Novo gasto</Text>
            <TextInput
              value={desc}
              onChangeText={setDesc}
              placeholder="Descrição"
              placeholderTextColor={ViaColors.onSurfaceVariant}
              style={styles.inp}
            />
            <View style={styles.r2}>
              <TextInput
                value={valor}
                onChangeText={setValor}
                placeholder="Valor (ex: 45,90)"
                placeholderTextColor={ViaColors.onSurfaceVariant}
                keyboardType="decimal-pad"
                style={[styles.inp, { flex: 1 }]}
              />
              <TextInput
                value={data}
                onChangeText={setData}
                placeholder="AAAA-MM-DD"
                style={[styles.inp, { width: 120 }]}
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
  panT: { ...textBody, marginBottom: 8, color: ViaColors.navy },
  form: {},
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
