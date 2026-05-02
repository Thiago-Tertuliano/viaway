import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProgressBarCoral } from '@/components/viaway/ProgressBarCoral';
import { ApiException } from '@/lib/api-client';
import { formatBrl, formatViagemDatas } from '@/lib/format';
import {
  getPainelGastos,
  getViagem,
  listAtividades,
  listChecklist,
  listCotacoes,
  listDias,
  listGastos,
  listLugaresViagem,
} from '@/lib/viaway-api';
import {
  ViaColors,
  ViaFonts,
  ViaRadius,
  ViaShadows,
  ViaSpacing,
  textBody,
  textBodySm,
  textH1,
  textH2,
  textH3,
  textLabel,
} from '@/constants/viaway-theme';

const HERO_DEFAULT =
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=400&fit=crop';

function atividadeTipoIcon(tipo: string): keyof typeof MaterialIcons.glyphMap {
  const t = tipo.toLowerCase();
  if (t === 'refeicao') return 'restaurant';
  if (t === 'transporte') return 'directions-car';
  if (t === 'hospedagem') return 'hotel';
  if (t === 'livre') return 'wb-sunny';
  return 'local-activity';
}

function useTripHubData(viagemId: string) {
  const qClient = useQueryClient();
  const viagem = useQuery({
    queryKey: ['viagem', viagemId] as const,
    queryFn: () => getViagem(viagemId),
    enabled: Boolean(viagemId),
  });
  const painel = useQuery({
    queryKey: ['painel', viagemId] as const,
    queryFn: () => getPainelGastos(viagemId),
    enabled: Boolean(viagemId) && viagem.isSuccess,
  });
  const dias = useQuery({
    queryKey: ['dias', viagemId] as const,
    queryFn: () => listDias(viagemId),
    enabled: Boolean(viagemId) && viagem.isSuccess,
  });
  const firstDiaId = useMemo(() => {
    const d = [...(dias.data ?? [])].sort((a, b) => a.ordem - b.ordem);
    return d[0]?.id;
  }, [dias.data]);
  const atividades = useQuery({
    queryKey: ['atividades', firstDiaId] as const,
    queryFn: () => (firstDiaId ? listAtividades(firstDiaId) : Promise.resolve([])),
    enabled: Boolean(firstDiaId),
  });
  const nextAtividade = (atividades.data ?? [])[0] ?? null;
  const metas = useQuery({
    queryKey: ['trip-metas', viagemId] as const,
    queryFn: () =>
      Promise.all([
        listLugaresViagem(viagemId).then((l) => l.length),
        listCotacoes(viagemId).then((c) => c.length),
        listGastos(viagemId).then((g) => g.length),
        listChecklist(viagemId).then((c) => c.length),
        listDias(viagemId).then((d) => d.length),
      ]),
    enabled: Boolean(viagemId) && viagem.isSuccess,
  });
  const refetch = useCallback(() => {
    return Promise.all([
      qClient.invalidateQueries({ queryKey: ['viagem', viagemId] }),
      qClient.invalidateQueries({ queryKey: ['painel', viagemId] }),
      qClient.invalidateQueries({ queryKey: ['dias', viagemId] }),
      qClient.invalidateQueries({ queryKey: ['trip-metas', viagemId] }),
      firstDiaId
        ? qClient.invalidateQueries({ queryKey: ['atividades', firstDiaId] })
        : Promise.resolve(),
    ]);
  }, [qClient, viagemId, firstDiaId]);
  return { viagem, painel, dias, nextAtividade, metas, refetch };
}

