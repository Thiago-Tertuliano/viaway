import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useId, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppHeader } from '@/components/viaway/AppHeader';
import { PrimaryCtaButton } from '@/components/viaway/PrimaryCtaButton';
import { SectionCard } from '@/components/viaway/SectionCard';
import { ApiException } from '@/lib/api-client';
import { type DestinationOption, searchDestinations } from '@/lib/destination-search';
import { createViagem } from '@/lib/viaway-api';
import { ViaColors, ViaFonts, ViaSpacing, textBody, textBodySm } from '@/constants/viaway-theme';

export default function CriarViagemScreen() {
  const router = useRouter();
  const qClient = useQueryClient();
  const [nome, setNome] = useState('');
  const [destinoQuery, setDestinoQuery] = useState('');
  const [destinoSelecionado, setDestinoSelecionado] = useState<DestinationOption | null>(null);
  const [destinoLoading, setDestinoLoading] = useState(false);
  const [destinoOptions, setDestinoOptions] = useState<DestinationOption[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const idN = useId();

  useEffect(() => {
    let active = true;
    if (destinoQuery.trim().length < 2 || destinoSelecionado?.label === destinoQuery.trim()) {
      setDestinoOptions([]);
      return;
    }
    setDestinoLoading(true);
    const timer = setTimeout(async () => {
      const options = await searchDestinations(destinoQuery);
      if (!active) return;
      setDestinoOptions(options);
      setDestinoLoading(false);
    }, 320);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [destinoQuery, destinoSelecionado?.label]);

  const destinoPrincipal = useMemo(
    () => destinoSelecionado?.label || destinoQuery.trim() || 'A definir',
    [destinoSelecionado?.label, destinoQuery],
  );

  const m = useMutation({
    mutationFn: () =>
      createViagem({
        nome: nome.trim() || 'Viagem',
        destinoPrincipal,
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
    <KeyboardAvoidingView style={styles.root} behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <AppHeader left="back" showAvatar={false} title="Nova viagem" />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={[textBody, styles.lead]}>
          Dê um nome e escolha o destino. O restante (itinerário, gastos, checklist e cotações) se conecta automaticamente ao contexto da viagem.
        </Text>

        <SectionCard>
          <View style={styles.field}>
            <Text style={styles.label} nativeID={`${idN}-nome`} accessibilityLabel="Nome da viagem">
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
            <Text style={styles.label} nativeID={`${idN}-destino`} accessibilityLabel="Destino principal">
              Destino principal (autocomplete global)
            </Text>
            <TextInput
              value={destinoQuery}
              onChangeText={(t) => {
                setDestinoSelecionado(null);
                setDestinoQuery(t);
              }}
              placeholder="Digite cidade: ex. São Paulo, Paris, Tokyo..."
              placeholderTextColor={ViaColors.onSurfaceVariant}
              style={styles.input}
              accessibilityLabelledBy={`${idN}-destino`}
              autoCorrect={false}
            />
            {destinoLoading ? <ActivityIndicator size="small" color={ViaColors.coral} style={{ marginTop: 8 }} /> : null}
            {destinoOptions.length > 0 ? (
              <View style={styles.suggestWrap}>
                {destinoOptions.map((opt) => (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      setDestinoSelecionado(opt);
                      setDestinoQuery(opt.label);
                      setDestinoOptions([]);
                    }}
                    style={({ pressed }) => [styles.suggestItem, pressed && { opacity: 0.85 }]}>
                    <Text style={styles.suggestText}>{opt.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        </SectionCard>

        <SectionCard>
          <Text style={styles.label}>Módulos conectados para este destino</Text>
          <Text style={styles.flowTxt}>- Itinerário por dias e atividades</Text>
          <Text style={styles.flowTxt}>- Gastos e painel financeiro</Text>
          <Text style={styles.flowTxt}>- Lugares e cotações vinculadas</Text>
          <Text style={styles.flowTxt}>- Checklist de preparação</Text>
        </SectionCard>

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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ViaColors.background },
  body: { flex: 1, padding: ViaSpacing.margin, gap: ViaSpacing.lg },
  lead: { color: ViaColors.onSurfaceVariant, marginBottom: ViaSpacing.sm, lineHeight: 22 },
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
  suggestWrap: {
    borderWidth: 1,
    borderColor: 'rgba(226,209,179,0.45)',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 6,
  },
  suggestItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(226,209,179,0.25)' },
  suggestText: { fontFamily: ViaFonts.body, fontSize: 14, color: ViaColors.onSurface },
  flowTxt: { ...textBody, fontSize: 14, color: ViaColors.onSurfaceVariant, marginTop: 4 },
  errText: { color: '#ba1a1a', fontSize: 14, fontFamily: ViaFonts.body },
  ghost: { alignItems: 'center', padding: ViaSpacing.md },
  ghostText: { fontFamily: ViaFonts.body, fontSize: 16, color: ViaColors.navy, opacity: 0.7 },
});
