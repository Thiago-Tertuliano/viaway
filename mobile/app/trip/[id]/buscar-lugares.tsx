import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/viaway/AppHeader';
import { ScreenState } from '@/components/viaway/ScreenState';
import { SectionCard } from '@/components/viaway/SectionCard';
import { ViaColors, ViaFonts, ViaRadius, ViaSpacing, textBodySm } from '@/constants/viaway-theme';
import {
  getPlacesConfig,
  hasGooglePlacesKey,
  searchGooglePlacesByCity,
  type GooglePlaceResult,
  type PlaceCategory,
} from '@/lib/google-places';
import { getViagem } from '@/lib/viaway-api';

const CATEGORIES: Array<{ id: PlaceCategory; label: string; icon: keyof typeof MaterialIcons.glyphMap }> = [
  { id: 'tourist_attraction', label: 'Atrações', icon: 'camera-alt' },
  { id: 'restaurant', label: 'Comida', icon: 'restaurant' },
  { id: 'cafe', label: 'Cafés', icon: 'local-cafe' },
  { id: 'lodging', label: 'Hospedagem', icon: 'hotel' },
  { id: 'museum', label: 'Cultura', icon: 'museum' },
];

export default function BuscarLugaresScreen() {
  const p = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(p.id) ? p.id[0] : p.id;
  const insets = useSafeAreaInsets();
  const placesCfg = useMemo(() => getPlacesConfig(), []);

  const [category, setCategory] = useState<PlaceCategory | null>(null);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [maxPriceLevel, setMaxPriceLevel] = useState<number | null>(null);
  const [query, setQuery] = useState('');

  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<GooglePlaceResult[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const viagemQ = useQuery({
    queryKey: ['viagem', id!] as const,
    queryFn: () => getViagem(id!),
    enabled: Boolean(id),
  });

  const city = viagemQ.data?.destinoPrincipal?.trim() ?? '';
  const keyConfigured = hasGooglePlacesKey();

  const headerSub = useMemo(() => {
    if (!city) return 'Defina o destino principal da viagem para buscar.';
    return `Cidade da viagem: ${city}`;
  }, [city]);

  const ttlHours = placesCfg.ttlMs / (60 * 60 * 1000);

  async function runSearch(reset: boolean) {
    if (!city || !keyConfigured) return;
    if (reset) {
      setLoadingSearch(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }
    try {
      const page = await searchGooglePlacesByCity({
        city,
        category: category ?? undefined,
        minRating: minRating ?? undefined,
        maxPriceLevel: maxPriceLevel ?? undefined,
        query: query.trim() || undefined,
        pageSize: placesCfg.pageSize,
        pageToken: reset ? undefined : nextPageToken ?? undefined,
      });
      if (reset) {
        setResults(page.results);
      } else {
        setResults((prev) => [...prev, ...page.results]);
      }
      setNextPageToken(page.nextPageToken);
      setHasSearched(true);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      if (reset) {
        setResults([]);
        setNextPageToken(null);
        setHasSearched(true);
      }
    } finally {
      if (reset) setLoadingSearch(false);
      else setLoadingMore(false);
    }
  }

  return (
    <View style={styles.root}>
      <AppHeader left="back" showAvatar={false} title="Adicionar lugares" />
      <ScrollView
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        contentContainerStyle={[styles.sc, { paddingBottom: insets.bottom + ViaSpacing.xl }]}>
        <SectionCard>
          <Text style={styles.h1}>Google Places (beta)</Text>
          <Text style={styles.sub}>{headerSub}</Text>
          <Text style={styles.cfgNote}>
            Cache: {placesCfg.cacheEnabled ? `${ttlHours.toFixed(1)}h (TTL)` : 'desligado'} ·{' '}
            {placesCfg.pageSize} resultados por página · variáveis em `.env.example`
          </Text>
          {!keyConfigured && (
            <View style={styles.warn}>
              <MaterialIcons name="key" size={18} color={ViaColors.secondary} />
              <Text style={styles.warnTxt}>
                Defina `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` no `.env` e reinicie o Expo. Opcionalmente:
                `EXPO_PUBLIC_PLACES_CACHE_TTL_MS`, `EXPO_PUBLIC_PLACES_CACHE_ENABLED`,
                `EXPO_PUBLIC_PLACES_PAGE_SIZE`. Em produção, use backend/proxy — chave pública no app não é
                ideal.
              </Text>
            </View>
          )}
        </SectionCard>

        <SectionCard>
          <Text style={styles.blockTitle}>Filtros (todos opcionais)</Text>
          <Text style={styles.hint}>Nada é obrigatório: ajuste o que quiser e toque em Buscar.</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Termo (opcional): fondue, parque, trilha…"
            placeholderTextColor="#8B93A8"
            style={styles.input}
          />

          <Text style={styles.filterLabel}>Tipo</Text>
          <View style={styles.chips}>
            <Pressable
              onPress={() => setCategory(null)}
              style={({ pressed }) => [
                styles.chip,
                category === null && styles.chipActive,
                pressed && { opacity: 0.85 },
              ]}>
              <MaterialIcons
                name="place"
                size={16}
                color={category === null ? '#fff' : ViaColors.navy}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.chipTxt, category === null && styles.chipTxtActive]}>Qualquer</Text>
            </Pressable>
            {CATEGORIES.map((c) => {
              const active = c.id === category;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setCategory(c.id)}
                  style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && { opacity: 0.85 }]}>
                  <MaterialIcons
                    name={c.icon}
                    size={16}
                    color={active ? '#fff' : ViaColors.navy}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{c.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.rowFilters}>
            <View style={styles.filterBlock}>
              <Text style={styles.filterLabel}>Avaliação mínima</Text>
              <View style={styles.rowBtns}>
                <Pressable
                  onPress={() => setMinRating(null)}
                  style={({ pressed }) => [
                    styles.smallBtn,
                    minRating === null && styles.smallBtnActive,
                    pressed && { opacity: 0.85 },
                  ]}>
                  <Text style={[styles.smallBtnTxt, minRating === null && styles.smallBtnTxtActive]}>Qualquer</Text>
                </Pressable>
                {[4, 3].map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => setMinRating(r)}
                    style={({ pressed }) => [
                      styles.smallBtn,
                      minRating === r && styles.smallBtnActive,
                      pressed && { opacity: 0.85 },
                    ]}>
                    <Text style={[styles.smallBtnTxt, minRating === r && styles.smallBtnTxtActive]}>{r}+</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.filterBlock}>
              <Text style={styles.filterLabel}>Custo máximo</Text>
              <View style={styles.rowBtns}>
                <Pressable
                  onPress={() => setMaxPriceLevel(null)}
                  style={({ pressed }) => [
                    styles.smallBtn,
                    maxPriceLevel === null && styles.smallBtnActive,
                    pressed && { opacity: 0.85 },
                  ]}>
                  <Text style={[styles.smallBtnTxt, maxPriceLevel === null && styles.smallBtnTxtActive]}>Qualquer</Text>
                </Pressable>
                {[2, 3, 4].map((pLevel) => (
                  <Pressable
                    key={pLevel}
                    onPress={() => setMaxPriceLevel(pLevel)}
                    style={({ pressed }) => [
                      styles.smallBtn,
                      maxPriceLevel === pLevel && styles.smallBtnActive,
                      pressed && { opacity: 0.85 },
                    ]}>
                    <Text style={[styles.smallBtnTxt, maxPriceLevel === pLevel && styles.smallBtnTxtActive]}>
                      {'$'.repeat(pLevel)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <Pressable
            onPress={() => void runSearch(true)}
            disabled={!city || !keyConfigured || loadingSearch}
            style={({ pressed }) => [
              styles.searchBtn,
              (!city || !keyConfigured || loadingSearch) && styles.searchBtnDisabled,
              pressed && !loadingSearch && { opacity: 0.92 },
            ]}>
            {loadingSearch ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="search" size={22} color="#fff" />
                <Text style={styles.searchBtnTxt}>Buscar</Text>
              </>
            )}
          </Pressable>
        </SectionCard>

        {viagemQ.isLoading ? (
          <ScreenState kind="loading" title="Carregando viagem..." />
        ) : hasSearched ? (
          <SectionCard>
            <Text style={styles.blockTitle}>Resultados ({results.length})</Text>
            {error ? <Text style={styles.err}>{error}</Text> : null}
            {results.map((place) => (
              <View key={place.id} style={styles.placeRow}>
                <View style={styles.placeMain}>
                  <Text style={styles.placeName}>{place.name}</Text>
                  <Text style={styles.placeAddr}>{place.address}</Text>
                  <Text style={styles.meta}>
                    {place.rating ? `⭐ ${place.rating.toFixed(1)}` : 'Sem avaliação'} ·{' '}
                    {place.priceLevel !== null ? '$'.repeat(Math.max(1, place.priceLevel)) : 'Preço n/d'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    if (place.mapsUri) void Linking.openURL(place.mapsUri);
                  }}
                  style={({ pressed }) => [styles.openBtn, pressed && { opacity: 0.85 }]}>
                  <MaterialIcons name="open-in-new" size={18} color={ViaColors.navy} />
                </Pressable>
              </View>
            ))}
            {!error && results.length === 0 && <Text style={styles.noData}>Nenhum resultado.</Text>}
            {nextPageToken ? (
              <Pressable
                onPress={() => void runSearch(false)}
                disabled={loadingMore}
                style={({ pressed }) => [styles.moreBtn, pressed && { opacity: 0.88 }]}>
                {loadingMore ? (
                  <ActivityIndicator color={ViaColors.navy} />
                ) : (
                  <Text style={styles.moreBtnTxt}>Carregar mais</Text>
                )}
              </Pressable>
            ) : null}
          </SectionCard>
        ) : (
          <SectionCard>
            <Text style={styles.placeholder}>
              Toque em <Text style={styles.placeholderBold}>Buscar</Text> para ver a lista. Repetir a mesma busca
              dentro do TTL usa cache e não chama a API de novo.
            </Text>
          </SectionCard>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ViaColors.background },
  sc: { padding: ViaSpacing.margin, gap: ViaSpacing.md },
  h1: { fontFamily: ViaFonts.bodySemi, fontSize: 17, color: ViaColors.navy, marginBottom: 4 },
  sub: { ...textBodySm, color: ViaColors.onSurfaceVariant },
  cfgNote: {
    ...textBodySm,
    color: ViaColors.outline,
    marginTop: ViaSpacing.sm,
    fontSize: 12,
    lineHeight: 17,
  },
  warn: {
    marginTop: ViaSpacing.sm,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: '#FFF8EA',
    borderRadius: ViaRadius.sm,
    padding: ViaSpacing.sm,
    borderWidth: 1,
    borderColor: '#F5D9A7',
  },
  warnTxt: { ...textBodySm, color: ViaColors.secondary, flex: 1 },
  blockTitle: { fontFamily: ViaFonts.bodySemi, fontSize: 16, color: ViaColors.navy, marginBottom: 6 },
  hint: { ...textBodySm, color: ViaColors.onSurfaceVariant, marginBottom: ViaSpacing.sm },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    borderRadius: ViaRadius.md,
    backgroundColor: '#F2F4F7',
    color: ViaColors.navy,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: ViaSpacing.sm,
    fontFamily: ViaFonts.body,
    fontSize: 14,
  },
  filterLabel: { ...textBodySm, color: ViaColors.onSurfaceVariant, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: ViaSpacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.14)',
    borderRadius: ViaRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: ViaColors.navy, borderColor: ViaColors.navy },
  chipTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 13, color: ViaColors.navy },
  chipTxtActive: { color: '#fff' },
  rowFilters: { flexDirection: 'row', gap: ViaSpacing.sm, marginBottom: ViaSpacing.md },
  filterBlock: { flex: 1, gap: 8 },
  rowBtns: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  smallBtn: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.14)',
    borderRadius: ViaRadius.sm,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  smallBtnActive: { backgroundColor: ViaColors.navy, borderColor: ViaColors.navy },
  smallBtnTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 12, color: ViaColors.navy },
  smallBtnTxtActive: { color: '#fff' },
  searchBtn: {
    marginTop: ViaSpacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ViaSpacing.sm,
    backgroundColor: ViaColors.navy,
    paddingVertical: ViaSpacing.md,
    borderRadius: ViaRadius.md,
  },
  searchBtnDisabled: { opacity: 0.45 },
  searchBtnTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 16, color: '#fff' },
  placeRow: {
    flexDirection: 'row',
    gap: ViaSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15,23,42,0.08)',
    paddingVertical: ViaSpacing.sm,
  },
  placeMain: { flex: 1, minWidth: 0 },
  placeName: { fontFamily: ViaFonts.bodySemi, fontSize: 15, color: ViaColors.navy },
  placeAddr: { ...textBodySm, color: ViaColors.onSurfaceVariant, marginTop: 2 },
  meta: { ...textBodySm, color: ViaColors.secondary, marginTop: 4 },
  openBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  noData: { ...textBodySm, color: ViaColors.onSurfaceVariant, fontStyle: 'italic' },
  err: { ...textBodySm, color: '#ba1a1a', marginBottom: ViaSpacing.sm },
  moreBtn: {
    marginTop: ViaSpacing.md,
    alignItems: 'center',
    paddingVertical: ViaSpacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.14)',
    borderRadius: ViaRadius.md,
    backgroundColor: '#fff',
  },
  moreBtnTxt: { fontFamily: ViaFonts.bodySemi, color: ViaColors.navy, fontSize: 15 },
  placeholder: { ...textBodySm, color: ViaColors.onSurfaceVariant, lineHeight: 20 },
  placeholderBold: { fontFamily: ViaFonts.bodySemi, color: ViaColors.navy },
});
