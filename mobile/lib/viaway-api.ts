import {
  type ApiListMeta,
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
} from './api-client';

// --- Viagens ---

export type ViagemJson = {
  id: string;
  nome: string;
  destinoPrincipal: string;
  destinosSecundarios: string[];
  dataIda: string | null;
  dataVolta: string | null;
  numViajantes: number;
  capaUrl: string | null;
  status: string;
  orcamentoTotal: number | null;
  notas: string | null;
  criadoEm: string;
  atualizadoEm: string;
  destaqueEmAndamento?: boolean;
};

export async function listViagens(page = 1) {
  const r = await apiGet<{ data: (ViagemJson & { destaqueEmAndamento: boolean })[]; meta: ApiListMeta }>(
    '/viagens',
    { page, pageSize: 50 },
  );
  return r;
}

export async function getViagem(id: string) {
  const r = await apiGet<{ data: ViagemJson }>(`/viagens/${id}`);
  return r.data;
}

export async function createViagem(body: {
  nome: string;
  destinoPrincipal: string;
  destinosSecundarios?: string[];
  orcamentoTotal?: number | null;
}) {
  const r = await apiPost<typeof body, { data: ViagemJson }>('/viagens', body);
  return r.data;
}

// --- Itinerário ---

export type DiaJson = {
  id: string;
  viagemId: string;
  data: string;
  ordem: number;
  resumoDia: string | null;
  criadoEm: string;
};

export type AtividadeJson = {
  id: string;
  diaId: string;
  viagemId: string;
  nome: string;
  horarioInicio: string | null;
  horarioFim: string | null;
  tipo: string;
  status: string;
  ordem: number;
  lugarId: string | null;
  custoEstimado: number | null;
  notas: string | null;
  criadoEm: string;
  atualizadoEm: string;
};

export function listDias(viagemId: string) {
  return apiGet<{ data: DiaJson[] }>('/itinerario/dias', { viagemId }).then((r) => r.data);
}

export function listAtividades(diaId: string) {
  return apiGet<{ data: AtividadeJson[] }>('/itinerario/atividades', { diaId }).then(
    (r) => r.data,
  );
}

// --- Lugares ---

export type LugarJson = {
  id: string;
  nome: string;
  tipo: string;
  viagemId: string | null;
  cidade: string | null;
  pais: string | null;
  endereco: string | null;
  status: string;
  criadoEm: string;
};

export function listLugaresViagem(viagemId: string) {
  return apiGet<{ data: LugarJson[] }>('/lugares', { viagemId }).then((r) => r.data);
}

// --- Cotações ---

export type CotacaoJson = {
  id: string;
  viagemId: string;
  tipo: string;
  fornecedor: string;
  valorTotal: number;
  status: string;
  link: string | null;
  periodoInicio: string | null;
  periodoFim: string | null;
  criadoEm: string;
};

export function listCotacoes(viagemId: string) {
  return apiGet<{ data: CotacaoJson[] }>('/cotacoes', { viagemId }).then((r) => r.data);
}

export function getComparativo(viagemId: string) {
  return apiGet<{
    data: {
      viagemId: string;
      totalCotacoes: number;
      comparativo: Record<string, CotacaoJson[]>;
    };
  }>('/cotacoes/comparativo', { viagemId }).then((r) => r.data);
}

// --- Gastos + painel ---

export type GastoJson = {
  id: string;
  viagemId: string;
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
  comprovanteUrl: string | null;
  notas: string | null;
  criadoEm: string;
};

export function listGastos(viagemId: string) {
  return apiGet<{ data: GastoJson[] }>('/gastos', { viagemId }).then((r) => r.data);
}

export type PainelGastos = {
  viagemId: string;
  orcamentoTotal: number;
  cotacoesConfirmadas: number;
  jaGasto: number;
  saldoDisponivel: number;
  custoEstimadoPorDia: number | null;
};

export function getPainelGastos(viagemId: string) {
  return apiGet<{ data: PainelGastos }>('/gastos/painel', { viagemId }).then((r) => r.data);
}

export function createGasto(body: {
  viagemId: string;
  descricao: string;
  categoria: GastoJson['categoria'];
  valor: number;
  data: string;
}) {
  return apiPost<typeof body, { data: GastoJson }>('/gastos', body).then((r) => r.data);
}

// --- Checklist ---

export type ChecklistJson = {
  id: string;
  viagemId: string;
  item: string;
  categoria: string | null;
  concluido: boolean;
  ordem: number;
  origem: string;
  criadoEm: string;
};

export function listChecklist(viagemId: string) {
  return apiGet<{ data: ChecklistJson[] }>('/checklists', { viagemId }).then((r) => r.data);
}

export function createChecklistItem(body: { viagemId: string; item: string; ordem: number }) {
  return apiPost<typeof body, { data: ChecklistJson }>('/checklists', body).then((r) => r.data);
}

export function toggleChecklist(id: string, concluido: boolean) {
  return apiPatch<{ concluido: boolean }, { data: ChecklistJson }>(`/checklists/${id}/toggle`, {
    concluido,
  }).then((r) => r.data);
}
