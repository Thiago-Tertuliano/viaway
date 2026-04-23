# 05 — Storage

> Cloudflare R2 para armazenamento de fotos e assets. Zero egress fees.

---

## Por que Cloudflare R2

| Critério | R2 | AWS S3 |
|---|---|---|
| Egress (download) | **Gratuito** | $0.09/GB |
| Storage | $0.015/GB/mês | $0.023/GB/mês |
| Operações (PUT/GET) | $0.36/M | $0.40/M PUT, $0.004/M GET |
| SDK | S3-compatible | Nativo |
| CDN | Cloudflare (incluso) | CloudFront (cobrado à parte) |
| Setup | Simples | Complexo (IAM, políticas, regiões) |

**Conclusão:** R2 é ~40% mais barato em storage e elimina o custo de egress — crítico para um app de fotos.

---

## Estrutura de Buckets

Um único bucket principal com organização por prefixo:

```
wandr-assets/
├── avatars/
│   └── {usuarioId}/
│       └── profile.jpg
├── viagens/
│   └── {viagemId}/
│       ├── capa.jpg
│       └── fotos/
│           └── {uuid}.jpg
├── lugares/
│   └── {lugarId}/
│       └── {uuid}.jpg
└── comprovantes/
    └── {gastoId}/
        └── {uuid}.jpg
```

---

## Fluxo de Upload

O mobile **nunca** envia arquivo para o backend. O fluxo usa presigned URLs:

```
[Mobile]
    │
    1. POST /storage/presigned
    │   Body: { tipo: 'viagem_foto', entidadeId: 'abc123', mimeType: 'image/jpeg' }
    │
    │   [Backend]
    │       ├─ Valida auth + ownership da entidade
    │       ├─ Gera chave: viagens/abc123/fotos/{uuid}.jpg
    │       └─ Retorna presigned PUT URL (TTL: 5 minutos)
    │
    2. PUT {presignedUrl} com o arquivo binário diretamente para R2
    │   (sem passar pelo backend)
    │
    3. PATCH /viagens/abc123/fotos
    │   Body: { url: 'https://cdn.wandr.app/viagens/abc123/fotos/{uuid}.jpg' }
    │   (confirma o upload e persiste a URL no banco)
```

---

## Configuração R2

### Variáveis de Ambiente

```env
# apps/api/.env
R2_ACCOUNT_ID=abc123def456
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=yyy
R2_BUCKET_NAME=wandr-assets
R2_PUBLIC_URL=https://cdn.wandr.app
```

### Cliente R2 no Backend

```typescript
// apps/api/src/config/storage.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuid } from 'uuid'

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export async function gerarPresignedUrl(
  tipo: 'avatar' | 'viagem_capa' | 'viagem_foto' | 'lugar_foto' | 'comprovante',
  entidadeId: string,
  mimeType: string
): Promise<{ url: string; chave: string; urlFinal: string }> {
  const ext = mimeType.split('/')[1] ?? 'jpg'
  const chave = gerarChave(tipo, entidadeId, ext)

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: chave,
    ContentType: mimeType,
    // Limitar tamanho via content-length (verificado no upload direto)
  })

  const url = await getSignedUrl(r2Client, command, { expiresIn: 300 }) // 5 min
  const urlFinal = `${process.env.R2_PUBLIC_URL}/${chave}`

  return { url, chave, urlFinal }
}

function gerarChave(
  tipo: string,
  entidadeId: string,
  ext: string
): string {
  const mapa = {
    avatar:       `avatars/${entidadeId}/profile.${ext}`,
    viagem_capa:  `viagens/${entidadeId}/capa.${ext}`,
    viagem_foto:  `viagens/${entidadeId}/fotos/${uuid()}.${ext}`,
    lugar_foto:   `lugares/${entidadeId}/${uuid()}.${ext}`,
    comprovante:  `comprovantes/${entidadeId}/${uuid()}.${ext}`,
  }
  return mapa[tipo]
}

export async function deletarArquivo(chave: string): Promise<void> {
  await r2Client.send(new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: chave,
  }))
}
```

