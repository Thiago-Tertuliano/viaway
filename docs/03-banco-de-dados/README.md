# 03 — Banco de Dados

> PostgreSQL 16 + Prisma 5. Schema completo, índices, RLS e estratégia de migrations.

---

## Decisões de Design

| Decisão | Escolha | Motivo |
|---|---|---|
| IDs | `cuid()` via Prisma | URL-safe, sem colisão, legível em logs |
| Timestamps | `createdAt` + `updatedAt` em toda tabela | Auditoria e sync incremental |
| Soft delete | `deletedAt DateTime?` em entidades principais | Recuperação de dados, histórico |
| JSONs flexíveis | `Json` (JSONB no PostgreSQL) | `fotos`, `tags`, `destinosSecundarios` sem joins desnecessários |
| Enums | Prisma enum | Type-safety no ORM e constraint no banco |
| Naming | `snake_case` no banco (`@@map`), `camelCase` no Prisma | Convenção Prisma + PostgreSQL |

---

## Schema Prisma Completo

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────

enum Plano {
  free
  pro
}

enum StatusViagem {
  planejando
  confirmada
  em_andamento
  concluida
}

enum TipoAtividade {
  atividade
  refeicao
  transporte
  hospedagem
  livre
}

enum StatusAtividade {
  pendente
  confirmado
  concluido
}

enum TipoLugar {
  restaurante
  hotel
  ponto_turistico
  praia
  museu
  bar
  outro
}

enum StatusLugar {
  quero_ir
  ja_fui
  descartado
}

enum FonteLugar {
  manual
  google
  ia
}

enum TipoCotacao {
  hospedagem
  passagem_aerea
  terrestre
  passeio
  outro
}

enum StatusCotacao {
  analise
  escolhido
  descartado
}

enum CategoriaGasto {
  transporte
  hospedagem
  alimentacao
  passeio
  compras
  outro
}

enum OrigemChecklist {
  manual
  ia
}

// ─────────────────────────────────────────
// USUÁRIO
// ─────────────────────────────────────────

model Usuario {
  id           String    @id @default(cuid())
  clerkId      String    @unique
  nome         String
  email        String    @unique
  fotoUrl      String?
  plano        Plano     @default(free)
  proExpiraEm  DateTime?
  criadoEm     DateTime  @default(now())
  ultimoAcesso DateTime  @default(now())
  deletadoEm   DateTime?

  viagens  Viagem[]
  lugares  Lugar[]

  @@index([clerkId])
  @@index([email])
  @@index([plano])
  @@map("usuarios")
}

// ─────────────────────────────────────────
// VIAGEM
// ─────────────────────────────────────────

model Viagem {
  id                   String       @id @default(cuid())
  usuarioId            String
  nome                 String
  destinoPrincipal     String
  destinosSecundarios  Json         @default("[]")
  dataIda              DateTime?
  dataVolta            DateTime?
  numViajantes         Int          @default(1)
  capaUrl              String?
  status               StatusViagem @default(planejando)
  orcamentoTotal       Decimal?     @db.Decimal(10, 2)
  notas                String?
  criadoEm             DateTime     @default(now())
  atualizadoEm         DateTime     @updatedAt
  deletadoEm           DateTime?

  usuario      Usuario          @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  dias         ItinerarioDia[]
  lugares      Lugar[]
  cotacoes     Cotacao[]
  gastos       Gasto[]
  checklists   Checklist[]

  @@index([usuarioId])
  @@index([status])
  @@index([dataIda])
  @@index([usuarioId, status])
  @@map("viagens")
}

// ─────────────────────────────────────────
// ITINERÁRIO
// ─────────────────────────────────────────

model ItinerarioDia {
  id         String   @id @default(cuid())
  viagemId   String
  data       DateTime @db.Date
  ordem      Int
  resumoDia  String?
  criadoEm   DateTime @default(now())

  viagem     Viagem      @relation(fields: [viagemId], references: [id], onDelete: Cascade)
  atividades Atividade[]

  @@unique([viagemId, data])
  @@index([viagemId])
  @@index([viagemId, ordem])
  @@map("itinerario_dias")
}

