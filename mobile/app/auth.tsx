import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Defs, LinearGradient as SvgGrad, Path, Rect, Stop } from 'react-native-svg';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ViaColors, ViaFonts, ViaSpacing } from '@/constants/viaway-theme';
import { getProfile, saveTokens, saveUserData, setAuthDone } from '@/lib/session';
import { login } from '@/lib/viaway-api';

const { height: SCREEN_H } = Dimensions.get('window');
const HERO_H  = Math.round(SCREEN_H * 0.47);
const WAVE_H  = 56;

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1519659528534-7fd733a832a0?auto=format&fit=crop&w=3840&q=100';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  async function handleLogin() {
    if (!email.includes('@') || email.length < 5) {
      setError('Digite um e-mail válido para continuar.');
      return;
    }
    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await login(email, password);

      // Salvar tokens e dados do usuário
      await saveTokens(result.accessToken, result.refreshToken);
      await saveUserData(result.usuario);
      await setAuthDone();

      const perfilLocal = await getProfile();
      router.replace(perfilLocal ? '/(tabs)' : '/register-intent');
    } catch (err: any) {
      const message = err?.message || 'Erro ao fazer login. Tente novamente.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <View style={styles.inner}>

        {/* ── Hero ──────────────────────────────────── */}
        <View style={[styles.hero, { height: HERO_H }]}>
          <Image
            source={{ uri: HERO_IMAGE }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            priority="high"
          />

          {/* Gradient via SVG — sem dependência extra */}
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <SvgGrad id="grad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0"   stopColor="#0F172A" stopOpacity="0.08" />
                <Stop offset="0.4" stopColor="#0F172A" stopOpacity="0.22" />
                <Stop offset="1"   stopColor="#0F172A" stopOpacity="0.80" />
              </SvgGrad>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#grad)" />
          </Svg>

          {/* Wordmark */}
          <View style={[styles.logoArea, { paddingTop: insets.top + 18 }]}>
            <View style={styles.logoRow}>
              <MaterialIcons name="flight-takeoff" size={19} color="rgba(255,255,255,0.92)" />
              <Text style={styles.logoText}>viaway</Text>
            </View>
          </View>

          {/* Headline */}
          <View style={styles.heroFooter}>
            <Text style={styles.heroHeadline}>{'Descubra o mundo\nao seu jeito.'}</Text>
            <Text style={styles.heroCaption}>
              Roteiro, checklist, gastos e cotações em um só lugar.
            </Text>
          </View>

          {/* ── Onda branca separadora ── */}
          <Svg
            width="100%"
            height={WAVE_H}
            viewBox={`0 0 400 ${WAVE_H}`}
            preserveAspectRatio="none"
            style={styles.wave}>
            <Path
              d="M0,56 C40,56 80,0 160,0 C240,0 260,56 280,56 C300,56 360,8 400,18 L400,56 Z"
              fill="#FFFFFF"
            />
          </Svg>
        </View>

        {/* ── Bottom Sheet ──────────────────────────── */}
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 20 }]}>
          <Text style={styles.sheetTitle}>Bem-vindo de volta</Text>
          <Text style={styles.sheetSubtitle}>Entre para continuar sua jornada.</Text>

          {/* Campos agrupados */}
          <View style={styles.fieldsGroup}>
          {/* Campo e-mail */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>E-mail</Text>
            <View style={[styles.inputShell, emailFocused && styles.inputFocused]}>
              <MaterialIcons
                name="mail-outline"
                size={18}
                color={emailFocused ? ViaColors.navy : '#BBBBBB'}
                style={styles.leadIcon}
              />
              <TextInput
                value={email}
                onChangeText={(v) => { setEmail(v); setError(null); }}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                placeholder="seuemail@exemplo.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor="#C2C2C2"
                style={styles.inputText}
              />
            </View>
          </View>

          {/* Campo senha */}
          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>Senha</Text>
              <Pressable hitSlop={10} onPress={() => router.push('/forgot-password')}>
                <Text style={styles.forgotLink}>Esqueceu a senha?</Text>
              </Pressable>
            </View>
            <View style={[styles.inputShell, passwordFocused && styles.inputFocused]}>
              <MaterialIcons
                name="lock-outline"
                size={18}
                color={passwordFocused ? ViaColors.navy : '#BBBBBB'}
                style={styles.leadIcon}
              />
              <TextInput
                value={password}
                onChangeText={(v) => { setPassword(v); setError(null); }}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                placeholder="Sua senha"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                placeholderTextColor="#C2C2C2"
                style={[styles.inputText, styles.inputFlex]}
              />
              <Pressable
                onPress={() => setShowPassword((s) => !s)}
                style={styles.eyeBtn}
                hitSlop={10}>
                <MaterialIcons
                  name={showPassword ? 'visibility' : 'visibility-off'}
                  size={20}
                  color="#BBBBBB"
                />
              </Pressable>
            </View>
          </View>
          </View>{/* fim fieldsGroup */}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Botão principal */}
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnActive, loading && styles.primaryBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnLabel}>Entrar</Text>
            )}
          </Pressable>

          {/* Divisor */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Botão secundário */}
          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.6 }]}
            onPress={() => router.push('/register-intent')}>
            <Text style={styles.secondaryBtnLabel}>
              Criar conta — primeira vez aqui?
            </Text>
          </Pressable>

          <Text style={styles.footer}>Axellion Inc · 2026 · Todos os direitos reservados</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  inner: {
    flex: 1,
  },

  // ── Hero ──────────────────────────────────────────────
  hero: {
    overflow: 'hidden',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  wave: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  logoArea: {
    paddingHorizontal: ViaSpacing.margin,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  logoText: {
    fontFamily: ViaFonts.h2,
    fontSize: 22,
    letterSpacing: -0.2,
    color: '#FFFFFF',
  },
  heroFooter: {
    paddingHorizontal: ViaSpacing.margin,
    paddingBottom: WAVE_H + 16,
    gap: 5,
  },
  heroHeadline: {
    fontFamily: ViaFonts.h1,
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -0.7,
    color: '#FFFFFF',
  },
  heroCaption: {
    fontFamily: ViaFonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.78)',
  },

  // ── Sheet ─────────────────────────────────────────────
  sheet: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: ViaSpacing.margin,
    paddingTop: 8,
    flexShrink: 1,
    gap: ViaSpacing.sm,
  },
  fieldsGroup: {
    gap: 8,
  },
  sheetTitle: {
    fontFamily: ViaFonts.h2,
    fontSize: 26,
    letterSpacing: -0.3,
    color: ViaColors.navy,
  },
  sheetSubtitle: {
    fontFamily: ViaFonts.body,
    fontSize: 15,
    color: ViaColors.onSurfaceVariant,
    marginTop: -8,
  },

  // ── Campos ────────────────────────────────────────────
  field: {
    gap: 7,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontFamily: ViaFonts.bodySemi,
    fontSize: 13,
    color: ViaColors.onSurface,
  },
  forgotLink: {
    fontFamily: ViaFonts.bodySemi,
    fontSize: 13,
    color: ViaColors.navy,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2D1B3',   // Sand
    paddingHorizontal: 14,
  },
  inputFocused: {
    backgroundColor: '#FFFFFF',
    borderColor: ViaColors.navy,  // Deep Navy no foco
  },
  leadIcon: {
    marginRight: 10,
  },
  inputText: {
    flex: 1,
    fontFamily: ViaFonts.body,
    fontSize: 15,
    color: ViaColors.onSurface,
    paddingVertical: 14,
  },
  inputFlex: {
    flex: 1,
  },
  eyeBtn: {
    padding: 6,
    marginLeft: 4,
  },

  // ── Erro ──────────────────────────────────────────────
  errorText: {
    fontFamily: ViaFonts.body,
    fontSize: 13,
    color: '#E5342A',
    marginTop: -6,
  },

  // ── Botões ────────────────────────────────────────────
  primaryBtn: {
    backgroundColor: ViaColors.navy,   // Deep Navy
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  primaryBtnActive: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnLabel: {
    fontFamily: ViaFonts.bodySemi,
    fontSize: 16,
    letterSpacing: 0.2,
    color: '#FFFFFF',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#EBEBEB',
  },
  dividerLabel: {
    fontFamily: ViaFonts.body,
    fontSize: 13,
    color: '#BBBBBB',
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: '#E2D1B3',          // Sand border
    backgroundColor: '#F2E0C2',      // Sand background
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnLabel: {
    fontFamily: ViaFonts.bodySemi,
    fontSize: 14,
    color: ViaColors.navy,           // Deep Navy text
  },
  footer: {
    textAlign: 'center',
    fontFamily: ViaFonts.body,
    fontSize: 11,
    color: '#BBBBBB',
    marginTop: 4,
  },
});
