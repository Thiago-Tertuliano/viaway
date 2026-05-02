import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SectionCard } from '@/components/viaway/SectionCard';
import { ViaColors, ViaFonts, ViaRadius, ViaSpacing } from '@/constants/viaway-theme';
import { getProfile, saveProfile, type ViawayProfile } from '@/lib/session';

type IconOpt<T extends string> = { id: T; label: string; sub: string; icon: string };

function IconOptionGrid<T extends string>({
  options,
  value,
  onChange,
}: {
  options: IconOpt<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={s.iconGrid}>
      {options.map((o) => {
        const on = value === o.id;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            style={[s.iconCard, on && s.iconCardOn]}>
            <View style={[s.iconBadge, on && s.iconBadgeOn]}>
              <MaterialIcons
                name={o.icon as keyof typeof MaterialIcons.glyphMap}
                size={20}
                color={on ? '#fff' : ViaColors.onSurfaceVariant}
              />
            </View>
            <Text style={[s.iconCardLabel, on && s.iconCardLabelOn]}>{o.label}</Text>
            <Text style={[s.iconCardSub, on && s.iconCardSubOn]} numberOfLines={2}>
              {o.sub}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TravelPreferencesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [base, setBase] = useState<ViawayProfile | null>(null);

  const [viagensAno, setViagensAno] = useState<ViawayProfile['viagensAno']>('1-2');
  const [duracaoMedia, setDuracaoMedia] = useState<ViawayProfile['duracaoMedia']>('3-7-dias');
  const [orcamentoFaixa, setOrcamentoFaixa] = useState<ViawayProfile['orcamentoFaixa']>('moderado');
  const [estilo, setEstilo] = useState<ViawayProfile['estilo']>('conforto');
  const [acompanhantes, setAcompanhantes] = useState<ViawayProfile['acompanhantes']>('casal');
  const [objetivo, setObjetivo] = useState<ViawayProfile['objetivo']>('misto');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await getProfile();
      if (!p) {
        router.back();
        return;
      }
      setBase(p);
      setViagensAno(p.viagensAno);
      setDuracaoMedia(p.duracaoMedia);
      setOrcamentoFaixa(p.orcamentoFaixa);
      setEstilo(p.estilo);
      setAcompanhantes(p.acompanhantes);
      setObjetivo(p.objetivo);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function salvar() {
    if (!base || saving) return;
    setSaving(true);
    try {
      await saveProfile({
        ...base,
        viagensAno,
        duracaoMedia,
        orcamentoFaixa,
        estilo,
        acompanhantes,
        objetivo,
      });
      Alert.alert('Salvo', 'Preferências de viagem atualizadas.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert(
        'Erro',
        e instanceof Error ? e.message : 'Não foi possível salvar.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>
          Preferências
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={ViaColors.coral} />
        </View>
      ) : !base ? null : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}>
          <Text style={styles.lead}>
            Ajuste como o ViaWay entende seu estilo de viajar. Nome, e-mail e senha ficam em Conta e
            segurança.
          </Text>

          <SectionCard>
            <Text style={styles.sectionLabel}>Frequência de viagens</Text>
            <IconOptionGrid
              options={[
                { id: '1-2', label: '1–2 / ano', sub: 'Viajante ocasional', icon: 'luggage' },
                { id: '3-5', label: '3–5 / ano', sub: 'Viajante frequente', icon: 'flight-takeoff' },
                { id: '6+', label: '6+ / ano', sub: 'Nômade digital', icon: 'public' },
              ]}
              value={viagensAno}
              onChange={setViagensAno}
            />
          </SectionCard>

          <SectionCard>
            <Text style={styles.sectionLabel}>Duração média</Text>
            <IconOptionGrid
              options={[
                {
                  id: 'fim-de-semana',
                  label: 'Fim de semana',
                  sub: 'Saídas curtas',
                  icon: 'weekend',
                },
                { id: '3-7-dias', label: '3 a 7 dias', sub: 'Férias curtas', icon: 'date-range' },
                { id: '8+-dias', label: '8+ dias', sub: 'Viagens longas', icon: 'flight' },
              ]}
              value={duracaoMedia}
              onChange={setDuracaoMedia}
            />
          </SectionCard>

          <SectionCard>
            <Text style={styles.sectionLabel}>Faixa de orçamento</Text>
            <IconOptionGrid
              options={[
                { id: 'economico', label: 'Econômico', sub: 'Melhor custo', icon: 'savings' },
                { id: 'moderado', label: 'Moderado', sub: 'Conforto acessível', icon: 'account-balance-wallet' },
                { id: 'alto', label: 'Premium', sub: 'Experiência completa', icon: 'workspace-premium' },
              ]}
              value={orcamentoFaixa}
              onChange={setOrcamentoFaixa}
            />
          </SectionCard>

          <SectionCard>
            <Text style={styles.sectionLabel}>Estilo de hospedagem</Text>
            <IconOptionGrid
              options={[
                { id: 'economico', label: 'Econômico', sub: 'Hostel, airbnb', icon: 'roofing' },
                { id: 'conforto', label: 'Conforto', sub: 'Hotel 3–4★', icon: 'hotel' },
                { id: 'premium', label: 'Premium', sub: 'Resort, 5★', icon: 'star' },
              ]}
              value={estilo}
              onChange={setEstilo}
            />
          </SectionCard>

          <SectionCard>
            <Text style={styles.sectionLabel}>Quem viaja com você?</Text>
            <IconOptionGrid
              options={[
                { id: 'solo', label: 'Solo', sub: 'Liberdade total', icon: 'person' },
                { id: 'casal', label: 'Casal', sub: 'Duas pessoas', icon: 'favorite' },
                { id: 'familia', label: 'Família', sub: 'Com crianças', icon: 'family-restroom' },
                { id: 'grupo', label: 'Grupo', sub: '3+ pessoas', icon: 'groups' },
              ]}
              value={acompanhantes}
              onChange={setAcompanhantes}
            />
          </SectionCard>

          <SectionCard>
            <Text style={styles.sectionLabel}>Foco da viagem</Text>
            <IconOptionGrid
              options={[
                { id: 'descanso', label: 'Descanso', sub: 'Relaxar', icon: 'spa' },
                { id: 'aventura', label: 'Aventura', sub: 'Trilhas', icon: 'terrain' },
                { id: 'gastronomia', label: 'Gastronomia', sub: 'Sabores', icon: 'restaurant' },
                { id: 'misto', label: 'Misto', sub: 'Um pouco de tudo', icon: 'explore' },
              ]}
              value={objetivo}
              onChange={setObjetivo}
            />
          </SectionCard>

          <Pressable
            onPress={() => void salvar()}
            disabled={saving}
            style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.9 }, saving && { opacity: 0.6 }]}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnTxt}>Salvar preferências</Text>
            )}
          </Pressable>

        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconCard: {
    width: '47.5%',
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.12)',
    borderRadius: 14,
    padding: 12,
    gap: 6,
    backgroundColor: '#fff',
  },
  iconCardOn: { borderColor: ViaColors.navy, backgroundColor: '#EEF0F7' },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(15,23,42,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeOn: { backgroundColor: ViaColors.navy },
  iconCardLabel: { fontFamily: ViaFonts.bodySemi, fontSize: 14, color: ViaColors.navy, marginTop: 2 },
  iconCardLabelOn: { color: ViaColors.navy },
  iconCardSub: { fontFamily: ViaFonts.body, fontSize: 11, color: ViaColors.onSurfaceVariant, lineHeight: 14 },
  iconCardSubOn: { color: ViaColors.onSurfaceVariant },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ViaColors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ViaSpacing.margin,
    paddingBottom: 14,
    backgroundColor: ViaColors.navy,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontFamily: ViaFonts.h3, fontSize: 17, color: '#fff' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: ViaSpacing.margin, paddingTop: ViaSpacing.lg, gap: ViaSpacing.md },
  lead: {
    fontFamily: ViaFonts.body,
    fontSize: 14,
    color: ViaColors.onSurfaceVariant,
    lineHeight: 20,
  },
  sectionLabel: {
    fontFamily: ViaFonts.bodySemi,
    fontSize: 13,
    color: ViaColors.navy,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  saveBtn: {
    backgroundColor: ViaColors.navy,
    borderRadius: ViaRadius.full,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: ViaSpacing.sm,
  },
  saveBtnTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 16, color: '#fff' },
});
