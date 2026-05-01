import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderWave } from '@/components/viaway/HeaderWave';
import { listViagens, type ViagemJson } from '@/lib/viaway-api';
import { ViaColors, ViaFonts, ViaShadows, ViaSpacing } from '@/constants/viaway-theme';

const CATEGORIAS = [
  { icon: 'flight' as const,              label: 'Passagens',    valor: 'R$ 2.340',  cor: '#3B82F6', bg: '#EFF6FF' },
  { icon: 'hotel' as const,               label: 'Hospedagem',   valor: 'R$ 1.180',  cor: '#8B5CF6', bg: '#F5F3FF' },
  { icon: 'restaurant' as const,          label: 'Alimentação',  valor: 'R$ 620',    cor: '#F59E0B', bg: '#FFFBEB' },
  { icon: 'directions-car' as const,      label: 'Transporte',   valor: 'R$ 390',    cor: '#10B981', bg: '#ECFDF5' },
  { icon: 'local-activity' as const,      label: 'Atrações',     valor: 'R$ 280',    cor: '#EF4444', bg: '#FEF2F2' },
  { icon: 'shopping-bag' as const,        label: 'Compras',      valor: 'R$ 150',    cor: '#EC4899', bg: '#FDF2F8' },
];

const TRANSACOES = [
  { label: 'Passagem TAM — GRU→LIS', data: '18 mai', valor: '-R$ 1.840', tipo: 'saida' },
  { label: 'Hotel Lisboa Oriente',    data: '18 mai', valor: '-R$ 540',   tipo: 'saida' },
  { label: 'Reembolso seguro viagem', data: '15 mai', valor: '+R$ 230',   tipo: 'entrada' },
  { label: 'Restaurante A Cevicheria',data: '12 mai', valor: '-R$ 98',    tipo: 'saida' },
  { label: 'Uber Aeroporto',          data: '10 mai', valor: '-R$ 62',    tipo: 'saida' },
];

const TOTAL = 'R$ 4.960';
const ORCAMENTO = 'R$ 6.000';
const PROGRESSO = 0.827;

export default function GastosScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const q = useQuery({
    queryKey: ['viagens'] as const,
    queryFn: async () => (await listViagens(1)).data,
  });
  const rows = (q.data ?? []) as ViagemJson[];
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const selectedTrip = useMemo(
    () => rows.find((v) => v.id === selectedTripId) ?? null,
    [rows, selectedTripId],
  );

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

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}>

        {/* Header inside scroll */}
        <View style={[s.header, { paddingTop: insets.top + 12 }]}>
          <Text style={s.headerTitle}>Gastos</Text>
          <Text style={s.headerSub}>Controle financeiro das viagens</Text>
          <View style={s.budgetCard}>
            <View style={s.budgetRow}>
              <View>
                <Text style={s.budgetLabel}>Total gasto</Text>
                <Text style={s.budgetValor}>{TOTAL}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.budgetLabel}>Orçamento</Text>
                <Text style={s.budgetOrc}>{ORCAMENTO}</Text>
              </View>
            </View>
            <View style={s.barTrack}>
              <View style={[s.barFill, { width: `${PROGRESSO * 100}%` as any }]} />
            </View>
            <Text style={s.barLabel}>{Math.round(PROGRESSO * 100)}% do orçamento utilizado</Text>
          </View>
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
                        style={[
                          s.tripChip,
                          on ? s.tripChipOn : null,
                        ]}>
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
                    ? `Viagem selecionada: ${selectedTrip.nome}`
                    : 'Selecione uma viagem para abrir os lançamentos.'}
                </Text>
              </>
            )}
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>Por categoria</Text>
            <View style={s.grid}>
              {CATEGORIAS.map((c) => (
                <Pressable
                  key={c.label}
                  style={({ pressed }) => [s.catCard, { backgroundColor: c.bg }, pressed && { opacity: 0.8 }]}>
                  <View style={[s.catIcon, { backgroundColor: c.cor + '20' }]}>
                    <MaterialIcons name={c.icon} size={20} color={c.cor} />
                  </View>
                  <Text style={s.catLabel}>{c.label}</Text>
                  <Text style={[s.catValor, { color: c.cor }]}>{c.valor}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={s.section}>
            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>Recentes</Text>
              <Pressable
                onPress={() => {
                  openTripGastos();
                }}>
                <Text style={s.seeAll}>Ver todas</Text>
              </Pressable>
            </View>
            <View style={s.transCard}>
              {TRANSACOES.map((t, i) => (
                <View key={t.label} style={[s.transRow, i < TRANSACOES.length - 1 && s.transBorder]}>
                  <View style={[s.transIcon, { backgroundColor: t.tipo === 'entrada' ? '#DCFCE7' : '#FEE2E2' }]}>
                    <MaterialIcons
                      name={t.tipo === 'entrada' ? 'arrow-downward' : 'arrow-upward'}
                      size={16}
                      color={t.tipo === 'entrada' ? '#16A34A' : '#DC2626'}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.transLabel} numberOfLines={1}>{t.label}</Text>
                    <Text style={s.transData}>{t.data}</Text>
                  </View>
                  <Text style={[s.transValor, { color: t.tipo === 'entrada' ? '#16A34A' : ViaColors.navy }]}>
                    {t.valor}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={s.section}>
            <Pressable
              onPress={openTripGastos}
              style={({ pressed }) => [
                s.ctaBtn,
                pressed && { opacity: 0.85 },
                !selectedTrip && rows.length > 0 ? s.ctaDisabled : null,
              ]}>
              <MaterialIcons name="add-circle-outline" size={20} color="#FFFFFF" />
              <Text style={s.ctaBtnTxt}>Registrar novo gasto</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    gap: 10,
  },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  budgetLabel: { fontFamily: ViaFonts.body, fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 0.4 },
  budgetValor: { fontFamily: ViaFonts.h1, fontSize: 26, color: '#FFFFFF', letterSpacing: -0.5, marginTop: 2 },
  budgetOrc: { fontFamily: ViaFonts.h3, fontSize: 18, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  barTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: ViaColors.coral, borderRadius: 3 },
  barLabel: { fontFamily: ViaFonts.body, fontSize: 11, color: 'rgba(255,255,255,0.4)' },

  scroll: { paddingTop: 20, gap: 20 },
  bodyWrap: { paddingTop: 20, gap: 20 },
  section: { paddingHorizontal: ViaSpacing.margin, gap: 12 },
  helperText: { fontFamily: ViaFonts.body, fontSize: 12, color: '#6B7280' },
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

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catCard: {
    width: '47%',
    borderRadius: 16,
    padding: 14,
    gap: 8,
    ...ViaShadows.level1,
  },
  catIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  catLabel: { fontFamily: ViaFonts.body, fontSize: 12, color: '#6B7280' },
  catValor: { fontFamily: ViaFonts.h3, fontSize: 15, letterSpacing: -0.2 },

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
  transLabel: { fontFamily: ViaFonts.bodySemi, fontSize: 13, color: ViaColors.navy },
  transData: { fontFamily: ViaFonts.body, fontSize: 11, color: '#9CA3AF' },
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
});
