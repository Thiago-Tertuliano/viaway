# 14 — Ambiente de Desenvolvimento

> Setup completo do ambiente local. Do zero ao servidor rodando em menos de 30 minutos.

---

## Pré-requisitos

| Ferramenta | Versão mínima | Instalar |
|---|---|---|
| Node.js | 22 LTS | [nodejs.org](https://nodejs.org) |
| npm | 10+ | Incluído com Node.js |
| Git | 2.40+ | [git-scm.com](https://git-scm.com) |
| Docker Desktop | 4.x | [docker.com](https://docker.com) |
| Expo CLI | latest | `npm install -g expo-cli` |
| EAS CLI | latest | `npm install -g eas-cli` |
| Expo Go | latest | App Store / Google Play (para testes rápidos) |

**Opcional mas recomendado:**
- VS Code com extensões: Prisma, ESLint, Prettier, Tailwind CSS IntelliSense
- TablePlus ou DBeaver para visualizar o banco localmente
- Bruno ou Insomnia para testar a API (alternativa ao Postman)

---

## Clonar e Instalar

```bash
# Clonar o repositório
git clone https://github.com/axellion/wandr.git
cd wandr

# Instalar dependências de todos os apps
npm install

# (Se monorepo com workspaces)
# npm install instala tudo de uma vez
```

---

## Variáveis de Ambiente

### Backend — `apps/api/.env`

Copiar o exemplo e preencher:
```bash
cp apps/api/.env.example apps/api/.env
```

```env
# apps/api/.env

NODE_ENV=development
PORT=3333
LOG_LEVEL=debug

# Banco (Docker local)
DATABASE_URL="postgresql://wandr:wandr@localhost:5432/wandr_dev"
DIRECT_URL="postgresql://wandr:wandr@localhost:5432/wandr_dev"

# Clerk (usar chaves do ambiente development no Clerk Dashboard)
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_... # obter via Clerk CLI tunnel ou ngrok

# Google Places (criar projeto no GCP, sem restrição de IP em dev)
GOOGLE_PLACES_API_KEY=AIza...

# OpenAI
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini  # usar mini em dev (mais barato)

# Cloudflare R2 (usar bucket de dev separado)
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=wandr-assets-dev
R2_PUBLIC_URL=https://cdn-dev.wandr.app

# RevenueCat (não necessário em desenvolvimento)
REVENUECAT_WEBHOOK_SECRET=dev_secret

# Sentry (opcional em dev)
SENTRY_DSN=
```

### Mobile — `apps/mobile/.env.local`

```bash
cp apps/mobile/.env.example apps/mobile/.env.local
```

```env
# apps/mobile/.env.local

EXPO_PUBLIC_API_URL=http://localhost:3333
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

# RevenueCat (usar keys de sandbox)
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_sandbox_...
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_sandbox_...
```

**Para testar no dispositivo físico:** substituir `localhost` pelo IP da máquina na rede local:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:3333
```

---

## Banco de Dados Local (Docker)

```bash
# Subir PostgreSQL local
docker run -d \
  --name wandr-postgres \
  -e POSTGRES_USER=wandr \
  -e POSTGRES_PASSWORD=wandr \
  -e POSTGRES_DB=wandr_dev \
  -p 5432:5432 \
  postgres:16-alpine

# Verificar se está rodando
docker ps | grep wandr-postgres

# Parar
docker stop wandr-postgres

# Iniciar novamente
docker start wandr-postgres
```

Ou com `docker-compose.yml` na raiz:

```yaml
# docker-compose.yml
version: '3.9'
services:
  postgres:
    image: postgres:16-alpine
    container_name: wandr-postgres
    environment:
      POSTGRES_USER: wandr
      POSTGRES_PASSWORD: wandr
      POSTGRES_DB: wandr_dev
    ports:
      - '5432:5432'
    volumes:
      - wandr_pgdata:/var/lib/postgresql/data

volumes:
  wandr_pgdata:
```

```bash
docker compose up -d
```

---

## Migrations e Seed

```bash
# Rodar migrations (criar todas as tabelas)
cd apps/api
npx prisma migrate dev

# Rodar seed (dados de exemplo)
npx prisma db seed

# Visualizar banco no Prisma Studio
npx prisma studio
# Abre http://localhost:5555

# Resetar banco em desenvolvimento (apaga tudo e recria)
npx prisma migrate reset
```

---

## Rodar os Serviços

### Backend

```bash
cd apps/api
npm run dev
# Servidor em http://localhost:3333
# Health check: http://localhost:3333/health
```

### Landing Page

```bash
cd apps/landing
npm run dev
# Site em http://localhost:3000
```

### Mobile

```bash
cd apps/mobile
npx expo start
```

Opções depois do `expo start`:
- `i` → Simulador iOS (requer XCode no macOS)
- `a` → Emulador Android (requer Android Studio)
- `w` → Browser (limitado — apenas para debug de lógica)
- QR code → Expo Go no dispositivo físico

---

## Comandos Úteis

### API Backend

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Tests
npm test

# Tests com coverage
npm run test:coverage

# Gerar Prisma Client (após mudança no schema)
npx prisma generate

# Ver queries SQL geradas (debug)
DATABASE_URL="..." npx prisma migrate dev --create-only
```

### Mobile

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Limpar cache do Metro bundler (quando tiver comportamento estranho)
npx expo start --clear

# Build de desenvolvimento (para testar com dev client)
eas build --platform ios --profile development
eas build --platform android --profile development

# Build de preview (APK/IPA para testar)
eas build --platform all --profile preview
```

---

## Webhook Local — Clerk

Para receber webhooks do Clerk em desenvolvimento, usar ngrok ou Cloudflare Tunnel:

```bash
# Opção 1: ngrok
npm install -g ngrok
ngrok http 3333
# URL gerada: https://abc123.ngrok.io
# No Clerk Dashboard: endpoint = https://abc123.ngrok.io/v1/auth/webhook

# Opção 2: Cloudflare Tunnel (mais estável)
npx cloudflared tunnel --url http://localhost:3333
```

---

## Estrutura de `.env.example`

Ambos os arquivos devem existir no repositório com valores fictícios:

```bash
# apps/api/.env.example
NODE_ENV=development
PORT=3333
LOG_LEVEL=debug
DATABASE_URL="postgresql://wandr:wandr@localhost:5432/wandr_dev"
DIRECT_URL="postgresql://wandr:wandr@localhost:5432/wandr_dev"
CLERK_SECRET_KEY=sk_test_COLOQUE_SUA_CHAVE
CLERK_WEBHOOK_SECRET=whsec_COLOQUE_SEU_SECRET
GOOGLE_PLACES_API_KEY=COLOQUE_SUA_CHAVE
OPENAI_API_KEY=COLOQUE_SUA_CHAVE
OPENAI_MODEL=gpt-4o-mini
R2_ACCOUNT_ID=COLOQUE_SEU_ACCOUNT_ID
R2_ACCESS_KEY_ID=COLOQUE_SUA_CHAVE
R2_SECRET_ACCESS_KEY=COLOQUE_SEU_SECRET
R2_BUCKET_NAME=wandr-assets-dev
R2_PUBLIC_URL=https://cdn-dev.wandr.app
REVENUECAT_WEBHOOK_SECRET=dev_secret
SENTRY_DSN=
```

---

## Troubleshooting

| Problema | Causa provável | Solução |
|---|---|---|
| `npx prisma migrate dev` falha | Banco não está rodando | `docker start wandr-postgres` |
| Expo não conecta à API | `localhost` não funciona em dispositivo físico | Usar IP da máquina na rede |
| Erro de CORS | Origin não permitida em desenvolvimento | Checar `NODE_ENV=development` no backend |
| `sk_test_` não funciona | Usando chave de produção em dev | Usar chave `test` do Clerk Dashboard |
| Metro bundler lento | Cache corrompido | `npx expo start --clear` |
| Erro de tipo Prisma | Schema desatualizado | `npx prisma generate` |
| Rate limit em dev | Muitas requests de teste | Aumentar limite em `NODE_ENV === 'development'` |

---

## Extensões VS Code Recomendadas

Criar `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "Prisma.prisma",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "expo.vscode-expo-tools",
    "ms-vscode.vscode-typescript-next",
    "streetsidesoftware.code-spell-checker",
    "streetsidesoftware.code-spell-checker-portuguese-brazilian"
  ]
}
```

---

## Convenções de Código

| Convenção | Padrão |
|---|---|
| Nomenclatura de arquivos | `kebab-case.ts` |
| Componentes React | `PascalCase.tsx` |
| Funções e variáveis | `camelCase` |
| Constantes | `UPPER_SNAKE_CASE` |
| Branches | `feature/nome-da-feature`, `fix/nome-do-bug` |
| Commits | Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:` |
| Imports | Absolutos via `@/` (path alias configurado no tsconfig) |

---

*← [13 — Segurança](../13-seguranca/README.md) | [↑ Índice](../README.md)*
