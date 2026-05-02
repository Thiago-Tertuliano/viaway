import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SectionCard } from '@/components/viaway/SectionCard';
import { HeaderWave } from '@/components/viaway/HeaderWave';
import {
  ViaColors,
  ViaFonts,
  ViaRadius,
  ViaShadows,
  ViaSpacing,
  textBody,
  textBodySm,
  textH2,
} from '@/constants/viaway-theme';
import { pickProfilePhotoDataUrl } from '@/lib/profile-photo';
import {
  getProfile,
  getUserData,
  logoutSession,
  saveUserData,
  type ViawayProfile,
} from '@/lib/session';
import { updateMe } from '@/lib/viaway-api';

const MENU_ROWS: Array<{
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  subtitle: string;
  action: 'notifications' | 'subscription' | 'help';
}> = [
  {
    icon: 'notifications-none',
    label: 'Notificações',
    subtitle: 'Lembretes de viagem, checklist e novidades',
    action: 'notifications',
  },
  {
    icon: 'workspace-premium',
    label: 'Assinatura',
    subtitle: 'Plano e benefícios',
    action: 'subscription',
  },
  {
    icon: 'help-outline',
    label: 'Ajuda',
    subtitle: 'Suporte e perguntas frequentes',
    action: 'help',
  },
];

const VIAGENS_ANO_LABEL: Record<ViawayProfile['viagensAno'], string> = {
  '1-2': '1 a 2 viagens por ano',
  '3-5': '3 a 5 viagens por ano',
  '6+': '6 ou mais por ano',
};

const DURACAO_LABEL: Record<ViawayProfile['duracaoMedia'], string> = {
  'fim-de-semana': 'Fins de semana',
  '3-7-dias': '3 a 7 dias',
  '8+-dias': '8 dias ou mais',
};

const ORCAMENTO_LABEL: Record<ViawayProfile['orcamentoFaixa'], string> = {
  economico: 'Econômico',
  moderado: 'Moderado',
  alto: 'Alto',
};

const ESTILO_LABEL: Record<ViawayProfile['estilo'], string> = {
  economico: 'Econômico',
  conforto: 'Conforto',
  premium: 'Premium',
};

const ACOMP_LABEL: Record<ViawayProfile['acompanhantes'], string> = {
  solo: 'Sozinho(a)',
  casal: 'Casal',
  familia: 'Família',
  grupo: 'Grupo',
};

const OBJETIVO_LABEL: Record<ViawayProfile['objetivo'], string> = {
  descanso: 'Descanso',
  aventura: 'Aventura',
  gastronomia: 'Gastronomia',
  misto: 'Misto',
};

function planoLabel(plano: string | undefined) {
  const p = (plano || 'free').toLowerCase();
  if (p === 'pro') return 'Viaway Pro';
  return 'Viaway Grátis';
}

