# 07 — Integrações Externas

> Google Places API (New) para busca de lugares e OpenAI GPT-4o para IA Pro.

---

## Google Places API (New)

### Visão Geral

Integração disponível apenas no plano **Pro**. Permite buscar lugares com fotos, avaliações e dados reais do Google.

**Versão:** Places API (New) — v1 (substituiu a versão legada em 2024)

### Configuração

```env
# apps/api/.env
GOOGLE_PLACES_API_KEY=AIza...
```

**Restrições no Google Cloud Console:**
- Restringir chave por IP do servidor Railway (não expor no cliente)
- APIs habilitadas: `Places API (New)`
- Quotas: monitorar `places.searchText` e `places.get`

### Endpoints Usados

| Endpoint | Uso | Custo aproximado |
|---|---|---|
| `POST /v1/places:searchText` | Busca textual de lugares | $17/1000 requests |
| `GET /v1/places/{placeId}` | Detalhes de um lugar | $17/1000 requests |
| `GET /v1/places/{placeId}/photos/{photoRef}/media` | Foto do lugar | $7/1000 requests |

**Campo máximo (field mask)** — só solicitar o que usar (reduz custo):

```
displayName,formattedAddress,location,rating,userRatingCount,
photos,types,currentOpeningHours,websiteUri,nationalPhoneNumber,
priceLevel,editorialSummary
```

### Implementação Backend

```typescript
// apps/api/src/services/places.service.ts

interface PlaceSearchResult {
  placeId: string
  nome: string
  endereco: string
  lat: number
  lng: number
  notaGoogle: number
  totalAvaliacoes: number
  fotos: string[]
  tipos: string[]
  aberto: boolean | null
  website: string | null
}

export class PlacesService {
  private readonly baseUrl = 'https://places.googleapis.com/v1'
  private readonly apiKey = process.env.GOOGLE_PLACES_API_KEY!
  private readonly fieldMask = [
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.location',
    'places.rating',
    'places.userRatingCount',
    'places.photos',
    'places.types',
    'places.currentOpeningHours.openNow',
    'places.websiteUri',
    'places.priceLevel',
    'places.editorialSummary',
  ].join(',')

  async buscarLugares(
    query: string,
    cidade?: string,
    maxResults = 10
  ): Promise<PlaceSearchResult[]> {
    const textoCompleto = cidade ? `${query} em ${cidade}` : query

    const response = await fetch(`${this.baseUrl}/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': this.fieldMask,
      },
      body: JSON.stringify({
        textQuery: textoCompleto,
        maxResultCount: maxResults,
        languageCode: 'pt-BR',
      }),
    })

    if (!response.ok) {
      throw new Error(`Google Places error: ${response.statusText}`)
    }

    const data = await response.json()
    return (data.places ?? []).map(this.mapPlace.bind(this))
  }

  async buscarDetalhes(placeId: string): Promise<PlaceSearchResult> {
    const response = await fetch(`${this.baseUrl}/places/${placeId}`, {
      headers: {
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': this.fieldMask,
      },
    })

    const place = await response.json()
    return this.mapPlace(place)
  }

  private mapPlace(place: any): PlaceSearchResult {
    return {
      placeId: place.id,
      nome: place.displayName?.text ?? '',
      endereco: place.formattedAddress ?? '',
      lat: place.location?.latitude ?? 0,
      lng: place.location?.longitude ?? 0,
      notaGoogle: place.rating ?? null,
      totalAvaliacoes: place.userRatingCount ?? 0,
      fotos: (place.photos ?? [])
        .slice(0, 5)
        .map((p: any) => this.buildPhotoUrl(p.name)),
      tipos: place.types ?? [],
      aberto: place.currentOpeningHours?.openNow ?? null,
      website: place.websiteUri ?? null,
    }
  }

  private buildPhotoUrl(photoName: string): string {
    return `${this.baseUrl}/${photoName}/media?maxWidthPx=800&key=${this.apiKey}`
  }
}
```

### Endpoint da API

```typescript
// apps/api/src/routes/lugares/buscar.ts
fastify.get('/lugares/buscar', {
  preHandler: [fastify.requireAuth, fastify.requirePro],
  schema: {
    querystring: {
      type: 'object',
      required: ['q'],
      properties: {
        q: { type: 'string', minLength: 2 },
        cidade: { type: 'string' },
        max: { type: 'integer', minimum: 1, maximum: 20, default: 10 },
      }
    }
  },
  handler: async (request, reply) => {
    const { q, cidade, max } = request.query as any
    const resultados = await placesService.buscarLugares(q, cidade, max)
    return reply.send({ lugares: resultados })
  }
})
```

### Cache de Resultados

Para reduzir custo e latência, cachear resultados por query + cidade (TTL: 1 hora):

```typescript
// Cache em memória simples para MVP; Redis para produção com volume
const cache = new Map<string, { data: any; expira: number }>()

