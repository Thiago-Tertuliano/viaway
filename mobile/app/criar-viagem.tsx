import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useId, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppHeader } from '@/components/viaway/AppHeader';
import { SectionCard } from '@/components/viaway/SectionCard';
import { ApiException } from '@/lib/api-client';
import { formatCep, lookupCep } from '@/lib/brasil-cep';
import { type DestinationOption, searchDestinations } from '@/lib/destination-search';
import { createViagem } from '@/lib/viaway-api';
import { ViaColors, ViaFonts, ViaSpacing, textBody, textBodySm } from '@/constants/viaway-theme';

const HUBS_BY_TRANSPORTE: Record<'aviao' | 'onibus' | 'trem', Array<{ region: string; hubs: string[] }>> = {
  aviao: [
    { region: 'sao paulo', hubs: ['Congonhas (CGH)', 'Guarulhos (GRU)', 'Viracopos (VCP)'] },
    { region: 'sao caetano', hubs: ['Congonhas (CGH)', 'Guarulhos (GRU)'] },
    { region: 'jundiai', hubs: ['Viracopos (VCP)', 'Congonhas (CGH)'] },
    { region: 'campinas', hubs: ['Viracopos (VCP)', 'Congonhas (CGH)'] },
    { region: 'rio de janeiro', hubs: ['Santos Dumont (SDU)', 'Galeao (GIG)'] },
    { region: 'belo horizonte', hubs: ['Confins (CNF)', 'Pampulha (PLU)'] },
  ],
  onibus: [
    { region: 'sao paulo', hubs: ['Terminal Tiete', 'Terminal Barra Funda', 'Terminal Jabaquara'] },
    { region: 'sao caetano', hubs: ['Terminal Santo Andre', 'Terminal Jabaquara'] },
    { region: 'jundiai', hubs: ['Rodoviaria de Jundiai', 'Terminal Tiete'] },
    { region: 'campinas', hubs: ['Terminal Rodoviario Ramos de Azevedo'] },
    { region: 'rio de janeiro', hubs: ['Novo Rio'] },
  ],
  trem: [
    { region: 'sao paulo', hubs: ['Estacao da Luz', 'Estacao Barra Funda', 'Estacao Palmeiras-Barra Funda'] },
    { region: 'sao caetano', hubs: ['Estacao Sao Caetano', 'Estacao Tamanduatei'] },
    { region: 'jundiai', hubs: ['Estacao Jundiai', 'Estacao Barra Funda'] },
    { region: 'campinas', hubs: ['Estacao Cultura', 'Estacao Anhumas'] },
    { region: 'rio de janeiro', hubs: ['Central do Brasil', 'Estacao Maracana'] },
  ],
};

