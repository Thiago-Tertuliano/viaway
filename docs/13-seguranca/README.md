# 13 — Segurança

> LGPD, proteção de rotas, secrets, rate limit e políticas de dados.

---

## Modelo de Ameaças

| Ameaça | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Token JWT roubado | Baixa | Alto | SecureStore, TTL curto (60s), Clerk refresh |
| Acesso a dados de outro usuário | Média | Alto | Verificação de ownership em todo endpoint |
| Webhook forjado (Clerk/RevenueCat) | Média | Alto | Validação HMAC em todos os webhooks |
| Rate limit abuse | Alta | Médio | `@fastify/rate-limit` |
| SQL injection | Baixa | Crítico | Prisma ORM (queries parametrizadas) |
| Secrets expostos no cliente | Baixa | Crítico | Variáveis EXPO_PUBLIC_ apenas para chaves públicas |
| Upload de arquivo malicioso | Média | Médio | Validação de MIME type, limite de tamanho |
| Scraping da API | Média | Baixo | Rate limit + autenticação obrigatória |

---

## Autenticação e Autorização

### Regras de ownership

**Todo endpoint que acessa um recurso deve verificar que o recurso pertence ao usuário autenticado.**

```typescript
// ✅ CORRETO — verificar ownership antes de retornar
async function getViagem(viagemId: string, usuarioId: string) {
  const viagem = await prisma.viagem.findFirst({
    where: {
      id: viagemId,
      usuarioId: usuarioId,  // ← verificação de ownership
      deletadoEm: null,
    }
  })

  if (!viagem) {
    throw new NotFoundError('Viagem não encontrada')
    // 404 em vez de 403 — não vazar que o recurso existe
  }

  return viagem
}

// ❌ ERRADO — buscar pelo ID e verificar depois
async function getViagemErrada(viagemId: string, usuarioId: string) {
  const viagem = await prisma.viagem.findUnique({ where: { id: viagemId } })

  if (viagem?.usuarioId !== usuarioId) {
    throw new ForbiddenError() // vazamento: confirma que o ID existe
  }
}
```

### Tokens e Sessões

| Item | Onde fica | TTL |
|---|---|---|
| Clerk Session Token | SecureStore (iOS Keychain / Android Keystore) | 60 segundos |
| Clerk Refresh Token | SecureStore | 30 dias |
| RevenueCat entitlement | Memória + verificação online | Verificado a cada abertura do app |
| Presigned URL (upload) | Retornado pela API, não persiste | 5 minutos |

**Nunca usar AsyncStorage para tokens** — AsyncStorage não é criptografado.

---

## Secrets — Política

### O que é secreto

| Secret | Onde fica | Como proteger |
|---|---|---|
| `CLERK_SECRET_KEY` | Railway env | Nunca no código, nunca no cliente |
| `CLERK_WEBHOOK_SECRET` | Railway env | Idem |
| `OPENAI_API_KEY` | Railway env | Idem |
| `GOOGLE_PLACES_API_KEY` | Railway env | Restringir por IP no GCP |
| `R2_SECRET_ACCESS_KEY` | Railway env | Idem |
| `REVENUECAT_WEBHOOK_SECRET` | Railway env | Idem |
| `DATABASE_URL` | Railway env | Idem |

### O que pode ser público (EXPO_PUBLIC_*)

| Variável | Tipo | Motivo |
|---|---|---|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Pública | Projetada para ser exposta |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | Pública | SDK RevenueCat usa no cliente |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | Pública | Idem |
| `EXPO_PUBLIC_API_URL` | Pública | URL do backend |

### Regras

- `EXPO_PUBLIC_*` → pode estar no cliente, mas nunca coloque chaves secretas nessas variáveis
- Nunca commitar `.env` — apenas `.env.example` com valores fictícios
- Rotacionar chaves comprometidas imediatamente via Railway Dashboard e Clerk Dashboard

---

## Rate Limiting

```typescript
// apps/api/src/server.ts
await fastify.register(rateLimit, {
  global: true,
  max: 100,
  timeWindow: '15 minutes',
  keyGenerator: (request) => request.headers['x-clerk-user-id'] || request.ip,
  errorResponseBuilder: (request, context) => ({
    error: 'rate_limit_exceeded',
    message: 'Muitas requisições. Tente novamente em alguns minutos.',
    retryAfter: context.after,
  }),
})

// Rate limit mais restritivo para IA
fastify.register(rateLimit, {
  max: 5,
  timeWindow: '1 hour',
  keyGenerator: (request) => `ia:${request.headers['x-clerk-user-id']}`,
  routeOverride: true,  // apenas nas rotas /ia/*
})

// Rate limit para busca Places
fastify.register(rateLimit, {
  max: 20,
  timeWindow: '1 hour',
  keyGenerator: (request) => `places:${request.headers['x-clerk-user-id']}`,
  routeOverride: true,
})
```

---

## LGPD — Conformidade

### Base Legal por Tipo de Dado

