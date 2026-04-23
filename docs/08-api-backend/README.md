# 08 — API Backend

> Backend Fastify + Prisma do ViaWay. Este documento concentra contrato da API, setup local e fluxo de testes Postman.

---

## Base URL e autenticação

- **Local:** `http://localhost:3001/v1`
- **Auth (produção):**
  - `Authorization: Bearer <token>`
- **Auth (dev local):**
  - `DISABLE_AUTH=true` + `NODE_ENV=development`

---

## Setup local rápido

Pré-requisitos:

- Node.js 22+
- PostgreSQL 16+ local
- Banco coerente com `DATABASE_URL` (ex.: `viaway`)

No backend:

```bash
cd ../../backend
copy .env.example .env
npm install
npm run db:migrate:deploy
npm run db:seed
npm run dev
```

Exemplo de `.env` local:

```env
NODE_ENV=development
PORT=3001
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/viaway?schema=public"
DISABLE_AUTH=true
DEV_CLERK_ID=user_dev_1
DEV_USER_EMAIL=dev@viaway.local
DEV_USER_NOME=Dev Local
```

---

## Formato de resposta

Sucesso:

```json
{
  "data": {},
  "meta": {}
}
```

Erro:

```json
{
  "error": "codigo_do_erro",
  "message": "mensagem",
  "details": {}
}
```

---

## Endpoints MVP Free implementados

### Health

- `GET /health`

### Viagens

- `GET /viagens` (filtro/paginação: `status`, `page`, `pageSize`)
- `POST /viagens`
- `GET /viagens/:id`
- `PUT /viagens/:id`
- `DELETE /viagens/:id` (soft delete)

Regras aplicadas:

- Limite Free de viagens ativas
- Viagens concluídas não entram no limite de ativas
- Indicador de destaque em andamento na listagem

### Itinerário

- `GET /itinerario/dias?viagemId=...`
- `POST /itinerario/dias`
- `PUT /itinerario/dias/:id`
- `DELETE /itinerario/dias/:id`
- `GET /itinerario/atividades?diaId=...`
- `POST /itinerario/atividades`
- `PUT /itinerario/atividades/:id`
- `DELETE /itinerario/atividades/:id`

### Lugares

- `GET /lugares?viagemId=...`
- `POST /lugares`
- `PUT /lugares/:id`
- `DELETE /lugares/:id` (soft delete)

Regras aplicadas:

- Limite Free de lugares por viagem
- Bloqueio de exclusão se lugar estiver vinculado a atividade

### Cotações

- `GET /cotacoes?viagemId=...`
- `GET /cotacoes/comparativo?viagemId=...`
- `POST /cotacoes`
- `PUT /cotacoes/:id`
- `DELETE /cotacoes/:id`

Regras aplicadas:

- Limite Free de cotações por viagem

### Gastos

- `GET /gastos?viagemId=...`
- `GET /gastos/painel?viagemId=...`
- `POST /gastos`
- `PUT /gastos/:id`
- `DELETE /gastos/:id`

Painel calcula em tempo real:

- orçamento total
- cotações escolhidas
- já gasto
- saldo disponível
- custo estimado por dia

### Checklist

- `GET /checklists?viagemId=...`
- `POST /checklists`
- `PATCH /checklists/:id/toggle`
- `PUT /checklists/:id`
- `DELETE /checklists/:id`

---

## Postman (centralizado no módulo 08)

Arquivos:

- `./postman/viaway-backend-local.postman_collection.json`
- `./postman/viaway-backend-local.postman_environment.json`

Passos:

1. Importar os dois arquivos
2. Selecionar ambiente `ViaWay Backend Local`
3. Rodar por módulo (Viagens -> Itinerário -> Lugares -> Cotações -> Gastos -> Checklist)
4. Validar retorno `200/201/204` e payload esperado

---

## Estrutura atual do backend (real)

```text
backend/
|- src/
|  |- auth/resolve-usuario.ts
|  |- lib/prisma.ts
|  |- lib/reply.ts
|  |- lib/plan-limits.ts
|  |- routes/v1/
|  |  |- health.ts
|  |  |- viagens.ts
|  |  |- itinerario.ts
|  |  |- lugares.ts
|  |  |- cotacoes.ts
|  |  |- gastos.ts
|  |  |- checklists.ts
|  |  `- index.ts
|  `- server.ts
`- prisma/
   |- schema.prisma
   |- migrations/
   `- seed.ts
```

---

*← [07 — Integrações](../07-integracoes/README.md) | Próximo: [09 — Mobile →](../09-mobile/README.md)*
