# ViaWay — Documentação Técnica

> Documentação técnica completa do ViaWay. Leia antes de codar.
> Documento-mãe de produto: [`../VIAWAY_PRODUTO.md`](../VIAWAY_PRODUTO.md)
> README raiz do projeto: [`../README.md`](../README.md)

---

## Estrutura da Documentação

| # | Documento | Escopo |
|---|-----------|--------|
| 01 | [Visão Geral](./01-visao-geral/README.md) | Produto, personas, módulos, regras de negócio |
| 02 | [Stack Técnica](./02-stack-tecnica/README.md) | Todas as tecnologias com versão e justificativa |
| 03 | [Banco de Dados](./03-banco-de-dados/README.md) | Schema Prisma completo, índices, RLS, migrations |
| 04 | [Autenticação](./04-autenticacao/README.md) | Clerk, OAuth, fluxo de sessão, proteção de rotas |
| 05 | [Storage](./05-storage/README.md) | Cloudflare R2, buckets, presigned URLs, upload flow |
| 06 | [Pagamento](./06-pagamento/README.md) | RevenueCat, IAP iOS/Android, webhooks, trial |
| 07 | [Integrações Externas](./07-integracoes/README.md) | Google Places API, OpenAI GPT-4o |
| 08 | [API Backend](./08-api-backend/README.md) | Todos os endpoints, schemas, contratos Fastify |
| 09 | [Mobile](./09-mobile/README.md) | Expo Router, estrutura, estado, offline-first |
| 10 | [Landing Page](./10-landing-page/README.md) | Next.js, marketing + aquisição (download grátis) + LGPD e requisitos das lojas |
| 11 | [Infraestrutura](./11-infraestrutura/README.md) | Railway, ambientes, domínios, backup |
| 12 | [CI/CD](./12-ci-cd/README.md) | GitHub Actions, EAS Build, pipeline completo |
| 13 | [Segurança](./13-seguranca/README.md) | LGPD, rate limit, secrets, auditoria |
| 14 | [Ambiente de Desenvolvimento](./14-ambiente-desenvolvimento/README.md) | Setup local, .env, comandos essenciais |

---

## Ordem de Leitura Recomendada

1. `VIAWAY_PRODUTO.md` → entendimento do produto
2. `01-visao-geral` → confirmar entendimento
3. `02-stack-tecnica` → decisões técnicas
4. `03-banco-de-dados` → fundação do sistema
5. `04-autenticacao` → identidade do usuário
6. `08-api-backend` → contrato da API
7. `09-mobile` → app principal
8. `06-pagamento` → modelo de receita
9. Demais em qualquer ordem

---

## Fases do Produto

| Fase | Escopo | Estimativa |
|------|--------|------------|
| **Fase 1 — MVP Free** | Auth, viagens, itinerário, lugares, cotações, gastos, checklist, limites Free | 8–10 semanas |
| **Fase 2 — Pro Core** | RevenueCat, paywall, Google Places, mapa, PDF, sync cloud | 4–6 semanas |
| **Fase 3 — IA** | Geração de itinerário, sugestão de orçamento, checklist automático, resumo pós-trip | 4–6 semanas |
| **Fase 4 — Social** | Compartilhamento, divisão de gastos, feed de viagens | 3–4 semanas |

---

## Decisões Técnicas Confirmadas

| Decisão | Escolha | Alternativa Descartada |
|---------|---------|------------------------|
| Framework mobile | Expo (managed workflow) | Bare React Native |
| Backend | Node.js + Fastify | Express, Go |
| ORM | Prisma | Drizzle, TypeORM |
| Banco | PostgreSQL | MySQL, MongoDB |
| Auth | Clerk | Supabase Auth |
| Storage | Cloudflare R2 | AWS S3 |
| Pagamento | RevenueCat | Implementar IAP direto |
| IA | OpenAI GPT-4o | Anthropic Claude |
| Hospedagem backend | Railway | Render, Fly.io |
| Landing page | Next.js 15 | Astro, HTML puro |
| Monitoramento | Sentry | Datadog, LogRocket |

---

*ViaWay — Documentação Técnica v1.0*
*[Axellion](https://axellion.com.br/) © 2026*
