import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  ImageStyle,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryCtaButton } from '@/components/viaway/PrimaryCtaButton';
import { SectionCard } from '@/components/viaway/SectionCard';
import { ViaColors, ViaFonts, ViaSpacing, textBody, textH2 } from '@/constants/viaway-theme';
import { brazilCityFlagUrls, brazilStateFlagUrl } from '@/lib/brasil-bandeiras';
import { formatCep, lookupCep } from '@/lib/brasil-cep';
import {
  saveLocalPassword,
  saveProfile,
  saveTokens,
  saveUserData,
  setAuthDone,
  type ViawayProfile,
} from '@/lib/session';
import { cadastro, updateMe } from '@/lib/viaway-api';

type Opt<T extends string> = { id: T; label: string };

const V_ano: Opt<ViawayProfile['viagensAno']>[] = [
  { id: '1-2', label: '1 a 2 viagens' },
  { id: '3-5', label: '3 a 5 viagens' },
  { id: '6+', label: '6 ou mais' },
];
const V_estilo: Opt<ViawayProfile['estilo']>[] = [
  { id: 'economico', label: 'Econômico' },
  { id: 'conforto', label: 'Conforto' },
  { id: 'premium', label: 'Premium' },
];
const V_acomp: Opt<ViawayProfile['acompanhantes']>[] = [
  { id: 'solo', label: 'Solo' },
  { id: 'casal', label: 'Casal' },
  { id: 'familia', label: 'Família' },
  { id: 'grupo', label: 'Grupo' },
];
const V_obj: Opt<ViawayProfile['objetivo']>[] = [
  { id: 'descanso', label: 'Descanso' },
  { id: 'aventura', label: 'Aventura' },
  { id: 'gastronomia', label: 'Gastronomia' },
  { id: 'misto', label: 'Misto' },
];
const V_orcamento: Opt<ViawayProfile['orcamentoFaixa']>[] = [
  { id: 'economico', label: 'Econômico' },
  { id: 'moderado', label: 'Moderado' },
  { id: 'alto', label: 'Alto' },
];

const FLAG_BR = 'https://flagcdn.com/w80/br.png';

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// ── Icon Input ───────────────────────────────────────────────────────────────
function IconInput({
  icon,
  label,
  right,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  icon: string;
  label: string;
  right?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={ii.block}>
      <Text style={ii.label}>{label}</Text>
      <View style={[ii.shell, focused && ii.shellFocused]}>
        <MaterialIcons
          name={icon as any}
          size={18}
          color={focused ? ViaColors.navy : ViaColors.onSurfaceVariant}
          style={{ marginRight: 10 }}
        />
        <TextInput
          {...props}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e)  => { setFocused(false); props.onBlur?.(e); }}
          placeholderTextColor="#C2C2C2"
          style={ii.input}
        />
        {right}
      </View>
    </View>
  );
}
const ii = StyleSheet.create({
  block: { gap: 6 },
  label: { fontFamily: ViaFonts.bodySemi, fontSize: 12, color: ViaColors.outline, letterSpacing: 0.5, textTransform: 'uppercase' },
  shell: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1.5,
    borderColor: '#E2D1B3', paddingHorizontal: 14, minHeight: 50,
  },
  shellFocused: { backgroundColor: '#fff', borderColor: ViaColors.navy },
  input: { flex: 1, fontFamily: ViaFonts.body, fontSize: 15, color: ViaColors.onSurface, paddingVertical: 0 },
});

// ── Wave Progress ─────────────────────────────────────────────────────────────
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
// Onda menor = mais ondas visíveis no espaço = movimento mais perceptível
const WAVE_PERIOD = 160;
const WAVE_H = 18;

