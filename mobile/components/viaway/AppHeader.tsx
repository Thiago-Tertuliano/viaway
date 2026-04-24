import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMenu } from '@/context/menu-context';
import { ViaColors, ViaFonts, ViaSpacing } from '@/constants/viaway-theme';

const AVATAR =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop';

type AppHeaderProps = {
  left?: 'menu' | 'back';
  onMenuPress?: () => void;
  title?: string;
  showAvatar?: boolean;
};

export function AppHeader({
  left = 'menu',
  onMenuPress,
  title = 'ViaWay',
  showAvatar = true,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { open: openMenu } = useMenu();

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top + 8,
          paddingBottom: ViaSpacing.md,
        },
      ]}>
      <View style={styles.side}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (left === 'back') router.back();
            else onMenuPress ? onMenuPress() : openMenu();
          }}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}>
          <MaterialIcons
            name={left === 'back' ? 'arrow-back' : 'menu'}
            size={28}
            color={ViaColors.navy}
          />
        </Pressable>
      </View>
      <Text
        style={styles.title}
        numberOfLines={1}
        accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.side}>
        {showAvatar ? (
          <Pressable
            accessibilityLabel="Perfil"
            onPress={() => {}}
            style={({ pressed }) => [styles.avatarWrap, pressed && { opacity: 0.85 }]}>
            <Image source={{ uri: AVATAR }} style={styles.avatar} contentFit="cover" />
          </Pressable>
        ) : (
          <View style={styles.avatarWrap} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ViaSpacing.margin,
    backgroundColor: ViaColors.background,
    borderBottomWidth: 1,
    borderBottomColor: ViaColors.sand,
  },
  side: { width: 40, alignItems: 'center', justifyContent: 'center' },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: ViaFonts.h2,
    fontSize: 22,
    color: ViaColors.navy,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  avatarWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: ViaColors.surfaceContainerLow,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
});