| Dado | Base Legal | Período de Retenção |
|---|---|---|
| Nome e e-mail | Execução de contrato | Enquanto conta ativa + 90 dias |
| Fotos de viagem | Execução de contrato | Enquanto viagem não deletada + 90 dias |
| Dados de localização | Consentimento (não coletamos em background) | Não persistimos |
| Dados de pagamento | Execução de contrato (via RevenueCat/Apple/Google) | Não armazenamos |
| Logs de sistema | Legítimo interesse (segurança) | 30 dias |
| Dados de IA | Execução de contrato (enviados para OpenAI) | Não armazenamos (OpenAI 30 dias) |
| Crash reports | Legítimo interesse (qualidade) | Sentry: 90 dias |

### Direitos do Titular

| Direito | Como implementar |
|---|---|
| Acesso | GET /v1/usuarios/meus-dados — exportar todos os dados |
| Correção | Edição de perfil no app |
| Exclusão | DELETE /v1/usuarios/minha-conta — soft delete + job de purge em 90 dias |
| Portabilidade | GET /v1/usuarios/exportar — JSON com todos os dados |
| Oposição | Configurações de comunicação no app |

### Endpoint de Exclusão de Conta

```typescript
// DELETE /v1/usuarios/minha-conta
// 1. Soft delete do usuário (deletadoEm = now())
// 2. Clerk: deletar usuário via API admin
// 3. RevenueCat: não precisa (dados ficam pelo prazo legal)
// 4. Job assíncrono em 90 dias:
//    - Deletar fotos do R2
//    - Hard delete do banco (exceto logs financeiros)
```

---

## Validação de Input

```typescript
// Toda rota usa schema Zod para validação
const criarViagemSchema = z.object({
  nome: z.string().min(1).max(200),
  destinoPrincipal: z.string().min(1).max(200),
  destinosSecundarios: z.array(z.string().max(200)).max(10).optional(),
  dataIda: z.string().datetime().optional().nullable(),
  dataVolta: z.string().datetime().optional().nullable(),
  numViajantes: z.number().int().min(1).max(50),
  orcamentoTotal: z.number().positive().max(9_999_999).optional().nullable(),
  notas: z.string().max(2000).optional().nullable(),
})

// Validação de arquivos de upload
const MIME_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp']
const TAMANHO_MAXIMO = 10 * 1024 * 1024 // 10MB

function validarArquivo(mimeType: string, tamanho: number) {
  if (!MIME_PERMITIDOS.includes(mimeType)) {
    throw new ValidationError('Tipo de arquivo não permitido. Use JPEG, PNG ou WebP.')
  }
  if (tamanho > TAMANHO_MAXIMO) {
    throw new ValidationError('Arquivo muito grande. Máximo 10MB.')
  }
}
```

---

## Headers de Segurança

```typescript
// @fastify/helmet configura automaticamente:
// Content-Security-Policy
// X-Content-Type-Options: nosniff
// X-Frame-Options: DENY
// X-XSS-Protection: 1; mode=block
// Strict-Transport-Security: max-age=31536000
// Referrer-Policy: no-referrer

await fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'https://cdn.wandr.app'],
      connectSrc: ["'self'", 'https://api.clerk.com'],
    }
  }
})
```

---

## CORS

```typescript
await fastify.register(cors, {
  origin: (origin, callback) => {
    const permitidos = [
      'https://wandr.app',
      'https://staging.wandr.app',
    ]

    // Permitir durante desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true)
    }

    if (!origin || permitidos.includes(origin)) {
      return callback(null, true)
    }

    callback(new Error('Not allowed by CORS'), false)
  },
  credentials: true,
})
```

---

## Auditoria

Logs estruturados para operações sensíveis (sem PII):

```typescript
// Logar operações importantes
logger.info({
  event: 'viagem.deleted',
  userId: usuario.id,
  viagemId: viagem.id,
  ts: new Date().toISOString(),
})

logger.warn({
  event: 'limite_atingido',
  userId: usuario.id,
  limite: 'viagens',
  total: 3,
})

logger.warn({
  event: 'webhook.invalid_signature',
  source: 'revenuecat',
  ip: request.ip,
})

// NUNCA logar:
// - Tokens JWT
// - Senhas
// - Dados de cartão
// - PII (nome completo + CPF juntos)
```

---

## Checklist de Segurança por Feature

Antes de fazer deploy de qualquer nova feature:

- [ ] Toda rota protegida tem `preHandler: [fastify.requireAuth]`
- [ ] Ownership verificado em todo acesso a recurso
- [ ] Input validado com Zod
- [ ] Sem `console.log` com dados sensíveis
- [ ] Rate limit configurado para rotas pesadas (IA, Places)
- [ ] Webhook validado com HMAC
- [ ] Nenhum secret em variável `EXPO_PUBLIC_*`
- [ ] Soft delete retorna 404 (não 403)

---

*← [12 — CI/CD](../12-ci-cd/README.md) | Próximo: [14 — Ambiente de Desenvolvimento →](../14-ambiente-desenvolvimento/README.md)*