function buildWave(w: number, h: number, amp: number, phase: number): string {
  const steps = 200;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * w;
    const y = h * 0.42 - Math.sin(((i / steps) * Math.PI * 2) + phase) * amp;
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`);
  }
  pts.push(`L${w},${h} L0,${h} Z`);
  return pts.join(' ');
}

// Duas ondas com períodos diferentes para criar interferência (efeito líquido)
const WAVE_A = buildWave(WAVE_PERIOD * 2, WAVE_H, 4.5, 0);
const WAVE_B = buildWave(WAVE_PERIOD * 2, WAVE_H, 3.2, Math.PI * 0.75);

function WaveProgress({ progress, totalSteps, step }: { progress: number; totalSteps: number; step: number }) {
  const trackW = SCREEN_W - ViaSpacing.margin * 2;
  const fillW = (progress / 100) * trackW;

  // Dois animadores independentes em velocidades diferentes → interferência real
  const waveAnimA = useRef(new Animated.Value(0)).current;
  const waveAnimB = useRef(new Animated.Value(0)).current;
  const fillAnim  = useRef(new Animated.Value(fillW)).current;

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: fillW,
      duration: 580,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, [fillW]);

  useEffect(() => {
    const loopA = Animated.loop(
      Animated.timing(waveAnimA, { toValue: 1, duration: 3200, useNativeDriver: true, easing: Easing.linear })
    );
    const loopB = Animated.loop(
      Animated.timing(waveAnimB, { toValue: 1, duration: 5000, useNativeDriver: true, easing: Easing.linear })
    );
    loopA.start();
    loopB.start();
    return () => { loopA.stop(); loopB.stop(); };
  }, []);

  // Deve mover exatamente 1 largura de SVG (= 1 ciclo completo) para loop sem salto
  const waveXA = waveAnimA.interpolate({ inputRange: [0, 1], outputRange: [0, -(WAVE_PERIOD * 2)] });
  const waveXB = waveAnimB.interpolate({ inputRange: [0, 1], outputRange: [0, -(WAVE_PERIOD * 2)] });
  const planeX  = fillAnim.interpolate({ inputRange: [0, trackW], outputRange: [0, trackW - 22] });

  return (
    <View style={waveStyles.wrap}>
      <View style={[waveStyles.track, { width: trackW }]}>
        {/* Base tint */}
        <Animated.View style={[waveStyles.baseFill, { width: fillAnim }]} />

        {/* Clip pelo fill width */}
        <Animated.View style={[waveStyles.waveClip, { width: fillAnim }]}>
          {/* Onda traseira — mais lenta, mais transparente */}
          <Animated.View style={[waveStyles.waveRow, { transform: [{ translateX: waveXB }] }]}>
            <Svg width={WAVE_PERIOD * 2} height={WAVE_H}>
              <Path d={WAVE_B} fill="rgba(15,23,42,0.30)" />
            </Svg>
            <Svg width={WAVE_PERIOD * 2} height={WAVE_H}>
              <Path d={WAVE_B} fill="rgba(15,23,42,0.30)" />
            </Svg>
          </Animated.View>
          {/* Onda frontal — rápida, sólida */}
          <Animated.View style={[waveStyles.waveRow, StyleSheet.absoluteFillObject, { transform: [{ translateX: waveXA }] }]}>
            <Svg width={WAVE_PERIOD * 2} height={WAVE_H}>
              <Path d={WAVE_A} fill="#0F172A" />
            </Svg>
            <Svg width={WAVE_PERIOD * 2} height={WAVE_H}>
              <Path d={WAVE_A} fill="#0F172A" />
            </Svg>
          </Animated.View>
        </Animated.View>
      </View>

      {/* Avião */}
      <Animated.View style={[waveStyles.plane, { transform: [{ translateX: planeX }] }]}>
        <MaterialIcons name="flight-takeoff" size={18} color="#E2D1B3" />
      </Animated.View>

      {/* Dots de etapa */}
      <View style={[waveStyles.dotsRow, { width: trackW }]}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View key={i} style={[waveStyles.dot, i <= step && waveStyles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const waveStyles = StyleSheet.create({
  wrap: { gap: 10 },
  track: {
    height: WAVE_H,
    borderRadius: WAVE_H / 2,
    backgroundColor: 'rgba(15,23,42,0.08)',
    overflow: 'hidden',
  },
  baseFill: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.10)',
  },
  waveClip: {
    position: 'absolute',
    left: 0, top: 0,
    height: WAVE_H,
    overflow: 'hidden',
  },
  waveRow: {
    flexDirection: 'row',
    top: 0,
    left: 0,
  },
  plane: {
    position: 'absolute',
    top: -(18 - WAVE_H) / 2 - 1,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginTop: 2,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(15,23,42,0.15)',
  },
  dotActive: {
    backgroundColor: ViaColors.navy,
  },
});

function FlagStrip({ sources, style }: { sources: string[]; style: ImageStyle }) {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const attemptRef = useRef(0);
  const [failed, setFailed] = useState(false);
  const key = sources.join('|');
  useEffect(() => {
    attemptRef.current = 0;
    setFailed(false);
  }, [key]);

  if (!sources.length || failed) {
    return <View style={[style, styles.flagPlaceholder]} />;
  }
  const i = Math.min(attemptRef.current, sources.length - 1);
  const uri = sources[i]!;

  return (
    <Image
      key={`${key}-${i}`}
      source={{ uri }}
      style={style}
      contentFit="cover"
      onError={() => {
        attemptRef.current += 1;
        if (attemptRef.current >= sources.length) setFailed(true);
        else rerender();
      }}
    />
  );
}

function FlagLocationRow({
  label,
  value,
  onChangeText,
  flagSources,
  keyboardType,
  maxLength,
  placeholder,
  flagFrame,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  flagSources: string[];
  keyboardType?: 'default' | 'number-pad' | 'email-address' | 'phone-pad';
  maxLength?: number;
  placeholder?: string;
  /** `pill` = cidade (destaque); `state` = UF; `country` = país */
  flagFrame?: 'pill' | 'state' | 'country';
}) {
  const frame = flagFrame ?? 'state';
  const imgStyle = [styles.flagImg, frame === 'pill' && styles.flagImgPill, frame === 'country' && styles.flagImgCountry];
  return (
    <View style={styles.flagRow}>
      <FlagStrip sources={flagSources} style={StyleSheet.flatten(imgStyle) as ImageStyle} />
      <View style={styles.flagRowBody}>
        <Text style={styles.flagRowLabel}>{label}</Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={ViaColors.onSurfaceVariant}
          style={styles.flagRowInput}
          keyboardType={keyboardType}
          maxLength={maxLength}
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
        />
      </View>
    </View>
  );
}

export default function RegisterIntentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [pais, setPais] = useState('Brasil');
  const [cepError, setCepError] = useState<string | null>(null);
  const [isLookingUpCep, setIsLookingUpCep] = useState(false);
  const [viagensAno, setViagensAno] = useState<ViawayProfile['viagensAno']>('1-2');
  const [duracaoMedia] = useState<ViawayProfile['duracaoMedia']>('3-7-dias');
  const [orcamentoFaixa, setOrcamentoFaixa] = useState<ViawayProfile['orcamentoFaixa']>('moderado');
  const [estilo, setEstilo] = useState<ViawayProfile['estilo']>('conforto');
  const [acompanhantes, setAcompanhantes] = useState<ViawayProfile['acompanhantes']>('casal');
  const [objetivo, setObjetivo] = useState<ViawayProfile['objetivo']>('misto');
  const [step, setStep] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [submittingRegister, setSubmittingRegister] = useState(false);

  // ── Finish animation refs ────────────────────────────────────────────────
  const progressBarRef = useRef<View>(null);
  // left/top em pixels absolutos — useNativeDriver: false
  const planeLeft    = useRef(new Animated.Value(0)).current;
  const planeTop     = useRef(new Animated.Value(0)).current;
  const planeScale   = useRef(new Animated.Value(1)).current;
  const planeOpacity = useRef(new Animated.Value(1)).current;
  // círculo coral que expande para cobrir a tela
  const coralScale   = useRef(new Animated.Value(0)).current;
  // tela de sucesso
  const successSlide = useRef(new Animated.Value(SCREEN_W)).current;
  const successFade  = useRef(new Animated.Value(0)).current;

  const totalSteps = 4;
  const canNext = useMemo(() => {
    if (step === 0) {
      return (
        nome.trim().length > 1 &&
        email.trim().includes('@') &&
        telefone.replace(/\D/g, '').length >= 10 &&
        senha.length >= 6 &&
        senha === confirmarSenha
      );
    }
    if (step === 1) {
      return (
        cep.replace(/\D/g, '').length === 8 &&
        cidade.trim().length > 1 &&
        uf.trim().length === 2 &&
        pais.trim().length > 1
      );
    }
    return true;
  }, [step, nome, email, senha, confirmarSenha, telefone, cep, cidade, uf, pais]);

  const cityFlagSources = useMemo(() => brazilCityFlagUrls(cidade, uf), [cidade, uf]);
  const stateFlagSources = useMemo(() => {
    const u = brazilStateFlagUrl(uf);
    return u ? [u] : [];
  }, [uf]);

  const progress = ((step + 1) / totalSteps) * 100;

  const stepTitle = useMemo(() => {
    if (step === 0) return 'Dados principais';
    if (step === 1) return 'CEP e localização';
    if (step === 2) return 'Ritmo e estilo';
    return 'Perfil de viagem';
  }, [step]);

  const stepSubtitle = useMemo(() => {
    if (step === 0) return 'Dados de acesso, contato e nome para sua conta no app.';
    if (step === 1) return 'Consulte o CEP e confira cidade, estado e país.';
    if (step === 2) return 'Frequência, orçamento e estilo de experiência.';
    return 'Finalize com o seu perfil de experiência.';
  }, [step]);

  async function handleLookupCep() {
    try {
      setCepError(null);
      setIsLookingUpCep(true);
      const result = await lookupCep(cep);
      setCep(result.cep);
      setLogradouro(result.logradouro);
      setBairro(result.bairro);
      setCidade(result.localidade);
      setUf(result.uf);
      setPais('Brasil');
      Keyboard.dismiss();
    } catch (err) {
      setCepError(err instanceof Error ? err.message : 'Falha ao consultar CEP.');
    } finally {
      setIsLookingUpCep(false);
    }
  }

  async function persistRegistration(): Promise<void> {
    const result = await cadastro(nome.trim(), email.trim(), senha);
    await saveTokens(result.accessToken, result.refreshToken);
    let usuarioApi = result.usuario;
    if (telefone.replace(/\D/g, '').length >= 10) {
      try {
        const u = await updateMe({ telefone: telefone.trim() });
        usuarioApi = {
          id: u.id,
          nome: u.nome,
          email: u.email,
          plano: u.plano,
          fotoUrl: u.fotoUrl,
          telefone: u.telefone ?? null,
        };
      } catch {
        /* telefone opcional no primeiro sync */
      }
    }
    await saveUserData(usuarioApi);
    await saveLocalPassword(senha);
    await saveProfile({
      nome: nome.trim(), email: email.trim(), telefone: telefone.trim(),
      cep: formatCep(cep), logradouro: logradouro.trim(), numero: '',
      bairro: bairro.trim(), cidade: cidade.trim(),
      uf: uf.trim().toUpperCase(), pais: pais.trim(),
      viagensAno, duracaoMedia, orcamentoFaixa, estilo, acompanhantes, objetivo,
    });
    await setAuthDone();
  }

  async function handleFinish() {
    if (!canNext || submittingRegister) return;
    setFirstName(nome.trim().split(' ')[0] ?? nome.trim());
    Keyboard.dismiss();

    setSubmittingRegister(true);
    try {
      await persistRegistration();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Não foi possível criar a conta. Tente novamente.';
      Alert.alert('Cadastro', msg);
      setSubmittingRegister(false);
      return;
    }
    setSubmittingRegister(false);

    progressBarRef.current?.measure((_fx, _fy, trackWidth, _h, pageX, pageY) => {
      // Posição inicial = avião no canto direito da barra (progresso 100%)
      const startX = pageX + trackWidth - 26;
      const startY = pageY + 2;
      const cx = SCREEN_W / 2;   // centro horizontal da tela
      const cy = SCREEN_H / 2;   // centro vertical da tela
      // Raio do círculo coral — cobre toda a tela a partir do centro
      const CORAL_R = Math.sqrt(cx * cx + cy * cy) * 2.2;

      // Reseta valores
      planeLeft.setValue(startX);
      planeTop.setValue(startY);
      planeScale.setValue(1);
      planeOpacity.setValue(1);
      coralScale.setValue(0);
      successSlide.setValue(SCREEN_W);
      successFade.setValue(0);

      setFinishing(true);

      const ND = false; // tudo sem native driver (position absoluta)
      Animated.sequence([
        // Fase 1 — voa para a direita, crescendo
        Animated.parallel([
          Animated.timing(planeLeft,  { toValue: SCREEN_W - 10, duration: 800, useNativeDriver: ND, easing: Easing.inOut(Easing.quad) }),
          Animated.timing(planeTop,   { toValue: startY - SCREEN_H * 0.18, duration: 800, useNativeDriver: ND, easing: Easing.out(Easing.quad) }),
          Animated.timing(planeScale, { toValue: 2.0, duration: 800, useNativeDriver: ND }),
        ]),
        // Fase 2 — vira e voa para o centro/esquerda, crescendo mais
        Animated.parallel([
          Animated.timing(planeLeft,  { toValue: cx - 30, duration: 900, useNativeDriver: ND, easing: Easing.inOut(Easing.cubic) }),
          Animated.timing(planeTop,   { toValue: cy - 30, duration: 900, useNativeDriver: ND, easing: Easing.inOut(Easing.cubic) }),
          Animated.timing(planeScale, { toValue: 5.0, duration: 900, useNativeDriver: ND }),
        ]),
        // Fase 3 — círculo coral expande do centro cobrindo tela + avião some
        Animated.parallel([
          Animated.timing(coralScale,   { toValue: 1, duration: 750, useNativeDriver: ND, easing: Easing.out(Easing.cubic) }),
          Animated.timing(planeOpacity, { toValue: 0, duration: 350, useNativeDriver: ND }),
        ]),
        // Fase 4 — tela de sucesso desliza da direita
        Animated.parallel([
          Animated.timing(successSlide, { toValue: 0, duration: 780, useNativeDriver: ND, easing: Easing.out(Easing.cubic) }),
          Animated.timing(successFade,  { toValue: 1, duration: 500, useNativeDriver: ND }),
        ]),
      ]).start();

      // Guarda raio para usar no estilo
      _coralRRef.current = CORAL_R;
      _coralCXRef.current = cx;
      _coralCYRef.current = cy;
    });
  }

  // refs auxiliares para posição do círculo coral (não precisa de re-render)
  const _coralRRef  = useRef(SCREEN_W * 1.5);
  const _coralCXRef = useRef(SCREEN_W / 2);
  const _coralCYRef = useRef(SCREEN_H / 2);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 12) }]}
      behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <View style={styles.topChip}>
            <Text style={styles.topChipText}>perfil inteligente viaway</Text>
          </View>
          <Text style={styles.stepCounter}>
            Etapa {step + 1} de {totalSteps}
          </Text>
          <View ref={progressBarRef} collapsable={false}>
            <WaveProgress progress={progress} totalSteps={totalSteps} step={step} />
          </View>
          <Text style={styles.title}>Cadastro inteligente</Text>
          <Text style={styles.subtitle}>Uma etapa por vez para personalizar sua experiência.</Text>
        </View>

        <SectionCard>
          <View style={styles.stepCard}>
          <Text style={styles.qTitle}>{stepTitle}</Text>
          <Text style={styles.qSubtitle}>{stepSubtitle}</Text>

          {step === 0 ? (
            <View style={styles.sectionWrap}>
              <IconInput
                icon="person-outline"
                label="Nome completo"
                placeholder="Digite seu nome"
                value={nome}
                onChangeText={setNome}
                autoCapitalize="words"
                returnKeyType="next"
              />
              <IconInput
                icon="mail-outline"
                label="E-mail"
                placeholder="seuemail@exemplo.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
              <IconInput
                icon="lock-outline"
                label="Senha"
                placeholder="Mínimo 6 caracteres"
                value={senha}
                onChangeText={setSenha}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                returnKeyType="next"
              />
              <View>
                <IconInput
                  icon="lock-outline"
                  label="Confirmar senha"
                  placeholder="Repita a senha"
                  value={confirmarSenha}
                  onChangeText={setConfirmarSenha}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  returnKeyType="next"
                />
                {confirmarSenha.length > 0 && senha !== confirmarSenha ? (
                  <Text style={[styles.errorText, { marginTop: 4 }]}>As senhas não coincidem.</Text>
                ) : null}
              </View>
              <IconInput
                icon="smartphone"
                label="Telefone"
                placeholder="(11) 99999-9999"
                value={telefone}
                onChangeText={(v) => setTelefone(formatPhone(v))}
                keyboardType="phone-pad"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                maxLength={15}
              />
            </View>
          ) : null}

          {step === 1 ? (
            <View style={styles.sectionWrap}>
              <View style={styles.sectionBlock}>
                <IconInput
                  icon="location-on"
                  label="CEP"
                  placeholder="00000-000"
                  value={cep}
                  onChangeText={(v) => { setCep(formatCep(v)); setCepError(null); }}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleLookupCep}
                  maxLength={9}
                  right={
                    <Pressable
                      onPress={handleLookupCep}
                      disabled={isLookingUpCep || cep.replace(/\D/g, '').length !== 8}
                      style={[styles.cepInlineBtn, (isLookingUpCep || cep.replace(/\D/g, '').length !== 8) && styles.cepButtonDisabled]}>
                      {isLookingUpCep
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <MaterialIcons name="search" size={18} color="#fff" />}
                    </Pressable>
                  }
                />
                {cepError ? <Text style={styles.errorText}>{cepError}</Text> : null}
              </View>

              <View style={styles.sectionBlock}>
                <View style={styles.locationHeader}>
                  <MaterialIcons name="map" size={15} color={ViaColors.outline} />
                  <Text style={styles.sectionLabel}>Localização</Text>
                </View>
                <View style={styles.locationCard}>
                  <FlagLocationRow
                    label="Cidade"
                    value={cidade}
                    onChangeText={setCidade}
                    flagSources={cityFlagSources}
                    placeholder="Cidade"
                    flagFrame="pill"
                  />
                  <View style={styles.flagDivider} />
                  <FlagLocationRow
                    label="Estado (UF)"
                    value={uf}
                    onChangeText={(v) => setUf(v.toUpperCase())}
                    flagSources={stateFlagSources}
                    maxLength={2}
                    placeholder="UF"
                    flagFrame="state"
                  />
                  <View style={styles.flagDivider} />
                  <FlagLocationRow
                    label="País"
                    value={pais}
                    onChangeText={setPais}
                    flagSources={[FLAG_BR]}
                    placeholder="País"
                    flagFrame="country"
                  />
                </View>
              </View>
            </View>
          ) : null}

          {step === 2 ? (
            <View style={styles.sectionWrap}>
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Frequência de viagens</Text>
                <IconOptionGrid
                  options={[
                    { id: '1-2', label: '1–2 / ano', sub: 'Viajante ocasional', icon: 'luggage' },
                    { id: '3-5', label: '3–5 / ano', sub: 'Viajante frequente', icon: 'flight-takeoff' },
                    { id: '6+',  label: '6+ / ano',  sub: 'Nômade digital',    icon: 'public' },
                  ]}
                  value={viagensAno}
                  onChange={setViagensAno}
                />
              </View>
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Faixa de orçamento</Text>
                <IconOptionGrid
                  options={[
                    { id: 'economico', label: 'Econômico', sub: 'Melhor custo-benefício', icon: 'savings' },
                    { id: 'moderado',  label: 'Moderado',  sub: 'Conforto acessível',    icon: 'account-balance-wallet' },
                    { id: 'alto',      label: 'Premium',   sub: 'Experiência completa',  icon: 'workspace-premium' },
                  ]}
                  value={orcamentoFaixa}
                  onChange={setOrcamentoFaixa}
                />
              </View>
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Estilo de hospedagem</Text>
                <IconOptionGrid
                  options={[
                    { id: 'economico', label: 'Econômico', sub: 'Hostel, airbnb simples', icon: 'roofing' },
                    { id: 'conforto',  label: 'Conforto',  sub: 'Hotel 3–4 estrelas',    icon: 'hotel' },
                    { id: 'premium',   label: 'Premium',   sub: 'Resort, 5 estrelas',    icon: 'star' },
                  ]}
                  value={estilo}
                  onChange={setEstilo}
                />
              </View>
            </View>
          ) : null}

          {step === 3 ? (
            <View style={styles.sectionWrap}>
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Quem viaja com você?</Text>
                <IconOptionGrid
                  options={[
                    { id: 'solo',    label: 'Solo',    sub: 'Liberdade total',    icon: 'person' },
                    { id: 'casal',   label: 'Casal',   sub: 'Duas pessoas',       icon: 'favorite' },
                    { id: 'familia', label: 'Família', sub: 'Com crianças',       icon: 'family-restroom' },
                    { id: 'grupo',   label: 'Grupo',   sub: '3 pessoas ou mais',  icon: 'groups' },
                  ]}
                  value={acompanhantes}
                  onChange={setAcompanhantes}
                />
              </View>
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Foco principal da viagem</Text>
                <IconOptionGrid
                  options={[
                    { id: 'descanso',    label: 'Descanso',    sub: 'Relaxar e recarregar', icon: 'spa' },
                    { id: 'aventura',    label: 'Aventura',    sub: 'Trilhas e emoção',     icon: 'terrain' },
                    { id: 'gastronomia', label: 'Gastronomia', sub: 'Sabores locais',       icon: 'restaurant' },
                    { id: 'misto',       label: 'Misto',       sub: 'Um pouco de tudo',    icon: 'explore' },
                  ]}
                  value={objetivo}
                  onChange={setObjetivo}
                />
              </View>
              {/* Resumo visual */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <MaterialIcons name="flight-takeoff" size={15} color={ViaColors.navy} />
                  <Text style={styles.summaryLine}>{V_ano.find(o => o.id === viagensAno)?.label} · {V_orcamento.find(o => o.id === orcamentoFaixa)?.label}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <MaterialIcons name="hotel" size={15} color={ViaColors.navy} />
                  <Text style={styles.summaryLine}>{V_estilo.find(o => o.id === estilo)?.label} · {V_acomp.find(o => o.id === acompanhantes)?.label}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <MaterialIcons name="explore" size={15} color={ViaColors.navy} />
                  <Text style={styles.summaryLine}>Foco em {V_obj.find(o => o.id === objetivo)?.label.toLowerCase()}</Text>
                </View>
                <Text style={styles.summaryHint}>Seu perfil será usado para personalizar roteiros e sugestões.</Text>
              </View>
            </View>
          ) : null}
          </View>
        </SectionCard>
      </ScrollView>

      <View style={[styles.navRow, { marginBottom: insets.bottom + 10 }]}>
        <Pressable
          onPress={() => step === 0 ? router.replace('/auth') : setStep((s) => s - 1)}
          style={styles.navButton}>
          <Text style={styles.navButtonText}>Voltar</Text>
        </Pressable>

        {step < totalSteps - 1 ? (
          <View style={styles.ctaWrap}>
            <PrimaryCtaButton
              label="Continuar"
              icon={null}
              onPress={() => {
                if (!canNext) return;
                setStep((s) => Math.min(totalSteps - 1, s + 1));
              }}
            />
          </View>
        ) : (
          <View style={styles.ctaWrap}>
            <PrimaryCtaButton
              label={submittingRegister ? 'Criando conta…' : 'Finalizar e entrar'}
              icon={null}
              onPress={() => void handleFinish()}
              disabled={submittingRegister}
            />
          </View>
        )}
      </View>
      {/* ── Overlay de transição ── */}
      {finishing ? (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">

          {/* Avião animado em posição absoluta */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: planeLeft,
              top:  planeTop,
              opacity: planeOpacity,
              transform: [{ scale: planeScale }],
            }}>
            <MaterialIcons name="flight-takeoff" size={40} color={ViaColors.navy} />
          </Animated.View>

          {/* Círculo coral que expande do centro cobrindo toda a tela */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width:  _coralRRef.current * 2,
              height: _coralRRef.current * 2,
              borderRadius: _coralRRef.current,
              backgroundColor: ViaColors.navy,
              left: _coralCXRef.current - _coralRRef.current,
              top:  _coralCYRef.current - _coralRRef.current,
              transform: [{ scale: coralScale }],
            }}
          />

          {/* Tela de sucesso — desliza da direita sobre o coral */}
          <Animated.View style={[
            StyleSheet.absoluteFillObject,
            finish.successScreen,
            { transform: [{ translateX: successSlide }], opacity: successFade },
          ]}>
            <View style={[finish.successInner, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
              <View style={finish.iconWrap}>
                <MaterialIcons name="flight-takeoff" size={56} color={ViaColors.navy} />
              </View>

              <Text style={finish.tag}>viaway</Text>
              <Text style={finish.headline}>Decolagem confirmada!</Text>
              <Text style={finish.sub}>
                Tudo pronto,{' '}
                <Text style={{ color: ViaColors.navy, fontFamily: ViaFonts.h3 }}>{firstName}</Text>.{'\n'}
                Seu perfil foi criado com sucesso.
              </Text>

              <View style={finish.divider} />

              <View style={finish.checkList}>
                {[
                  { icon: 'check-circle', text: 'Perfil inteligente configurado' },
                  { icon: 'check-circle', text: 'Preferências de viagem salvas' },
                  { icon: 'check-circle', text: 'Roteiros personalizados liberados' },
                ].map((item) => (
                  <View key={item.text} style={finish.checkRow}>
                    <MaterialIcons name={item.icon as any} size={18} color={ViaColors.navy} />
                    <Text style={finish.checkText}>{item.text}</Text>
                  </View>
                ))}
              </View>

              <Pressable
                style={finish.ctaBtn}
                onPress={() => router.replace('/(tabs)')}>
                <MaterialIcons name="flight-takeoff" size={18} color="#fff" />
                <Text style={finish.ctaLabel}>Começar a viajar</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function OptionRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Opt<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.optionList}>
      {options.map((o) => (
        <Pressable
          key={o.id}
          onPress={() => onChange(o.id)}
          style={[styles.optionCard, value === o.id && styles.optionCardOn]}>
          <Text style={[styles.optTxt, value === o.id && styles.optTxtOn]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

type IconOpt<T extends string> = Opt<T> & { sub: string; icon: string };

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
    <View style={styles.iconGrid}>
      {options.map((o) => {
        const on = value === o.id;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            style={[styles.iconCard, on && styles.iconCardOn]}>
            <View style={[styles.iconBadge, on && styles.iconBadgeOn]}>
              <MaterialIcons
                name={o.icon as any}
                size={20}
                color={on ? '#fff' : ViaColors.onSurfaceVariant}
              />
            </View>
            <Text style={[styles.iconCardLabel, on && styles.iconCardLabelOn]}>{o.label}</Text>
            <Text style={[styles.iconCardSub, on && styles.iconCardSubOn]} numberOfLines={2}>{o.sub}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ViaColors.background, paddingHorizontal: ViaSpacing.margin, gap: ViaSpacing.md },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: ViaSpacing.lg, gap: ViaSpacing.md },
  top: { gap: 10 },
  topChip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.16)',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  topChipText: {
    fontFamily: ViaFonts.bodySemi,
    fontSize: 10,
    letterSpacing: 1.2,
    color: ViaColors.navy,
    textTransform: 'uppercase',
  },
  stepCounter: {
    fontFamily: ViaFonts.bodySemi,
    fontSize: 12,
    letterSpacing: 0.4,
    color: ViaColors.secondary,
    textTransform: 'uppercase',
  },
  title: { ...textH2, color: ViaColors.navy, marginTop: 2 },
  subtitle: { ...textBody, color: ViaColors.onSurfaceVariant, marginBottom: 2 },
  stepCard: { gap: 14, paddingVertical: 18 },
  sectionWrap: { gap: 10 },
  sectionBlock: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#ffffff',
    gap: 10,
  },
  sectionLabel: {
    fontFamily: ViaFonts.bodySemi,
    fontSize: 12,
    color: ViaColors.outline,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  inputPremium: {
    fontFamily: ViaFonts.body,
    fontSize: 16,
    color: ViaColors.onSurface,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.18)',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  locationCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(226,209,179,0.55)',
    overflow: 'hidden',
    backgroundColor: ViaColors.surface,
  },
  flagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  flagImg: {
    width: 40,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    backgroundColor: ViaColors.surfaceWhite,
  },
  flagImgPill: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,107,90,0.45)',
  },
  flagImgCountry: {
    borderWidth: 2,
    borderColor: 'rgba(15,23,42,0.12)',
  },
  flagPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ViaColors.surfaceContainerLow,
    borderColor: 'rgba(15,23,42,0.1)',
  },
  flagRowBody: { flex: 1, gap: 4 },
  flagRowLabel: {
    fontFamily: ViaFonts.bodySemi,
    fontSize: 11,
    color: ViaColors.outline,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  flagRowInput: {
    fontFamily: ViaFonts.body,
    fontSize: 16,
    color: ViaColors.onSurface,
    borderWidth: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
    minHeight: 22,
  },
  flagDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(15,23,42,0.08)',
    marginLeft: 64,
  },
  qTitle: { fontFamily: ViaFonts.h3, fontSize: 22, color: ViaColors.navy, lineHeight: 28 },
  qSubtitle: { fontFamily: ViaFonts.body, fontSize: 14, color: ViaColors.onSurfaceVariant, lineHeight: 20 },
  optionList: { gap: 10 },
  optionCard: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  optionCardOn: { backgroundColor: '#EEF0F7', borderColor: ViaColors.navy },
  optTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 14, color: ViaColors.onSurfaceVariant },
  optTxtOn: { color: ViaColors.navy },
  cepInlineBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: ViaColors.navy,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 6,
  },
  cepButtonDisabled: { opacity: 0.45 },
  locationHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  errorText: {
    fontFamily: ViaFonts.body,
    fontSize: 12,
    color: '#ba1a1a',
  },
  summaryText: {
    fontFamily: ViaFonts.body,
    fontSize: 14,
    color: ViaColors.onSurfaceVariant,
    lineHeight: 20,
  },
  // Icon grid
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconCard: {
    width: '47.5%',
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.12)',
    borderRadius: 14,
    padding: 12,
    gap: 6,
    backgroundColor: '#fff',
  },
  iconCardOn: {
    borderColor: ViaColors.navy,
    backgroundColor: '#EEF0F7',
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(15,23,42,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeOn: {
    backgroundColor: ViaColors.navy,
  },
  iconCardLabel: {
    fontFamily: ViaFonts.bodySemi,
    fontSize: 14,
    color: ViaColors.navy,
    marginTop: 2,
  },
  iconCardLabelOn: {
    color: ViaColors.navy,
  },
  iconCardSub: {
    fontFamily: ViaFonts.body,
    fontSize: 11,
    color: ViaColors.onSurfaceVariant,
    lineHeight: 15,
  },
  iconCardSubOn: {
    color: ViaColors.onSurfaceVariant,
  },
  // Resumo
  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2D1B3',
    backgroundColor: '#F2E0C2',
    padding: 14,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryLine: {
    fontFamily: ViaFonts.bodySemi,
    fontSize: 13,
    color: ViaColors.navy,
  },
  summaryHint: {
    fontFamily: ViaFonts.body,
    fontSize: 12,
    color: ViaColors.onSurfaceVariant,
    marginTop: 4,
    lineHeight: 17,
  },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 'auto' },
  navButton: {
    minHeight: 50,
    minWidth: 96,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 18,
  },
  navButtonText: { fontFamily: ViaFonts.bodySemi, fontSize: 14, color: ViaColors.navy },
  navButtonTextDisabled: { color: ViaColors.outline },
  ctaWrap: { flex: 1 },
});

// ── Finish overlay styles ─────────────────────────────────────────────────────
const finish = StyleSheet.create({
  successScreen: {
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  successInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 12,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: '#fff6f3',
    borderWidth: 1.5,
    borderColor: 'rgba(244,113,82,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tag: {
    fontFamily: ViaFonts.h2,
    fontSize: 13,
    letterSpacing: 2,
    color: ViaColors.outline,
    textTransform: 'uppercase',
  },
  headline: {
    fontFamily: ViaFonts.h1,
    fontSize: 30,
    letterSpacing: -0.5,
    color: ViaColors.navy,
    textAlign: 'center',
    lineHeight: 36,
  },
  sub: {
    fontFamily: ViaFonts.body,
    fontSize: 15,
    color: ViaColors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
  },
  divider: {
    width: 40,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(244,113,82,0.3)',
    marginVertical: 8,
  },
  checkList: { gap: 10, width: '100%' },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  checkText: {
    fontFamily: ViaFonts.bodySemi,
    fontSize: 14,
    color: ViaColors.navy,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: ViaColors.navy,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    width: '100%',
    marginTop: 8,
  },
  ctaLabel: {
    fontFamily: ViaFonts.bodySemi,
    fontSize: 16,
    color: '#fff',
    letterSpacing: 0.2,
  },
});

