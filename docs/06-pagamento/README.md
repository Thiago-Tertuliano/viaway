# 06 — Pagamento

> RevenueCat para gestão de in-app purchases no iOS e Android. Abstrai StoreKit e Play Billing.

---

## Por que RevenueCat

Implementar IAP diretamente é complexo e arriscado:
- StoreKit 2 (iOS) e Play Billing 6 (Android) têm APIs diferentes
- Validação de recibo server-side é crítica (fraude)
- Gerenciar trial, cancelamento, downgrade, renovação é trabalhoso
- **RevenueCat resolve tudo** com uma SDK unificada

| Critério | RevenueCat | Implementar direto |
|---|---|---|
| SDK unificada iOS + Android | ✅ | ❌ |
| Validação server-side | ✅ Automático | Manual |
| Webhooks confiáveis | ✅ | Manual |
| Dashboard MRR/Churn/LTV | ✅ | ❌ |
| Custo | 1% da receita (pós $2.5k MRR) | Dev time |

**Custo real:** Gratuito até $2.500/mês de receita recorrente. Para o MVP, zero custo.

---

## Arquitetura de Pagamento

```
[Mobile — RevenueCat SDK]
    │
    ├─ Verifica entitlement "pro" no início da sessão
    │       └─ RevenueCat consulta Apple/Google em background
    │
    ├─ Usuário aciona upsell
    │       ├─ Lista packages disponíveis (mensal, anual)
    │       └─ Inicia purchase → StoreKit / Play Billing
    │
    └─ Purchase completa
            │
            ├─ RevenueCat confirma entitlement "pro"
            │       └─ App atualiza UI imediatamente (optimistic)
            │
            └─ RevenueCat dispara webhook
                    └─ POST https://api.wandr.app/plano/webhook
                            └─ Backend atualiza `usuarios.plano = 'pro'`
                                        e `usuarios.proExpiraEm`
```

---

## Configuração RevenueCat

### Pré-requisitos

**App Store Connect:**
1. Criar subscription group "Wandr Pro"
2. Adicionar products:
   - `wandr_pro_monthly` — R$ 19,90/mês
   - `wandr_pro_annual` — R$ 149,90/ano
3. Configurar trial de 7 dias em ambos
4. Configurar localização em PT-BR

**Google Play Console:**
1. Criar subscription "wandr_pro"
2. Base plans: monthly + annual
3. Offers: free trial 7 dias
4. Publicar (pelo menos em closed testing antes)

**RevenueCat Dashboard:**
1. Criar projeto "Wandr"
2. Conectar App Store + Google Play
3. Criar entitlement: `pro`
4. Criar offering: `default`
5. Adicionar packages: `$rc_monthly`, `$rc_annual`
6. Configurar webhook → `https://api.wandr.app/plano/webhook`

### Variáveis de Ambiente

```env
# apps/mobile/.env
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxx

# apps/api/.env
REVENUECAT_WEBHOOK_SECRET=xxx
```

---

## Implementação Mobile

### Inicialização

```typescript
// apps/mobile/app/_layout.tsx
import Purchases, { LOG_LEVEL } from 'react-native-purchases'
import { Platform } from 'react-native'

export default function RootLayout() {
  useEffect(() => {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG)
    }

    const key = Platform.select({
      ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY!,
      android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY!,
    })!

    Purchases.configure({ apiKey: key })
  }, [])

  // ...
}
```

### Identificar Usuário (após login Clerk)

```typescript
// apps/mobile/src/hooks/useRevenuecat.ts
import Purchases, { CustomerInfo } from 'react-native-purchases'
import { useUser } from '@clerk/clerk-expo'

export function useRevenueCat() {
  const { user } = useUser()

  // Identificar usuário no RevenueCat com o ID do Clerk
  useEffect(() => {
    if (user?.id) {
      Purchases.logIn(user.id)
    }
  }, [user?.id])

  // Verificar entitlement
  const isPro = async (): Promise<boolean> => {
    const info = await Purchases.getCustomerInfo()
    return !!info.entitlements.active['pro']
  }

  // Buscar packages disponíveis
  const getPackages = async () => {
    const offerings = await Purchases.getOfferings()
    return offerings.current?.availablePackages ?? []
  }

  // Iniciar compra
  const purchase = async (packageToBuy: any) => {
    const { customerInfo } = await Purchases.purchasePackage(packageToBuy)
    return !!customerInfo.entitlements.active['pro']
  }

  // Restaurar compras (obrigatório pelas lojas)
  const restore = async () => {
    const info = await Purchases.restorePurchases()
    return !!info.entitlements.active['pro']
  }

  return { isPro, getPackages, purchase, restore }
}
```

### Tela de Paywall

```typescript
// apps/mobile/src/components/Paywall.tsx
import { useRevenueCat } from '@/hooks/useRevenuecat'

export function Paywall({ trigger }: { trigger: string }) {
  const { getPackages, purchase } = useRevenueCat()
  const [packages, setPackages] = useState([])
  const [selected, setSelected] = useState<'monthly' | 'annual'>('annual')

  useEffect(() => {
    getPackages().then(setPackages)
  }, [])

  // UI: ver docs/01-visao-geral para especificação completa do paywall
  // Componentes obrigatórios:
  // - Headline com benefício principal
  // - Lista 4-5 features Pro com ícone
  // - Toggle Mensal / Anual (anual selecionado por padrão)
  // - CTA: "Começar trial grátis de 7 dias"
  // - Sub-texto: "Cancele quando quiser. Sem fidelidade."
  // - Link "Ver o que está incluso no Free"
}
```

