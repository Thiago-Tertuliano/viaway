import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { PrimaryCtaButton } from '@/components/viaway/PrimaryCtaButton';
import { SectionCard } from '@/components/viaway/SectionCard';
import { ViaColors, ViaFonts, ViaSpacing, textBody, textH2 } from '@/constants/viaway-theme';
import { saveProfile, setAuthDone, type ViawayProfile } from '@/lib/session';

type Opt<T extends string> = { id: T; label: string };

const V_ano: Opt<ViawayProfile['viagensAno']>[] = [
  { id: '1-2', label: '1 a 2 viagens' },
  { id: '3-5', label: '3 a 5 viagens' },
  { id: '6+', label: '6 ou mais' },
];
const V_estilo: Opt<ViawayProfile['estilo']>[] = [
  { id: 'economico', label: 'Econômico' },
  { id: 'conforto', label: 'Conforto' },
  { id: 'premium', label: 'Premium' },
];
const V_acomp: Opt<ViawayProfile['acompanhantes']>[] = [
  { id: 'solo', label: 'Solo' },
  { id: 'casal', label: 'Casal' },
  { id: 'familia', label: 'Família' },
  { id: 'grupo', label: 'Grupo' },
];
const V_obj: Opt<ViawayProfile['objetivo']>[] = [
  { id: 'descanso', label: 'Descanso' },
  { id: 'aventura', label: 'Aventura' },
  { id: 'gastronomia', label: 'Gastronomia' },
  { id: 'misto', label: 'Misto' },
];

export default function RegisterIntentScreen() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [viagensAno, setViagensAno] = useState<ViawayProfile['viagensAno']>('1-2');
  const [estilo, setEstilo] = useState<ViawayProfile['estilo']>('conforto');
  const [acompanhantes, setAcompanhantes] = useState<ViawayProfile['acompanhantes']>('casal');
  const [objetivo, setObjetivo] = useState<ViawayProfile['objetivo']>('misto');

  const canGo = useMemo(() => nome.trim().length > 1 && email.trim().includes('@'), [nome, email]);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Cadastro inteligente</Text>
      <Text style={styles.subtitle}>
        Responda rápido para personalizar o app para o seu estilo de viagem.
      </Text>

      <SectionCard>
        <TextInput
          placeholder="Seu nome"
          value={nome}
          onChangeText={setNome}
          placeholderTextColor={ViaColors.onSurfaceVariant}
          style={styles.input}
        />
        <TextInput
          placeholder="Seu e-mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={ViaColors.onSurfaceVariant}
          style={styles.input}
        />
      </SectionCard>

      <Question title="Quantas viagens por ano?">
        <OptionRow options={V_ano} value={viagensAno} onChange={setViagensAno} />
      </Question>
      <Question title="Seu estilo de viagem">
        <OptionRow options={V_estilo} value={estilo} onChange={setEstilo} />
      </Question>
      <Question title="Com quem você viaja mais?">
        <OptionRow options={V_acomp} value={acompanhantes} onChange={setAcompanhantes} />
      </Question>
      <Question title="Objetivo principal">
        <OptionRow options={V_obj} value={objetivo} onChange={setObjetivo} />
      </Question>

      <PrimaryCtaButton
        label="Finalizar e entrar"
        icon={null}
        onPress={async () => {
          if (!canGo) return;
          await saveProfile({
            nome: nome.trim(),
            email: email.trim(),
            viagensAno,
            estilo,
            acompanhantes,
            objetivo,
          });
          await setAuthDone();
          router.replace('/(tabs)');
        }}
      />
    </View>
  );
}

function Question({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.qTitle}>{title}</Text>
      {children}
    </View>
  );
}

function OptionRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Opt<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.row}>
      {options.map((o) => (
        <Pressable
          key={o.id}
          onPress={() => onChange(o.id)}
          style={[styles.opt, value === o.id && styles.optOn]}>
          <Text style={[styles.optTxt, value === o.id && styles.optTxtOn]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ViaColors.background, padding: ViaSpacing.margin, gap: ViaSpacing.md },
  title: { ...textH2, color: ViaColors.navy },
  subtitle: { ...textBody, color: ViaColors.onSurfaceVariant, marginBottom: 4 },
  input: {
    fontFamily: ViaFonts.body,
    fontSize: 16,
    color: ViaColors.onSurface,
    borderBottomWidth: 1,
    borderBottomColor: ViaColors.sand,
    paddingVertical: 10,
    marginBottom: 6,
  },
  qTitle: { fontFamily: ViaFonts.bodySemi, fontSize: 14, color: ViaColors.navy },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opt: {
    borderWidth: 1,
    borderColor: ViaColors.sand,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: ViaColors.surfaceWhite,
  },
  optOn: { backgroundColor: ViaColors.primaryContainer, borderColor: ViaColors.primaryContainer },
  optTxt: { fontFamily: ViaFonts.body, fontSize: 13, color: ViaColors.onSurfaceVariant },
  optTxtOn: { color: ViaColors.onPrimary },
});

