import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SectionCard } from '@/components/viaway/SectionCard';
import { ViaColors, ViaFonts, ViaRadius, ViaSpacing } from '@/constants/viaway-theme';
import {
  getInboxNotifications,
  markAllInboxRead,
  markInboxNotificationRead,
  seedInboxIfEmpty,
  type InboxNotification,
} from '@/lib/session';

export default function NotificationsInboxScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<InboxNotification[]>([]);

  const load = useCallback(async () => {
    await seedInboxIfEmpty();
    setItems(await getInboxNotifications());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function onTapItem(n: InboxNotification) {
    if (!n.read) {
      await markInboxNotificationRead(n.id);
      setItems(await getInboxNotifications());
    }
  }

  async function onMarkAll() {
    await markAllInboxRead();
    setItems(await getInboxNotifications());
  }

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.topTitle}>Notificações</Text>
        <Pressable onPress={() => void onMarkAll()} hitSlop={8} style={styles.markAll}>
          <Text style={styles.markAllTxt}>Lidas</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.lead}>
          Avisos e dicas do ViaWay. Em breve: lembretes de viagem e checklist conforme suas preferências.
        </Text>

        {items.length === 0 ? (
          <SectionCard>
            <Text style={styles.empty}>Nada por aqui.</Text>
          </SectionCard>
        ) : (
          items.map((n) => (
            <Pressable key={n.id} onPress={() => void onTapItem(n)}>
              <SectionCard>
                <View style={styles.row}>
                  <View style={[styles.dot, n.read && styles.dotRead]} />
                  <View style={styles.body}>
                    <Text style={[styles.title, n.read && styles.titleRead]}>{n.title}</Text>
                    <Text style={styles.bodyTxt}>{n.body}</Text>
                    <Text style={styles.date}>
                      {new Date(n.createdAt).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={ViaColors.outline} />
                </View>
              </SectionCard>
            </Pressable>
          ))
        )}

        <Pressable
          onPress={() => router.push('/notifications-settings')}
          style={({ pressed }) => [styles.settingsLink, pressed && { opacity: 0.85 }]}>
          <MaterialIcons name="tune" size={18} color={ViaColors.navy} />
          <Text style={styles.settingsLinkTxt}>Preferências de notificação</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ViaColors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ViaSpacing.margin,
    paddingBottom: 14,
    backgroundColor: ViaColors.navy,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontFamily: ViaFonts.h3, fontSize: 17, color: '#fff', flex: 1, textAlign: 'center' },
  markAll: { paddingHorizontal: 8, paddingVertical: 6 },
  markAllTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 13, color: ViaColors.sand },
  scroll: { paddingHorizontal: ViaSpacing.margin, paddingTop: ViaSpacing.lg, gap: ViaSpacing.sm },
  lead: {
    fontFamily: ViaFonts.body,
    fontSize: 14,
    color: ViaColors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 4,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ViaColors.coral,
    marginTop: 6,
  },
  dotRead: { backgroundColor: '#D1D5DB' },
  body: { flex: 1 },
  title: { fontFamily: ViaFonts.bodySemi, fontSize: 16, color: ViaColors.navy },
  titleRead: { color: ViaColors.onSurfaceVariant },
  bodyTxt: { fontFamily: ViaFonts.body, fontSize: 14, color: ViaColors.onSurface, marginTop: 4, lineHeight: 20 },
  date: { fontFamily: ViaFonts.body, fontSize: 11, color: ViaColors.outline, marginTop: 8 },
  empty: { fontFamily: ViaFonts.body, fontSize: 14, color: ViaColors.onSurfaceVariant, textAlign: 'center' },
  settingsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: ViaSpacing.lg,
    paddingVertical: 14,
    borderRadius: ViaRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    backgroundColor: '#fff',
  },
  settingsLinkTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 14, color: ViaColors.navy },
});
