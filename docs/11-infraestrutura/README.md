# 11 — Infraestrutura

> Railway para backend + PostgreSQL. Vercel para landing. Cloudflare para DNS + R2.

---

## Visão Geral

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLOUDFLARE                               │
│  DNS: wandr.app, api.wandr.app, cdn.wandr.app                   │
│  R2: Bucket wandr-assets (fotos, avatars, comprovantes)         │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
           ┌─────────────────────┴─────────────────────┐
           ▼                                           ▼
     ┌──────────┐                               ┌──────────────┐
     │  VERCEL  │                               │   RAILWAY    │
     │          │                               │              │
     │ wandr.app│                               │ api.wandr.app│
     │ Next.js  │                               │ Node.js      │
     │ Landing  │                               │ Fastify      │
     └──────────┘                               │              │
                                                │ PostgreSQL   │
                                                │ (addon)      │
                                                └──────────────┘
```

---

## Railway — Backend

### Por que Railway

| Critério | Railway | Render | Fly.io |
|---|---|---|---|
| PostgreSQL gerenciado | ✅ Addon nativo | ✅ | ❌ (externo) |
| Deploy via GitHub | ✅ | ✅ | ⚠️ |
| Preço previsível | ✅ ~$5-20/mês | ✅ | Mais complexo |
| Cold start | ✅ Sem (plano pago) | ⚠️ Free tier dorme | ✅ |
| Variáveis de env | ✅ Interface simples | ✅ | ✅ |
| DX | ✅ Excelente | Bom | Técnico |

### Serviços no Railway

| Serviço | Tipo | Plano estimado |
|---|---|---|
| `wandr-api` | Node.js (Fastify) | Hobby: $5/mês |
| `wandr-db` | PostgreSQL addon | Starter: $5/mês |

**Total Railway MVP:** ~$10/mês

### Configuração do Serviço

```bash
# Railway detecta Node.js automaticamente
# Variáveis essenciais no Railway Dashboard:

NODE_ENV=production
PORT=3333
DATABASE_URL=${{Postgres.DATABASE_URL}}
DIRECT_URL=${{Postgres.DATABASE_URL}}
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...
GOOGLE_PLACES_API_KEY=AIza...
OPENAI_API_KEY=sk-proj-...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=wandr-assets
R2_PUBLIC_URL=https://cdn.wandr.app
REVENUECAT_WEBHOOK_SECRET=...
LOG_LEVEL=info
SENTRY_DSN=https://...
```

### Dockerfile (opcional, Railway suporta Nixpacks)

Railway detecta Node.js automaticamente via `package.json`. Se precisar de mais controle:

```dockerfile
FROM node:22-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
EXPOSE 3333
CMD ["node", "dist/server.js"]
```

### Scripts de Deploy

```json
// apps/api/package.json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "tsx watch src/server.ts",
    "migrate": "prisma migrate deploy",
    "postinstall": "prisma generate"
  }
}
```

**Railway executa `npm run start` após o build. Migrations rodamos manualmente antes do deploy ou via `railway run`.**

---

## Ambientes

| Ambiente | URL Backend | URL Landing | Branch |
|---|---|---|---|
| **Production** | `https://api.wandr.app` | `https://wandr.app` | `main` |
| **Staging** | `https://api-staging.wandr.app` | `https://staging.wandr.app` | `develop` |
| **Development** | `http://localhost:3333` | `http://localhost:3000` | feature/* |

### Configuração de Ambiente no Mobile

```typescript
// apps/mobile/.env.local (desenvolvimento)
EXPO_PUBLIC_API_URL=http://localhost:3333
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_sandbox_...

// apps/mobile/.env.production (via EAS secrets)
EXPO_PUBLIC_API_URL=https://api.wandr.app
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_...
```

---

## DNS — Cloudflare

### Registros

| Subdomínio | Tipo | Destino | Proxy |
|---|---|---|---|
| `wandr.app` | CNAME | `cname.vercel-dns.com` | ✅ Orange |
| `www.wandr.app` | CNAME | `cname.vercel-dns.com` | ✅ Orange |
| `api.wandr.app` | CNAME | `*.up.railway.app` | ✅ Orange |
| `api-staging.wandr.app` | CNAME | `*.up.railway.app` | ✅ Orange |
| `cdn.wandr.app` | CNAME | `*.r2.cloudflarestorage.com` | ✅ Orange |

### SSL
- Cloudflare Universal SSL (gratuito) para todos os subdomínios
- Modo: Full (Strict) para api.wandr.app e cdn.wandr.app

---

## PostgreSQL no Railway

### Connection String

```env
# Railway injeta automaticamente via variável ${{Postgres.DATABASE_URL}}
DATABASE_URL=postgresql://user:pass@host.railway.internal:5432/railway

# Para migrations (sem pgbouncer)
DIRECT_URL=postgresql://user:pass@host.railway.internal:5432/railway
```

### Backups

| Tipo | Frequência | Retenção |
|---|---|---|
| Automático Railway | Diário | 7 dias (Hobby) |
| Export manual pg_dump | Semanal | Armazenado no R2 |

```bash
# Script de backup manual
railway run pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d).sql.gz
# Upload para R2 via AWS CLI
aws s3 cp backup_$(date +%Y%m%d).sql.gz s3://wandr-assets/backups/ \
  --endpoint-url https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com
```

---

## Escalabilidade (Futuro)

| Componente | Solução atual | Quando escalar | Próxima solução |
|---|---|---|---|
| Backend | Railway Hobby (1 instância) | > 500 DAU | Railway Pro (múltiplas instâncias) |
| Banco | Railway PostgreSQL | > 10GB ou 100 conn/s | PgBouncer + Railway Pro |
| Cache | Sem (React Query client-side) | > 1000 RPM na API | Redis no Railway |
| CDN | Cloudflare (grátis) | — | Já escalável |
| Storage | R2 (praticamente ilimitado) | — | Já escalável |

---

## Health Check e Monitoramento

### Endpoint de Health

```
GET https://api.wandr.app/health
Response: { "status": "ok", "ts": "2026-04-18T10:00:00Z" }
```

### UptimeRobot (gratuito)

- Monitor: `https://api.wandr.app/health` — a cada 5 minutos
- Alerta: e-mail + Telegram se down por > 1 minuto
- Status page público: `status.wandr.app` (opcional)

### Sentry

- Backend: `@sentry/node` com `tracing` habilitado
- Mobile: `@sentry/react-native` com Expo plugin
- Alertas: Slack/e-mail para novos issues com > 10 ocorrências/hora

---

*← [10 — Landing Page](../10-landing-page/README.md) | Próximo: [12 — CI/CD →](../12-ci-cd/README.md)*
