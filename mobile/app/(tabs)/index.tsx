import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/viaway/AppHeader';
import { EmptyTripsState } from '@/components/viaway/EmptyTripsState';
import { useMenu } from '@/context/menu-context';
import { ApiException } from '@/lib/api-client';
import { listViagens, type ViagemJson } from '@/lib/viaway-api';
import { ViaColors, ViaFonts, ViaRadius, ViaShadows, ViaSpacing, textBodySm, textH2 } from '@/constants/viaway-theme';

type Row = ViagemJson & { destaqueEmAndamento?: boolean };

function useViagensQ() {
  return useQuery({
    queryKey: ['viagens'] as const,
    queryFn: async () => (await listViagens(1)).data,
  });
}

export default function InicioScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const menu = useMenu();
  const qClient = useQueryClient();
  const q = useViagensQ();
  const rows: Row[] = (q.data ?? []) as Row[];

  return (
    <View style={styles.root}>
      <AppHeader
        onMenuPress={() => menu.open()}
        showAvatar
      />
      {q.isLoading ? (
        <View style={styles.c}>
          <ActivityIndicator size="large" color={ViaColors.coral} />
        </View>
      ) : q.isError && q.error instanceof ApiException && q.error.status === 401 ? (
        <View style={[styles.body, { paddingBottom: 100 + insets.bottom }]}>
          <Text style={styles.errT}>A API exige autenticação.</Text>
          <Text style={styles.errS}>
            Em desenvolvimento, inicie o backend com DISABLE_AUTH=true ou configure Clerk no
            app e a URL (localhost vs 10.0.2.2 no Android) em .env
          </Text>
        </View>
      ) : q.isError ? (
        <View style={[styles.body, { paddingBottom: 100 + insets.bottom }]}>
          <Text style={styles.errT}>{(q.error as Error).message}</Text>
          <Pressable
            onPress={() => void qClient.invalidateQueries({ queryKey: ['viagens'] })}
            style={({ pressed }) => [styles.retry, pressed && { opacity: 0.88 }]}>
            <Text style={styles.retryT}>Tentar de novo</Text>
          </Pressable>
        </View>
      ) : rows.length === 0 ? (
        <View
          style={[
            styles.body,
            { paddingBottom: 100 + insets.bottom, paddingTop: ViaSpacing.lg },
          ]}>
          <EmptyTripsState onCreatePress={() => router.push('/criar-viagem')} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(i) => i.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: 100 + insets.bottom, paddingTop: ViaSpacing.md },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={q.isFetching}
              onRefresh={() => void qClient.invalidateQueries({ queryKey: ['viagens'] })}
            />
          }
          renderItem={({ item: v }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/trip/[id]', params: { id: v.id } })}
              style={({ pressed }) => [styles.trip, pressed && { opacity: 0.94 }]}>
              <View style={styles.tripTop}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  {v.destaqueEmAndamento && <Text style={styles.badge}>em andamento</Text>}
                  <Text style={styles.tit}>{v.nome}</Text>
                  <Text style={styles.sub}>{v.destinoPrincipal}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={28} color={ViaColors.navy} />
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ViaColors.background },
  c: { flex: 1, justifyContent: 'center' },
  body: { flex: 1, paddingHorizontal: ViaSpacing.margin },
  list: { paddingHorizontal: ViaSpacing.margin, gap: ViaSpacing.md },
  errT: { fontFamily: ViaFonts.bodySemi, color: '#ba1a1a', marginBottom: ViaSpacing.md },
  errS: { fontFamily: ViaFonts.body, color: ViaColors.onSurfaceVariant, lineHeight: 20 },
  retry: {
    alignSelf: 'flex-start',
    marginTop: ViaSpacing.lg,
    backgroundColor: ViaColors.primaryContainer,
    paddingVertical: 12,
    paddingHorizontal: ViaSpacing.lg,
    borderRadius: 999,
  },
  retryT: { color: ViaColors.onPrimary, fontFamily: ViaFonts.bodySemi, fontSize: 15 },
  trip: {
    backgroundColor: ViaColors.surfaceWhite,
    borderRadius: ViaRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(226,209,179,0.35)',
    ...ViaShadows.level1,
    padding: ViaSpacing.md,
  },
  tripTop: { flexDirection: 'row', alignItems: 'center' },
  badge: {
    fontSize: 11,
    fontFamily: ViaFonts.label,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.6,
    color: ViaColors.coral,
    marginBottom: 4,
  },
  tit: { ...textH2, color: ViaColors.navy, fontSize: 20, marginBottom: 4 },
  sub: { ...textBodySm, color: ViaColors.onSurfaceVariant },
});