function cacheKey(query: string, cidade?: string): string {
  return `${query.toLowerCase().trim()}|${cidade?.toLowerCase().trim() ?? ''}`
}

async function buscarComCache(query: string, cidade?: string) {
  const key = cacheKey(query, cidade)
  const cached = cache.get(key)

  if (cached && cached.expira > Date.now()) {
    return cached.data
  }

  const data = await placesService.buscarLugares(query, cidade)
  cache.set(key, { data, expira: Date.now() + 60 * 60 * 1000 }) // 1h
  return data
}
```

### Estimativa de Custo

| Cenário | Requests/mês | Custo estimado |
|---|---|---|
| 100 usuários Pro, 5 buscas/mês | 500 searchText | ~$8.50 |
| 1.000 usuários Pro, 5 buscas/mês | 5.000 searchText | ~$85 |
| Cache hit rate 40% | 3.000 searchText | ~$51 |

**Free tier Google:** $200/mês de crédito → cobre os primeiros ~11.000 requests de searchText.

---

## OpenAI GPT-4o API

### Visão Geral

Usado para 4 funcionalidades Pro:
1. **Geração de itinerário** — input: destino, datas, estilo, ritmo → output: itinerário dia a dia
2. **Sugestão de orçamento** — input: destino, duração, viajantes → output: faixas por categoria
3. **Checklist automático** — input: destino, época, duração → output: lista de itens
4. **Resumo pós-trip** — input: dados da viagem → output: resumo em texto

### Configuração

```env
# apps/api/.env
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o
OPENAI_MAX_TOKENS=4000
```

### Cliente OpenAI

```typescript
// apps/api/src/config/openai.ts
import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})
```

### Geração de Itinerário

**Prompt Engineering:**

```typescript
// apps/api/src/services/ia/itinerario.service.ts

const SYSTEM_PROMPT = `Você é um assistente especialista em planejamento de viagens no Brasil e no mundo.
Gera itinerários detalhados, práticos e realistas.
Sempre responde em JSON estruturado conforme o schema fornecido.
Não inventa lugares que não existem. Prefere lugares conhecidos e bem avaliados.
Considera a lógica geográfica — não coloca lugares distantes no mesmo dia sem justificativa.`

interface InputItinerario {
  destino: string
  dataInicio: string   // ISO 8601
  dataFim: string      // ISO 8601
  numViajantes: number
  estilo: 'cultural' | 'praia' | 'aventura' | 'gastronomico' | 'relaxamento'
  ritmo: 'leve' | 'moderado' | 'intenso'
  interesses?: string[]
  orcamentoTotal?: number
}

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    dias: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          data: { type: 'string', description: 'YYYY-MM-DD' },
          resumo: { type: 'string' },
          atividades: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                tipo: { enum: ['atividade', 'refeicao', 'transporte', 'hospedagem', 'livre'] },
                nome: { type: 'string' },
                horarioInicio: { type: 'string', description: 'HH:MM' },
                horarioFim: { type: 'string', description: 'HH:MM' },
                duracaoMin: { type: 'integer' },
                custoEstimadoPorPessoa: { type: 'number' },
                notas: { type: 'string' },
                nomeLugar: { type: 'string' },
                enderecoLugar: { type: 'string' },
              },
              required: ['tipo', 'nome', 'horarioInicio']
            }
          }
        },
        required: ['data', 'atividades']
      }
    },
    estimativaCustoTotal: { type: 'number' },
    dicas: { type: 'array', items: { type: 'string' } }
  },
  required: ['dias']
}