function initials(nome: string) {
  const p = nome.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return '?';
  if (p.length === 1) return p[0]!.slice(0, 2).toUpperCase();
  return `${p[0]![0] ?? ''}${p[p.length - 1]![0] ?? ''}`.toUpperCase();
}

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ViawayProfile | null>(null);
  const [userApi, setUserApi] = useState<Awaited<ReturnType<typeof getUserData>>>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, u] = await Promise.all([getProfile(), getUserData()]);
      setProfile(p);
      setUserApi(u);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const displayNome = userApi?.nome || profile?.nome || 'Viajante';
  const displayEmail = userApi?.email || profile?.email || '—';

  const travelRows = useMemo(() => {
    if (!profile) return [];
    return [
      {
        icon: 'flight' as const,
        label: 'Frequência',
        value: VIAGENS_ANO_LABEL[profile.viagensAno],
        color: '#4F46E5',
        bg: '#EEF2FF',
      },
      {
        icon: 'date-range' as const,
        label: 'Duração média',
        value: DURACAO_LABEL[profile.duracaoMedia],
        color: '#0369A1',
        bg: '#F0F9FF',
      },
      {
        icon: 'savings' as const,
        label: 'Orçamento',
        value: ORCAMENTO_LABEL[profile.orcamentoFaixa],
        color: '#B45309',
        bg: '#FFFBEB',
      },
      {
        icon: 'hotel-class' as const,
        label: 'Estilo',
        value: ESTILO_LABEL[profile.estilo],
        color: '#7C3AED',
        bg: '#F5F3FF',
      },
      {
        icon: 'groups' as const,
        label: 'Quem viaja',
        value: ACOMP_LABEL[profile.acompanhantes],
        color: '#0D9488',
        bg: '#F0FDFA',
      },
      {
        icon: 'explore' as const,
        label: 'Objetivo',
        value: OBJETIVO_LABEL[profile.objetivo],
        color: ViaColors.coral,
        bg: '#FFF7ED',
      },
    ];
  }, [profile]);

  function onMenuRow(action: (typeof MENU_ROWS)[number]['action']) {
    if (action === 'notifications') {
      router.push('/notifications-settings');
      return;
    }
    if (action === 'subscription') {
      Alert.alert('Assinatura', `Seu plano atual: ${planoLabel(userApi?.plano)}. Upgrade em breve.`);
      return;
    }
    Alert.alert('Ajuda', 'Entre em contato com o suporte Viaway ou consulte a documentação do app.');
  }

  function openPhotoOptions() {
    Alert.alert('Foto do perfil', 'Escolha uma imagem da galeria ou remova a foto atual.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Galeria',
        onPress: () => void applyPickedPhoto(),
      },
      ...(userApi?.fotoUrl
        ? [
            {
              text: 'Remover foto',
              style: 'destructive' as const,
              onPress: () => void removeProfilePhoto(),
            },
          ]
        : []),
    ]);
  }

  async function applyPickedPhoto() {
    if (photoBusy) return;
    setPhotoBusy(true);
    try {
      const dataUrl = await pickProfilePhotoDataUrl();
      if (!dataUrl) return;
      const updated = await updateMe({ fotoUrl: dataUrl });
      const prevU = await getUserData();
      await saveUserData({
        id: updated.id,
        nome: updated.nome,
        email: updated.email,
        plano: updated.plano,
        fotoUrl: updated.fotoUrl,
        telefone: updated.telefone ?? prevU?.telefone ?? null,
      });
      setUserApi({
        id: updated.id,
        nome: updated.nome,
        email: updated.email,
        plano: updated.plano,
        fotoUrl: updated.fotoUrl,
        telefone: updated.telefone ?? prevU?.telefone ?? null,
      });
    } catch (e) {
      Alert.alert(
        'Foto',
        e instanceof Error ? e.message : 'Não foi possível atualizar a foto.',
      );
    } finally {
      setPhotoBusy(false);
    }
  }

  async function removeProfilePhoto() {
    if (photoBusy) return;
    setPhotoBusy(true);
    try {
      const updated = await updateMe({ fotoUrl: null });
      const prevU = await getUserData();
      await saveUserData({
        id: updated.id,
        nome: updated.nome,
        email: updated.email,
        plano: updated.plano,
        fotoUrl: updated.fotoUrl ?? null,
        telefone: updated.telefone ?? prevU?.telefone ?? null,
      });
      setUserApi({
        id: updated.id,
        nome: updated.nome,
        email: updated.email,
        plano: updated.plano,
        fotoUrl: updated.fotoUrl ?? null,
        telefone: updated.telefone ?? prevU?.telefone ?? null,
      });
    } catch (e) {
      Alert.alert(
        'Foto',
        e instanceof Error ? e.message : 'Não foi possível remover a foto.',
      );
    } finally {
      setPhotoBusy(false);
    }
  }

  function confirmLogout() {
    Alert.alert('Sair da conta', 'Você precisará entrar de novo para acessar suas viagens.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try {
            await logoutSession();
            router.replace('/auth');
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: 100 + insets.bottom }]}>
        <View style={[styles.simpleHeader, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.headerTitle}>Perfil</Text>
          <Text style={styles.headerSub}>Sua conta ViaWay</Text>
        </View>
        <HeaderWave />

        <View style={styles.scrollInner}>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={ViaColors.coral} />
              <Text style={styles.loadingTxt}>Carregando perfil…</Text>
            </View>
          ) : (
            <>
              <View style={styles.head}>
                <Pressable
                  onPress={openPhotoOptions}
                  disabled={photoBusy}
                  style={({ pressed }) => [styles.avatarWrap, pressed && { opacity: 0.92 }]}>
                  {userApi?.fotoUrl ? (
                    <Image source={{ uri: userApi.fotoUrl }} style={styles.bigAvatar} contentFit="cover" />
                  ) : (
                    <View style={[styles.bigAvatar, styles.avatarInitials]}>
                      <Text style={styles.avatarInitialsTxt}>{initials(displayNome)}</Text>
                    </View>
                  )}
                  <View style={styles.avatarCameraBadge}>
                    {photoBusy ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <MaterialIcons name="photo-camera" size={18} color="#fff" />
                    )}
                  </View>
                </Pressable>
                <Text style={styles.nome}>{displayNome}</Text>
                <View style={styles.emailRow}>
                  <MaterialIcons name="mail-outline" size={16} color={ViaColors.onSurfaceVariant} />
                  <Text style={styles.email}>{displayEmail}</Text>
                </View>
                <View style={styles.planChip}>
                  <MaterialIcons name="verified" size={14} color={ViaColors.onPrimary} />
                  <Text style={styles.planChipTxt}>{planoLabel(userApi?.plano)}</Text>
                </View>
              </View>

              {profile ? (
                <SectionCard>
                  <View style={styles.cardHead}>
                    <MaterialIcons name="luggage" size={22} color={ViaColors.navy} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>Perfil de viagem</Text>
                      <Text style={styles.cardSub}>Como você definiu no cadastro neste aparelho</Text>
                      <Pressable
                        onPress={() => router.push('/account-settings')}
                        style={({ pressed }) => [styles.editPill, styles.editPillSingle, pressed && { opacity: 0.88 }]}>
                        <MaterialIcons name="manage-accounts" size={16} color={ViaColors.coral} />
                        <Text style={styles.editPillTxt}>Conta e segurança</Text>
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.locationBanner}>
                    <MaterialIcons name="place" size={18} color="#0369A1" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.locLabel}>Base</Text>
                      <Text style={styles.locValue}>
                        {profile.cidade && profile.uf
                          ? `${profile.cidade} · ${profile.uf}`
                          : 'Não informado'}
                        {profile.pais ? ` · ${profile.pais}` : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.travelGrid}>
                    {travelRows.map((row) => (
                      <View
                        key={row.label}
                        style={[styles.travelTile, { borderLeftColor: row.color, backgroundColor: row.bg }]}>
                        <View style={[styles.travelIconCircle, { backgroundColor: row.color + '22' }]}>
                          <MaterialIcons name={row.icon} size={20} color={row.color} />
                        </View>
                        <Text style={styles.travelTileLabel}>{row.label}</Text>
                        <Text style={styles.travelTileValue}>{row.value}</Text>
                      </View>
                    ))}
                  </View>
                </SectionCard>
              ) : (
                <SectionCard>
                  <View style={styles.emptyProfile}>
                    <MaterialIcons name="badge" size={36} color={ViaColors.navy} />
                    <Text style={styles.emptyTitle}>Conta ativa</Text>
                    <Text style={styles.emptySub}>
                      Os dados do assistente de viagem ficam salvos neste aparelho quando você usa o cadastro
                      completo. Para nome, e-mail, telefone e senha, use Conta e segurança.
                    </Text>
                    <Pressable
                      onPress={() => router.push('/account-settings')}
                      style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}>
                      <MaterialIcons name="manage-accounts" size={18} color="#fff" />
                      <Text style={styles.primaryBtnTxt}>Conta e segurança</Text>
                    </Pressable>
                  </View>
                </SectionCard>
              )}

              {MENU_ROWS.map((r) => (
                <SectionCard key={r.label}>
                  <Pressable
                    onPress={() => onMenuRow(r.action)}
                    style={({ pressed }) => [styles.row, pressed && { backgroundColor: ViaColors.surfaceContainerLow }]}>
                    <View style={styles.rowIconWrap}>
                      <MaterialIcons name={r.icon} size={22} color={ViaColors.navy} />
                    </View>
                    <View style={styles.rowBody}>
                      <Text style={styles.rowText}>{r.label}</Text>
                      <Text style={styles.rowSub}>{r.subtitle}</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={22} color={ViaColors.outline} />
                  </Pressable>
                </SectionCard>
              ))}

              <Pressable
                onPress={confirmLogout}
                disabled={loggingOut}
                style={({ pressed }) => [
                  styles.logoutBtn,
                  pressed && { opacity: 0.88 },
                  loggingOut && { opacity: 0.6 },
                ]}>
                {loggingOut ? (
                  <ActivityIndicator color="#B91C1C" />
                ) : (
                  <>
                    <MaterialIcons name="logout" size={20} color="#B91C1C" />
                    <Text style={styles.logoutTxt}>Sair da conta</Text>
                  </>
                )}
              </Pressable>

              <Text style={styles.footerHint}>
                Onboarding e dados locais permanecem neste aparelho após sair; você só precisa entrar de novo.
              </Text>
            </>
          )}
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
  scrollInner: { paddingHorizontal: ViaSpacing.margin, paddingTop: ViaSpacing.lg, gap: ViaSpacing.md },
  loadingBox: { paddingVertical: 48, alignItems: 'center', gap: 12 },
  loadingTxt: { ...textBodySm, color: ViaColors.onSurfaceVariant },
  head: { alignItems: 'center', marginBottom: ViaSpacing.sm, gap: ViaSpacing.xs },
  avatarWrap: {
    position: 'relative',
    marginBottom: ViaSpacing.sm,
  },
  bigAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: ViaColors.surfaceContainerLow,
    borderWidth: 3,
    borderColor: 'rgba(226,209,179,0.6)',
  },
  avatarCameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: ViaColors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: ViaColors.background,
    ...ViaShadows.level1,
  },
  avatarInitials: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ViaColors.primaryContainer,
  },
  avatarInitialsTxt: {
    fontFamily: ViaFonts.h2,
    fontSize: 32,
    color: ViaColors.onPrimary,
    letterSpacing: -0.5,
  },
  nome: { ...textH2, fontSize: 22, color: ViaColors.navy },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12 },
  email: { ...textBodySm, color: ViaColors.onSurfaceVariant, flexShrink: 1 },
  planChip: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: ViaColors.primaryContainer,
  },
  planChipTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 12, color: ViaColors.onPrimary },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: ViaSpacing.md,
  },
  cardTitle: { fontFamily: ViaFonts.bodySemi, fontSize: 17, color: ViaColors.navy },
  cardSub: { ...textBodySm, color: ViaColors.onSurfaceVariant, marginTop: 2 },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(244,113,82,0.45)',
    backgroundColor: '#FFF7ED',
  },
  editPillSingle: { marginTop: 10, alignSelf: 'flex-start' },
  editPillTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 12, color: ViaColors.coral },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: ViaRadius.md,
    backgroundColor: '#F0F9FF',
    marginBottom: ViaSpacing.md,
    borderWidth: 1,
    borderColor: 'rgba(3,105,161,0.15)',
  },
  locLabel: { ...textBodySm, fontSize: 10, color: '#0369A1', textTransform: 'uppercase', letterSpacing: 0.5 },
  locValue: { fontFamily: ViaFonts.bodySemi, fontSize: 14, color: ViaColors.navy, marginTop: 2 },
  travelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  travelTile: {
    width: '47%',
    flexGrow: 1,
    minWidth: 140,
    borderRadius: ViaRadius.md,
    borderLeftWidth: 3,
    padding: 12,
    gap: 6,
    ...ViaShadows.level1,
  },
  travelIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  travelTileLabel: { fontFamily: ViaFonts.body, fontSize: 10, color: '#6B7280', textTransform: 'uppercase' },
  travelTileValue: { fontFamily: ViaFonts.bodySemi, fontSize: 14, color: ViaColors.navy, lineHeight: 18 },
  emptyProfile: { alignItems: 'center', paddingVertical: ViaSpacing.lg, gap: 12 },
  emptyTitle: { ...textH2, fontSize: 17, color: ViaColors.navy, textAlign: 'center' },
  emptySub: { ...textBody, color: ViaColors.onSurfaceVariant, textAlign: 'center', lineHeight: 22, paddingHorizontal: 8 },
  primaryBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ViaColors.navy,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: ViaRadius.full,
  },
  primaryBtnTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 15, color: '#fff' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ViaSpacing.sm,
    paddingVertical: 6,
    borderRadius: ViaRadius.sm,
  },
  rowIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: ViaColors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, minWidth: 0, gap: 2 },
  rowText: { ...textBody, color: ViaColors.navy, fontSize: 16 },
  rowSub: { ...textBodySm, color: ViaColors.onSurfaceVariant, fontSize: 13, lineHeight: 18 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: ViaRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(185,28,28,0.35)',
    backgroundColor: '#FEF2F2',
  },
  logoutTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 15, color: '#B91C1C' },
  footerHint: {
    ...textBodySm,
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: ViaSpacing.md,
  },
});