model Atividade {
  id             String          @id @default(cuid())
  diaId          String
  viagemId       String
  lugarId        String?
  tipo           TipoAtividade   @default(atividade)
  nome           String
  horarioInicio  DateTime?       @db.Time
  horarioFim     DateTime?       @db.Time
  duracaoMin     Int?
  custoEstimado  Decimal?        @db.Decimal(10, 2)
  notas          String?
  status         StatusAtividade @default(pendente)
  ordem          Int
  criadoEm       DateTime        @default(now())
  atualizadoEm   DateTime        @updatedAt

  dia    ItinerarioDia @relation(fields: [diaId], references: [id], onDelete: Cascade)
  lugar  Lugar?        @relation(fields: [lugarId], references: [id], onDelete: SetNull)

  @@index([diaId])
  @@index([viagemId])
  @@index([lugarId])
  @@index([diaId, ordem])
  @@map("atividades")
}

// ─────────────────────────────────────────
// LUGARES
// ─────────────────────────────────────────

model Lugar {
  id             String      @id @default(cuid())
  usuarioId      String
  viagemId       String?
  nome           String
  tipo           TipoLugar   @default(outro)
  cidade         String?
  estado         String?
  pais           String?
  endereco       String?
  lat            Float?
  lng            Float?
  googlePlaceId  String?
  notaGoogle     Float?
  fotos          Json        @default("[]")
  notaPessoal    String?
  status         StatusLugar @default(quero_ir)
  tags           Json        @default("[]")
  fonte          FonteLugar  @default(manual)
  criadoEm       DateTime    @default(now())
  atualizadoEm   DateTime    @updatedAt
  deletadoEm     DateTime?

  usuario    Usuario     @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  viagem     Viagem?     @relation(fields: [viagemId], references: [id], onDelete: SetNull)
  atividades Atividade[]

  @@index([usuarioId])
  @@index([viagemId])
  @@index([googlePlaceId])
  @@index([usuarioId, status])
  @@index([usuarioId, viagemId])
  @@map("lugares")
}

// ─────────────────────────────────────────
// COTAÇÕES
// ─────────────────────────────────────────

model Cotacao {
  id             String        @id @default(cuid())
  viagemId       String
  tipo           TipoCotacao
  fornecedor     String
  periodoInicio  DateTime?     @db.Date
  periodoFim     DateTime?     @db.Date
  valorTotal     Decimal       @db.Decimal(10, 2)
  valorPorPessoa Decimal?      @db.Decimal(10, 2)
  link           String?
  notas          String?
  status         StatusCotacao @default(analise)
  criadoEm       DateTime      @default(now())
  atualizadoEm   DateTime      @updatedAt

  viagem Viagem @relation(fields: [viagemId], references: [id], onDelete: Cascade)

  @@index([viagemId])
  @@index([viagemId, status])
  @@map("cotacoes")
}

// ─────────────────────────────────────────
// GASTOS
// ─────────────────────────────────────────

model Gasto {
  id              String         @id @default(cuid())
  viagemId        String
  descricao       String
  categoria       CategoriaGasto
  valor           Decimal        @db.Decimal(10, 2)
  data            DateTime       @db.Date
  comprovanteUrl  String?
  notas           String?
  criadoEm        DateTime       @default(now())
  atualizadoEm    DateTime       @updatedAt

  viagem Viagem @relation(fields: [viagemId], references: [id], onDelete: Cascade)

  @@index([viagemId])
  @@index([viagemId, data])
  @@index([viagemId, categoria])
  @@map("gastos")
}

// ─────────────────────────────────────────
// CHECKLIST
// ─────────────────────────────────────────

