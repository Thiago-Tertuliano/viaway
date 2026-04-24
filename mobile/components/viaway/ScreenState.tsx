import { MaterialIcons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ViaColors, ViaFonts, ViaSpacing } from '@/constants/viaway-theme';

type ScreenStateProps = {
  kind: 'loading' | 'empty' | 'error';
  title: string;
  subtitle?: string;
};

export function ScreenState({ kind, title, subtitle }: ScreenStateProps) {
  return (
    <View style={styles.wrap}>
      {kind === 'loading' ? (
        <ActivityIndicator size="large" color={ViaColors.coral} />
      ) : (
        <MaterialIcons
          name={kind === 'error' ? 'error-outline' : 'inbox'}
          size={40}
          color={kind === 'error' ? '#ba1a1a' : ViaColors.outline}
        />
      )}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: ViaSpacing.sm,
    paddingHorizontal: ViaSpacing.margin,
  },
  title: {
    fontFamily: ViaFonts.bodySemi,
    fontSize: 16,
    color: ViaColors.navy,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: ViaFonts.body,
    fontSize: 14,
    color: ViaColors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
});

