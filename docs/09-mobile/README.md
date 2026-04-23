# 09 — Mobile

> React Native + Expo SDK 52. Estrutura completa, navegação, estado, offline-first e design system.

---

## Estrutura de Pastas

```
apps/mobile/
├── app/                        ← Expo Router (file-based routing)
│   ├── _layout.tsx             ← Root layout: ClerkProvider, QueryProvider, RevenueCat
│   ├── +not-found.tsx          ← 404
│   ├── (auth)/                 ← Grupo não autenticado
│   │   ├── _layout.tsx         ← Redireciona para (tabs) se já logado
│   │   ├── sign-in.tsx
│   │   ├── sign-up.tsx
│   │   └── forgot.tsx
│   ├── (tabs)/                 ← Grupo autenticado (bottom tabs)
│   │   ├── _layout.tsx         ← Redireciona para (auth) se não logado
│   │   ├── index.tsx           ← Home: lista de viagens
│   │   ├── lugares.tsx         ← Banco pessoal de lugares
│   │   └── perfil.tsx          ← Perfil + configurações + plano
│   └── viagem/                 ← Stack dentro da home
│       ├── nova.tsx            ← Criar viagem
│       ├── [id]/
│       │   ├── _layout.tsx     ← Header da viagem (nome + status)
│       │   ├── index.tsx       ← Dashboard da viagem
│       │   ├── itinerario.tsx  ← Itinerário dia a dia
│       │   ├── lugares.tsx     ← Lugares da viagem + mapa
│       │   ├── cotacoes.tsx    ← Cotações e comparativo
│       │   ├── gastos.tsx      ← Gastos e painel financeiro
│       │   └── checklist.tsx   ← Checklist da viagem
│       └── [id]/lugar/
│           ├── novo.tsx
│           └── [lugarId].tsx
├── src/
│   ├── components/
│   │   ├── ui/                 ← Design system: Button, Card, Input, Badge...
│   │   ├── viagem/             ← ViagemCard, ViagemStatus, ViagemHeader...
│   │   ├── itinerario/         ← DiaCard, AtividadeItem, DragList...
│   │   ├── lugares/            ← LugarCard, LugarBusca, LugarMapa...
│   │   ├── financeiro/         ← PainelFinanceiro, CotacaoCard, GastoItem...
│   │   ├── ia/                 ← PaywallInline, IAGenerating, IAResult...
│   │   └── paywall/            ← PaywallModal, PaywallTrigger...
│   ├── hooks/
│   │   ├── useViagens.ts       ← CRUD de viagens + React Query
│   │   ├── useLugares.ts
│   │   ├── useItinerario.ts
│   │   ├── usePlano.ts         ← isPro, limites, upsell
│   │   ├── useRevenueCat.ts
│   │   └── useOfflineSync.ts
│   ├── stores/
│   │   ├── viagemStore.ts      ← Zustand: viagem ativa, filtros
│   │   └── uiStore.ts          ← Zustand: modais, toasts, tema
│   ├── services/
│   │   ├── api.ts              ← Cliente HTTP configurado
│   │   ├── storage.ts          ← Upload R2
│   │   └── sync.ts             ← Fila de sync offline
│   ├── utils/
│   │   ├── currency.ts         ← Formatação BRL
│   │   ├── date.ts             ← Formatação de datas PT-BR
│   │   └── limits.ts           ← Verificação de limites Free
│   └── types/
│       ├── api.ts              ← Tipos dos responses da API
│       └── navigation.ts       ← Tipos das rotas
├── assets/                     ← Ícones, splash screen, fontes
├── app.config.ts               ← Expo config dinâmico
├── eas.json                    ← EAS Build config
├── tailwind.config.ts          ← NativeWind config
└── tsconfig.json
```

---

## Navegação — Expo Router

### Estrutura de Tabs

```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router'
import { Home, MapPin, User } from 'lucide-react-native'
import { useColorScheme } from 'nativewind'

export default function TabsLayout() {
  const { colorScheme } = useColorScheme()

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#6366F1',   // indigo-500 (cor primária Wandr)
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: colorScheme === 'dark' ? '#111827' : '#FFFFFF',
          borderTopColor: colorScheme === 'dark' ? '#1F2937' : '#F3F4F6',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Viagens',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="lugares"
        options={{
          title: 'Lugares',
          tabBarIcon: ({ color, size }) => <MapPin size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}
```

### Navegação Programática

```typescript
import { router } from 'expo-router'

// Navegar para detalhes de uma viagem
router.push(`/viagem/${viagemId}`)

// Abrir criação de nova viagem
router.push('/viagem/nova')

// Abrir lugar específico
router.push(`/viagem/${viagemId}/lugar/${lugarId}`)

// Voltar
router.back()
```

---

## Estado Global — Zustand + React Query

### Divisão de responsabilidades

| Tecnologia | Responsabilidade |
|---|---|
| **React Query** | Estado do servidor: buscar, cachear, sincronizar dados da API |
| **Zustand** | Estado UI: viagem selecionada, filtros, modais, tema |
| **AsyncStorage** | Persistência offline: cache React Query |
| **SecureStore** | Tokens Clerk (nunca estado da aplicação) |

### Zustand Store

```typescript
// src/stores/viagemStore.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface ViagemStore {
  filtroStatus: string | null
  setFiltroStatus: (status: string | null) => void
  viagemAtiva: string | null
  setViagemAtiva: (id: string | null) => void
}

export const useViagemStore = create<ViagemStore>()(
  persist(
    (set) => ({
      filtroStatus: null,
      setFiltroStatus: (status) => set({ filtroStatus: status }),
      viagemAtiva: null,
      setViagemAtiva: (id) => set({ viagemAtiva: id }),
    }),
    {
      name: 'viagem-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
```

