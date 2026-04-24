import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/viaway/AppHeader';
import { ScreenState } from '@/components/viaway/ScreenState';
import { SectionCard } from '@/components/viaway/SectionCard';
import { listAtividades, listDias } from '@/lib/viaway-api';
import { formatDateBr } from '@/lib/format';
import {
  ViaColors,
  ViaRadius,
  ViaShadows,
  ViaSpacing,
  textBody,
  textBodySm,
  textH3,
  textLabel,
} from '@/constants/viaway-theme';

export default function ItinerarioViagemScreen() {
  const p = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(p.id) ? p.id[0] : p.id;
  const insets = useSafeAreaInsets();
  const qClient = useQueryClient();
  const diasQ = useQuery({
    queryKey: ['dias', id!] as const,
    queryFn: () => listDias(id!),
    enabled: Boolean(id),
  });
  return (
    <View style={styles.root}>
      <AppHeader left="back" showAvatar={false} title="Itinerário" />
      {diasQ.isLoading ? (
        <ScreenState kind="loading" title="Carregando itinerário..." />
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.sc,
            { paddingBottom: insets.bottom + ViaSpacing.xl },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={diasQ.isFetching}
              onRefresh={() => {
                if (id) {
                  void qClient.invalidateQueries({ queryKey: ['dias', id] });
                }
              }}
            />
          }>
          {diasQ.isError && (
            <Text style={styles.e}>Não foi possível carregar os dias.</Text>
          )}
          {(diasQ.data ?? [])
            .sort((a, b) => a.ordem - b.ordem)
            .map((dia) => <DiaBloco key={dia.id} dia={dia} />)}
          {diasQ.isSuccess && (diasQ.data?.length ?? 0) === 0 && (
            <ScreenState
              kind="empty"
              title="Nenhum dia planejado"
              subtitle="Adicione dias e atividades para montar seu roteiro."
            />
          )}
        </ScrollView>
      )}
    </View>
  );
}

function DiaBloco({ dia }: { dia: { id: string; data: string; ordem: number; resumoDia: string | null } }) {
  const q = useQuery({
    queryKey: ['atividades', dia.id] as const,
    queryFn: () => listAtividades(dia.id),
  });
  return (
    <View style={styles.diaBox}>
      <View style={styles.diaRow}>
        <View style={styles.dot} />
        <View style={styles.h}>
          <Text style={styles.kb}>Dia {dia.ordem}</Text>
          <Text style={styles.h2}>{formatDateBr(dia.data) ?? dia.data}</Text>
          {dia.resumoDia && <Text style={styles.s}>{dia.resumoDia}</Text>}
        </View>
      </View>
      {q.isLoading && <ActivityIndicator color={ViaColors.coral} style={{ marginVertical: 8 }} />}
      {q.isSuccess &&
        (q.data ?? []).map((a) => (
          <SectionCard key={a.id}>
          <Pressable style={({ pressed }) => [styles.a, pressed && { opacity: 0.92 }]}>
            <View style={styles.badge}>
              <Text style={styles.tipo}>{a.tipo}</Text>
            </View>
            <Text style={styles.an}>{a.nome}</Text>
            <View style={styles.mrow}>
              {a.horarioInicio && (
                <View style={styles.mi}>
                  <MaterialIcons name="schedule" size={14} color={ViaColors.outline} />
                  <Text style={styles.ms}>{a.horarioInicio}</Text>
                </View>
              )}
              <View style={styles.mi}>
                <MaterialIcons name="info-outline" size={14} color={ViaColors.outline} />
                <Text style={styles.ms}>{a.status}</Text>
              </View>
            </View>
          </Pressable>
          </SectionCard>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ViaColors.background },
  sc: { padding: ViaSpacing.margin, gap: ViaSpacing.lg },
  e: { color: '#ba1a1a' },
  empty: { ...textBody, color: ViaColors.onSurfaceVariant },
  diaBox: { marginBottom: ViaSpacing.lg },
  diaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: ViaSpacing.md, marginBottom: ViaSpacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: ViaColors.coral, marginTop: 6 },
  h: { flex: 1, marginBottom: ViaSpacing.md },
  kb: { ...textLabel, color: ViaColors.coral, marginBottom: 2 },
  h2: { ...textH3, color: ViaColors.navy },
  s: { ...textBodySm, marginTop: 4, color: ViaColors.onSurfaceVariant },
  a: { paddingVertical: ViaSpacing.xs, marginLeft: 22, marginBottom: ViaSpacing.sm },
  badge: { marginBottom: 4 },
  tipo: { ...textLabel, color: ViaColors.navy, fontSize: 10, alignSelf: 'flex-start' },
  an: { fontFamily: textH3.fontFamily, fontSize: 17, color: ViaColors.onSurface },
  mrow: { flexDirection: 'row', gap: 12, marginTop: 6, flexWrap: 'wrap' },
  mi: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ms: { ...textBodySm, color: ViaColors.onSurfaceVariant },
});
