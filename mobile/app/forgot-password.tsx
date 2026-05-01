import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Defs, LinearGradient as SvgGrad, Rect, Stop } from 'react-native-svg';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ViaColors, ViaFonts, ViaSpacing } from '@/constants/viaway-theme';
import { getLocalPassword, getProfile, saveLocalPassword } from '@/lib/session';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1488085061387-422e29b40080?auto=format&fit=crop&w=3840&q=100';

type Step = 'email' | 'reset' | 'done';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [newFocused, setNewFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Animação de transição entre steps
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(1)).current;

  function animateStep(next: Step) {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -24, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      slideAnim.setValue(24);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 300, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      ]).start();
    });
  }

  async function handleVerifyEmail() {
    setError(null);
    if (!email.includes('@') || email.length < 5) {
      setError('Digite um e-mail válido.');
      return;
    }
    setLoading(true);
    try {
      const profile = await getProfile();
      if (!profile) {
        setError('Nenhum perfil encontrado neste dispositivo.');
        return;
      }
      if (profile.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
        setError('E-mail não corresponde ao cadastro.');
        return;
      }
      animateStep('reset');
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    setError(null);
    if (newPassword.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    try {
      await saveLocalPassword(newPassword);
      animateStep('done');
    } finally {
      setLoading(false);
    }
  }

  const stepMeta = {
    email: {
      title: 'Recuperar acesso',
      subtitle: 'Informe o e-mail cadastrado para continuar.',
    },
    reset: {
      title: 'Nova senha',
      subtitle: 'Escolha uma senha segura para sua conta.',
    },
    done: {
      title: 'Tudo certo!',
      subtitle: 'Sua senha foi redefinida com sucesso.',
    },
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.select({ ios: 'padding', android: undefined })}>

      {/* ── Hero ── */}
      <View style={styles.hero}>
        <Image source={{ uri: HERO_IMAGE }} style={StyleSheet.absoluteFill} contentFit="cover" priority="high" />
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgGrad id="g" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0"   stopColor="#0F172A" stopOpacity="0.10" />
              <Stop offset="0.4" stopColor="#0F172A" stopOpacity="0.25" />
              <Stop offset="1"   stopColor="#0F172A" stopOpacity="0.82" />
            </SvgGrad>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#g)" />
        </Svg>

        {/* Header: voltar + logo na mesma linha */}
        <View style={[styles.heroHeader, { paddingTop: insets.top + 14 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
            <MaterialIcons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <View style={styles.logoRow}>
            <MaterialIcons name="flight-takeoff" size={18} color="rgba(255,255,255,0.9)" />
            <Text style={styles.logoText}>viaway</Text>
          </View>
          {/* Espaçador para centralizar o logo */}
          <View style={{ width: 38 }} />
        </View>

        {/* Headline hero */}
        <View style={styles.heroFooter}>
          <Text style={styles.heroHeadline}>{'Recupere\nseu acesso.'}</Text>
          <Text style={styles.heroCaption}>Identificamos seu perfil e redefinimos sua senha com segurança.</Text>
        </View>
      </View>

      {/* ── Sheet ── */}
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 20 }]}>
        <View style={styles.handle} />

        {/* Indicador de etapa */}
        <View style={styles.stepIndicator}>
          {(['email', 'reset', 'done'] as Step[]).map((s, i) => (
            <View key={s} style={[styles.stepDot, step === s && styles.stepDotActive,
              (['email', 'reset', 'done'] as Step[]).indexOf(step) > i && styles.stepDotDone]} />
          ))}
        </View>

        {/* Conteúdo animado */}
        <Animated.View style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          gap: 16,
        }}>
          <View style={{ gap: 4 }}>
            <Text style={styles.sheetTitle}>{stepMeta[step].title}</Text>
            <Text style={styles.sheetSubtitle}>{stepMeta[step].subtitle}</Text>
          </View>

          {/* ── Step: email ── */}
          {step === 'email' ? (
            <View style={styles.fields}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>E-mail cadastrado</Text>
                <View style={[styles.inputShell, emailFocused && styles.inputFocused]}>
                  <MaterialIcons name="mail-outline" size={18}
                    color={emailFocused ? ViaColors.navy : '#BBBBBB'} style={styles.leadIcon} />
                  <TextInput
                    value={email}
                    onChangeText={(v) => { setEmail(v); setError(null); }}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    placeholder="seuemail@exemplo.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleVerifyEmail}
                    placeholderTextColor="#C2C2C2"
                    style={styles.inputText}
                  />
                </View>
              </View>

              {error ? <ErrorBanner text={error} /> : null}

              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnActive]}
                onPress={handleVerifyEmail}
                disabled={loading}>
                {loading
                  ? <Text style={styles.primaryBtnLabel}>Verificando…</Text>
                  : <Text style={styles.primaryBtnLabel}>Verificar e-mail</Text>}
              </Pressable>
            </View>
          ) : null}

          {/* ── Step: reset ── */}
          {step === 'reset' ? (
            <View style={styles.fields}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Nova senha</Text>
                <View style={[styles.inputShell, newFocused && styles.inputFocused]}>
                  <MaterialIcons name="lock-outline" size={18}
                    color={newFocused ? ViaColors.navy : '#BBBBBB'} style={styles.leadIcon} />
                  <TextInput
                    value={newPassword}
                    onChangeText={(v) => { setNewPassword(v); setError(null); }}
                    onFocus={() => setNewFocused(true)}
                    onBlur={() => setNewFocused(false)}
                    placeholder="Mínimo 6 caracteres"
                    secureTextEntry={!showNew}
                    autoCapitalize="none"
                    returnKeyType="next"
                    placeholderTextColor="#C2C2C2"
                    style={[styles.inputText, { flex: 1 }]}
                  />
                  <Pressable onPress={() => setShowNew(s => !s)} hitSlop={10} style={styles.eyeBtn}>
                    <MaterialIcons name={showNew ? 'visibility' : 'visibility-off'} size={20} color="#BBBBBB" />
                  </Pressable>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Confirmar nova senha</Text>
                <View style={[styles.inputShell, confirmFocused && styles.inputFocused]}>
                  <MaterialIcons name="lock-outline" size={18}
                    color={confirmFocused ? ViaColors.navy : '#BBBBBB'} style={styles.leadIcon} />
                  <TextInput
                    value={confirmPassword}
                    onChangeText={(v) => { setConfirmPassword(v); setError(null); }}
                    onFocus={() => setConfirmFocused(true)}
                    onBlur={() => setConfirmFocused(false)}
                    placeholder="Repita a senha"
                    secureTextEntry={!showConfirm}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleReset}
                    placeholderTextColor="#C2C2C2"
                    style={[styles.inputText, { flex: 1 }]}
                  />
                  <Pressable onPress={() => setShowConfirm(s => !s)} hitSlop={10} style={styles.eyeBtn}>
                    <MaterialIcons name={showConfirm ? 'visibility' : 'visibility-off'} size={20} color="#BBBBBB" />
                  </Pressable>
                </View>
              </View>

              {/* Força da senha */}
              {newPassword.length > 0 ? <StrengthBar password={newPassword} /> : null}

              {error ? <ErrorBanner text={error} /> : null}

              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnActive]}
                onPress={handleReset}
                disabled={loading}>
                <Text style={styles.primaryBtnLabel}>
                  {loading ? 'Salvando…' : 'Redefinir senha'}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* ── Step: done ── */}
          {step === 'done' ? (
            <View style={styles.doneWrap}>
              <View style={styles.doneIcon}>
                <MaterialIcons name="check-circle" size={52} color={ViaColors.navy} />
              </View>
              <Text style={styles.doneText}>
                Sua senha foi atualizada. Faça login com as novas credenciais.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnActive]}
                onPress={() => router.replace('/auth')}>
                <MaterialIcons name="login" size={18} color="#fff" />
                <Text style={styles.primaryBtnLabel}>Ir para o login</Text>
              </Pressable>
            </View>
          ) : null}
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Força da senha ────────────────────────────────────────────────────────────
function getStrength(pw: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9!@#$%^&*]/.test(pw)) score++;
  if (score === 0) return { level: 0, label: 'Muito fraca', color: '#E5342A' };
  if (score === 1) return { level: 1, label: 'Fraca',       color: '#F59E0B' };
  if (score === 2) return { level: 2, label: 'Boa',         color: '#3B82F6' };
  return              { level: 3, label: 'Forte',       color: '#22C55E' };
}

