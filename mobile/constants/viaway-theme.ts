import { Platform, TextStyle, ViewStyle } from 'react-native';

/** Tokens alinhados a `prototype/app-mobile/design_system/DESIGN.md` (editorial, navy, sand, coral) */
export const ViaColors = {
  background: '#F8FAFC',
  surface: '#FCF8FA',
  surfaceWhite: '#FFFFFF',
  surfaceContainerLow: '#F6F3F5',
  primaryContainer: '#131B2E',
  onPrimary: '#FFFFFF',
  onPrimaryMuted: 'rgba(255,255,255,0.7)',
  onPrimaryContainer: '#7C839B',
  navy: '#0F172A',
  onSurface: '#1B1B1D',
  onSurfaceVariant: '#45464D',
  sand: '#E2D1B3',
  outline: '#76777D',
  secondary: '#695D45',
  coral: '#F47152',
} as const;

export const ViaSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  margin: 20,
  gutter: 12,
} as const;

export const ViaRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
} as const;

export const ViaShadows = {
  level1: Platform.select<ViewStyle>({
    ios: {
      shadowColor: 'rgba(15, 23, 42, 1)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 20,
    },
    default: { elevation: 2 },
  }),
  level2: Platform.select<ViewStyle>({
    ios: {
      shadowColor: 'rgba(15, 23, 42, 1)',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 30,
    },
    default: { elevation: 6 },
  }),
} as const;

export const ViaFonts = {
  h1: 'PlusJakartaSans_800ExtraBold' as const,
  h2: 'PlusJakartaSans_700Bold' as const,
  h3: 'PlusJakartaSans_600SemiBold' as const,
  body: 'Inter_400Regular' as const,
  bodySemi: 'Inter_600SemiBold' as const,
  label: 'Inter_600SemiBold' as const,
};

export const textH1: TextStyle = {
  fontFamily: ViaFonts.h1,
  fontSize: 32,
  lineHeight: 38,
  letterSpacing: -0.64,
  color: ViaColors.navy,
};

export const textH2: TextStyle = {
  fontFamily: ViaFonts.h2,
  fontSize: 24,
  lineHeight: 32,
  letterSpacing: -0.24,
  color: ViaColors.navy,
};

export const textH3: TextStyle = {
  fontFamily: ViaFonts.h3,
  fontSize: 20,
  lineHeight: 28,
  letterSpacing: -0.2,
  color: ViaColors.onSurface,
};

export const textBody: TextStyle = {
  fontFamily: ViaFonts.body,
  fontSize: 16,
  lineHeight: 24,
  color: ViaColors.onSurface,
};

export const textBodySm: TextStyle = {
  fontFamily: ViaFonts.body,
  fontSize: 14,
  lineHeight: 21,
  color: ViaColors.onSurfaceVariant,
};

export const textLabel: TextStyle = {
  fontFamily: ViaFonts.label,
  fontSize: 12,
  lineHeight: 14.4,
  letterSpacing: 0.6,
  textTransform: 'uppercase' as const,
  color: ViaColors.outline,
};
