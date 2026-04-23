# 10 — Landing Page

> Next.js 15 App Router. **Canal de marketing e aquisição** + base legal (LGPD) e requisitos das lojas.

---

## Propósito (duplo)

A landing em `wandr.app` cumpre **duas funções** ao mesmo tempo — sem contradição:

| Função | Objetivo |
|--------|----------|
| **Marketing e vendas** | Gerar interesse, explicar o problema que resolvemos, posicionar o produto, levar à **instalação gratuita** e preparar o caminho para **upgrade Pro** (sem vender assinatura na web — a compra continua in-app). |
| **Compliance e confiança** | Política de privacidade, termos, suporte, exclusão de conta — exigências da App Store, Google Play e LGPD. |

**Tom:** profissional, claro e confiável — não “texto técnico seco”, mas também não linguagem agressiva ou promessas irreais. O visitante deve entender *por que baixar* e *com quem está confiando seus dados*.

**Domínio:** `wandr.app` (landing) e `api.wandr.app` (backend)

---

## Funil na landing (o que “vender” na web)

O produto é **mobile-first**; a loja cobra a assinatura. Na landing, o objetivo principal de conversão é:

1. **CTA primário:** “Baixar grátis” / “Começar de graça” → deep links / badges App Store e Google Play.
2. **CTA secundário (Pro):** explicar benefícios do Pro e o trial de 7 dias — com texto do tipo *“desbloqueie no app após instalar”*, sem checkout na web (evita fricção e mantém RevenueCat como fonte da verdade).

Não é necessário (nem desejável no MVP) ter página de pagamento na web. A landing **vende o download e a proposta de valor**; o app **vende a assinatura**.

---

## Mensagens centrais (alinhadas ao produto)

Use o [`WANDR_PRODUTO.md`](../../WANDR_PRODUTO.md) como fonte. Resumo para copy:

| Pilar | Mensagem |
|-------|----------|
| **Problema** | Planejar viagem hoje está espalhado em planilhas, notas e prints — nada conversa entre si. |
| **Promessa** | Uma viagem, um lugar: roteiro, orçamento, lugares e documentos no mesmo app. |
| **Diferencial Free** | O Free é útil de verdade — dá para planejar uma viagem real. |
| **Diferencial Pro** | Automação: Google Places, itinerário com IA, PDF, sync, compartilhamento (conforme roadmap). |
| **Prova social (futuro)** | Depoimentos, números ou selos — só quando houver material real; evitar inventar. |

---

## Estrutura da Home (marketing + produto)

Ordem sugerida para a página principal (`/`). Cada bloco deve ter **headline**, **subtexto curto** e, quando fizer sentido, **imagem ou mock do app**.