model Checklist {
  id         String          @id @default(cuid())
  viagemId   String
  item       String
  categoria  String?
  concluido  Boolean         @default(false)
  ordem      Int
  origem     OrigemChecklist @default(manual)
  criadoEm   DateTime        @default(now())

  viagem Viagem @relation(fields: [viagemId], references: [id], onDelete: Cascade)

  @@index([viagemId])
  @@index([viagemId, concluido])
  @@map("checklists")
}
```

---

## Índices — Justificativas

| Índice | Tabela | Motivo |
|--------|--------|--------|
| `clerkId` | usuarios | Lookup em cada request autenticado |
| `usuarioId` | viagens | Toda query filtra por usuário |
| `usuarioId, status` | viagens | Filtro de viagens ativas (RN01) |
| `diaId, ordem` | atividades | Ordenação do itinerário |
| `lugarId` | atividades | Verificação RN10 (lugar vinculado) |
| `googlePlaceId` | lugares | Evitar duplicatas ao importar do Google |
| `usuarioId, viagemId` | lugares | Contagem para limite Free (RN02) |
| `viagemId, data` | gastos | Painel financeiro por período |
| `viagemId, status` | cotacoes | Filtro de cotações escolhidas |

---

## Campos Calculados (não persistidos)

Calculados em tempo real na query ou na aplicação:

| Campo | Entidade | Fórmula |
|-------|----------|---------|
| `totalGastoDia` | ItinerarioDia | `SUM(atividades.custoEstimado)` |
| `totalCotacoesEscolhidas` | Viagem | `SUM(cotacoes.valorTotal WHERE status = escolhido)` |
| `totalGasto` | Viagem | `SUM(gastos.valor)` |
| `saldoDisponivel` | Viagem | `orcamentoTotal - totalCotacoesEscolhidas - totalGasto` |
| `custoPorDia` | Viagem | `totalGasto / duracao_dias` |
| `progressoItinerario` | Viagem | `atividades_confirmadas / total_atividades * 100` |

---

## Row Level Security (RLS)

O PostgreSQL suporta RLS nativo. Para o Wandr, a segurança é aplicada no **nível da aplicação** (middleware Fastify verifica o `usuarioId` via Clerk), não via RLS nativo do banco — isso simplifica a gestão e evita complexidade prematura.

**Regra:** Todo endpoint valida que o recurso solicitado pertence ao `usuarioId` do token Clerk antes de qualquer operação.

Futuramente (Fase 4, viagens compartilhadas), revisar se RLS nativo é necessário.

---

## Migrations — Workflow

```bash
# Desenvolvimento — cria migration e aplica
npx prisma migrate dev --name nome_descritivo

# Produção — NUNCA usar migrate dev
npx prisma migrate deploy

# Gerar Prisma Client após mudança de schema
npx prisma generate

# Visualizar banco no Prisma Studio
npx prisma studio

# Verificar status das migrations
npx prisma migrate status

# Reset do banco em desenvolvimento (apaga tudo)
npx prisma migrate reset
```

**Convenção de nomes de migration:**
```
YYYYMMDDHHMMSS_nome_descritivo
Ex: 20260418120000_create_usuarios_viagens
    20260420090000_add_google_place_id_to_lugares
```

---

## Seed de Dados (Desenvolvimento)

Arquivo: `prisma/seed.ts`

```typescript
// Seed mínimo para desenvolvimento
const seed = async () => {
  // 1. Criar usuário de teste
  const usuario = await prisma.usuario.upsert({
    where: { clerkId: 'user_test_dev' },
    update: {},
    create: {
      clerkId: 'user_test_dev',
      nome: 'Dev User',
      email: 'dev@wandr.app',
      plano: 'pro',
    }
  })

  // 2. Criar viagem de exemplo
  const viagem = await prisma.viagem.create({
    data: {
      usuarioId: usuario.id,
      nome: 'Floripa com a família — Jan 2026',
      destinoPrincipal: 'Florianópolis, SC',
      dataIda: new Date('2026-01-15'),
      dataVolta: new Date('2026-01-22'),
      numViajantes: 4,
      status: 'planejando',
      orcamentoTotal: 8000.00,
    }
  })

  // 3. Criar dias do itinerário
  // 4. Criar lugares de exemplo
  // 5. Criar cotações de exemplo
}
```

---

## Connection Pooling

Em produção no Railway:

```env
# URL com PgBouncer (Railway addon)
DATABASE_URL="postgresql://user:pass@host:6543/wandr?pgbouncer=true&connection_limit=5"

# URL direta para migrations (nunca use pgbouncer para migrate)
DIRECT_URL="postgresql://user:pass@host:5432/wandr"
```

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

---

## Soft Delete — Estratégia

Tabelas com soft delete: `usuarios`, `viagens`, `lugares`

```typescript
// Toda query de listagem DEVE filtrar deletadoEm
const viagens = await prisma.viagem.findMany({
  where: {
    usuarioId: req.user.id,
    deletadoEm: null, // ← obrigatório
  }
})

// Soft delete
await prisma.viagem.update({
  where: { id: viagemId },
  data: { deletadoEm: new Date() }
})
```

**Retenção:** Registros soft-deleted são mantidos por 90 dias, depois removidos via job periódico.

---

## Backup

| Estratégia | Frequência | Ferramenta |
|---|---|---|
| Backup automático | Diário | Railway (addon PostgreSQL) |
| Export manual | Semanal | `pg_dump` via script |
| Point-in-time recovery | Últimas 24h | Railway Pro |

---

*← [02 — Stack Técnica](../02-stack-tecnica/README.md) | Próximo: [04 — Autenticação →](../04-autenticacao/README.md)*
