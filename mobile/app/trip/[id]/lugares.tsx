import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TripScreenHeader } from '@/components/viaway/TripScreenHeader';
import { ScreenState } from '@/components/viaway/ScreenState';
import { SectionCard } from '@/components/viaway/SectionCard';
import { ViaColors, ViaFonts, ViaRadius, ViaShadows, ViaSpacing, textBody, textBodySm, textH3 } from '@/constants/viaway-theme';
import { listLugaresViagem, type LugarJson } from '@/lib/viaway-api';
import {
  abrirRotaLugaresNoGoogleMaps,
  abrirUmLugarNoMapaNativo,
  lugarParaEnderecoBusca,
} from '@/lib/open-places-in-maps';

export default function LugaresViagemScreen() {
  const p = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(p.id) ? p.id[0] : p.id;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qClient = useQueryClient();
  const q = useQuery({
    queryKey: ['lugares', id!] as const,
    queryFn: () => listLugaresViagem(id!),
    enabled: Boolean(id),
  });

  const lugares = (q.data ?? []) as LugarJson[];
  const enderecosOrdenados = lugares.map((l) => lugarParaEnderecoBusca(l)).filter(Boolean);

  return (
    <View style={styles.root}>
      <TripScreenHeader title="Lugares" />
      {q.isLoading ? (
        <ScreenState kind="loading" title="Carregando lugares..." />
      ) : (
        <ScrollView
          bounces={false}
          alwaysBounceVertical={false}
          overScrollMode="never"
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

          <SectionCard>
            <Text style={styles.mapIntroTitle}>Adicionar lugares da cidade</Text>
            <Text style={styles.mapIntroSub}>
              Busque lugares da cidade desta viagem com filtros (atrações, comida, avaliação e custo) e abra no
              mapa.
            </Text>
            <Pressable
              onPress={() => id && router.push({ pathname: '/trip/[id]/buscar-lugares', params: { id } })}
              style={({ pressed }) => [styles.ctaSearch, pressed && { opacity: 0.9 }]}>
              <MaterialIcons name="travel-explore" size={20} color="#fff" />
              <Text style={styles.ctaSearchTxt}>Buscar lugares no Google Places</Text>
              <MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.9)" />
            </Pressable>
          </SectionCard>

          {lugares.length > 0 && (
            <SectionCard>
              <View style={styles.mapIntro}>
                <View style={styles.mapIntroIcon}>
                  <MaterialIcons name="map" size={28} color={ViaColors.secondary} />
                </View>
                <View style={styles.mapIntroText}>
                  <Text style={styles.mapIntroTitle}>Rota no mapa do celular</Text>
                  <Text style={styles.mapIntroSub}>
                    Sem mapa dentro do Viaway: a lista fica aqui, bonita e na ordem. Um toque abre tudo no app de
                    mapas — com paradas certinhas quando você tiver mais de um lugar.
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => abrirRotaLugaresNoGoogleMaps(enderecosOrdenados)}
                style={({ pressed }) => [styles.ctaRoute, pressed && { opacity: 0.9 }]}>
                <MaterialIcons name="directions" size={22} color="#fff" />
                <Text style={styles.ctaRouteTxt}>
                  {lugares.length === 1 ? 'Abrir no mapa' : 'Abrir rota com todas as paradas'}
                </Text>
                <MaterialIcons name="open-in-new" size={20} color="rgba(255,255,255,0.9)" />
              </Pressable>
              <Text style={styles.mapFoot}>
                {Platform.OS === 'ios'
                  ? 'No iPhone, cada lugar também pode abrir direto no Apple Maps pelo ícone ao lado.'
                  : 'Usamos o Google Maps para encadear várias paradas; em um único lugar, abrimos o app de mapas do sistema.'}
              </Text>
            </SectionCard>
          )}

          {lugares.map((l, index) => {
            const busca = lugarParaEnderecoBusca(l);
            return (
              <SectionCard key={l.id}>
                <View style={styles.card}>
                  <View style={styles.ordem}>
                    <Text style={styles.ordemTxt}>{index + 1}</Text>
                  </View>
                  <MaterialIcons name="place" size={22} color={ViaColors.secondary} style={styles.pin} />
                  <View style={styles.t}>
                    <Text style={styles.tit}>{l.nome}</Text>
                    <Text style={styles.tip}>
                      {l.tipo} · {l.status}
                    </Text>
                    <Text style={styles.loc}>
                      {[l.cidade, l.pais].filter(Boolean).join(', ') || '—'}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityLabel="Abrir este lugar no app de mapas"
                    onPress={() => abrirUmLugarNoMapaNativo(busca)}
                    hitSlop={12}
                    style={({ pressed }) => [styles.rowMapBtn, pressed && { opacity: 0.75 }]}>
                    <MaterialIcons name="open-in-new" size={22} color={ViaColors.navy} />
                  </Pressable>
                </View>
              </SectionCard>
            );
          })}

          {q.isSuccess && lugares.length === 0 && (
            <ScreenState
              kind="empty"
              title="Nenhum lugar vinculado"
              subtitle="Salve lugares e associe à viagem. Depois você abre a rota inteira no Google Maps ou no Apple Maps, lugar a lugar."
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
  mapIntro: { flexDirection: 'row', gap: ViaSpacing.md, marginBottom: ViaSpacing.md },
  mapIntroIcon: {
    width: 52,
    height: 52,
    borderRadius: ViaRadius.md,
    backgroundColor: 'rgba(59,130,246,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapIntroText: { flex: 1, minWidth: 0, gap: 6 },
  mapIntroTitle: { fontFamily: ViaFonts.bodySemi, fontSize: 16, color: ViaColors.navy },
  mapIntroSub: { ...textBodySm, color: ViaColors.onSurfaceVariant, lineHeight: 20 },
  ctaRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ViaSpacing.sm,
    backgroundColor: ViaColors.navy,
    paddingVertical: ViaSpacing.md,
    paddingHorizontal: ViaSpacing.md,
    borderRadius: ViaRadius.md,
    ...ViaShadows.level1,
  },
  ctaRouteTxt: { flex: 1, fontFamily: ViaFonts.bodySemi, fontSize: 15, color: '#fff' },
  ctaSearch: {
    marginTop: ViaSpacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ViaSpacing.sm,
    backgroundColor: ViaColors.secondary,
    paddingVertical: ViaSpacing.md,
    paddingHorizontal: ViaSpacing.md,
    borderRadius: ViaRadius.md,
    ...ViaShadows.level1,
  },
  ctaSearchTxt: { flex: 1, fontFamily: ViaFonts.bodySemi, fontSize: 15, color: '#fff' },
  mapFoot: { ...textBodySm, color: ViaColors.onSurfaceVariant, marginTop: ViaSpacing.sm, lineHeight: 18 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ViaSpacing.sm,
    paddingVertical: ViaSpacing.xs,
  },
  ordem: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(15,23,42,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  ordemTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 12, color: ViaColors.navy },
  pin: { marginTop: 4 },
  t: { flex: 1, minWidth: 0 },
  tit: { ...textH3, color: ViaColors.navy, marginBottom: 2 },
  tip: { ...textBodySm, color: ViaColors.onSurfaceVariant },
  loc: { ...textBodySm, marginTop: 4, color: ViaColors.outline },
  rowMapBtn: {
    padding: ViaSpacing.xs,
    borderRadius: ViaRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(226,209,179,0.6)',
    backgroundColor: ViaColors.surfaceWhite,
    marginTop: 2,
  },
});
