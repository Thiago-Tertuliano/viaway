export const viawayOpenApi = {
  openapi: "3.0.3",
  info: {
    title: "ViaWay API",
    version: "1.0.0",
    description: "API MVP Free do ViaWay",
  },
  servers: [{ url: "/v1", description: "Base local/proxy" }],
  tags: [
    { name: "Health" },
    { name: "Viagens" },
    { name: "Itinerario" },
    { name: "Lugares" },
    { name: "Cotacoes" },
    { name: "Gastos" },
    { name: "Checklist" },
  ],
  paths: {
    "/health": { get: { tags: ["Health"], summary: "Health check" } },
    "/viagens": {
      get: { tags: ["Viagens"], summary: "Lista viagens" },
      post: { tags: ["Viagens"], summary: "Cria viagem" },
    },
    "/viagens/{id}": {
      get: { tags: ["Viagens"], summary: "Obtém viagem por ID" },
      put: { tags: ["Viagens"], summary: "Atualiza viagem" },
      delete: { tags: ["Viagens"], summary: "Soft delete de viagem" },
    },
    "/itinerario/dias": {
      get: { tags: ["Itinerario"], summary: "Lista dias do itinerário" },
      post: { tags: ["Itinerario"], summary: "Cria dia de itinerário" },
    },
    "/itinerario/dias/{id}": {
      put: { tags: ["Itinerario"], summary: "Atualiza dia de itinerário" },
      delete: { tags: ["Itinerario"], summary: "Exclui dia de itinerário" },
    },
    "/itinerario/atividades": {
      get: { tags: ["Itinerario"], summary: "Lista atividades por dia" },
      post: { tags: ["Itinerario"], summary: "Cria atividade" },
    },
    "/itinerario/atividades/{id}": {
      put: { tags: ["Itinerario"], summary: "Atualiza atividade" },
      delete: { tags: ["Itinerario"], summary: "Exclui atividade" },
    },
    "/lugares": {
      get: { tags: ["Lugares"], summary: "Lista lugares" },
      post: { tags: ["Lugares"], summary: "Cria lugar" },
    },
    "/lugares/{id}": {
      put: { tags: ["Lugares"], summary: "Atualiza lugar" },
      delete: { tags: ["Lugares"], summary: "Exclui lugar (soft delete)" },
    },
    "/cotacoes": {
      get: { tags: ["Cotacoes"], summary: "Lista cotações" },
      post: { tags: ["Cotacoes"], summary: "Cria cotação" },
    },
    "/cotacoes/comparativo": {
      get: { tags: ["Cotacoes"], summary: "Retorna comparativo de cotações" },
    },
    "/cotacoes/{id}": {
      put: { tags: ["Cotacoes"], summary: "Atualiza cotação" },
      delete: { tags: ["Cotacoes"], summary: "Exclui cotação" },
    },
    "/gastos": {
      get: { tags: ["Gastos"], summary: "Lista gastos" },
      post: { tags: ["Gastos"], summary: "Cria gasto" },
    },
    "/gastos/painel": {
      get: { tags: ["Gastos"], summary: "Painel financeiro da viagem" },
    },
    "/gastos/{id}": {
      put: { tags: ["Gastos"], summary: "Atualiza gasto" },
      delete: { tags: ["Gastos"], summary: "Exclui gasto" },
    },
    "/checklists": {
      get: { tags: ["Checklist"], summary: "Lista checklist da viagem" },
      post: { tags: ["Checklist"], summary: "Cria item de checklist" },
    },
    "/checklists/{id}": {
      put: { tags: ["Checklist"], summary: "Atualiza item do checklist" },
      delete: { tags: ["Checklist"], summary: "Exclui item do checklist" },
    },
    "/checklists/{id}/toggle": {
      patch: { tags: ["Checklist"], summary: "Alterna concluído de checklist" },
    },
  },
} as const;

