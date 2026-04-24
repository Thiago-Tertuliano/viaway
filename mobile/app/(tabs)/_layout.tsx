import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HapticTab } from '@/components/haptic-tab';
import { ViaColors, ViaShadows, ViaSpacing } from '@/constants/viaway-theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const tabH = 56 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: ViaColors.navy,
        tabBarInactiveTintColor: ViaColors.sand,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute' as const,
          height: tabH,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          backgroundColor: ViaColors.surfaceWhite,
          borderTopWidth: 1,
          borderTopColor: ViaColors.sand,
          ...Platform.select({
            ios: { ...ViaShadows.level2 },
            default: { elevation: 8 },
          }),
        },
        tabBarItemStyle: {
          height: 44,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons
              name="home"
              size={26}
              color={color}
              style={focused ? styles.iconOn : undefined}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explorar',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons
              name="explore"
              size={26}
              color={color}
              style={focused ? styles.iconOn : undefined}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons
              name="person"
              size={26}
              color={color}
              style={focused ? styles.iconOn : undefined}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconOn: { transform: [{ scale: 1.1 }] },
});