| Seção | Função de marketing |
|-------|---------------------|
| **Hero** | Headline forte + subheadline + CTAs de download (iOS/Android) + mockup do app. |
| **Problema / dor** | 3 bullets ou cards: caos de ferramentas, falta de visão do orçamento, stress na viagem. |
| **Solução** | Como o Wandr organiza: viagens → itinerário → lugares → cotações e gastos. |
| **Benefícios (não só features)** | Traduzir features em resultado: “menos tempo planejando”, “orçamento sob controle”, “tudo no bolso”. |
| **Como funciona** | 3 passos simples: baixe grátis → crie uma viagem → organize o roteiro e o dinheiro. |
| **Free vs Pro** | Tabela ou cards: Free generoso vs Pro com automação — CTA Pro como “disponível no app com trial”. |
| **Screenshots / carrossel** | Telas reais (mesmas linhas visuais das lojas, quando possível). |
| **FAQ curto** | 4–6 perguntas (grátis? dados? cancelar Pro? funciona offline?). |
| **CTA final** | Repetir download grátis + reforço de confiança (link para privacidade). |
| **Rodapé** | Links legais, suporte, redes (se houver), [Axellion](https://axellion.com.br/) como marca. |

**SEO:** uma frase-chave principal (ex.: “app para planejar viagem”) no H1 e na meta description, sem keyword stuffing.

---

## Requisitos das lojas (mantidos)

### App Store (Apple)
- [ ] Privacy Policy URL pública e legível
- [ ] Support URL (pode ser e-mail ou formulário)
- [ ] App description
- [ ] Screenshots (6.7" e 5.5" para iPhone, 12.9" para iPad se suportar)
- [ ] App Preview Video (opcional, mas recomendado)

### Google Play
- [ ] Privacy Policy URL
- [ ] Email de suporte
- [ ] Endereço físico (CNPJ da [Axellion](https://axellion.com.br/))
- [ ] Declaração de Dados (Data Safety section)
- [ ] Screenshots (pelo menos 2 de phone)

---

## Mapa de rotas

| Rota | Público-alvo | Conteúdo |
|------|----------------|----------|
| `/` | Visitante / lead | Home completa (marketing + CTAs de download) |
| `/privacidade` | Usuário, auditoria, lojas | Política de Privacidade (LGPD) |
| `/termos` | Usuário, lojas | Termos de Uso |
| `/suporte` | Usuário | Contato, FAQ estendido, SLA de resposta se definido |
| `/delete-account` | Google Play, usuário | Instruções claras de exclusão de conta |
| `/planos` *(opcional)* | Comparador dedicado | Pode espelhar Free vs Pro com mais texto; CTA sempre “baixe o app” |

Todas as páginas legais devem estar **acessíveis no rodapé** de todas as páginas (incluindo a home).

---

## Stack e pastas

```
apps/landing/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                  ← Home (marketing)
│   ├── privacidade/page.tsx
│   ├── termos/page.tsx
│   ├── suporte/page.tsx
│   ├── delete-account/page.tsx
│   └── planos/page.tsx           ← opcional
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   └── Footer.tsx            ← links legais sempre visíveis
│   ├── marketing/
│   │   ├── Hero.tsx
│   │   ├── ProblemSection.tsx
│   │   ├── BenefitsSection.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── PlansTeaser.tsx       ← Free vs Pro + CTA app
│   │   ├── ScreenshotsCarousel.tsx
│   │   ├── FaqAccordion.tsx
│   │   └── FinalCta.tsx
│   ├── DownloadButtons.tsx       ← App Store + Google Play + UTM opcional
│   └── ContactForm.tsx
├── public/
│   ├── app-store-badge.svg
│   ├── google-play-badge.svg
│   └── og-image.png
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

### Deep links e UTM (recomendado)

Para medir aquisição a partir da landing:

- Links das lojas com parâmetros UTM (`utm_source=wandr_site`, `utm_medium=cta`, `utm_campaign=launch`).
- Manter URLs oficiais das lojas atualizadas no código ou em CMS/env (evita link quebrado após mudança de bundle).

---

## Home — esqueleto de componentes

```typescript
// app/page.tsx — SSG; conteúdo pode vir de constantes ou CMS depois

export default function Home() {
  return (
    <main>
      <Hero />
      <ProblemSection />
      <BenefitsSection />
      <HowItWorks />
      <ScreenshotsCarousel />
      <PlansTeaser />
      <FaqAccordion />
      <FinalCta />
    </main>
  )
}
```

---

## SEO — Metadata

```typescript
// app/layout.tsx
export const metadata: Metadata = {
  title: 'Wandr — Planejamento de viagens simplificado',
  description:
    'Organize roteiro, cotações, lugares e gastos em um único app. Comece grátis. Pro com IA e automações.',
  openGraph: {
    title: 'Wandr — Planejamento de viagens simplificado',
    description:
      'Uma viagem, um lugar. Baixe grátis e planeje sua próxima viagem sem caos de planilhas e notas.',
    url: 'https://wandr.app',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    type: 'website',
    locale: 'pt_BR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wandr — Planejamento de viagens simplificado',
    description: 'Organize roteiro, orçamento e lugares no mesmo app. Grátis para começar.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}
```

---

## Política de Privacidade — Pontos Obrigatórios (LGPD)

A política deve cobrir:

1. **Dados coletados**
   - Nome, e-mail (via Clerk)
   - Fotos (enviadas pelo usuário)
   - Dados de viagem (roteiro, gastos, cotações)
   - Localização (apenas quando o usuário usa o mapa — não rastreamos em background)
   - Dados de pagamento (apenas RevenueCat/Apple/Google — não armazenamos cartão)

2. **Base legal (LGPD)**
   - Execução de contrato: dados necessários para o funcionamento do app
   - Legítimo interesse: melhoria do produto
   - Consentimento: comunicações de marketing (opt-in)

3. **Compartilhamento com terceiros**
   - Clerk (autenticação)
   - Cloudflare R2 (storage)
   - RevenueCat + Apple/Google (pagamento)
   - OpenAI (IA — dados do itinerário enviados para processamento)
   - Sentry (crash reports anonimizados)

4. **Direitos do titular**
   - Acesso, correção, exclusão dos dados
   - Como exercer: suporte@wandr.app ou `/delete-account`

5. **Retenção**
   - Dados retidos enquanto conta ativa + 90 dias após exclusão
   - Logs de sistema: 30 dias

6. **Contato DPO**
   - privacidade@axellion.com.br

---

## Delete Account — Requisito Google Play

O Google exige que apps com login tenham uma forma de solicitar exclusão de conta:

```typescript
// app/delete-account/page.tsx
// Instruções:
// 1. Abrir o app Wandr
// 2. Ir em Perfil → Configurações
// 3. Rolar até o fim → "Excluir minha conta"
// 4. Confirmar exclusão

// OU

// Enviar e-mail para: suporte@wandr.app
// Assunto: "Solicitação de exclusão de conta"
// Incluir: e-mail cadastrado

// O que é deletado:
// - Conta e perfil
// - Todas as viagens, itinerários, lugares, cotações e gastos
// - Fotos enviadas (R2)
// - Dados de assinatura (RevenueCat)

// O que é mantido por obrigação legal:
// - Logs de transações financeiras (5 anos — Lei 9.613)

// Prazo: até 30 dias úteis
```

---

## Deploy — Vercel

```bash
# apps/landing/vercel.json
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "devCommand": "next dev",
  "installCommand": "npm install"
}
```

**Configurações:**
- Domínio: `wandr.app` (DNS apontado para Vercel)
- SSL: automático via Vercel
- Deploy automático: push na branch `main`
- Preview deploys: PRs geram URL de preview automaticamente

---

## Dependências

```json
{
  "dependencies": {
    "next": "15.x",
    "react": "19.x",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/typography": "^0.5.0"
  }
}
```

---

## Checklist antes do go-live (marketing + compliance)

- [ ] Home comunica problema, solução, benefícios e CTAs de download claros
- [ ] Badges das lojas funcionando (URLs corretas por ambiente prod)
- [ ] Privacidade, termos, suporte e delete-account publicados e linkados no rodapé
- [ ] Meta tags e OG image para compartilhamento em redes
- [ ] Texto alinhado ao que o app realmente faz (evitar divergência com as lojas)
- [ ] (Opcional) Analytics com consentimento, se usar cookies não essenciais

---

*← [09 — Mobile](../09-mobile/README.md) | Próximo: [11 — Infraestrutura →](../11-infraestrutura/README.md)*