function normalizeText(v: string) {
  return v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

type ExpenseItem = { nome: string; valor: number };

export default function CriarViagemScreen() {
  const router = useRouter();
  const qClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [nome, setNome] = useState('');
  const [destinoQuery, setDestinoQuery] = useState('');
  const [destinoSelecionado, setDestinoSelecionado] = useState<DestinationOption | null>(null);
  const [origemQuery, setOrigemQuery] = useState('');
  const [origemSelecionada, setOrigemSelecionada] = useState<DestinationOption | null>(null);
  const [origemLoading, setOrigemLoading] = useState(false);
  const [origemOptions, setOrigemOptions] = useState<DestinationOption[]>([]);
  const [hubOrigem, setHubOrigem] = useState('');
  const [transporte, setTransporte] = useState<'aviao' | 'onibus' | 'trem' | 'carro'>('aviao');
  const [hospedagemTipo, setHospedagemTipo] = useState<'hotel' | 'hostel' | 'pousada' | 'chale' | 'cabana' | 'casa'>('hotel');
  const [hospedagemNome, setHospedagemNome] = useState('');
  const [hospedagemCep, setHospedagemCep] = useState('');
  const [hospedagemRua, setHospedagemRua] = useState('');
  const [hospedagemCidade, setHospedagemCidade] = useState('');
  const [hospedagemUf, setHospedagemUf] = useState('');
  const [hospedagemCepLoading, setHospedagemCepLoading] = useState(false);
  const [hospedagemDias, setHospedagemDias] = useState('');
  const [hospedagemDiaria, setHospedagemDiaria] = useState('');
  const [hospedagemNumero, setHospedagemNumero] = useState('');
  const [transporteNome, setTransporteNome] = useState('');
  const [transporteValor, setTransporteValor] = useState('');
  const [alimentacaoNome, setAlimentacaoNome] = useState('');
  const [alimentacaoValor, setAlimentacaoValor] = useState('');
  const [passeiosNome, setPasseiosNome] = useState('');
  const [passeiosValor, setPasseiosValor] = useState('');
  const [comprasNome, setComprasNome] = useState('');
  const [comprasValor, setComprasValor] = useState('');
  const [outrosNome, setOutrosNome] = useState('');
  const [outrosValor, setOutrosValor] = useState('');
  const [transporteItens, setTransporteItens] = useState<ExpenseItem[]>([]);
  const [alimentacaoItens, setAlimentacaoItens] = useState<ExpenseItem[]>([]);
  const [passeiosItens, setPasseiosItens] = useState<ExpenseItem[]>([]);
  const [comprasItens, setComprasItens] = useState<ExpenseItem[]>([]);
  const [outrosItens, setOutrosItens] = useState<ExpenseItem[]>([]);
  const [passagemIda, setPassagemIda] = useState('');
  const [passagemVolta, setPassagemVolta] = useState('');
  const [pedagioValor, setPedagioValor] = useState('');
  const [combustivelValorTanque, setCombustivelValorTanque] = useState('');
  const [combustivelQtdTanques, setCombustivelQtdTanques] = useState('');
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

  useEffect(() => {
    let active = true;
    if (origemQuery.trim().length < 2 || origemSelecionada?.label === origemQuery.trim()) {
      setOrigemOptions([]);
      return;
    }
    setOrigemLoading(true);
    const timer = setTimeout(async () => {
      const options = await searchDestinations(origemQuery);
      if (!active) return;
      setOrigemOptions(options);
      setOrigemLoading(false);
    }, 320);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [origemQuery, origemSelecionada?.label]);

  const destinoPrincipal = useMemo(
    () => destinoSelecionado?.label || destinoQuery.trim() || 'A definir',
    [destinoSelecionado?.label, destinoQuery],
  );
  const origemPrincipal = useMemo(
    () => origemSelecionada?.label || origemQuery.trim() || '',
    [origemSelecionada?.label, origemQuery],
  );
  const hospedagemLocalPrincipal = useMemo(() => {
    const base = [hospedagemRua.trim(), hospedagemCidade.trim(), hospedagemUf.trim()].filter(Boolean).join(' - ');
    return base;
  }, [hospedagemRua, hospedagemCidade, hospedagemUf]);
  const hospedagemDiasNum = Number.parseInt(hospedagemDias, 10);
  const hospedagemDiariaNum = Number.parseFloat(hospedagemDiaria.replace(',', '.'));
  const hospedagemTotal = (Number.isNaN(hospedagemDiasNum) ? 0 : hospedagemDiasNum) * (Number.isNaN(hospedagemDiariaNum) ? 0 : hospedagemDiariaNum);
  const hubsSugeridos = useMemo(() => {
    if (transporte === 'carro' || !origemPrincipal) return [];
    const origemNorm = normalizeText(origemPrincipal);
    const matches = HUBS_BY_TRANSPORTE[transporte]
      .filter((row) => origemNorm.includes(row.region) || row.region.includes(origemNorm))
      .flatMap((row) => row.hubs);
    return [...new Set(matches)].slice(0, 5);
  }, [origemPrincipal, transporte]);

  useEffect(() => {
    const digits = hospedagemCep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    let active = true;
    setHospedagemCepLoading(true);
    lookupCep(digits)
      .then((res) => {
        if (!active) return;
        setHospedagemRua(res.logradouro || '');
        setHospedagemCidade(res.localidade || '');
        setHospedagemUf(res.uf || '');
        setHospedagemCep(formatCep(res.cep));
      })
      .catch(() => {
        if (!active) return;
        setHospedagemRua('');
        setHospedagemCidade('');
        setHospedagemUf('');
      })
      .finally(() => {
        if (active) setHospedagemCepLoading(false);
      });
    return () => {
      active = false;
    };
  }, [hospedagemCep]);
  const canContinue = destinoPrincipal !== 'A definir';
  const steps: Array<{
    key: 'destino' | 'transporte' | 'hospedagem' | 'gastos' | 'resumo';
    label: string;
    icon: keyof typeof MaterialIcons.glyphMap;
  }> = [
    { key: 'destino', label: 'Destino', icon: 'place' },
    { key: 'transporte', label: 'Transporte', icon: 'directions-bus' },
    { key: 'hospedagem', label: 'Hospedagem', icon: 'hotel' },
    { key: 'gastos', label: 'Gastos', icon: 'account-balance-wallet' },
    { key: 'resumo', label: 'Resumo', icon: 'fact-check' },
  ];
  const passagemIdaNum = Number.parseFloat(passagemIda.replace(',', '.'));
  const passagemVoltaNum = Number.parseFloat(passagemVolta.replace(',', '.'));
  const pedagioValorNum = Number.parseFloat(pedagioValor.replace(',', '.'));
  const combustivelValorTanqueNum = Number.parseFloat(combustivelValorTanque.replace(',', '.'));
  const combustivelQtdTanquesNum = Number.parseFloat(combustivelQtdTanques.replace(',', '.'));
  const combustivelTotal =
    (Number.isNaN(combustivelValorTanqueNum) ? 0 : combustivelValorTanqueNum) *
    (Number.isNaN(combustivelQtdTanquesNum) ? 0 : combustivelQtdTanquesNum);
  const transporteValorNum = Number.parseFloat(transporteValor.replace(',', '.'));
  const alimentacaoValorNum = Number.parseFloat(alimentacaoValor.replace(',', '.'));
  const passeiosValorNum = Number.parseFloat(passeiosValor.replace(',', '.'));
  const comprasValorNum = Number.parseFloat(comprasValor.replace(',', '.'));
  const outrosValorNum = Number.parseFloat(outrosValor.replace(',', '.'));
  const transporteInterurbanoTotal =
    transporte === 'carro'
      ? combustivelTotal + (Number.isNaN(pedagioValorNum) ? 0 : pedagioValorNum)
      : (Number.isNaN(passagemIdaNum) ? 0 : passagemIdaNum) +
        (Number.isNaN(passagemVoltaNum) ? 0 : passagemVoltaNum) +
        (Number.isNaN(pedagioValorNum) ? 0 : pedagioValorNum);
  const transporteItensTotal = transporteItens.reduce((acc, cur) => acc + cur.valor, 0);
  const alimentacaoItensTotal = alimentacaoItens.reduce((acc, cur) => acc + cur.valor, 0);
  const passeiosItensTotal = passeiosItens.reduce((acc, cur) => acc + cur.valor, 0);
  const comprasItensTotal = comprasItens.reduce((acc, cur) => acc + cur.valor, 0);
  const outrosItensTotal = outrosItens.reduce((acc, cur) => acc + cur.valor, 0);
  const gastosExtrasTotal =
    transporteItensTotal + alimentacaoItensTotal + passeiosItensTotal + comprasItensTotal + outrosItensTotal;
  const totalEstimadoViagem = hospedagemTotal + transporteInterurbanoTotal + gastosExtrasTotal;

  function addExpenseItem(
    nome: string,
    valor: number,
    setter: Dispatch<SetStateAction<ExpenseItem[]>>,
    clearNome: () => void,
    clearValor: () => void,
  ) {
    if (!nome.trim() || Number.isNaN(valor) || valor <= 0) {
      setErr('Preencha nome e valor valido para adicionar o gasto.');
      return;
    }
    setter((prev) => [...prev, { nome: nome.trim(), valor }]);
    clearNome();
    clearValor();
    setErr(null);
  }

  const m = useMutation({
    mutationFn: () =>
      createViagem({
        nome: nome.trim() || 'Viagem',
        destinoPrincipal,
        destinosSecundarios: [],
        orcamentoTotal: totalEstimadoViagem > 0 ? totalEstimadoViagem : null,
        notas: [
          `Origem: ${origemPrincipal || 'Nao informado'}`,
          `Transporte principal: ${transporte}`,
          transporte !== 'carro' ? `Terminal/Aeroporto origem: ${hubOrigem || 'Nao informado'}` : 'Terminal/Aeroporto origem: nao aplicavel',
          `Hospedagem: ${hospedagemTipo}${hospedagemNome.trim() ? ` - ${hospedagemNome.trim()}` : ''}`,
          `Endereco hospedagem: ${hospedagemLocalPrincipal || 'Nao informado'}${hospedagemNumero.trim() ? `, ${hospedagemNumero.trim()}` : ''}`,
          `Hospedagem diaria: ${Number.isNaN(hospedagemDiariaNum) ? 0 : hospedagemDiariaNum}`,
          `Hospedagem dias: ${Number.isNaN(hospedagemDiasNum) ? 0 : hospedagemDiasNum}`,
          `Hospedagem total estimada: ${hospedagemTotal}`,
          `Passagem ida: ${Number.isNaN(passagemIdaNum) ? 0 : passagemIdaNum}`,
          `Passagem volta: ${Number.isNaN(passagemVoltaNum) ? 0 : passagemVoltaNum}`,
          `Combustivel por tanque: ${Number.isNaN(combustivelValorTanqueNum) ? 0 : combustivelValorTanqueNum}`,
          `Quantidade de tanques: ${Number.isNaN(combustivelQtdTanquesNum) ? 0 : combustivelQtdTanquesNum}`,
          `Pedagio: ${Number.isNaN(pedagioValorNum) ? 0 : pedagioValorNum}`,
          `Transporte local: ${transporteItens.map((x) => `${x.nome}=${x.valor}`).join('; ') || 'nenhum'}`,
          `Alimentacao: ${alimentacaoItens.map((x) => `${x.nome}=${x.valor}`).join('; ') || 'nenhum'}`,
          `Passeios: ${passeiosItens.map((x) => `${x.nome}=${x.valor}`).join('; ') || 'nenhum'}`,
          `Compras: ${comprasItens.map((x) => `${x.nome}=${x.valor}`).join('; ') || 'nenhum'}`,
          `Outros: ${outrosItens.map((x) => `${x.nome}=${x.valor}`).join('; ') || 'nenhum'}`,
          `Total estimado geral: ${totalEstimadoViagem}`,
        ].join('\n'),
      }),
    onSuccess: (v) => {
      void qClient.invalidateQueries({ queryKey: ['viagens'] });
      router.replace({ pathname: '/viagem-criada', params: { id: v.id, nome: v.nome } });
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
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <Text style={[textBody, styles.lead]}>
          Monte sua viagem em etapas. No final, criamos tudo com transporte, hospedagem e planejamento financeiro.
        </Text>

        <SectionCard>
          <Text style={styles.flowTitle}>Fluxo da viagem</Text>
          <View style={styles.flowHeader}>
            {steps.map((item, idx) => (
              <View key={item.key} style={styles.flowStepWrap}>
                <View style={idx + 1 <= step ? styles.stepIconWrapActive : styles.stepIconWrap}>
                  <MaterialIcons
                    name={item.icon}
                    size={16}
                    color={idx + 1 <= step ? ViaColors.onPrimary : ViaColors.onSurfaceVariant}
                  />
                </View>
                <Text style={idx + 1 <= step ? styles.flowStepActive : styles.flowStepMuted}>{item.label}</Text>
                {idx < steps.length - 1 ? (
                  <View style={idx + 1 < step ? styles.flowLineActive : styles.flowLine} />
                ) : null}
              </View>
            ))}
          </View>
        </SectionCard>

        {step === 1 && (
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
            <Text style={styles.hint}>Se preferir, usamos 'Viagem' automaticamente.</Text>
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
            <Text style={styles.hint}>
              Seu destino conecta itinerario, lugares, gastos e cotacoes automaticamente.
            </Text>
          </View>
          </SectionCard>
        )}

        {step === 2 && (
          <SectionCard>
            <Text style={styles.label}>Transporte entre cidades</Text>
            <TextInput
              value={origemQuery}
              onChangeText={(t) => {
                setOrigemSelecionada(null);
                setOrigemQuery(t);
              }}
              placeholder="Cidade de origem (autocomplete)"
              placeholderTextColor={ViaColors.onSurfaceVariant}
              style={styles.input}
            />
            {origemLoading ? <ActivityIndicator size="small" color={ViaColors.coral} style={{ marginTop: 8 }} /> : null}
            {origemOptions.length > 0 ? (
              <View style={styles.suggestWrap}>
                {origemOptions.map((opt) => (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      setOrigemSelecionada(opt);
                      setOrigemQuery(opt.label);
                      setOrigemOptions([]);
                      setHubOrigem('');
                    }}
                    style={({ pressed }) => [styles.suggestItem, pressed && { opacity: 0.85 }]}>
                    <Text style={styles.suggestText}>{opt.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <View style={styles.chipsRow}>
              {['aviao', 'onibus', 'trem', 'carro'].map((item) => (
                <Pressable
                  key={item}
                  onPress={() => {
                    setTransporte(item as 'aviao' | 'onibus' | 'trem' | 'carro');
                    setHubOrigem('');
                  }}
                  style={[styles.chip, transporte === item && styles.chipActive]}>
                  <Text style={[styles.chipText, transporte === item && styles.chipTextActive]}>{item}</Text>
                </Pressable>
              ))}
            </View>
            {transporte !== 'carro' ? (
              <View style={styles.field}>
                <Text style={styles.label}>
                  {transporte === 'aviao'
                    ? 'Aeroporto de origem'
                    : transporte === 'onibus'
                      ? 'Rodoviaria de origem'
                      : 'Estacao de origem'}
                </Text>
                <TextInput
                  value={hubOrigem}
                  onChangeText={setHubOrigem}
                  placeholder={
                    transporte === 'aviao'
                      ? 'Digite ou selecione o aeroporto'
                      : transporte === 'onibus'
                        ? 'Digite ou selecione a rodoviaria'
                        : 'Digite ou selecione a estacao'
                  }
                  placeholderTextColor={ViaColors.onSurfaceVariant}
                  style={styles.input}
                />
                {hubsSugeridos.length > 0 ? (
                  <View style={styles.suggestWrap}>
                    {hubsSugeridos.map((hub) => (
                      <Pressable
                        key={hub}
                        onPress={() => setHubOrigem(hub)}
                        style={({ pressed }) => [styles.suggestItem, pressed && { opacity: 0.85 }]}>
                        <Text style={styles.suggestText}>{hub}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
            {transporte === 'carro' ? (
              <View style={styles.subSectionCard}>
                <Text style={styles.subSectionTitle}>Custos de carro</Text>
                <View style={styles.field}>
                  <Text style={styles.label}>Valor por tanque</Text>
                  <TextInput
                    value={combustivelValorTanque}
                    onChangeText={setCombustivelValorTanque}
                    placeholder="Ex.: 200,00"
                    placeholderTextColor={ViaColors.onSurfaceVariant}
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Quantidade de tanques</Text>
                  <TextInput
                    value={combustivelQtdTanques}
                    onChangeText={setCombustivelQtdTanques}
                    placeholder="Ex.: 2"
                    placeholderTextColor={ViaColors.onSurfaceVariant}
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Pedagio total</Text>
                  <TextInput
                    value={pedagioValor}
                    onChangeText={setPedagioValor}
                    placeholder="Ex.: 65,00"
                    placeholderTextColor={ViaColors.onSurfaceVariant}
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.subSectionCard}>
                <Text style={styles.subSectionTitle}>Custos do transporte principal</Text>
                <View style={styles.field}>
                  <Text style={styles.label}>Passagem de ida</Text>
                  <TextInput
                    value={passagemIda}
                    onChangeText={setPassagemIda}
                    placeholder="Ex.: 450,00"
                    placeholderTextColor={ViaColors.onSurfaceVariant}
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Passagem de volta</Text>
                  <TextInput
                    value={passagemVolta}
                    onChangeText={setPassagemVolta}
                    placeholder="Ex.: 430,00"
                    placeholderTextColor={ViaColors.onSurfaceVariant}
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />
                </View>
              </View>
            )}
            <Text style={styles.hint}>Esse transporte e o principal da sua cidade ate o destino.</Text>
          </SectionCard>
        )}

        {step === 3 && (
          <SectionCard>
            <Text style={styles.label}>Hospedagem</Text>
            <View style={styles.chipsRow}>
              {['hotel', 'hostel', 'pousada', 'chale', 'cabana', 'casa'].map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setHospedagemTipo(item as 'hotel' | 'hostel' | 'pousada' | 'chale' | 'cabana' | 'casa')}
                  style={[styles.chip, hospedagemTipo === item && styles.chipActive]}>
                  <Text style={[styles.chipText, hospedagemTipo === item && styles.chipTextActive]}>{item}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={hospedagemNome}
              onChangeText={setHospedagemNome}
              placeholder="Nome (opcional): ex. Hotel Central"
              placeholderTextColor={ViaColors.onSurfaceVariant}
              style={styles.input}
            />
            <View style={styles.field}>
              <Text style={styles.label}>CEP</Text>
            <TextInput
              value={hospedagemCep}
              onChangeText={(t) => setHospedagemCep(formatCep(t))}
              placeholder="00000-000"
              placeholderTextColor={ViaColors.onSurfaceVariant}
              keyboardType="number-pad"
              style={styles.input}
            />
              {hospedagemCepLoading ? <ActivityIndicator size="small" color={ViaColors.coral} /> : null}
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Rua</Text>
              <TextInput
                value={hospedagemRua}
                onChangeText={setHospedagemRua}
                placeholder="Rua"
                placeholderTextColor={ViaColors.onSurfaceVariant}
                style={styles.input}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Cidade</Text>
              <TextInput
                value={hospedagemCidade}
                onChangeText={setHospedagemCidade}
                placeholder="Cidade"
                placeholderTextColor={ViaColors.onSurfaceVariant}
                style={styles.input}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Numero</Text>
            <TextInput
              value={hospedagemNumero}
              onChangeText={setHospedagemNumero}
              placeholder="Numero (preencha manualmente)"
              placeholderTextColor={ViaColors.onSurfaceVariant}
              style={styles.input}
            />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Quantidade de dias</Text>
            <View style={styles.r2}>
              <TextInput
                value={hospedagemDias}
                onChangeText={setHospedagemDias}
                placeholder="Ex.: 5"
                placeholderTextColor={ViaColors.onSurfaceVariant}
                keyboardType="number-pad"
                style={[styles.input, { flex: 1 }]}
              />
            </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Valor da diaria</Text>
              <View style={styles.r2}>
              <TextInput
                value={hospedagemDiaria}
                onChangeText={setHospedagemDiaria}
                placeholder="Ex.: 365,00"
                placeholderTextColor={ViaColors.onSurfaceVariant}
                keyboardType="decimal-pad"
                style={[styles.input, { flex: 1 }]}
              />
            </View>
            </View>
            <Text style={styles.hint}>
              Total hospedagem estimado: R$ {hospedagemTotal.toFixed(2)}
            </Text>
          </SectionCard>
        )}

        {step === 4 && (
          <SectionCard>
            <Text style={styles.label}>Gastos por sessao</Text>
            <View style={styles.subSectionCard}>
              <Text style={styles.subSectionTitle}>Transporte local</Text>
              <TextInput
                value={transporteNome}
                onChangeText={setTransporteNome}
                placeholder="Ex.: Uber, onibus, metro"
                placeholderTextColor={ViaColors.onSurfaceVariant}
                style={styles.input}
              />
              <TextInput
                value={transporteValor}
                onChangeText={setTransporteValor}
                placeholder="Valor estimado"
                placeholderTextColor={ViaColors.onSurfaceVariant}
                keyboardType="decimal-pad"
                style={styles.input}
              />
              <Pressable
                onPress={() =>
                  addExpenseItem(
                    transporteNome,
                    transporteValorNum,
                    setTransporteItens,
                    () => setTransporteNome(''),
                    () => setTransporteValor(''),
                  )
                }
                style={styles.addItemBtn}>
                <Text style={styles.addItemBtnTxt}>Adicionar gasto</Text>
              </Pressable>
              {transporteItens.map((item, idx) => (
                <Text key={`${item.nome}-${idx}`} style={styles.itemRow}>- {item.nome}: R$ {item.valor.toFixed(2)}</Text>
              ))}
            </View>
            <View style={styles.subSectionCard}>
              <Text style={styles.subSectionTitle}>Alimentacao</Text>
              <TextInput
                value={alimentacaoNome}
                onChangeText={setAlimentacaoNome}
                placeholder="Nome do lugar/refeicao"
                placeholderTextColor={ViaColors.onSurfaceVariant}
                style={styles.input}
              />
              <TextInput
                value={alimentacaoValor}
                onChangeText={setAlimentacaoValor}
                placeholder="Valor estimado"
                placeholderTextColor={ViaColors.onSurfaceVariant}
                keyboardType="decimal-pad"
                style={styles.input}
              />
              <Pressable
                onPress={() =>
                  addExpenseItem(
                    alimentacaoNome,
                    alimentacaoValorNum,
                    setAlimentacaoItens,
                    () => setAlimentacaoNome(''),
                    () => setAlimentacaoValor(''),
                  )
                }
                style={styles.addItemBtn}>
                <Text style={styles.addItemBtnTxt}>Adicionar gasto</Text>
              </Pressable>
              {alimentacaoItens.map((item, idx) => (
                <Text key={`${item.nome}-${idx}`} style={styles.itemRow}>- {item.nome}: R$ {item.valor.toFixed(2)}</Text>
              ))}
            </View>
            <View style={styles.subSectionCard}>
              <Text style={styles.subSectionTitle}>Passeios</Text>
              <TextInput
                value={passeiosNome}
                onChangeText={setPasseiosNome}
                placeholder="Nome do passeio"
                placeholderTextColor={ViaColors.onSurfaceVariant}
                style={styles.input}
              />
              <TextInput
                value={passeiosValor}
                onChangeText={setPasseiosValor}
                placeholder="Valor estimado"
                placeholderTextColor={ViaColors.onSurfaceVariant}
                keyboardType="decimal-pad"
                style={styles.input}
              />
              <Pressable
                onPress={() =>
                  addExpenseItem(
                    passeiosNome,
                    passeiosValorNum,
                    setPasseiosItens,
                    () => setPasseiosNome(''),
                    () => setPasseiosValor(''),
                  )
                }
                style={styles.addItemBtn}>
                <Text style={styles.addItemBtnTxt}>Adicionar gasto</Text>
              </Pressable>
              {passeiosItens.map((item, idx) => (
                <Text key={`${item.nome}-${idx}`} style={styles.itemRow}>- {item.nome}: R$ {item.valor.toFixed(2)}</Text>
              ))}
            </View>
            <View style={styles.subSectionCard}>
              <Text style={styles.subSectionTitle}>Compras</Text>
              <TextInput
                value={comprasNome}
                onChangeText={setComprasNome}
                placeholder="Nome da compra"
                placeholderTextColor={ViaColors.onSurfaceVariant}
                style={styles.input}
              />
              <TextInput
                value={comprasValor}
                onChangeText={setComprasValor}
                placeholder="Valor estimado"
                placeholderTextColor={ViaColors.onSurfaceVariant}
                keyboardType="decimal-pad"
                style={styles.input}
              />
              <Pressable
                onPress={() =>
                  addExpenseItem(
                    comprasNome,
                    comprasValorNum,
                    setComprasItens,
                    () => setComprasNome(''),
                    () => setComprasValor(''),
                  )
                }
                style={styles.addItemBtn}>
                <Text style={styles.addItemBtnTxt}>Adicionar gasto</Text>
              </Pressable>
              {comprasItens.map((item, idx) => (
                <Text key={`${item.nome}-${idx}`} style={styles.itemRow}>- {item.nome}: R$ {item.valor.toFixed(2)}</Text>
              ))}
            </View>
            <View style={styles.subSectionCard}>
              <Text style={styles.subSectionTitle}>Outros</Text>
              <TextInput
                value={outrosNome}
                onChangeText={setOutrosNome}
                placeholder="Nome do gasto"
                placeholderTextColor={ViaColors.onSurfaceVariant}
                style={styles.input}
              />
              <TextInput
                value={outrosValor}
                onChangeText={setOutrosValor}
                placeholder="Valor estimado"
                placeholderTextColor={ViaColors.onSurfaceVariant}
                keyboardType="decimal-pad"
                style={styles.input}
              />
              <Pressable
                onPress={() =>
                  addExpenseItem(
                    outrosNome,
                    outrosValorNum,
                    setOutrosItens,
                    () => setOutrosNome(''),
                    () => setOutrosValor(''),
                  )
                }
                style={styles.addItemBtn}>
                <Text style={styles.addItemBtnTxt}>Adicionar gasto</Text>
              </Pressable>
              {outrosItens.map((item, idx) => (
                <Text key={`${item.nome}-${idx}`} style={styles.itemRow}>- {item.nome}: R$ {item.valor.toFixed(2)}</Text>
              ))}
            </View>
          </SectionCard>
        )}

        {step === 5 && (
          <SectionCard>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryHeaderText}>Resumo da criacao</Text>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryLabelWithIcon}>
                <MaterialIcons name="hotel" size={16} color={ViaColors.onSurfaceVariant} />
                <Text style={styles.summaryLabel}>Hospedagem total</Text>
              </View>
              <Text style={styles.summaryValue}>R$ {hospedagemTotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryLabelWithIcon}>
                <MaterialIcons name="flight-takeoff" size={16} color={ViaColors.onSurfaceVariant} />
                <Text style={styles.summaryLabel}>Transporte principal</Text>
              </View>
              <Text style={styles.summaryValue}>R$ {transporteInterurbanoTotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryLabelWithIcon}>
                <MaterialIcons name="local-taxi" size={16} color={ViaColors.onSurfaceVariant} />
                <Text style={styles.summaryLabel}>Transporte local</Text>
              </View>
              <Text style={styles.summaryValue}>R$ {transporteItensTotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryLabelWithIcon}>
                <MaterialIcons name="restaurant" size={16} color={ViaColors.onSurfaceVariant} />
                <Text style={styles.summaryLabel}>Alimentacao</Text>
              </View>
              <Text style={styles.summaryValue}>R$ {alimentacaoItensTotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryLabelWithIcon}>
                <MaterialIcons name="map" size={16} color={ViaColors.onSurfaceVariant} />
                <Text style={styles.summaryLabel}>Passeios</Text>
              </View>
              <Text style={styles.summaryValue}>R$ {passeiosItensTotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryLabelWithIcon}>
                <MaterialIcons name="shopping-bag" size={16} color={ViaColors.onSurfaceVariant} />
                <Text style={styles.summaryLabel}>Compras</Text>
              </View>
              <Text style={styles.summaryValue}>R$ {comprasItensTotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryLabelWithIcon}>
                <MaterialIcons name="more-horiz" size={16} color={ViaColors.onSurfaceVariant} />
                <Text style={styles.summaryLabel}>Outros</Text>
              </View>
              <Text style={styles.summaryValue}>R$ {outrosItensTotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryLabelWithIcon}>
                <MaterialIcons name="payments" size={16} color={ViaColors.onSurfaceVariant} />
                <Text style={styles.summaryLabel}>Total estimado da viagem</Text>
              </View>
              <Text style={styles.summaryValueStrong}>R$ {totalEstimadoViagem.toFixed(2)}</Text>
            </View>
          </SectionCard>
        )}

        {m.isPending ? (
          <ActivityIndicator size="small" color={ViaColors.coral} />
        ) : null}
        {err ? <Text style={styles.errText}>{err}</Text> : null}
        <View style={styles.actions}>
          {step > 1 && (
            <Pressable onPress={() => setStep((s) => s - 1)} style={styles.ghostBtn}>
              <Text style={styles.ghostBtnText}>Voltar</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => {
              setErr(null);
              if (step === 1 && !canContinue) return setErr('Defina um destino para continuar.');
              if (step === 2 && !origemPrincipal) return setErr('Defina a cidade de origem para continuar.');
              if (step === 2 && transporte !== 'carro' && !hubOrigem.trim()) {
                return setErr('Defina aeroporto/terminal de origem para continuar.');
              }
              if (step === 3 && (!hospedagemLocalPrincipal || Number.isNaN(hospedagemDiasNum) || hospedagemDiasNum <= 0 || Number.isNaN(hospedagemDiariaNum) || hospedagemDiariaNum <= 0)) {
                return setErr('Preencha local, dias e valor da diaria para continuar.');
              }
              if (step < 5) return setStep((s) => s + 1);
              if (totalEstimadoViagem <= 0) return setErr('Informe pelo menos um gasto para gerar o resumo.');
              m.mutate();
            }}
            style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.9 }]}>
            <Text style={styles.nextBtnText}>{step < 5 ? 'Continuar' : 'Criar viagem'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ViaColors.background },
  body: { flexGrow: 1, padding: ViaSpacing.margin, gap: ViaSpacing.xl, paddingBottom: 44 },
  lead: { color: ViaColors.onSurfaceVariant, marginBottom: ViaSpacing.sm, lineHeight: 22 },
  field: { gap: ViaSpacing.sm, marginBottom: ViaSpacing.sm },
  flowTitle: { ...textBodySm, fontFamily: ViaFonts.bodySemi, color: ViaColors.navy, marginBottom: 10 },
  flowHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  flowStepWrap: { alignItems: 'center', flex: 1 },
  stepIconWrapActive: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: ViaColors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: ViaColors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: ViaColors.sand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  flowStepActive: { ...textBodySm, fontFamily: ViaFonts.bodySemi, color: ViaColors.navy, fontSize: 11, textAlign: 'center' },
  flowStepMuted: { ...textBodySm, color: ViaColors.onSurfaceVariant, fontSize: 11, textAlign: 'center' },
  flowLine: {
    position: 'absolute',
    top: 17,
    right: -18,
    width: 36,
    height: 2,
    backgroundColor: 'rgba(226,209,179,0.65)',
  },
  flowLineActive: {
    position: 'absolute',
    top: 17,
    right: -18,
    width: 36,
    height: 2,
    backgroundColor: ViaColors.coral,
  },
  label: { ...textBodySm, color: '#6B7280', fontFamily: ViaFonts.bodySemi },
  input: {
    fontFamily: ViaFonts.body,
    fontSize: 15,
    color: ViaColors.onSurface,
    borderWidth: 1,
    borderColor: 'rgba(203,213,225,0.95)',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 12,
    backgroundColor: '#EEF2F6',
    marginBottom: 2,
  },
  suggestWrap: {
    borderWidth: 1,
    borderColor: 'rgba(203,213,225,0.95)',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 6,
    backgroundColor: '#EEF2F6',
  },
  suggestItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(226,209,179,0.25)' },
  suggestText: { fontFamily: ViaFonts.body, fontSize: 14, color: ViaColors.onSurface },
  hint: { ...textBodySm, color: ViaColors.onSurfaceVariant, fontSize: 12, lineHeight: 18 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, marginBottom: 12 },
  r2: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 8 },
  chip: {
    borderWidth: 1,
    borderColor: ViaColors.sand,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: ViaColors.primaryContainer, borderColor: ViaColors.navy },
  chipText: { fontFamily: ViaFonts.body, color: ViaColors.navy, textTransform: 'capitalize' },
  chipTextActive: { color: ViaColors.onPrimary },
  subSectionCard: {
    borderWidth: 1,
    borderColor: 'rgba(203,213,225,0.9)',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginBottom: 14,
    backgroundColor: '#F1F5F9',
  },
  subSectionTitle: { ...textBodySm, fontFamily: ViaFonts.bodySemi, color: '#6B7280', marginBottom: 2 },
  addItemBtn: {
    alignSelf: 'flex-start',
    backgroundColor: ViaColors.primaryContainer,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
  },
  addItemBtnTxt: { fontFamily: ViaFonts.bodySemi, fontSize: 12, color: ViaColors.onPrimary },
  itemRow: { ...textBodySm, color: ViaColors.onSurfaceVariant, marginTop: 2 },
  summaryHeader: {
    backgroundColor: ViaColors.navy,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  summaryHeaderText: { fontFamily: ViaFonts.bodySemi, color: '#FFFFFF', fontSize: 15 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  summaryLabelWithIcon: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryLabel: { ...textBodySm, color: ViaColors.onSurfaceVariant },
  summaryValue: { fontFamily: ViaFonts.bodySemi, color: ViaColors.navy, fontSize: 14 },
  summaryValueStrong: { fontFamily: ViaFonts.h3, color: ViaColors.navy, fontSize: 16 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  ghostBtn: {
    borderWidth: 1,
    borderColor: ViaColors.sand,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  ghostBtnText: { fontFamily: ViaFonts.bodySemi, color: ViaColors.navy },
  nextBtn: {
    flex: 1,
    backgroundColor: ViaColors.primaryContainer,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnText: { fontFamily: ViaFonts.bodySemi, fontSize: 16, color: ViaColors.onPrimary },
  errText: { color: '#ba1a1a', fontSize: 14, fontFamily: ViaFonts.body },
});
