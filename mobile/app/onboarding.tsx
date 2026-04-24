import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryCtaButton } from '@/components/viaway/PrimaryCtaButton';
import { ViaColors, ViaFonts, ViaSpacing, textBody, textH2 } from '@/constants/viaway-theme';
import { setOnboardingDone } from '@/lib/session';

const STEPS = [
  {
    image:
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80&auto=format&fit=crop',
    tag: 'Montanhas',
    title: 'Seu hub de viagem',
    desc: 'Itinerário, gastos, cotações e checklist no mesmo fluxo.',
  },
  {
    image:
      'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&q=80&auto=format&fit=crop',
    tag: 'Centro Urbano',
    title: 'Planejamento inteligente',
    desc: 'O app entende seu perfil para sugerir organização do jeito certo.',
  },
  {
    image:
      'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1200&q=80&auto=format&fit=crop',
    tag: 'Texas',
    title: 'Tudo conectado ao destino',
    desc: 'Defina a cidade e o restante da viagem se organiza por contexto.',
  },
];

export default function OnboardingScreen() {
  const [idx, setIdx] = useState(0);
  const listRef = useRef<FlatList<(typeof STEPS)[number]>>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const last = idx === STEPS.length - 1;

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        data={STEPS}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.tag}
        onMomentumScrollEnd={(e) => {
          const next = Math.round(e.nativeEvent.contentOffset.x / width);
          setIdx(next);
        }}
        renderItem={({ item, index }) => (
          <View style={[styles.hero, { width }]}>
            <Image source={{ uri: item.image }} style={styles.heroImage} contentFit="cover" />
            <View style={styles.heroOverlayTop} />
            <View style={styles.heroOverlay} />
            <View style={[styles.heroContent, { paddingTop: insets.top + 8 }]}>
              <Text style={styles.progress}>{index + 1}/{STEPS.length}</Text>
              <Text style={styles.brand}>ViaWay</Text>
              <View style={styles.tagChip}>
                <Text style={styles.tagChipTxt}>{item.tag}</Text>
              </View>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.desc}>{item.desc}</Text>
            </View>
          </View>
        )}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === idx && styles.dotOn]} />
          ))}
        </View>

        <View style={styles.bottom}>
          {!last ? (
            <>
              <PrimaryCtaButton
                label="Continuar"
                icon={null}
                onPress={() => {
                  const next = Math.min(STEPS.length - 1, idx + 1);
                  listRef.current?.scrollToIndex({ index: next, animated: true });
                  setIdx(next);
                }}
              />
              <Pressable
                onPress={() => {
                  const finalIdx = STEPS.length - 1;
                  listRef.current?.scrollToIndex({ index: finalIdx, animated: true });
                  setIdx(finalIdx);
                }}
                style={styles.skipBtn}>
                <Text style={styles.skip}>Pular</Text>
              </Pressable>
            </>
          ) : (
            <PrimaryCtaButton
              label="Começar"
              icon={null}
              onPress={async () => {
                await setOnboardingDone();
                router.replace('/auth');
              }}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  hero: {
    flex: 1,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  heroImage: { ...StyleSheet.absoluteFillObject },
  heroOverlayTop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3,8,18,0.16)',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(19,27,46,0.54)',
  },
  heroContent: { paddingHorizontal: ViaSpacing.margin, paddingBottom: ViaSpacing.md, gap: 10 },
  progress: {
    alignSelf: 'flex-start',
    fontFamily: ViaFonts.bodySemi,
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  brand: { fontFamily: ViaFonts.h2, color: ViaColors.onPrimary, fontSize: 28 },
  tagChip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  tagChipTxt: {
    fontFamily: ViaFonts.bodySemi,
    fontSize: 12,
    color: ViaColors.onPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: { ...textH2, color: ViaColors.onPrimary, maxWidth: 320, fontSize: 24 },
  desc: { ...textBody, color: 'rgba(255,255,255,0.95)', maxWidth: 320, lineHeight: 24 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: ViaSpacing.margin,
  },
  dots: { flexDirection: 'row', gap: 8, alignSelf: 'center', marginBottom: ViaSpacing.md },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#d2d6df' },
  dotOn: { width: 24, borderRadius: 999, backgroundColor: ViaColors.coral },
  bottom: { gap: ViaSpacing.sm },
  skipBtn: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 14 },
  skip: { textAlign: 'center', fontFamily: ViaFonts.body, color: 'rgba(255,255,255,0.82)' },
});

