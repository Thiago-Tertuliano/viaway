# 12 — CI/CD

> GitHub Actions para lint, test e deploy. EAS Build para apps iOS e Android.

---

## Branch Strategy

```
main          ← produção (deploy automático Railway + EAS prod)
  └── develop ← staging (deploy automático Railway staging)
        └── feature/nome-da-feature
        └── fix/nome-do-bug
```

**Regras:**
- `main` e `develop` são branches protegidas (sem push direto)
- PRs para `develop`: 1 aprovação + CI passing
- PRs para `main`: 1 aprovação + CI passing + tests OK

---

## Pipelines

### 1 — API Backend (Railway)

**Trigger:** Push em `main` ou `develop`

```yaml
# .github/workflows/api-deploy.yml
name: API — CI/CD

on:
  push:
    branches: [main, develop]
    paths:
      - 'apps/api/**'
      - '.github/workflows/api-deploy.yml'
  pull_request:
    branches: [main, develop]
    paths:
      - 'apps/api/**'

jobs:
  ci:
    name: Lint + Type Check + Tests
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/api

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: apps/api/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Tests
        run: npm test
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/wandr_test

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: wandr_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

  deploy-staging:
    name: Deploy → Staging
    needs: ci
    if: github.ref == 'refs/heads/develop' && github.event_name == 'push'
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Railway (staging)
        uses: bervProject/railway-deploy@v1
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: wandr-api-staging

      - name: Run migrations (staging)
        run: |
          npm install -g @railway/cli
          railway run --service wandr-api-staging npx prisma migrate deploy
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

  deploy-production:
    name: Deploy → Production
    needs: ci
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Railway (production)
        uses: bervProject/railway-deploy@v1
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: wandr-api

      - name: Run migrations (production)
        run: |
          npm install -g @railway/cli
          railway run --service wandr-api npx prisma migrate deploy
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

---

### 2 — Landing Page (Vercel)

**Vercel já faz deploy automático via integração GitHub. Não precisa de workflow separado.**

Configurar no Vercel Dashboard:
- Production Branch: `main`
- Preview Branches: todas (gera URL de preview por PR)
- Root Directory: `apps/landing`
- Build Command: `next build`

---

### 3 — Mobile iOS/Android (EAS Build)

**Trigger:** Push em `main` (produção) ou tag `v*.*.*`

```yaml
# .github/workflows/mobile-build.yml
name: Mobile — EAS Build

on:
  push:
    branches: [main]
    paths:
      - 'apps/mobile/**'
      - '.github/workflows/mobile-build.yml'
  workflow_dispatch:
    inputs:
      platform:
        description: 'Platform'
        required: true
        type: choice
        options: [ios, android, all]
      profile:
        description: 'Build profile'
        required: true
        type: choice
        options: [preview, production]

jobs:
  build:
    name: EAS Build
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/mobile

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: apps/mobile/package-lock.json

      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Install dependencies
        run: npm ci

      - name: Build (production — all platforms)
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        run: eas build --platform all --profile production --non-interactive
        env:
          EXPO_PUBLIC_API_URL: https://api.wandr.app
          EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.CLERK_PUBLISHABLE_KEY_PROD }}
          EXPO_PUBLIC_REVENUECAT_IOS_KEY: ${{ secrets.REVENUECAT_IOS_KEY }}
          EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: ${{ secrets.REVENUECAT_ANDROID_KEY }}

      - name: Build (manual dispatch)
        if: github.event_name == 'workflow_dispatch'
        run: eas build --platform ${{ inputs.platform }} --profile ${{ inputs.profile }} --non-interactive

  submit:
    name: EAS Submit → Stores
    needs: build
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Submit to App Store (TestFlight)
        run: eas submit --platform ios --latest --non-interactive
        working-directory: apps/mobile

      - name: Submit to Google Play (Internal Testing)
        run: eas submit --platform android --latest --non-interactive
        working-directory: apps/mobile
```

---

### 4 — PR Validation (todos os apps)

```yaml
# .github/workflows/pr-check.yml
name: PR Check

on:
  pull_request:
    branches: [main, develop]

jobs:
  check-api:
    name: API — Type Check
    runs-on: ubuntu-latest
    if: contains(github.event.pull_request.changed_files, 'apps/api/')
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
        working-directory: apps/api
      - run: npx tsc --noEmit
        working-directory: apps/api

  check-mobile:
    name: Mobile — Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
        working-directory: apps/mobile
      - run: npx tsc --noEmit
        working-directory: apps/mobile
```

---

## Secrets no GitHub

| Secret | Uso |
|---|---|
| `RAILWAY_TOKEN` | Deploy automático Railway |
| `EXPO_TOKEN` | EAS Build + Submit |
| `CLERK_PUBLISHABLE_KEY_PROD` | Build mobile produção |
| `REVENUECAT_IOS_KEY` | Build mobile iOS |
| `REVENUECAT_ANDROID_KEY` | Build mobile Android |

---

## OTA Updates — Expo EAS Update

Para atualizações de JS sem passar pelo processo de review das lojas (Fase 2+):

```bash
# Publicar OTA update para produção
eas update --branch production --message "Fix: cálculo do painel financeiro"

# Publicar para staging
eas update --branch staging --message "Test: nova tela de paywall"
```

**Quando NÃO usar OTA:**
- Mudança em código nativo (novos plugins Expo)
- Mudança no `app.config.ts` (ícone, splash, permissões)
- Atualização de SDK Expo
- Nesses casos: nova build via EAS

---

## Matriz de Deploy por Ambiente

| Branch | Backend | Landing | Mobile |
|---|---|---|---|
| `feature/*` | ❌ Sem deploy | Preview Vercel | ❌ |
| `develop` | ✅ Railway Staging | Preview Vercel | ❌ (manual) |
| `main` | ✅ Railway Prod | ✅ Vercel Prod | ✅ EAS Build + Submit |

---

*← [11 — Infraestrutura](../11-infraestrutura/README.md) | Próximo: [13 — Segurança →](../13-seguranca/README.md)*
