import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import Svg, { Defs, LinearGradient as SvgGrad, Rect, Stop } from 'react-native-svg';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ViaColors, ViaFonts, ViaSpacing } from '@/constants/viaway-theme';
import { setOnboardingDone } from '@/lib/session';

const STEPS = [
  {
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&q=90&auto=format&fit=crop',
    location: 'Montanhas',
    icon: 'terrain' as const,
    title: 'Seu hub\nde viagem',
    desc: 'Itinerário, gastos, cotações e checklist no mesmo fluxo.',
    accent: '#F47152',
  },
  {
    image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1600&q=90&auto=format&fit=crop',
    location: 'Centro Urbano',
    icon: 'location-city' as const,
    title: 'Planejamento\ninteligente',
    desc: 'O app entende seu perfil para sugerir organização do jeito certo.',
    accent: '#4A90D9',
  },
  {
    image: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1600&q=90&auto=format&fit=crop',
    location: 'Horizonte Aberto',
    icon: 'explore' as const,
    title: 'Tudo conectado\nao destino',
    desc: 'Defina a cidade e o restante da viagem se organiza por contexto.',
    accent: '#52C48A',
  },
];

const KB_DURATION = 7000; // Ken Burns por slide

export default function OnboardingScreen() {
  const [idx, setIdx] = useState(0);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const last = idx === STEPS.length - 1;

  // ── Animated values ───────────────────────────────────────────────────────
  const imgOpacities  = useRef(STEPS.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;
  const kenBurns      = useRef(new Animated.Value(1.06)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentY      = useRef(new Animated.Value(0)).current;
  const dotWidths     = useRef(STEPS.map((_, i) => new Animated.Value(i === 0 ? 28 : 8))).current;
  const dotOpacities  = useRef(STEPS.map((_, i) => new Animated.Value(i === 0 ? 1 : 0.4))).current;

  // Ken Burns ao montar e a cada mudança de slide
  useEffect(() => {
    kenBurns.setValue(1.06);
    Animated.timing(kenBurns, {
      toValue: 1.0,
      duration: KB_DURATION,
      useNativeDriver: true,
      easing: Easing.out(Easing.quad),
    }).start();
  }, [idx]);

  function goTo(next: number) {
    if (next === idx || next < 0 || next >= STEPS.length) return;

    // Conteúdo sai
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 0, duration: 220, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
      Animated.timing(contentY,       { toValue: next > idx ? -24 : 24, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      setIdx(next);

      // Crossfade de imagens
      Animated.parallel(
        STEPS.map((_, i) =>
          Animated.timing(imgOpacities[i], {
            toValue: i === next ? 1 : 0,
            duration: 700,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.quad),
          })
        )
      ).start();

      // Dots — ambos useNativeDriver: false (width não suporta native driver)
      STEPS.forEach((_, i) => {
        Animated.timing(dotWidths[i],    { toValue: i === next ? 28 : 8,   duration: 300, useNativeDriver: false }).start();
        Animated.timing(dotOpacities[i], { toValue: i === next ? 1  : 0.4, duration: 300, useNativeDriver: false }).start();
      });

      // Conteúdo entra
      contentY.setValue(next > idx ? 24 : -24);
      Animated.sequence([
        Animated.delay(120),
        Animated.parallel([
          Animated.timing(contentOpacity, { toValue: 1, duration: 380, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
          Animated.timing(contentY,       { toValue: 0, duration: 380, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        ]),
      ]).start();
    });
  }

  const step = STEPS[idx];

  return (
    <View style={styles.root}>

      {/* ── Imagens em crossfade com Ken Burns ── */}
      {STEPS.map((s, i) => (
        <Animated.View key={s.location} style={[StyleSheet.absoluteFillObject, { opacity: imgOpacities[i] }]}>
          <Animated.View style={{ flex: 1, transform: i === idx ? [{ scale: kenBurns }] : [] }}>
            <Image
              source={{ uri: s.image }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              priority={i === 0 ? 'high' : 'normal'}
            />
          </Animated.View>
        </Animated.View>
      ))}

      {/* ── Gradiente (escurece embaixo) ── */}
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <Defs>
          <SvgGrad id="g1" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"    stopColor="#0F172A" stopOpacity="0.28" />
            <Stop offset="0.38" stopColor="#0F172A" stopOpacity="0.10" />
            <Stop offset="0.62" stopColor="#0F172A" stopOpacity="0.35" />
            <Stop offset="1"    stopColor="#0F172A" stopOpacity="0.88" />
          </SvgGrad>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#g1)" />
      </Svg>

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 18 }]}>
        <View style={styles.logoRow}>
          <MaterialIcons name="flight-takeoff" size={17} color="rgba(255,255,255,0.92)" />
          <Text style={styles.logoText}>viaway</Text>
        </View>
        <Pressable onPress={async () => { await setOnboardingDone(); router.replace('/auth'); }} style={styles.skipPill}>
          <Text style={styles.skipPillText}>Pular</Text>
        </Pressable>
      </View>

      {/* ── Conteúdo central animado ── */}
      <Animated.View
        style={[styles.content, {
          paddingBottom: insets.bottom + 160,
          opacity: contentOpacity,
          transform: [{ translateY: contentY }],
        }]}>

        {/* Chip de localização */}
        <View style={styles.locationChip}>
          <MaterialIcons name={step.icon} size={13} color="rgba(255,255,255,0.85)" />
          <Text style={styles.locationText}>{step.location}</Text>
        </View>

        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.desc}>{step.desc}</Text>

        {/* Linha accent */}
        <View style={[styles.accentLine, { backgroundColor: step.accent }]} />
      </Animated.View>

      {/* ── Footer ── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 28 }]}>
        {/* Dots animados */}
        <View style={styles.dotsRow}>
          {STEPS.map((_, i) => (
            <Pressable key={i} onPress={() => goTo(i)} hitSlop={10}>
              <Animated.View style={[styles.dot, {
                width: dotWidths[i],
                opacity: dotOpacities[i],
                backgroundColor: STEPS[i].accent,
              }]} />
            </Pressable>
          ))}
        </View>

        {/* Botões */}
        <View style={styles.btnRow}>
          {!last ? (
            <Pressable
              style={[styles.primaryBtn, styles.primaryBtnFull, { backgroundColor: step.accent }]}
              onPress={() => goTo(idx + 1)}>
              <Text style={styles.primaryBtnText}>Continuar</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#fff" />
            </Pressable>
          ) : (
            <Pressable
              style={[styles.primaryBtn, styles.primaryBtnFull, { backgroundColor: step.accent }]}
              onPress={async () => {
                await setOnboardingDone();
                router.replace('/auth');
              }}>
              <MaterialIcons name="flight-takeoff" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Começar agora</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  // Header
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ViaSpacing.margin,
    zIndex: 10,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: {
    fontFamily: ViaFonts.h2,
    fontSize: 20,
    letterSpacing: -0.2,
    color: '#fff',
  },
  skipPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  skipPillText: {
    fontFamily: ViaFonts.bodySemi,
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
  },

  // Conteúdo
  content: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: ViaSpacing.margin,
    gap: 12,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  locationText: {
    fontFamily: ViaFonts.bodySemi,
    fontSize: 12,
    color: 'rgba(255,255,255,0.88)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    fontFamily: ViaFonts.h1,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -1,
    color: '#fff',
  },
  desc: {
    fontFamily: ViaFonts.body,
    fontSize: 15,
    lineHeight: 23,
    color: 'rgba(255,255,255,0.80)',
    maxWidth: 300,
  },
  accentLine: {
    width: 36,
    height: 3,
    borderRadius: 2,
    marginTop: 4,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: ViaSpacing.margin,
    gap: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  primaryBtn: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnFull: {
    flex: 1,
  },
  primaryBtnText: {
    fontFamily: ViaFonts.bodySemi,
    fontSize: 15,
    color: '#fff',
    letterSpacing: 0.1,
  },
});
