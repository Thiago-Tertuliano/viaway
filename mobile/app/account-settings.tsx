import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SectionCard } from '@/components/viaway/SectionCard';
import { ViaColors, ViaFonts, ViaRadius, ViaSpacing } from '@/constants/viaway-theme';
import {
  getProfile,
  getUserData,
  saveProfile,
  saveTokens,
  saveUserData,
  type ViawayProfile,
} from '@/lib/session';
import { changePassword, getMe, updateMe } from '@/lib/viaway-api';

export default function AccountSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [emailInicial, setEmailInicial] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senhaParaEmail, setSenhaParaEmail] = useState('');

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [me, u, p] = await Promise.all([getMe(), getUserData(), getProfile()]);
      setNome(me.nome);
      setEmail(me.email);
      setEmailInicial(me.email);
      setTelefone(me.telefone ?? p?.telefone ?? '');
    } catch (e) {
      Alert.alert(
        'Conta',
        e instanceof Error ? e.message : 'Não foi possível carregar seus dados.',
      );
      router.back();
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const emailMudou = email.trim().toLowerCase() !== emailInicial.trim().toLowerCase();

  async function salvarDados() {
    if (saving) return;
    if (nome.trim().length < 2) {
      Alert.alert('Nome', 'Informe pelo menos 2 caracteres no nome.');
      return;
    }
    if (!email.includes('@')) {
      Alert.alert('E-mail', 'E-mail inválido.');
      return;
    }
    if (emailMudou && !senhaParaEmail.trim()) {
      Alert.alert('Segurança', 'Para alterar o e-mail, informe sua senha atual no campo indicado.');
      return;
    }

    setSaving(true);
    try {
      const body: Parameters<typeof updateMe>[0] = {
        nome: nome.trim(),
        telefone: telefone.trim() || null,
      };
      if (emailMudou) {
        body.email = email.trim().toLowerCase();
        body.senhaAtual = senhaParaEmail;
      }
      const data = await updateMe(body);
      if (data.accessToken && data.refreshToken) {
        await saveTokens(data.accessToken, data.refreshToken);
      }
      await saveUserData({
        id: data.id,
        nome: data.nome,
        email: data.email,
        plano: data.plano,
        telefone: data.telefone ?? null,
        fotoUrl: data.fotoUrl,
      });
      const p = await getProfile();
      if (p) {
        const merged: ViawayProfile = {
          ...p,
          nome: data.nome,
          email: data.email,
          telefone: (data.telefone ?? telefone).trim() || p.telefone,
        };
        await saveProfile(merged);
      }
      setEmailInicial(data.email);
      setSenhaParaEmail('');
      Alert.alert('Salvo', 'Seus dados foram atualizados.');
    } catch (e) {
      Alert.alert(
        'Conta',
        e instanceof Error ? e.message : 'Não foi possível salvar.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function salvarSenha() {
    if (savingPw) return;
    if (novaSenha.length < 6) {
      Alert.alert('Senha', 'A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      Alert.alert('Senha', 'A confirmação não coincide com a nova senha.');
      return;
    }
    setSavingPw(true);
    try {
      const r = await changePassword(senhaAtual, novaSenha);
      if (r.accessToken && r.refreshToken) {
        await saveTokens(r.accessToken, r.refreshToken);
      }
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
      Alert.alert('Senha', 'Senha alterada com sucesso.');
    } catch (e) {
      Alert.alert(
        'Senha',
        e instanceof Error ? e.message : 'Não foi possível alterar a senha.',
      );
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.topTitle}>Conta e segurança</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={ViaColors.coral} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={styles.lead}>
            Atualize nome, e-mail, telefone e senha. O e-mail de login só muda com sua senha atual.
          </Text>

          <SectionCard>
            <Text style={styles.sectionTitle}>Dados da conta</Text>
            <Field label="Nome" value={nome} onChangeText={setNome} autoCapitalize="words" />
            <Field
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {emailMudou ? (
              <Field
                label="Senha atual (obrigatória para trocar e-mail)"
                value={senhaParaEmail}
                onChangeText={setSenhaParaEmail}
                secure
              />
            ) : null}
            <Field
              label="Telefone"
              value={telefone}
              onChangeText={setTelefone}
              keyboardType="phone-pad"
              placeholder="(00) 00000-0000"
            />
            <Pressable
              onPress={() => void salvarDados()}
              disabled={saving}
              style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }, saving && { opacity: 0.6 }]}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnTxt}>Salvar dados</Text>
              )}
            </Pressable>
          </SectionCard>

          <SectionCard>
            <Text style={styles.sectionTitle}>Alterar senha</Text>
            <Field label="Senha atual" value={senhaAtual} onChangeText={setSenhaAtual} secure />
            <Field label="Nova senha" value={novaSenha} onChangeText={setNovaSenha} secure />
            <Field
              label="Confirmar nova senha"
              value={confirmarSenha}
              onChangeText={setConfirmarSenha}
              secure
            />
            <Pressable
              onPress={() => void salvarSenha()}
              disabled={savingPw}
              style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.88 }, savingPw && { opacity: 0.6 }]}>
              {savingPw ? (
                <ActivityIndicator color={ViaColors.navy} />
              ) : (
                <Text style={styles.secondaryBtnTxt}>Atualizar senha</Text>
              )}
            </Pressable>
          </SectionCard>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  secure,
  keyboardType,
  autoCapitalize,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  secure?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'words';
  placeholder?: string;
}) {
  return (
    <View style={fieldStyles.wrap}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        style={fieldStyles.input}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: { marginBottom: ViaSpacing.md },
  label: {
    fontFamily: ViaFonts.bodySemi,
    fontSize: 12,
    color: ViaColors.outline,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E2D1B3',
    borderRadius: ViaRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: ViaFonts.body,
    fontSize: 15,
    color: ViaColors.onSurface,
    backgroundColor: '#fff',
  },
});

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
  topTitle: {
    fontFamily: ViaFonts.h3,
    fontSize: 17,
    color: '#fff',
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: ViaSpacing.margin, paddingTop: ViaSpacing.lg, gap: ViaSpacing.md },
  lead: {
    fontFamily: ViaFonts.body,
    fontSize: 14,
    color: ViaColors.onSurfaceVariant,
    lineHeight: 20,
  },
  sectionTitle: {
    fontFamily: ViaFonts.h3,
    fontSize: 16,
    color: ViaColors.navy,
    marginBottom: ViaSpacing.sm,
  },
  primaryBtn: {
    marginTop: ViaSpacing.sm,
    backgroundColor: ViaColors.navy,
    borderRadius: ViaRadius.full,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 16, color: '#fff' },
  secondaryBtn: {
    marginTop: ViaSpacing.sm,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: ViaColors.navy,
    borderRadius: ViaRadius.full,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 15, color: ViaColors.navy },
});