---

## Webhook RevenueCat → Backend

### Eventos monitorados

| Evento RevenueCat | Ação no Backend |
|---|---|
| `INITIAL_PURCHASE` | `plano = 'pro'`, calcular `proExpiraEm` |
| `RENEWAL` | Atualizar `proExpiraEm` |
| `PRODUCT_CHANGE` | Atualizar plano (mudança anual/mensal) |
| `CANCELLATION` | Marcar `proExpiraEm` (mantém Pro até o fim do período) |
| `EXPIRATION` | `plano = 'free'`, `proExpiraEm = null` |
| `BILLING_ISSUE` | Log + (opcional) notificação push |

### Handler do Webhook

```typescript
// apps/api/src/routes/plano/webhook.ts
import crypto from 'crypto'

fastify.post('/plano/webhook', {
  // rawBody necessário para verificação de assinatura
  config: { rawBody: true },
  handler: async (request, reply) => {
    // Verificar assinatura RevenueCat
    const assinatura = request.headers['x-revenuecat-webhook-hmac']
    const payload = request.rawBody
    const hmac = crypto
      .createHmac('sha256', process.env.REVENUECAT_WEBHOOK_SECRET!)
      .update(payload)
      .digest('hex')

    if (hmac !== assinatura) {
      return reply.status(401).send({ error: 'Invalid signature' })
    }

    const { event } = request.body as RevenueCatWebhookPayload
    const clerkId = event.app_user_id

    const usuario = await fastify.prisma.usuario.findUnique({
      where: { clerkId }
    })

    if (!usuario) {
      fastify.log.warn({ clerkId }, 'Webhook recebido para usuário desconhecido')
      return reply.status(200).send({ ok: true }) // 200 para evitar retry
    }

    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
        await fastify.prisma.usuario.update({
          where: { id: usuario.id },
          data: {
            plano: 'pro',
            proExpiraEm: new Date(event.expiration_at_ms),
          }
        })
        break

      case 'EXPIRATION':
      case 'CANCELLATION':
        if (event.type === 'EXPIRATION') {
          await fastify.prisma.usuario.update({
            where: { id: usuario.id },
            data: { plano: 'free', proExpiraEm: null }
          })
        }
        // CANCELLATION: mantém Pro até expiração, apenas log
        break

      case 'BILLING_ISSUE':
        fastify.log.warn({ userId: usuario.id }, 'Billing issue')
        break
    }

    return reply.status(200).send({ received: true })
  }
})
```

---

## Trial de 7 Dias

O trial é configurado no App Store Connect e Google Play Console, não no código.

**Fluxo:**
1. Usuário seleciona plano anual ou mensal
2. Loja mostra "7 dias grátis, depois R$ XX/mês"
3. Usuário confirma (sem cobrança agora)
4. RevenueCat retorna entitlement `pro` ativo
5. Webhook `INITIAL_PURCHASE` chega → backend ativa Pro
6. Após 7 dias: loja cobra automaticamente
7. Se cancelar antes dos 7 dias: webhook `CANCELLATION` → backend marca como Free na expiração

**Regra UX:** Só oferecer trial uma vez por usuário. RevenueCat controla isso automaticamente.

---

## Downgrade — RN11

Quando o usuário cancela o Pro:
- `CANCELLATION` webhook → backend apenas loga (plano ainda é `pro`)
- `EXPIRATION` webhook → backend muda `plano = 'free'`
- Dados mantidos integralmente (viagens, lugares, cotações)
- Funcionalidades Pro inacessíveis (verificação pelo middleware `requirePro`)
- Se usuário tiver mais de 3 viagens ativas: **não deleta**, mas não pode criar novas

---

## Restaurar Compras

Obrigatório pelas políticas da App Store e Google Play:

```typescript
// Botão visível nas configurações do app
const handleRestore = async () => {
  try {
    const isPro = await restore()
    if (isPro) {
      Alert.alert('Compra restaurada!', 'Seu plano Pro foi restaurado.')
    } else {
      Alert.alert('Nenhuma compra encontrada.')
    }
  } catch (e) {
    Alert.alert('Erro ao restaurar. Tente novamente.')
  }
}
```

---

## Sandbox (Teste sem cobrança real)

```typescript
// Usar contas sandbox das lojas para testes
// iOS: criar conta sandbox no App Store Connect → Testers
// Android: adicionar e-mail de teste no Google Play → License Testers

// RevenueCat detecta sandbox automaticamente e separa no dashboard
```

---

## Métricas RevenueCat Dashboard

| Métrica | Meta |
|---------|------|
| MRR (Monthly Recurring Revenue) | Crescimento mês a mês |
| Churn Rate | < 5% ao mês |
| Trial Conversion Rate | > 40% |
| LTV (Lifetime Value) | > R$ 150 |
| Active Subscribers | Acompanhar semana a semana |

---

*← [05 — Storage](../05-storage/README.md) | Próximo: [07 — Integrações →](../07-integracoes/README.md)*
