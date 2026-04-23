# 04 — Autenticação

> Clerk como provedor de identidade. Cobre cadastro, login, OAuth Google, JWT e proteção de rotas.

---

## Por que Clerk

| Critério | Clerk | Supabase Auth |
|---|---|---|
| SDK Expo nativo | ✅ Oficial | ✅ Oficial |
| Google OAuth | ✅ Built-in, zero config | ✅ Built-in |
| Dashboard de usuários | ✅ Completo | ⚠️ Básico |
| Webhook de sync | ✅ Svix integrado | ✅ Disponível |
| Preço (até 10k MAU) | **Gratuito** | **Gratuito** |
| Customização de UI | ⚠️ Templates limitados | ⚠️ Templates limitados |
| Multi-tenant (futuro) | ✅ Organizations | ❌ Manual |

**Decisão:** Clerk — melhor DX para Expo, webhook confiável via Svix, dashboard de usuários completo.

---

## Fluxo de Autenticação

### Cadastro / Login

```
[Mobile App]
    │
    ├─ (novo usuário) → Clerk SignUp screen
    │       │
    │       ├─ email + senha  OR
    │       └─ "Continuar com Google" → OAuth Google
    │                 │
    │                 └─ Clerk cria User no seu sistema
    │                           │
    │                           └─ Webhook → POST /auth/webhook (Fastify)
    │                                         └─ Upsert na tabela `usuarios`
    │
    └─ (usuário existente) → Clerk SignIn screen
              │
              └─ Clerk retorna JWT (session token)
                          │
                          └─ Mobile armazena no SecureStore
                                      │
                                      └─ Toda request: Authorization: Bearer <token>
```

### Validação de Request no Backend

```
[Request chega no Fastify]
    │
    ├─ Middleware Clerk verifica JWT
    │       │
    │       ├─ JWT inválido → 401 Unauthorized
    │       └─ JWT válido  → req.auth = { userId, sessionId }
    │                 │
    │                 └─ Busca usuário no banco pelo clerkId
    │                           │
    │                           ├─ Não encontrado → 401 (usuário não sincronizado)
    │                           └─ Encontrado → req.user = { id, plano, ... }
    │
    └─ Handler executa com req.user disponível
```

---

## Configuração Clerk

### Variáveis de Ambiente

```env
# Mobile (apps/mobile/.env)
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...

# Backend (apps/api/.env)
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...
```

### Setup Mobile (Expo)

```typescript
// apps/mobile/app/_layout.tsx
import { ClerkProvider, ClerkLoaded } from '@clerk/clerk-expo'
import { tokenCache } from '@/utils/token-cache'

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </ClerkLoaded>
    </ClerkProvider>
  )
}
```

```typescript
// apps/mobile/utils/token-cache.ts
import * as SecureStore from 'expo-secure-store'
import type { TokenCache } from '@clerk/clerk-expo'

export const tokenCache: TokenCache = {
  async getToken(key: string) {
    return SecureStore.getItemAsync(key)
  },
  async saveToken(key: string, value: string) {
    return SecureStore.setItemAsync(key, value)
  },
  async clearToken(key: string) {
    return SecureStore.deleteItemAsync(key)
  },
}
```

### Proteção de Rotas no Mobile

```typescript
// apps/mobile/app/(auth)/_layout.tsx
import { useAuth } from '@clerk/clerk-expo'
import { Redirect, Stack } from 'expo-router'

export default function AuthLayout() {
  const { isSignedIn } = useAuth()

  if (isSignedIn) {
    return <Redirect href="/(tabs)" />
  }

  return <Stack />
}

// apps/mobile/app/(tabs)/_layout.tsx
import { useAuth } from '@clerk/clerk-expo'
import { Redirect, Tabs } from 'expo-router'

export default function TabsLayout() {
  const { isSignedIn, isLoaded } = useAuth()

  if (!isLoaded) return null // splash screen

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />
  }

  return <Tabs />
}
```

### Setup Backend (Fastify)

```typescript
// apps/api/src/plugins/clerk.ts
import fp from 'fastify-plugin'
import { clerkPlugin, getAuth } from '@clerk/fastify'

export default fp(async (fastify) => {
  fastify.register(clerkPlugin, {
    secretKey: process.env.CLERK_SECRET_KEY,
  })

  // Decorator para acessar auth em qualquer handler
  fastify.decorate('requireAuth', async (request, reply) => {
    const { userId } = getAuth(request)
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const usuario = await fastify.prisma.usuario.findUnique({
      where: { clerkId: userId, deletadoEm: null },
    })

    if (!usuario) {
      return reply.status(401).send({ error: 'User not found' })
    }

    request.usuario = usuario
  })
})

// Uso em rotas protegidas
fastify.get('/viagens', {
  preHandler: fastify.requireAuth,
  handler: async (request, reply) => {
    const { usuario } = request
    // usuario.id, usuario.plano disponíveis
  }
})
```

---

## Webhook Clerk → Backend

O webhook sincroniza usuários criados/atualizados no Clerk com a tabela `usuarios`.

### Eventos monitorados

| Evento Clerk | Ação no Backend |
|---|---|
| `user.created` | `INSERT` em `usuarios` |
| `user.updated` | `UPDATE` nome, email, fotoUrl |
| `session.ended` | (opcional) log de auditoria |

