import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SectionCard } from '@/components/viaway/SectionCard';
import { ViaColors, ViaFonts, ViaRadius, ViaSpacing } from '@/constants/viaway-theme';
import {
  getNotificationPrefs,
  saveNotificationPrefs,
  type NotificationPrefs,
} from '@/lib/session';

type RowProps = {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
};

function NotifRow({ icon, title, subtitle, value, onValueChange, disabled }: RowProps) {
  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.iconWrap}>
        <MaterialIcons name={icon} size={22} color={ViaColors.navy} />
      </View>
      <View style={rowStyles.body}>
        <Text style={rowStyles.title}>{title}</Text>
        <Text style={rowStyles.sub}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: '#D1D5DB', true: ViaColors.navy + '88' }}
        thumbColor={value ? ViaColors.navy : '#f4f3f4'}
      />
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ViaColors.sand,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  title: { fontFamily: ViaFonts.bodySemi, fontSize: 15, color: ViaColors.onSurface },
  sub: { fontFamily: ViaFonts.body, fontSize: 12, color: ViaColors.onSurfaceVariant, marginTop: 2 },
});

export default function NotificationsSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const p = await getNotificationPrefs();
    setPrefs(p);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function patch(next: Partial<NotificationPrefs>) {
    if (!prefs) return;
    setSaving(true);
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    try {
      await saveNotificationPrefs(merged);
    } finally {
      setSaving(false);
    }
  }

  const master = prefs?.masterEnabled ?? true;

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.topTitle}>Notificações</Text>
        <View style={{ width: 40 }} />
      </View>

      {!prefs ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={ViaColors.coral} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}>
          <Text style={styles.lead}>
            Defina o que o ViaWay pode lembrar neste aparelho. Push remoto será integrado em uma versão
            futura; por ora as preferências ficam salvas no app.
          </Text>

          <SectionCard>
            <NotifRow
              icon="notifications-active"
              title="Notificações no app"
              subtitle="Permite lembretes e alertas locais quando disponíveis"
              value={prefs.masterEnabled}
              onValueChange={(v) => void patch({ masterEnabled: v })}
              disabled={saving}
            />
            <NotifRow
              icon="flight-takeoff"
              title="Viagens e roteiro"
              subtitle="Lembretes de viagem, datas e check-in"
              value={prefs.tripReminders && master}
              onValueChange={(v) => void patch({ tripReminders: v })}
              disabled={saving || !master}
            />
            <NotifRow
              icon="checklist"
              title="Checklist"
              subtitle="Itens pendentes antes da viagem"
              value={prefs.checklistReminders && master}
              onValueChange={(v) => void patch({ checklistReminders: v })}
              disabled={saving || !master}
            />
            <NotifRow
              icon="campaign"
              title="Novidades e ofertas"
              subtitle="Lançamentos do ViaWay e conteúdo opcional"
              value={prefs.offersAndNews && master}
              onValueChange={(v) => void patch({ offersAndNews: v })}
              disabled={saving || !master}
            />
          </SectionCard>
        </ScrollView>
      )}
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
  topTitle: { fontFamily: ViaFonts.h3, fontSize: 17, color: '#fff' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: ViaSpacing.margin, paddingTop: ViaSpacing.lg, gap: ViaSpacing.md },
  lead: {
    fontFamily: ViaFonts.body,
    fontSize: 14,
    color: ViaColors.onSurfaceVariant,
    lineHeight: 20,
  },
});
