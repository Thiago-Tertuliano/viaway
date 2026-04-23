# 02 — Stack Técnica

> Todas as tecnologias do Wandr com versão, justificativa e responsabilidade.

---

## Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENTE MOBILE                          │
│               React Native + Expo SDK 52                    │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Clerk SDK  │  │  API Client  │  │  RevenueCat SDK  │  │
│  │  (auth)     │  │  (Axios/     │  │  (IAP iOS/       │  │
│  │             │  │   fetch)     │  │   Android)       │  │
│  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘  │
└─────────┼────────────────┼───────────────────┼────────────┘
          │                │                   │
          ▼                ▼                   ▼
     Clerk Auth       Fastify API          RevenueCat
     (tokens JWT)     (Railway)            (entitlements)
                           │
           ┌───────────────┼──────────────────┐
           ▼               ▼                  ▼
       PostgreSQL     Google Places       OpenAI
       + Prisma        API (New)          GPT-4o
       (Railway)                          API
           │
      Cloudflare R2
      (fotos / assets)
           │
        Sentry
      (crash reporting)
```

---

## Stack Completa

### Mobile

| Tecnologia | Versão | Função | Justificativa |
|---|---|---|---|
| **React Native** | 0.76+ | Framework mobile | Ecossistema maduro, JS/TS, cross-platform |
| **Expo** | SDK 52 | Managed workflow | OTA updates, EAS Build, sem XCode/Android Studio para builds básicos |
| **Expo Router** | 4.x | Navegação file-based | Mesmo conceito do Next.js App Router, rotas tipadas |
| **TypeScript** | 5.x | Tipagem estática | Previne erros em runtime, essencial em codebase crescente |
| **NativeWind** | 4.x | Styling com Tailwind | Tailwind CSS para React Native, zero StyleSheet boilerplate |
| **React Native Reanimated** | 3.x | Animações 60fps | Roda na thread nativa, não bloqueia JS |
| **React Native Gesture Handler** | 2.x | Gestos nativos | Drag-and-drop do itinerário |
| **FlashList** | 1.x | Listas performáticas | 10x mais rápido que FlatList para listas longas |
| **Expo SecureStore** | latest | Tokens seguros | Armazenamento criptografado para JWT |
| **AsyncStorage** | latest | Cache local | Dados offline para usuário Free |

### Backend

| Tecnologia | Versão | Função | Justificativa |
|---|---|---|---|
| **Node.js** | 22 LTS | Runtime | LTS estável, suporte nativo a ESModules e crypto |
| **Fastify** | 5.x | Framework HTTP | ~3x mais rápido que Express, schema validation nativo, TypeScript first |
| **TypeScript** | 5.x | Tipagem | Consistência com o mobile, contratos de API tipados |
| **Prisma** | 5.x | ORM | Type-safety total, migrations automáticas, Prisma Studio para debug |
| **Zod** | 3.x | Validação | Validação de schemas em runtime com inferência de tipos |
| **Pino** | 9.x | Logging | Logger mais rápido do ecossistema Node, JSON estruturado |

### Banco de Dados

| Tecnologia | Versão | Função | Justificativa |
|---|---|---|---|
| **PostgreSQL** | 16 | Banco principal | JSONB para campos flexíveis, RLS nativo, suporte a extensões geoespaciais futuras |
| **PgBouncer** | — | Connection pooling | Essencial em produção para evitar esgotamento de conexões com Railway |

### Autenticação

| Tecnologia | Versão | Função | Justificativa |
|---|---|---|---|
| **Clerk** | latest | Auth completo | SDK nativo para Expo, Google OAuth built-in, webhook de sync, dashboard de usuários |

### Storage

| Tecnologia | Versão | Função | Justificativa |
|---|---|---|---|
| **Cloudflare R2** | — | Object storage | Zero egress fees (diferencial crítico vs S3), S3-compatible SDK |
| **@aws-sdk/client-s3** | 3.x | Cliente R2 | R2 é S3-compatible, usa o mesmo SDK |

### Pagamento

| Tecnologia | Versão | Função | Justificativa |
|---|---|---|---|
| **RevenueCat** | SDK 7+ | In-app purchases | Abstrai StoreKit (iOS) + Play Billing (Android), dashboard MRR/churn/LTV |

### IA

| Tecnologia | Versão | Função | Justificativa |
|---|---|---|---|
| **OpenAI API** | GPT-4o | Geração de itinerário, sugestão de orçamento, checklist, resumo pós-trip | Melhor custo-benefício para geração de conteúdo estruturado |

### Integrações

| Tecnologia | Versão | Função | Justificativa |
|---|---|---|---|
| **Google Places API (New)** | v1 | Busca de lugares com fotos e avaliações | Única API com dados de qualidade suficiente para o produto |

### PDF (Fase 2)

| Tecnologia | Versão | Função | Justificativa |
|---|---|---|---|
| **Puppeteer** (server-side) | 22.x | Geração de PDF do roteiro | Server-side garante consistência de layout em iOS e Android |

### Landing Page

| Tecnologia | Versão | Função | Justificativa |
|---|---|---|---|
| **Next.js** | 15 (App Router) | Landing: marketing + aquisição + páginas legais (LGPD, lojas) | SSG para SEO, deploy Vercel free tier |
| **Tailwind CSS** | 4.x | Styling | Consistência com o design system do mobile (NativeWind) |
| **Vercel** | — | Hosting da landing | Zero config, auto-deploy GitHub, CDN global |

### Monitoramento e Ops

| Tecnologia | Versão | Função | Justificativa |
|---|---|---|---|
| **Sentry** | latest | Crash reporting mobile + backend | SDK Expo nativo, alertas em tempo real, stack traces |
| **Railway** | — | Hosting backend + PostgreSQL | Deploy via GitHub, addon PostgreSQL gerenciado, preço previsível |
| **GitHub Actions** | — | CI/CD | Nativo no repositório, sem custo adicional |
| **EAS Build** | — | Builds iOS/Android | Builds na nuvem Expo, sem necessidade de Mac dedicado |

---

## Versões Mínimas de SO

| Plataforma | Versão Mínima | Cobertura de Mercado |
|---|---|---|
| iOS | 16.0 | ~90% dos dispositivos ativos |
| Android | 10 (API 29) | ~85% dos dispositivos ativos |

---

## Dependências por Camada

### `package.json` Mobile (principais)

```json
{
  "dependencies": {
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "react-native": "0.76.x",
    "nativewind": "^4.0.0",
    "tailwindcss": "^4.0.0",
    "react-native-reanimated": "~3.16.0",
    "react-native-gesture-handler": "~2.20.0",
    "@shopify/flash-list": "1.x",
    "@tanstack/react-query": "^5.0.0",
    "@tanstack/react-query-persist-client": "^5.0.0",
    "@tanstack/query-async-storage-persister": "^5.0.0",
    "zustand": "^5.0.0",
    "axios": "^1.7.0",
    "zod": "^3.23.0",
    "@clerk/clerk-expo": "latest",
    "react-native-purchases": "^7.0.0",
    "expo-secure-store": "~14.0.0",
    "@react-native-async-storage/async-storage": "2.x",
    "expo-image": "~2.0.0",
    "expo-image-picker": "~16.0.0",
    "@react-native-community/netinfo": "^11.0.0"
  }
}
```

### `package.json` Backend (principais)

```json
{
  "dependencies": {
    "fastify": "^5.0.0",
    "@fastify/cors": "^10.0.0",
    "@fastify/helmet": "^13.0.0",
    "@fastify/rate-limit": "^10.0.0",
    "@fastify/multipart": "^9.0.0",
    "@prisma/client": "^5.22.0",
    "zod": "^3.23.0",
    "pino": "^9.0.0",
    "@aws-sdk/client-s3": "^3.0.0",
    "@aws-sdk/s3-request-presigner": "^3.0.0",
    "openai": "^4.0.0",
    "@clerk/fastify": "latest",
    "@sentry/node": "^8.0.0"
  },
  "devDependencies": {
    "prisma": "^5.22.0",
    "typescript": "^5.6.0",
    "tsx": "^4.19.0",
    "vitest": "^2.0.0"
  }
}
```

---

## Limites de Performance

| Operação | Meta | Estratégia |
|---|---|---|
| Abertura de viagem | < 1.5s | Cache React Query, skeleton loader |
| Busca Places API | < 2s | Debounce 300ms, cache local 1h |
| Geração de itinerário IA | < 8s | Streaming response + skeleton loader |
| Upload de foto | < 3s (4G) | Presigned URL direto para R2, compressão antes do upload |
| Cold start backend | < 500ms | Railway mantém instância ativa no plano pago |

---

## Repositório — Estrutura de Pastas

```
wandr/
├── apps/
│   ├── mobile/          ← Expo React Native
│   └── landing/         ← Next.js
├── packages/
│   ├── api/             ← Fastify backend
│   └── shared/          ← tipos compartilhados (opcional)
├── docs/                ← esta documentação
└── .github/
    └── workflows/       ← CI/CD
```

> **Monorepo:** Usar Turborepo ou estrutura simples com workspaces npm.
> Decisão final antes de iniciar o projeto.

---

## Decisões Pendentes (Validar antes de codar)

| Decisão | Opções | Recomendação |
|---------|--------|--------------|
| Monorepo vs repos separados | Monorepo (Turbo) \| Repos separados | Monorepo — facilita compartilhamento de tipos |
| Estado global offline | Zustand + AsyncStorage \| MMKV | MMKV se performance for problema (mais rápido que AsyncStorage) |
| PDF geração | Puppeteer server-side \| react-native-pdf | Puppeteer — layout mais confiável cross-platform |

---

*← [01 — Visão Geral](../01-visao-geral/README.md) | Próximo: [03 — Banco de Dados →](../03-banco-de-dados/README.md)*
