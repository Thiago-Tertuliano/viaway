import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import {
  ViaColors,
  ViaRadius,
  ViaShadows,
  ViaSpacing,
  textBody,
  textH2,
} from '@/constants/viaway-theme';
import { PrimaryCtaButton } from './PrimaryCtaButton';

const ILLUSTRATION =
  'https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=400&h=400&fit=crop';

type EmptyTripsStateProps = {
  onCreatePress: () => void;
};

export function EmptyTripsState({ onCreatePress }: EmptyTripsStateProps) {
  return (
    <View style={styles.card}>
      <View style={styles.illuWrap}>
        <Image
          source={{ uri: ILLUSTRATION }}
          style={styles.illu}
          contentFit="cover"
        />
        <View style={styles.illuOverlay} />
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.heading}>Ainda não tem planos?</Text>
        <Text style={styles.sub}>
          Comece a planejar sua próxima aventura agora mesmo.
        </Text>
      </View>
      <PrimaryCtaButton
        label="Criar minha primeira viagem"
        icon="add"
        onPress={onCreatePress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    backgroundColor: ViaColors.surfaceWhite,
    borderRadius: ViaRadius.lg,
    borderWidth: 1,
    borderColor: '#EAE7E9',
    padding: ViaSpacing.xl,
    alignItems: 'center',
    ...ViaShadows.level1,
  },
  illuWrap: {
    width: 192,
    height: 192,
    borderRadius: 96,
    marginBottom: ViaSpacing.md,
    overflow: 'hidden',
    backgroundColor: ViaColors.surfaceContainerLow,
  },
  illu: {
    width: '100%',
    height: '100%',
  },
  illuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(252,248,250,0.35)',
  },
  textBlock: {
    alignItems: 'center',
    marginBottom: ViaSpacing.md,
    gap: ViaSpacing.sm,
  },
  heading: {
    ...textH2,
    textAlign: 'center',
    color: ViaColors.onSurface,
  },
  sub: {
    ...textBody,
    textAlign: 'center',
    color: ViaColors.onSurfaceVariant,
    maxWidth: 280,
  },
});