### React Query Hooks

```typescript
// src/hooks/useViagens.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'

export function useViagens() {
  return useQuery({
    queryKey: ['viagens'],
    queryFn: () => api.get('/v1/viagens').then(r => r.data.data),
    staleTime: 1000 * 60 * 5,  // 5 minutos
  })
}

export function useViagem(id: string) {
  return useQuery({
    queryKey: ['viagens', id],
    queryFn: () => api.get(`/v1/viagens/${id}`).then(r => r.data.data),
    enabled: !!id,
  })
}

export function useCriarViagem() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: any) => api.post('/v1/viagens', data).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['viagens'] })
    },
  })
}
```

---

## Offline-First

### Estratégia por tipo de usuário

| Funcionalidade | Free (offline) | Pro (offline) |
|---|---|---|
| Visualizar viagens | ✅ Cache local | ✅ Cache local |
| Visualizar itinerário | ✅ Cache local | ✅ Cache local |
| Editar atividade | ❌ Requer conexão | ✅ Fila de sync |
| Adicionar gasto | ❌ Requer conexão | ✅ Fila de sync |
| Buscar lugares | ❌ Sempre online | ❌ Sempre online (API Google) |

### Configuração do QueryProvider

```typescript
// src/providers/QueryProvider.tsx
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import AsyncStorage from '@react-native-async-storage/async-storage'
import NetInfo from '@react-native-community/netinfo'
import { onlineManager } from '@tanstack/react-query'

// Sincronizar status de rede com React Query
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected && !!state.isInternetReachable)
  })
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 horas no cache
      staleTime: 1000 * 60 * 5,    // 5 minutos antes de refetch
      retry: 2,
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
})

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'WANDR_QUERY_CACHE',
  throttleTime: 1000,
})
```

---

## Design System

### Paleta de Cores

```typescript
// tailwind.config.ts
const colors = {
  primary: {
    50:  '#EEF2FF',
    100: '#E0E7FF',
    500: '#6366F1', // indigo — cor principal
    600: '#4F46E5',
    700: '#4338CA',
  },
  accent: {
    500: '#F59E0B', // amber — destaques, badges
  },
  success: '#10B981',  // emerald
  danger: '#EF4444',   // red
  warning: '#F59E0B',  // amber
  text: {
    primary:   '#111827',
    secondary: '#6B7280',
    muted:     '#9CA3AF',
  },
  surface: {
    base:    '#FFFFFF',
    raised:  '#F9FAFB',
    overlay: '#F3F4F6',
  },
}
```

### Tipografia

| Token | Fonte | Tamanho | Peso |
|---|---|---|---|
| `text-xs` | System | 12px | 400 |
| `text-sm` | System | 14px | 400 |
| `text-base` | System | 16px | 400 |
| `text-lg` | System | 18px | 600 |
| `text-xl` | System | 20px | 700 |
| `text-2xl` | System | 24px | 700 |

**Fonte:** SF Pro (iOS nativo) / Roboto (Android nativo). Sem fonte custom no MVP.

### Componentes UI Base

| Componente | Variantes |
|---|---|
| `Button` | `primary`, `secondary`, `outline`, `ghost`, `danger` |
| `Card` | `default`, `elevated`, `pressable` |
| `Input` | `default`, `error`, `disabled` |
| `Badge` | `default`, `success`, `warning`, `danger`, `pro` |
| `Avatar` | `sm`, `md`, `lg` |
| `Skeleton` | Placeholder de loading |
| `PaywallInline` | Exibido em lugar de feature Pro bloqueada |

---

## Performance

### Listas Longas

```typescript
// Usar FlashList em vez de FlatList
import { FlashList } from '@shopify/flash-list'

<FlashList
  data={viagens}
  renderItem={({ item }) => <ViagemCard viagem={item} />}
  estimatedItemSize={140}
  keyExtractor={(item) => item.id}
/>
```

### Imagens

```typescript
// Usar expo-image em vez de Image do RN
import { Image } from 'expo-image'

<Image
  source={{ uri: lugar.fotos[0] }}
  style={{ width: '100%', height: 200 }}
  contentFit="cover"
  placeholder={blurhash}
  transition={200}
/>
```

### Memoização

```typescript
// Memoizar componentes que recebem props estáveis
const ViagemCard = memo(function ViagemCard({ viagem }: { viagem: Viagem }) {
  // ...
})

// Memoizar callbacks passados para listas
const handlePress = useCallback((id: string) => {
  router.push(`/viagem/${id}`)
}, [])
```

---

## Configuração EAS Build

```json
// eas.json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "autoIncrement": true,
      "env": {
        "APP_ENV": "production"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "thiago@axellion.com.br",
        "ascAppId": "XXXXXXXXX"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

---

## Variáveis de Ambiente (Mobile)

```typescript
// app.config.ts
import { ExpoConfig } from 'expo/config'

const config: ExpoConfig = {
  name: 'Wandr',
  slug: 'wandr',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  splash: { image: './assets/splash.png', resizeMode: 'contain', backgroundColor: '#6366F1' },
  ios: {
    bundleIdentifier: 'com.axellion.wandr',
    supportsTablet: false,
  },
  android: {
    package: 'com.axellion.wandr',
    adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#6366F1' },
  },
  extra: {
    clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
    revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    eas: { projectId: 'EXPO_PROJECT_ID' }
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    ['expo-image-picker', { photosPermission: 'Wandr precisa acessar suas fotos para personalizar sua viagem.' }],
    ['react-native-purchases', { ...revenueCatConfig }]
  ],
}
```

---

*← [08 — API Backend](../08-api-backend/README.md) | Próximo: [10 — Landing Page →](../10-landing-page/README.md)*