---

## Endpoint de Presigned URL

```typescript
// apps/api/src/routes/storage/presigned.ts

const bodySchema = z.object({
  tipo: z.enum(['avatar', 'viagem_capa', 'viagem_foto', 'lugar_foto', 'comprovante']),
  entidadeId: z.string().cuid(),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
})

fastify.post('/storage/presigned', {
  preHandler: [fastify.requireAuth],
  schema: { body: zodToJsonSchema(bodySchema) },
  handler: async (request, reply) => {
    const { tipo, entidadeId, mimeType } = bodySchema.parse(request.body)
    const { usuario } = request

    // Verificar que o usuário é dono da entidade
    await verificarOwnership(tipo, entidadeId, usuario.id)

    const { url, chave, urlFinal } = await gerarPresignedUrl(tipo, entidadeId, mimeType)

    return reply.send({ uploadUrl: url, urlFinal, chave })
  }
})
```

---

## Upload no Mobile

```typescript
// apps/mobile/src/services/storage.ts
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { api } from './api'

export async function uploadFotoViagem(
  viagemId: string,
  uri: string
): Promise<string> {
  // 1. Comprimir imagem antes do upload
  const compressed = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1200 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  )

  // 2. Obter presigned URL do backend
  const { uploadUrl, urlFinal } = await api.post('/storage/presigned', {
    tipo: 'viagem_foto',
    entidadeId: viagemId,
    mimeType: 'image/jpeg',
  })

  // 3. Upload direto para R2
  const fileContent = await fetch(compressed.uri)
  const blob = await fileContent.blob()

  await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: blob,
  })

  // 4. Retornar URL final
  return urlFinal
}
```

---

## Limites e Validações

| Tipo de Arquivo | Tamanho Máximo | Formatos Aceitos |
|---|---|---|
| Avatar | 5 MB | JPEG, PNG, WebP |
| Capa de viagem | 10 MB | JPEG, PNG, WebP |
| Foto de lugar | 10 MB | JPEG, PNG, WebP |
| Comprovante de gasto | 10 MB | JPEG, PNG, WebP |

**Compressão no mobile antes do upload:**
- Resize: width máximo 1200px
- Quality: 80%
- Formato: JPEG (melhor compressão para fotos)

---

## CDN e Acesso Público

```
# Configuração no Cloudflare Dashboard
Domínio custom: cdn.wandr.app → R2 Public Bucket

# URLs são sempre públicas (sem autenticação para leitura)
# Segurança: usuário não sabe a chave exata sem passar pelo backend
https://cdn.wandr.app/viagens/{viagemId}/fotos/{uuid}.jpg
```

**Nota de segurança:** As URLs são "security by obscurity" via UUID. Para Fase 2+, avaliar signed URLs para leitura também, caso haja requisito de privacidade mais forte.

---

## Lifecycle Rules — Limpeza de Arquivos Órfãos

Implementado via job periódico (cron no Railway, semanal):

1. Listar todos os arquivos no R2
2. Para cada arquivo, extrair `entidadeId` da chave
3. Verificar se a entidade existe no banco e não foi deletada
4. Arquivos órfãos (entidade inexistente) → deletar do R2

```typescript
// apps/api/src/jobs/cleanup-storage.ts
export async function cleanupOrphanFiles() {
  const objects = await listAllObjects()

  for (const obj of objects) {
    const { tipo, entidadeId } = parseChave(obj.Key)
    const exists = await verificarEntidadeExiste(tipo, entidadeId)

    if (!exists) {
      await deletarArquivo(obj.Key)
      logger.info({ chave: obj.Key }, 'Arquivo órfão removido')
    }
  }
}
```

---

*← [04 — Autenticação](../04-autenticacao/README.md) | Próximo: [06 — Pagamento →](../06-pagamento/README.md)*
