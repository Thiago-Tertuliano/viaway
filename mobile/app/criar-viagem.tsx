import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useId, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppHeader } from '@/components/viaway/AppHeader';
import { PrimaryCtaButton } from '@/components/viaway/PrimaryCtaButton';
import { ApiException } from '@/lib/api-client';
import { createViagem } from '@/lib/viaway-api';
import { ViaColors, ViaFonts, ViaSpacing, textBody, textBodySm } from '@/constants/viaway-theme';

export default function CriarViagemScreen() {
  const router = useRouter();
  const qClient = useQueryClient();
  const [nome, setNome] = useState('');
  const [destino, setDestino] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const idN = useId();
  const m = useMutation({
    mutationFn: () =>
      createViagem({
        nome: nome.trim() || 'Viagem',
        destinoPrincipal: destino.trim() || 'A definir',
        destinosSecundarios: [],
      }),
    onSuccess: (v) => {
      void qClient.invalidateQueries({ queryKey: ['viagens'] });
      router.replace({ pathname: '/trip/[id]', params: { id: v.id } });
    },
    onError: (e: unknown) => {
      if (e instanceof ApiException) {
        setErr(e.message);
        return;
      }
      setErr(e instanceof Error ? e.message : 'Erro ao criar');
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <AppHeader left="back" showAvatar={false} title="Nova viagem" />
      <View style={styles.body}>
        <Text style={[textBody, styles.lead]}>
          Conte o básico — você pode ajustar depois no painel da viagem.
        </Text>

        <View style={styles.field}>
          <Text
            style={styles.label}
            nativeID={`${idN}-nome`}
            accessibilityLabel="Nome da viagem">
            Nome da viagem
          </Text>
          <TextInput
            value={nome}
            onChangeText={setNome}
            placeholder="Ex.: Escapada em Paris"
            placeholderTextColor={ViaColors.onSurfaceVariant}
            style={styles.input}
            accessibilityLabelledBy={`${idN}-nome`}
            autoCorrect={false}
          />
        </View>

        <View style={styles.field}>
          <Text
            style={styles.label}
            nativeID={`${idN}-destino`}
            accessibilityLabel="Destino principal">
            Destino principal
          </Text>
          <TextInput
            value={destino}
            onChangeText={setDestino}
            placeholder="Cidade, país"
            placeholderTextColor={ViaColors.onSurfaceVariant}
            style={styles.input}
            accessibilityLabelledBy={`${idN}-destino`}
            autoCorrect
          />
        </View>

        {m.isPending ? (
          <ActivityIndicator size="small" color={ViaColors.coral} />
        ) : null}
        {err ? <Text style={styles.errText}>{err}</Text> : null}
        <PrimaryCtaButton
          label="Continuar"
          icon={null}
          onPress={() => {
            setErr(null);
            m.mutate();
          }}
        />

        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.ghost, pressed && { opacity: 0.75 }]}>
          <Text style={styles.ghostText}>Cancelar</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ViaColors.background },
  body: { flex: 1, padding: ViaSpacing.margin, gap: ViaSpacing.lg },
  lead: { color: ViaColors.onSurfaceVariant, marginBottom: ViaSpacing.sm },
  field: { gap: ViaSpacing.xs },
  label: { ...textBodySm, color: ViaColors.navy, fontFamily: ViaFonts.bodySemi },
  input: {
    fontFamily: ViaFonts.body,
    fontSize: 16,
    color: ViaColors.onSurface,
    borderBottomWidth: 1,
    borderBottomColor: ViaColors.sand,
    paddingVertical: ViaSpacing.md,
  },
  errText: { color: '#ba1a1a', fontSize: 14, fontFamily: ViaFonts.body },
  ghost: { alignItems: 'center', padding: ViaSpacing.md },
  ghostText: { fontFamily: ViaFonts.body, fontSize: 16, color: ViaColors.navy, opacity: 0.7 },
});