export default function TripHubScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const p = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(p.id) ? p.id[0] : p.id;

  const { viagem, painel, nextAtividade, metas, refetch } = useTripHubData(
    id ?? '',
  );
  const loading = viagem.isLoading || (viagem.isFetching && !viagem.data);
  const err = viagem.error;
  const v = viagem.data;
  const painelD = painel.data;

  const orc = painelD?.orcamentoTotal ?? 0;
  const comprometido = (painelD?.jaGasto ?? 0) + (painelD?.cotacoesConfirmadas ?? 0);
  const progress = orc > 0 ? Math.min(1, comprometido / orc) : 0;
  const pct = orc > 0 ? Math.round((comprometido / orc) * 100) : 0;

  const [lugN, , gasN, chkN, diaN] = metas.data ?? [0, 0, 0, 0, 0];

  if (!id) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Pressable onPress={() => router.back()} style={styles.loadingBack}>
          <MaterialIcons name="arrow-back" size={24} color={ViaColors.navy} />
        </Pressable>
        <ActivityIndicator size="large" color={ViaColors.coral} />
        <Text style={styles.muted}>Carregando viagem…</Text>
      </View>
    );
  }

  if (err && err instanceof ApiException) {
    return (
      <View style={styles.center}>
        <Pressable onPress={() => router.back()} style={styles.loadingBack}>
          <MaterialIcons name="arrow-back" size={24} color={ViaColors.navy} />
        </Pressable>
        <MaterialIcons name="error-outline" size={48} color="#ba1a1a" />
        <Text style={styles.err}>{err.message}</Text>
        <Text style={styles.muted}>
          API em {id.slice(0, 6)}… Confira se o backend está com DISABLE_AUTH e se a URL
          (localhost vs 10.0.2.2 no Android) está correta.
        </Text>
        <Pressable onPress={() => refetch()} style={styles.retryBtn}>
          <Text style={styles.retryTxt}>Tentar de novo</Text>
        </Pressable>
      </View>
    );
  }

  if (!v) {
    return null;
  }

  const capa = v.capaUrl || HERO_DEFAULT;
  const range = formatViagemDatas(v.dataIda, v.dataVolta);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + ViaSpacing.xl },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={viagem.isFetching}
            onRefresh={refetch}
            tintColor={ViaColors.coral}
          />
        }
        showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          <Image source={{ uri: capa }} style={styles.heroImg} contentFit="cover" />
          <View style={styles.heroGrad} />
          <View style={[styles.heroTopBar, { paddingTop: insets.top + 10 }]}>
            <Pressable onPress={() => router.back()} style={styles.heroIconBtn} hitSlop={12}>
              <MaterialIcons name="arrow-back" size={22} color="#fff" />
            </Pressable>
          </View>
          <View style={styles.heroText}>
            <Text style={styles.h1}>{v.nome}</Text>
            <View style={styles.rowDate}>
              <MaterialIcons name="calendar-today" size={18} color="rgba(255,255,255,0.95)" />
              <Text style={styles.date}>{range}</Text>
            </View>
            <Text style={styles.subDest}>{v.destinoPrincipal}</Text>
          </View>
        </View>

        <View style={styles.padded}>
          <View style={styles.card}>
            <View style={styles.nextActRow}>
              {nextAtividade ? (
                <>
                  <View style={styles.nextActIconRing}>
                    <MaterialIcons
                      name={atividadeTipoIcon(nextAtividade.tipo)}
                      size={22}
                      color={ViaColors.coral}
                    />
                  </View>
                  <View style={styles.nextActBody}>
                    <Text style={styles.kicker}>Próxima atividade</Text>
                    <Text style={styles.h3}>{nextAtividade.nome}</Text>
                    <View style={styles.metaRow}>
                      {nextAtividade.horarioInicio != null && (
                        <View style={styles.metaItem}>
                          <MaterialIcons
                            name="schedule"
                            size={16}
                            color={ViaColors.onSurfaceVariant}
                          />
                          <Text style={styles.meta}>{nextAtividade.horarioInicio}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.nextActBody}>
                  <Text style={styles.kicker}>Próxima atividade</Text>
                  <Text style={styles.mutedB}>Nada no itinerário ainda. Adicione um dia e atividades.</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.between}>
              <View>
                <Text style={styles.kicker}>Orçamento (comprometido)</Text>
                <Text style={styles.money}>
                  {formatBrl(comprometido)}
                  {orc > 0 ? (
                    <Text style={styles.moneyCap}>
                      {' '}
                      / {formatBrl(orc)}
                    </Text>
                  ) : (
                    <Text style={styles.moneyCap}> (sem teto)</Text>
                  )}
                </Text>
              </View>
              {orc > 0 ? <Text style={styles.pct}>{pct}%</Text> : null}
            </View>
            {orc > 0 ? <ProgressBarCoral progress={progress} /> : null}
            {painelD && (
              <Text style={styles.mutedB} accessibilityRole="text">
                Saldo disponível: {formatBrl(painelD.saldoDisponivel)}
                {painelD.custoEstimadoPorDia != null
                  ? ` · Média/dia: ${formatBrl(painelD.custoEstimadoPorDia)}`
                  : ''}
              </Text>
            )}
          </View>

          <Text style={styles.acessoTit}>Acesso rápido</Text>
          <View style={styles.bento}>
            <Pressable
              style={({ pressed }) => [styles.tileLarge, styles.tileNavy, pressed && { opacity: 0.92 }]}
              onPress={() => router.push({ pathname: '/trip/[id]/itinerario', params: { id } })}>
              <View style={styles.rowTile}>
                <View style={styles.mapRing}>
                  <MaterialIcons
                    name="map"
                    size={24}
                    color={ViaColors.onPrimary}
                  />
                </View>
                <View style={styles.grow}>
                  <Text style={styles.tileH}>Itinerário</Text>
                  <Text style={styles.tileP}>
                    {diaN} {diaN === 1 ? 'dia' : 'dias'}
                  </Text>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={24}
                  color={ViaColors.onPrimary}
                />
              </View>
            </Pressable>

            <View style={styles.halfRow}>
              <Pressable
                style={({ pressed }) => [styles.tileSmall, pressed && { opacity: 0.95 }]}
                onPress={() => router.push({ pathname: '/trip/[id]/lugares', params: { id } })}>
                <MaterialIcons name="place" size={24} color={ViaColors.secondary} />
                <Text style={styles.tileHSm}>Lugares</Text>
                <Text style={styles.tileMeta}>{lugN} salvos</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.tileSmall, pressed && { opacity: 0.95 }]}
                onPress={() => router.push('/cambio')}>
                <MaterialIcons name="currency-exchange" size={24} color={ViaColors.secondary} />
                <Text style={styles.tileHSm}>Câmbio</Text>
                <Text style={styles.tileMeta}>Calculadora e taxas</Text>
              </Pressable>
            </View>

            <View style={styles.halfRow}>
              <Pressable
                style={({ pressed }) => [styles.tileSmall, pressed && { opacity: 0.95 }]}
                onPress={() => router.push({ pathname: '/trip/[id]/gastos', params: { id } })}>
                <MaterialIcons name="credit-card" size={24} color={ViaColors.secondary} />
                <Text style={styles.tileHSm}>Gastos</Text>
                <Text style={styles.tileMeta}>{gasN} lanç.</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.tileSmall, pressed && { opacity: 0.95 }]}
                onPress={() => router.push({ pathname: '/trip/[id]/checklist', params: { id } })}>
                <MaterialIcons name="check-box" size={24} color={ViaColors.secondary} />
                <Text style={styles.tileHSm}>Checklist</Text>
                <Text style={styles.tileMeta}>{chkN} itens</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingBack: { position: 'absolute', top: 48, left: 16, zIndex: 2, padding: 8 },
  center: { flex: 1, backgroundColor: ViaColors.background, justifyContent: 'center', alignItems: 'center', padding: ViaSpacing.margin, gap: ViaSpacing.md },
  muted: { fontFamily: ViaFonts.body, fontSize: 14, color: ViaColors.onSurfaceVariant, textAlign: 'center' },
  mutedB: { ...textBody, fontSize: 14, color: ViaColors.onSurfaceVariant, marginTop: ViaSpacing.md },
  err: { fontFamily: ViaFonts.bodySemi, color: '#ba1a1a', textAlign: 'center' },
  retryBtn: { marginTop: ViaSpacing.md, padding: ViaSpacing.md, backgroundColor: ViaColors.primaryContainer, borderRadius: 999 },
  retryTxt: { color: ViaColors.onPrimary, fontFamily: ViaFonts.bodySemi },
  root: { flex: 1, backgroundColor: ViaColors.background },
  scroll: { paddingBottom: ViaSpacing.lg },
  heroWrap: {
    height: 300,
    width: '100%',
    borderBottomLeftRadius: ViaRadius.lg,
    borderBottomRightRadius: ViaRadius.lg,
    overflow: 'hidden',
    ...ViaShadows.level1,
  },
  heroImg: { ...StyleSheet.absoluteFillObject },
  heroGrad: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.45)' },
  heroTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: ViaSpacing.margin,
    paddingBottom: 8,
    zIndex: 2,
  },
  heroIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: ViaSpacing.margin,
    paddingTop: 56,
  },
  h1: { ...textH1, color: ViaColors.onPrimary, marginBottom: ViaSpacing.sm },
  subDest: { fontFamily: textBody.fontFamily, fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  rowDate: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  date: { fontFamily: textBody.fontFamily, fontSize: 16, lineHeight: 24, color: 'rgba(255,255,255,0.9)' },
  padded: { paddingHorizontal: ViaSpacing.margin, gap: ViaSpacing.lg, marginTop: ViaSpacing.lg },
  card: {
    backgroundColor: ViaColors.surfaceWhite,
    borderRadius: ViaRadius.lg,
    padding: ViaSpacing.md,
    ...ViaShadows.level1,
  },
  nextActRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ViaSpacing.md,
  },
  nextActIconRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(244,113,82,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextActBody: { flex: 1, minWidth: 0 },
  kicker: { ...textLabel, color: ViaColors.outline, marginBottom: 4 },
  h3: { ...textH3, color: ViaColors.onSurface },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: ViaSpacing.lg, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { ...textBodySm, color: ViaColors.onSurfaceVariant },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: ViaSpacing.md },
  money: { ...textH2, color: ViaColors.onSurface },
  moneyCap: { fontFamily: ViaFonts.body, fontSize: 14, lineHeight: 21, color: ViaColors.outline },
  pct: { ...textBodySm, color: ViaColors.onSurfaceVariant },
  acessoTit: { ...textH3, color: ViaColors.onSurface, marginBottom: ViaSpacing.xs },
  bento: { gap: ViaSpacing.gutter },
  halfRow: { flexDirection: 'row', gap: ViaSpacing.gutter },
  tileLarge: { borderRadius: ViaRadius.lg, padding: ViaSpacing.md, ...ViaShadows.level1 },
  tileNavy: { backgroundColor: ViaColors.primaryContainer },
  rowTile: { flexDirection: 'row', alignItems: 'center', gap: ViaSpacing.md },
  mapRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grow: { flex: 1, minWidth: 0 },
  tileH: { fontFamily: ViaFonts.bodySemi, fontSize: 16, color: ViaColors.onPrimary },
  tileP: { fontFamily: ViaFonts.body, fontSize: 14, lineHeight: 20, color: ViaColors.onPrimaryMuted },
  tileSmall: {
    flex: 1,
    minHeight: 120,
    backgroundColor: ViaColors.surfaceWhite,
    borderRadius: ViaRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(226,209,179,0.45)',
    padding: ViaSpacing.md,
    gap: ViaSpacing.sm,
    ...ViaShadows.level1,
  },
  tileHSm: { fontFamily: ViaFonts.bodySemi, fontSize: 16, color: ViaColors.onSurface },
  tileMeta: { ...textBodySm, color: ViaColors.outline, marginTop: 2 },
});