### Handler do Webhook

```typescript
// apps/api/src/routes/auth/webhook.ts
import { Webhook } from 'svix'

export async function webhookHandler(request, reply) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET

  // Verificar assinatura Svix
  const wh = new Webhook(webhookSecret)
  let event

  try {
    event = wh.verify(request.rawBody, {
      'svix-id': request.headers['svix-id'],
      'svix-timestamp': request.headers['svix-timestamp'],
      'svix-signature': request.headers['svix-signature'],
    })
  } catch {
    return reply.status(400).send({ error: 'Invalid webhook signature' })
  }

  const { type, data } = event

  if (type === 'user.created' || type === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url } = data

    await fastify.prisma.usuario.upsert({
      where: { clerkId: id },
      update: {
        nome: `${first_name ?? ''} ${last_name ?? ''}`.trim(),
        email: email_addresses[0].email_address,
        fotoUrl: image_url,
        ultimoAcesso: new Date(),
      },
      create: {
        clerkId: id,
        nome: `${first_name ?? ''} ${last_name ?? ''}`.trim(),
        email: email_addresses[0].email_address,
        fotoUrl: image_url,
        plano: 'free',
      },
    })
  }

  reply.status(200).send({ received: true })
}
```

### Configurar Webhook no Clerk Dashboard

1. Clerk Dashboard → Webhooks → Add Endpoint
2. URL: `https://api.wandr.app/auth/webhook`
3. Eventos: `user.created`, `user.updated`
4. Copiar `Signing Secret` → `CLERK_WEBHOOK_SECRET`

---

## Verificação de Plano (Entitlement)

```typescript
// apps/api/src/middleware/plano.ts
export const requirePro = async (request, reply) => {
  const { usuario } = request

  const isPro =
    usuario.plano === 'pro' &&
    (usuario.proExpiraEm === null || usuario.proExpiraEm > new Date())

  if (!isPro) {
    return reply.status(403).send({
      error: 'pro_required',
      message: 'Esta funcionalidade requer o plano Pro.',
    })
  }
}

// Uso em rotas Pro
fastify.get('/lugares/buscar', {
  preHandler: [fastify.requireAuth, fastify.requirePro],
  handler: async (request, reply) => { ... }
})
```

---

## Limites Free — Middleware de Verificação

```typescript
// apps/api/src/middleware/limites.ts

export const verificarLimiteViagens = async (request, reply) => {
  const { usuario } = request
  if (usuario.plano === 'pro') return // Pro não tem limite

  const total = await fastify.prisma.viagem.count({
    where: {
      usuarioId: usuario.id,
      status: { not: 'concluida' },
      deletadoEm: null,
    }
  })

  if (total >= 3) {
    return reply.status(403).send({
      error: 'limit_reached',
      limit: 'viagens',
      message: 'Limite de 3 viagens ativas atingido. Faça upgrade para o Pro.',
    })
  }
}

export const verificarLimiteLugares = async (request, reply) => {
  const { usuario } = request
  if (usuario.plano === 'pro') return

  const { viagemId } = request.params
  const total = await fastify.prisma.lugar.count({
    where: { usuarioId: usuario.id, viagemId, deletadoEm: null }
  })

  if (total >= 20) {
    return reply.status(403).send({
      error: 'limit_reached',
      limit: 'lugares',
      message: 'Limite de 20 lugares por viagem atingido. Faça upgrade para o Pro.',
    })
  }
}
```

---

## Google OAuth

Configurado diretamente no Clerk Dashboard:
1. Clerk Dashboard → User & Authentication → Social Connections → Google
2. Configurar Google OAuth app no Google Cloud Console
3. Client ID + Client Secret → Clerk
4. Redirect URI: `https://clerk.wandr.app/v1/oauth_callback`

No mobile, o Clerk SDK cuida de tudo:

```typescript
import { useOAuth } from '@clerk/clerk-expo'
import * as WebBrowser from 'expo-web-browser'

WebBrowser.maybeCompleteAuthSession()

export function GoogleSignInButton() {
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' })

  const handleGoogleSignIn = async () => {
    const { createdSessionId, setActive } = await startOAuthFlow()
    if (createdSessionId) {
      await setActive({ session: createdSessionId })
    }
  }

  return (
    <Pressable onPress={handleGoogleSignIn}>
      <Text>Continuar com Google</Text>
    </Pressable>
  )
}
```

---

## Telas de Auth (Expo Router)

```
app/
└── (auth)/
    ├── _layout.tsx     ← redirect se já autenticado
    ├── sign-in.tsx     ← tela de login
    ├── sign-up.tsx     ← tela de cadastro
    └── forgot.tsx      ← recuperação de senha (via Clerk)
```

---

## Segurança

- Tokens armazenados exclusivamente no `SecureStore` (criptografado no keychain/keystore)
- Nunca em `AsyncStorage` (não criptografado)
- JWT tem TTL de 60 segundos, refresh automático pelo SDK Clerk
- Webhook validado via assinatura Svix (HMAC-SHA256)
- Clerk Secret Key nunca exposta no cliente mobile

---

*← [03 — Banco de Dados](../03-banco-de-dados/README.md) | Próximo: [05 — Storage →](../05-storage/README.md)*