export async function gerarItinerario(input: InputItinerario) {
  const duracao = calcularDias(input.dataInicio, input.dataFim)

  const userPrompt = `
Crie um itinerário de viagem para ${input.destino}.
- Período: ${input.dataInicio} a ${input.dataFim} (${duracao} dias)
- Viajantes: ${input.numViajantes}
- Estilo: ${input.estilo}
- Ritmo: ${input.ritmo}
${input.interesses?.length ? `- Interesses: ${input.interesses.join(', ')}` : ''}
${input.orcamentoTotal ? `- Orçamento total: R$ ${input.orcamentoTotal}` : ''}

Gere o itinerário completo dia a dia, com horários realistas e custo estimado por pessoa em BRL.
`

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'itinerario',
        schema: OUTPUT_SCHEMA,
        strict: true,
      }
    },
    max_tokens: Number(process.env.OPENAI_MAX_TOKENS) ?? 4000,
    temperature: 0.7,
  })

  const content = response.choices[0].message.content
  return JSON.parse(content!)
}
```

### Sugestão de Orçamento

```typescript
export async function sugerirOrcamento(
  destino: string,
  duracaoDias: number,
  numViajantes: number
) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: `Para uma viagem a ${destino} de ${duracaoDias} dias com ${numViajantes} viajante(s),
      sugira faixas de orçamento em BRL (econômico, confortável, premium) com estimativas por:
      hospedagem, alimentação, transporte, passeios e outros.
      Responda em JSON com campos: economico, confortavel, premium (cada um com o total e breakdown por categoria).`
    }],
    response_format: { type: 'json_object' },
    max_tokens: 1000,
    temperature: 0.5,
  })

  return JSON.parse(response.choices[0].message.content!)
}
```

### Checklist Automático

```typescript
export async function gerarChecklist(
  destino: string,
  dataIda: string,
  duracaoDias: number
) {
  const mesViagem = new Date(dataIda).toLocaleDateString('pt-BR', { month: 'long' })

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: `Gere uma lista de itens para levar em uma viagem de ${duracaoDias} dias para ${destino} em ${mesViagem}.
      Inclua: documentos, roupas adequadas ao clima, itens específicos do destino e dicas práticas.
      Organize por categoria. Responda em JSON: { itens: [{ item, categoria }] }`
    }],
    response_format: { type: 'json_object' },
    max_tokens: 800,
    temperature: 0.4,
  })

  return JSON.parse(response.choices[0].message.content!)
}
```

### Estimativa de Custo OpenAI

| Funcionalidade | Input tokens | Output tokens | Custo/chamada |
|---|---|---|---|
| Geração de itinerário (7 dias) | ~500 | ~3.000 | ~$0.04 |
| Sugestão de orçamento | ~200 | ~500 | ~$0.009 |
| Checklist automático | ~150 | ~400 | ~$0.007 |
| Resumo pós-trip | ~800 | ~600 | ~$0.02 |

**Preço GPT-4o:** $2.50/1M input tokens + $10/1M output tokens

**100 itinerários gerados/mês:** ~$4 — custo totalmente absorvível no plano Pro.

### Fallback e Timeout

```typescript
// Timeout de 15s para operações de IA
const TIMEOUT_MS = 15_000

async function gerarComTimeout<T>(fn: () => Promise<T>): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('IA timeout')), TIMEOUT_MS)
    )
  ])
}

// No handler da rota
try {
  const itinerario = await gerarComTimeout(() => gerarItinerario(input))
  return reply.send(itinerario)
} catch (error) {
  if (error.message === 'IA timeout') {
    return reply.status(504).send({
      error: 'ia_timeout',
      message: 'A geração demorou mais que o esperado. Tente novamente.'
    })
  }
  throw error
}
```

---

## Mapa de Integrações por Fase

| Integração | Fase 1 | Fase 2 | Fase 3 |
|---|---|---|---|
| Clerk (auth) | ✅ Obrigatório | — | — |
| Cloudflare R2 (storage) | ✅ Obrigatório | — | — |
| RevenueCat (pagamento) | ❌ | ✅ Obrigatório | — |
| Google Places API | ❌ | ✅ Obrigatório | — |
| OpenAI GPT-4o | ❌ | ❌ | ✅ Obrigatório |

---

*← [06 — Pagamento](../06-pagamento/README.md) | Próximo: [08 — API Backend →](../08-api-backend/README.md)*
