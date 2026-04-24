import { StyleSheet, View } from 'react-native';
import { ViaColors, ViaRadius } from '@/constants/viaway-theme';

type ProgressBarCoralProps = {
  /** 0 a 1 */
  progress: number;
};

export function ProgressBarCoral({ progress }: ProgressBarCoralProps) {
  const p = Math.min(1, Math.max(0, progress));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${p * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 4,
    borderRadius: ViaRadius.full,
    backgroundColor: ViaColors.sand,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
    backgroundColor: ViaColors.coral,
    borderRadius: ViaRadius.full,
  },
});
