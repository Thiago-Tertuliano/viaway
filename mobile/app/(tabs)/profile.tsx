import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SectionCard } from '@/components/viaway/SectionCard';
import { HeaderWave } from '@/components/viaway/HeaderWave';
import { ViaColors, ViaFonts, ViaSpacing, textBody, textBodySm, textH2 } from '@/constants/viaway-theme';
import { getProfile } from '@/lib/session';

const AVATAR =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop';

const rows = [
  { icon: 'notifications-none' as const, label: 'Notificações', subtitle: 'Preferências de alertas e lembretes' },
  { icon: 'credit-card' as const, label: 'Assinatura', subtitle: 'Plano atual e benefícios ativos' },
  { icon: 'help-outline' as const, label: 'Ajuda', subtitle: 'Suporte e central de perguntas' },
];

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const [nome, setNome] = useState('Viajante');
  const [email, setEmail] = useState('cadastre seu perfil');
  const [plano] = useState('Plano Grátis');
  const [base, setBase] = useState<{ cidade: string; uf: string; objetivo: string } | null>(null);

  useEffect(() => {
    let active = true;
    void getProfile().then((profile) => {
      if (!active || !profile) return;
      setNome(profile.nome || 'Viajante');
      setEmail(profile.email || 'cadastre seu perfil');
      setBase({
        cidade: profile.cidade,
        uf: profile.uf,
        objetivo: profile.objetivo,
      });
    });
    return () => {
      active = false;
    };
  }, []);

  const objetivoLabel = useMemo(() => {
    if (!base?.objetivo) return 'misto';
    if (base.objetivo === 'descanso') return 'descanso';
    if (base.objetivo === 'aventura') return 'aventura';
    if (base.objetivo === 'gastronomia') return 'gastronomia';
    return 'misto';
  }, [base?.objetivo]);

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: 100 + insets.bottom }]}>

        {/* header inside scroll */}
        <View style={[styles.simpleHeader, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.headerTitle}>Perfil</Text>
          <Text style={styles.headerSub}>Sua conta Viaway</Text>
        </View>
        <HeaderWave />

        <View style={styles.scrollInner}>
          <Text style={styles.sectionTitle}>Sua conta</Text>
          <View style={styles.head}>
            <Image source={{ uri: AVATAR }} style={styles.bigAvatar} contentFit="cover" />
            <Text style={styles.nome}>{nome}</Text>
            <Text style={styles.email}>{email}</Text>
            <View style={styles.planChip}>
              <Text style={styles.planChipTxt}>{plano}</Text>
            </View>
          </View>

          <SectionCard>
            <Text style={styles.metaTitle}>Perfil de viagem</Text>
            <View style={styles.metaWrap}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Base</Text>
                <Text style={styles.metaValue}>
                  {base?.cidade && base.uf ? `${base.cidade} · ${base.uf}` : 'não informado'}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Objetivo</Text>
                <Text style={styles.metaValue}>{objetivoLabel}</Text>
              </View>
            </View>
          </SectionCard>

          {rows.map((r) => (
            <SectionCard key={r.label}>
              <Pressable
                onPress={() => {}}
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: ViaColors.surfaceContainerLow }]}>
                <MaterialIcons name={r.icon} size={22} color={ViaColors.navy} />
                <View style={styles.rowBody}>
                  <Text style={styles.rowText}>{r.label}</Text>
                  <Text style={styles.rowSub}>{r.subtitle}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={ViaColors.sand} />
              </Pressable>
            </SectionCard>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ViaColors.background },
  simpleHeader: {
    backgroundColor: ViaColors.navy,
    paddingHorizontal: ViaSpacing.margin,
    paddingBottom: 20,
    gap: 4,
  },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 28, color: '#FFFFFF', letterSpacing: -0.5 },
  headerSub: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  scroll: { gap: 0 },
  scrollInner: { paddingHorizontal: ViaSpacing.margin, paddingTop: ViaSpacing.lg, gap: ViaSpacing.sm },
  sectionTitle: { ...textH2, color: ViaColors.navy, marginBottom: ViaSpacing.md },
  head: { alignItems: 'center', marginBottom: ViaSpacing.lg, gap: ViaSpacing.xs },
  bigAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: ViaSpacing.sm,
    backgroundColor: ViaColors.surfaceContainerLow,
  },
  nome: { ...textH2, color: ViaColors.navy },
  email: { ...textBodySm, color: ViaColors.onSurfaceVariant },
  planChip: {
    marginTop: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: ViaColors.primaryContainer,
  },
  planChipTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 12, color: ViaColors.onPrimary },
  metaTitle: { fontFamily: ViaFonts.bodySemi, fontSize: 16, color: ViaColors.navy, marginBottom: 12 },
  metaWrap: { gap: ViaSpacing.sm },
  metaItem: {
    borderWidth: 1,
    borderColor: 'rgba(226,209,179,0.6)',
    borderRadius: 12,
    backgroundColor: ViaColors.surfaceWhite,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metaLabel: { fontFamily: ViaFonts.body, fontSize: 12, color: ViaColors.outline, textTransform: 'uppercase' },
  metaValue: { fontFamily: ViaFonts.bodySemi, fontSize: 14, color: ViaColors.navy, marginTop: 2, textTransform: 'capitalize' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ViaSpacing.md,
    paddingVertical: 10,
  },
  rowBody: { flex: 1, minWidth: 0, gap: 2 },
  rowText: { ...textBody, color: ViaColors.navy, fontSize: 16 },
  rowSub: { ...textBodySm, color: ViaColors.onSurfaceVariant, fontSize: 13 },
});
