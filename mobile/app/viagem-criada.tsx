import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { ViaColors, ViaFonts } from '@/constants/viaway-theme';

export default function ViagemCriadaScreen() {
  const router = useRouter();
  const p = useLocalSearchParams<{ id: string; nome?: string }>();
  const id = Array.isArray(p.id) ? p.id[0] : p.id;
  const nome = Array.isArray(p.nome) ? p.nome[0] : p.nome;

  const planeX = useRef(new Animated.Value(-24)).current;
  const planeY = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0.7)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(planeX, {
          toValue: 120,
          duration: 1500,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(planeY, {
          toValue: -10,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(checkOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(checkScale, {
          toValue: 1,
          friction: 6,
          tension: 110,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const t = setTimeout(() => {
      if (id) {
        router.replace({ pathname: '/trip/[id]', params: { id } });
      } else {
        router.replace('/(tabs)');
      }
    }, 3000);

    return () => clearTimeout(t);
  }, [checkOpacity, checkScale, id, planeX, planeY, router]);

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.headerTxt}>Viagem criada com sucesso</Text>
        </View>
        <View style={styles.body}>
          <Svg width={220} height={120} viewBox="0 0 220 120">
            <Circle cx="180" cy="24" r="8" fill="rgba(34,197,94,0.25)" />
            <Path
              d="M8 86 C56 66, 120 66, 208 78"
              stroke="rgba(15,23,42,0.24)"
              strokeWidth="2"
              fill="none"
              strokeDasharray="6 6"
            />
          </Svg>
          <Animated.View
            style={[
              styles.planeWrap,
              { transform: [{ translateX: planeX }, { translateY: planeY }] },
            ]}>
            <MaterialIcons name="flight-takeoff" size={30} color={ViaColors.navy} />
          </Animated.View>
          <Animated.View
            style={[
              styles.checkWrap,
              { opacity: checkOpacity, transform: [{ scale: checkScale }] },
            ]}>
            <MaterialIcons name="check-circle" size={64} color="#16A34A" />
          </Animated.View>
          <Text style={styles.title}>{nome ? nome : 'Sua nova viagem'}</Text>
          <Text style={styles.subtitle}>Pronto! Organizamos tudo. Vamos abrir o painel da viagem...</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: ViaColors.navy,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  headerTxt: {
    fontFamily: ViaFonts.bodySemi,
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  body: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 26,
    minHeight: 280,
  },
  planeWrap: {
    position: 'absolute',
    top: 72,
    left: 10,
  },
  checkWrap: {
    marginTop: 24,
    marginBottom: 10,
  },
  title: {
    fontFamily: ViaFonts.h2,
    fontSize: 22,
    color: ViaColors.navy,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: ViaFonts.body,
    fontSize: 14,
    color: ViaColors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
});