function StrengthBar({ password }: { password: string }) {
  const { level, label, color } = getStrength(password);
  return (
    <View style={sb.wrap}>
      <View style={sb.track}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[sb.seg, { backgroundColor: i <= level - 1 ? color : '#EBEBEB' }]} />
        ))}
      </View>
      <Text style={[sb.label, { color }]}>{label}</Text>
    </View>
  );
}
const sb = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: { flex: 1, flexDirection: 'row', gap: 4 },
  seg:   { flex: 1, height: 4, borderRadius: 2 },
  label: { fontFamily: ViaFonts.bodySemi, fontSize: 12, minWidth: 60, textAlign: 'right' },
});

// ── Banner de erro ────────────────────────────────────────────────────────────
function ErrorBanner({ text }: { text: string }) {
  return (
    <View style={eb.wrap}>
      <MaterialIcons name="error-outline" size={16} color="#C0392B" />
      <Text style={eb.text}>{text}</Text>
    </View>
  );
}
const eb = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#FECACA' },
  text: { fontFamily: ViaFonts.body, fontSize: 13, color: '#C0392B', flex: 1 },
});

// ── Styles ────────────────────────────────────────────────────────────────────
const HERO_H = 260;
const SHEET_R = 32;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

  hero: {
    height: HERO_H,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ViaSpacing.margin,
  },
  backBtn: {
    width: 38, height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  logoRow:  { flexDirection: 'row', alignItems: 'center', gap: 7 },
  logoText: { fontFamily: ViaFonts.h2, fontSize: 20, letterSpacing: -0.2, color: '#fff' },
  heroFooter: {
    paddingHorizontal: ViaSpacing.margin,
    paddingBottom: SHEET_R + 16,
    gap: 6,
  },
  heroHeadline: {
    fontFamily: ViaFonts.h1,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.6,
    color: '#fff',
  },
  heroCaption: {
    fontFamily: ViaFonts.body,
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
    lineHeight: 19,
    maxWidth: 280,
  },

  sheet: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: -SHEET_R,
    borderTopLeftRadius: SHEET_R,
    borderTopRightRadius: SHEET_R,
    paddingHorizontal: ViaSpacing.margin,
    paddingTop: 14,
    gap: 16,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E2E2E2',
    alignSelf: 'center',
    marginBottom: 4,
  },

  // Indicador de etapas
  stepIndicator: { flexDirection: 'row', gap: 6, alignSelf: 'flex-start' },
  stepDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(15,23,42,0.15)',
  },
  stepDotActive: { width: 24, borderRadius: 4, backgroundColor: ViaColors.navy },
  stepDotDone:   { backgroundColor: 'rgba(15,23,42,0.35)' },

  sheetTitle: {
    fontFamily: ViaFonts.h2,
    fontSize: 24,
    letterSpacing: -0.3,
    color: ViaColors.navy,
  },
  sheetSubtitle: {
    fontFamily: ViaFonts.body,
    fontSize: 14,
    color: ViaColors.onSurfaceVariant,
    lineHeight: 20,
  },

  fields: { gap: 14 },
  field:  { gap: 7 },
  fieldLabel: {
    fontFamily: ViaFonts.bodySemi,
    fontSize: 13,
    color: ViaColors.onSurface,
  },
  inputShell: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14, borderWidth: 1.5, borderColor: '#E2D1B3',
    paddingHorizontal: 14,
  },
  inputFocused: { backgroundColor: '#fff', borderColor: ViaColors.navy },
  leadIcon:     { marginRight: 10 },
  inputText:    { flex: 1, fontFamily: ViaFonts.body, fontSize: 15, color: ViaColors.onSurface, paddingVertical: 14 },
  eyeBtn:       { padding: 6, marginLeft: 4 },

  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: ViaColors.navy,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  primaryBtnActive: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  primaryBtnLabel:  { fontFamily: ViaFonts.bodySemi, fontSize: 16, color: '#fff', letterSpacing: 0.2 },

  // Done
  doneWrap: { flex: 1, alignItems: 'center', gap: 20, paddingTop: 24 },
  doneIcon: {
    width: 96, height: 96, borderRadius: 28,
    backgroundColor: '#EEF0F7',
    borderWidth: 1.5, borderColor: 'rgba(15,23,42,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  doneText: {
    fontFamily: ViaFonts.body,
    fontSize: 15,
    color: ViaColors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
});
