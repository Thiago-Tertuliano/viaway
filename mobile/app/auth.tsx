import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image } from 'expo-image';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryCtaButton } from '@/components/viaway/PrimaryCtaButton';
import { ViaColors, ViaFonts, ViaSpacing, textBody, textH2 } from '@/constants/viaway-theme';
import { setAuthDone } from '@/lib/session';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1200&q=80&auto=format&fit=crop';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <View style={[styles.hero, { paddingTop: insets.top + 8 }]}>
        <Image source={{ uri: HERO_IMAGE }} style={styles.heroImage} contentFit="cover" />
        <View style={styles.heroTint} />
        <View style={styles.heroWave} />
      </View>

      <View style={styles.content}>
        <View style={styles.brandBlock}>
          <Text style={styles.brand}>ViaWay</Text>
          <Text style={styles.brandSub}>travel planner</Text>
        </View>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Entrar no ViaWay</Text>
          <Text style={styles.subtitle}>Seu roteiro, custos e checklist em um só lugar.</Text>
        </View>

        <View style={styles.mainCard}>
          <Text style={styles.fieldLabel}>E-mail</Text>
          <TextInput
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              setError(null);
            }}
            placeholder="seuemail@exemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={ViaColors.onSurfaceVariant}
            style={styles.input}
          />

          <Text style={[styles.fieldLabel, styles.fieldLabelSpacing]}>Senha</Text>
          <TextInput
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              setError(null);
            }}
            placeholder="Digite sua senha"
            secureTextEntry
            autoCapitalize="none"
            placeholderTextColor={ViaColors.onSurfaceVariant}
            style={styles.input}
          />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryCtaButton
          label="Entrar"
          icon={null}
          onPress={async () => {
            if (!email.includes('@') || email.length < 5) {
              setError('Digite um e-mail válido para continuar.');
              return;
            }
            if (password.length < 6) {
              setError('Digite uma senha válida com pelo menos 6 caracteres.');
              return;
            }
            await setAuthDone();
            router.replace('/register-intent');
          }}
        />

        <Pressable onPress={() => router.replace('/register-intent')} style={styles.altWrap}>
          <Text style={styles.alt}>Primeira vez? montar perfil inteligente</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f7fa' },
  hero: {
    height: '44%',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(239, 143, 141, 0.78)',
  },
  heroWave: {
    position: 'absolute',
    left: -80,
    right: -80,
    bottom: -120,
    height: 220,
    backgroundColor: '#f7f7fa',
    borderTopLeftRadius: 200,
    borderTopRightRadius: 200,
  },
  content: { flex: 1, paddingHorizontal: ViaSpacing.margin, gap: ViaSpacing.md, marginTop: -4 },
  brandBlock: { alignItems: 'center', marginTop: 4 },
  brand: { fontFamily: ViaFonts.h2, color: ViaColors.navy, fontSize: 28, letterSpacing: -0.3 },
  brandSub: {
    fontFamily: ViaFonts.body,
    color: ViaColors.onSurfaceVariant,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  titleWrap: { marginBottom: 2, marginTop: 10 },
  title: { ...textH2, color: ViaColors.navy },
  subtitle: { ...textBody, color: ViaColors.onSurfaceVariant, marginTop: 2, lineHeight: 22 },
  mainCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  fieldLabel: {
    fontFamily: ViaFonts.bodySemi,
    fontSize: 12,
    color: ViaColors.navy,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  input: {
    fontFamily: ViaFonts.body,
    fontSize: 16,
    color: ViaColors.onSurface,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    borderRadius: 12,
    backgroundColor: '#fbfcff',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  fieldLabelSpacing: { marginTop: 14 },
  error: {
    fontFamily: ViaFonts.body,
    fontSize: 13,
    color: '#ba1a1a',
    marginTop: -4,
  },
  altWrap: { marginTop: 4, paddingVertical: 8 },
  alt: { textAlign: 'center', fontFamily: ViaFonts.body, color: ViaColors.onSurfaceVariant, fontSize: 13 },
});

