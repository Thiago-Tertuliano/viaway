import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { ViaColors, ViaRadius, ViaShadows, ViaSpacing } from '@/constants/viaway-theme';

type SectionCardProps = {
  children: ReactNode;
  padded?: boolean;
};

export function SectionCard({ children, padded = true }: SectionCardProps) {
  return <View style={[styles.card, padded && styles.padded]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: ViaColors.surfaceWhite,
    borderRadius: ViaRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(226,209,179,0.26)',
    ...ViaShadows.level1,
  },
  padded: {
    padding: ViaSpacing.md,
  },
});

