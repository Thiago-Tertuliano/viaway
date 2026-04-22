# ViaWay

Plataforma de planejamento de viagens da Axellion, com foco em organizacao ponta a ponta da viagem:
roteiro, lugares, cotacoes, gastos, checklist, automacoes com IA e modelo Freemium (Free vs Pro).

Este README descreve a estrutura alvo do projeto, o estado atual e o processo recomendado para evolucao profissional sem pular etapas.

## Documentos principais

- Produto: `VIAWAY_PRODUTO.md`
- Documentacao tecnica: `docs/README.md`
- Backend (estado atual): `backend/README.md`

## Estrutura atual da pasta

```text
PROJETOS/Viaway/
|- backend/            # API Fastify + Prisma + Postgres (em desenvolvimento)
|- docs/               # Base tecnica e guias por dominio
|- prototype/          # Prototipos e artefatos de tela/landing
|- wandr-landing-page/ # Landing antiga (base de transicao)
|- VIAWAY_PRODUTO.md   # Documento mae do produto
```

## Estrutura futura alvo (arquitetura recomendada)

Objetivo: consolidar o projeto em formato de monorepo para garantir padronizacao, reuso e escalabilidade.

```text
viaway/
|- apps/
|  |- mobile/          # React Native (Expo)
|  |- api/             # Fastify (Node.js) + Prisma
|  `- web/             # Landing e pagina institucional (opcional)
|- packages/
|  |- db/              # Prisma schema, migrations, seed, helpers
|  |- types/           # Tipos compartilhados (DTOs e contratos)
|  |- config/          # ESLint, TSConfig, Prettier, env schema
|  `- ui/              # Design tokens/components compartilhados (opcional)
|- docs/
|- scripts/
|- .github/workflows/  # CI/CD
|- turbo.json          # Orquestracao monorepo
`- README.md
```

## Principios de implementacao

1. Base antes de feature: schema, contratos e qualidade minima primeiro.
2. API contratual: toda rota nasce com validacao, erro padrao e testes.
3. Evolucao incremental: pequenas entregas verticais, sem refactor grande em bloco.
4. Rastreabilidade: cada mudanca deve mapear para modulo/regra do `VIAWAY_PRODUTO.md`.
5. Nao quebrar legado: transicoes de nome e estrutura sempre com plano de migracao.

## Ordem recomendada de construcao

1. Fundacao tecnica
   - Padrao de estrutura (monorepo ou repos separados com convencao unica)
   - Lint, format, typecheck e testes no pipeline
   - Controle de ambiente (`.env.example`, validacao de variaveis)

2. Dados e autenticacao
   - Prisma schema versionado e migrations consistentes
   - Auth e autorizacao por plano (Free/Pro)
   - Seed minima para QA funcional

3. Dominio core (MVP Free)
   - Viagens
   - Itinerario
   - Lugares (manual)
   - Cotacoes e gastos
   - Checklist manual
   - Aplicacao de limites Free

4. Pro Core
   - Paywall e RevenueCat
   - Places API
   - PDF
   - Sync cloud

5. IA e Social
   - Itinerario automatico
   - Sugestao de orcamento
   - Checklist inteligente
   - Compartilhamento e coedicao

## Convencoes de engenharia

- Branching: `main`, `develop`, `feature/*`, `fix/*`
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- Pull Request obrigatorio para merge
- Sem segredo em repositorio (usar variaveis de ambiente)
- Documento tecnico sempre atualizado junto com codigo

## Checkpoint de qualidade por entrega

Cada entrega deve cumprir, no minimo:

- Build e typecheck passando
- Lint sem erro
- Testes minimos do fluxo alterado
- Sem quebra de contrato de API
- Atualizacao de documentacao quando houver impacto funcional/tecnico

## Estado atual (snapshot)

- Produto definido em `VIAWAY_PRODUTO.md`
- Documentacao tecnica ampla em `docs/`
- Backend inicial em `backend/` com Fastify + Prisma
- Prototipos de interface e landing existentes para referencia

## Proximos passos sugeridos

1. Consolidar naming e referencias legadas de "Wandr" para "ViaWay" no backend/docs.
2. Definir se o projeto sera monorepo imediatamente ou migracao por fases.
3. Fechar Definition of Done (DoD) para cada modulo do MVP.
4. Priorizar backlog por dependencia tecnica (fundacao -> core -> Pro -> IA).

---

ViaWay - Axellion
