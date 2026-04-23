# ViaWay API

Backend **Fastify 5** + **Prisma 5** + **PostgreSQL**, alinhado a `docs/08-api-backend` e `docs/03-banco-de-dados`.

## Requisitos

- Node.js 22+
- PostgreSQL 16+ local instalado (sem Docker)

## Setup local (sem Docker)

1. Crie banco local:

```sql
CREATE DATABASE viaway;
```

2. Configure ambiente:

```bash
cp .env.example .env
```

Use, por exemplo:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/viaway?schema=public"
DISABLE_AUTH=true
NODE_ENV=development
```

3. Instale dependências:

```bash
npm install
```

4. Aplique migrations e seed:

```bash
npm run db:migrate:deploy
npm run db:seed
```

5. Suba a API:

```bash
npm run dev
```

## Endpoints iniciais

- `GET http://localhost:3001/v1/health`
- `GET|POST http://localhost:3001/v1/viagens`
- `GET|PUT|DELETE http://localhost:3001/v1/viagens/:id`
- `Swagger UI: http://localhost:3001/v1/docs`

## Scripts úteis

- `npm run db:generate` — gera client Prisma
- `npm run db:migrate` — cria/aplica migration em dev
- `npm run db:migrate:deploy` — aplica migrations existentes
- `npm run db:seed` — popula usuário e viagens mínimas
- `npm run db:studio` — abre Prisma Studio

## Produção

```bash
npm run build
npm start
```

Use `CLERK_SECRET_KEY` e `CLERK_PUBLISHABLE_KEY`; **não** use `DISABLE_AUTH`.
