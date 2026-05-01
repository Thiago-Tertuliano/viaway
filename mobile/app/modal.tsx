import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { ViaColors, ViaFonts, ViaSpacing, textBody, textH2 } from '@/constants/viaway-theme';

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.sheet}>
        <Text style={styles.title}>Atalhos do ViaWay</Text>
        <Text style={styles.subtitle}>
          Esta tela pode ser usada para ações rápidas do app, como criar viagem, abrir suporte ou
          acessar configurações.
        </Text>
        <Link href="/(tabs)" dismissTo style={styles.link}>
          <Text style={styles.linkText}>Voltar para início</Text>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15,23,42,0.35)',
  },
  sheet: {
    backgroundColor: ViaColors.surfaceWhite,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: ViaSpacing.margin,
    gap: ViaSpacing.md,
  },
  title: { ...textH2, color: ViaColors.navy },
  subtitle: { ...textBody, color: ViaColors.onSurfaceVariant },
  link: {
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: ViaColors.sand,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ViaColors.surface,
  },
  linkText: { fontFamily: ViaFonts.bodySemi, color: ViaColors.navy, fontSize: 15 },
});
