import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ViaColors, ViaFonts, ViaRadius, ViaShadows, ViaSpacing } from '@/constants/viaway-theme';

type PrimaryCtaButtonProps = {
  label: string;
  icon?: keyof typeof MaterialIcons.glyphMap | null;
  onPress: () => void;
  disabled?: boolean;
};

export function PrimaryCtaButton({ label, icon = 'add', onPress, disabled }: PrimaryCtaButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        ViaShadows.level1,
        disabled && { opacity: 0.55 },
        pressed && !disabled && { opacity: 0.92, transform: [{ scale: 0.99 }] },
      ]}>
      {icon != null ? (
        <View style={styles.row}>
          <MaterialIcons name={icon} size={20} color={ViaColors.onPrimary} />
          <Text style={styles.text}>{label}</Text>
        </View>
      ) : (
        <Text style={styles.text}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: '100%',
    backgroundColor: ViaColors.primaryContainer,
    paddingVertical: ViaSpacing.md,
    paddingHorizontal: ViaSpacing.lg,
    borderRadius: ViaRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ViaSpacing.sm,
  },
  text: {
    fontFamily: ViaFonts.bodySemi,
    fontSize: 16,
    letterSpacing: 0.16,
    color: ViaColors.onPrimary,
  },
});
