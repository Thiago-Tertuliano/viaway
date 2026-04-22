# VIAWAY — DOCUMENTO DE PRODUTO
**Aplicativo de Planejamento de Viagens | Versão 1.0**

> Documento-mãe do produto. Todo desenvolvimento (telas, banco, automações, paywall) deve ser rastreável aqui.

---

## ÍNDICE

1. [Visão do Produto](#1-visão-do-produto)
2. [Público-Alvo](#2-público-alvo)
3. [Modelo de Negócio — Free vs Pro](#3-modelo-de-negócio--free-vs-pro)
4. [Módulos do Sistema](#4-módulos-do-sistema)
5. [Módulo 1 — Viagens](#5-módulo-1--viagens)
6. [Módulo 2 — Itinerário](#6-módulo-2--itinerário)
7. [Módulo 3 — Lugares](#7-módulo-3--lugares)
8. [Módulo 4 — Cotações e Custos](#8-módulo-4--cotações-e-custos)
9. [Módulo 5 — IA e Automações (Pro)](#9-módulo-5--ia-e-automações-pro)
10. [Modelo de Dados](#10-modelo-de-dados)
11. [Regras de Negócio](#11-regras-de-negócio)
12. [Arquitetura Técnica](#12-arquitetura-técnica)
13. [Monetização e Paywall](#13-monetização-e-paywall)
14. [Roadmap](#14-roadmap)
15. [Glossário](#15-glossário)

---

## 1. VISÃO DO PRODUTO

### O que é o ViaWay

ViaWay é um aplicativo mobile de planejamento de viagens para pessoas físicas — solo travelers, casais e famílias. Centraliza tudo que hoje está espalhado em planilhas, notas e grupos de WhatsApp: roteiro, cotações de hotel e passagem, lista de lugares, controle de custos e documentos da viagem.

### Problema central

Quem planeja viagem hoje usa 4 a 7 ferramentas diferentes: Google Docs pro roteiro, Sheets pra orçamento, notas do celular pra lugares, print de e-mail pra passagem, foto no Instagram pra referência de restaurante. Nada conversa entre si. Na hora da viagem, o caos é garantido.

### Proposta de valor

**Uma viagem, um lugar.** Tudo que precisa para planejar, orçar e executar uma viagem fica dentro do ViaWay — do destino até o gasto de cada dia.

O diferencial pro não é funcionalidade extra qualquer: é **automação real**. O Pro usa a API do Google Places para buscar lugares com fotos e avaliações, gera itinerários automaticamente com IA, e calcula o orçamento ideal baseado no estilo da viagem.

### Posicionamento

| Ferramenta | Posição |
|---|---|
| Google Trips (descontinuado) | Referência de produto morto com demanda real |
| TripIt | Foco em viajantes corporativos, importa e-mails |
| Wanderlog | Mais próximo, mas Web first, UX complexa |
| **ViaWay** | **Mobile first, simples, com IA como diferencial Pro** |

---

## 2. PÚBLICO-ALVO

### Persona Primária — O Planejador do Grupo

Geralmente uma pessoa por viagem assume o papel de organizador. É quem vai usar o ViaWay. Perfil:

- 25–40 anos
- Viaja 2–4 vezes por ano (finais de semana + férias)
- Viagens nacionais ou curtas internacionais
- Já usa apps como Notion, Google Keep, Nubank
- Quer praticidade, mas exige que o app seja bonito

### Persona Secundária — O Viajante Frequente

- Viaja sozinho ou a dois com frequência
- Quer construir um banco de lugares pessoal
- Tem disposição para pagar por funcionalidade que realmente economize tempo

### Casos de Uso Prioritários

1. **Planejar uma viagem de final de semana** (hospedar roteiro, cotações, lugares)
2. **Montar um banco pessoal de lugares que quer visitar** (wishlist por destino)
3. **Controlar o orçamento durante a viagem** (quanto já gastou, quanto falta)
4. **Gerar um roteiro automaticamente** com base no destino e duração (Pro)

---

## 3. MODELO DE NEGÓCIO — FREE VS PRO

### Filosofia do Freemium

O plano Free deve ser genuinamente útil — não uma demo truncada. O usuário precisa conseguir planejar uma viagem real no Free. O Pro desbloqueia automação e escala.

### Tabela de Features

| Feature | Free | Pro |
|---|:---:|:---:|
| Criar viagens | Até 3 ativas | Ilimitado |
| Itinerário manual (dia a dia) | ✅ | ✅ |
| Lista de lugares por viagem | Até 20 | Ilimitado |
| Cotações (hotel, passagem, etc.) | Até 10 por viagem | Ilimitado |
| Controle de gastos | ✅ | ✅ |
| Fotos e notas em lugares | ✅ | ✅ |
| Checklist de viagem | ✅ | ✅ |
| Exportar roteiro em PDF | ❌ | ✅ |
| Busca de lugares via Google Places | ❌ | ✅ |
| Geração de itinerário com IA | ❌ | ✅ |
| Sugestão de orçamento por destino | ❌ | ✅ |
| Backup em nuvem e sync multi-device | ❌ | ✅ |
| Compartilhar viagem com acompanhantes | ❌ | ✅ |

### Preço sugerido (testar com mercado)

| Plano | Preço |
|---|---|
| Free | R$ 0 |
| Pro Mensal | R$ 19,90/mês |
| Pro Anual | R$ 149,90/ano (~R$ 12,49/mês) |

### Trigger de conversão

Momentos que devem disparar o upsell para Pro, de forma natural e não intrusiva:

1. Usuário tenta criar a 4ª viagem ativa
2. Usuário tenta adicionar o 21º lugar em uma viagem
3. Usuário acessa "Buscar lugar por destino" (ícone Google)
4. Usuário tenta exportar roteiro em PDF
5. Usuário tenta compartilhar viagem

**Regra de UX:** O paywall nunca aparece como popup bloqueante. Sempre como um estado inline com botão "Desbloquear com Pro" e benefício claro.

---

## 4. MÓDULOS DO SISTEMA

```
┌──────────────────────────────────────────────────────────┐
│                        VIAWAY                            │
├──────────────┬───────────────┬──────────────────────────┤
│   VIAGENS    │  ITINERÁRIO   │        LUGARES            │
│  (por viagem)│  (dia a dia)  │  (wishlist + exploração) │
├──────────────┴───────────────┴──────────────────────────┤
│            COTAÇÕES & CUSTOS (por viagem)               │
├─────────────────────────────────────────────────────────┤
│        IA & AUTOMAÇÕES — PRO ONLY                       │
│  (itinerário automático, busca Places, sugestão budget) │
└─────────────────────────────────────────────────────────┘
```

---

## 5. MÓDULO 1 — VIAGENS

### Conceito

A Viagem é o container central de tudo. Um card por viagem na home do app, com status visual claro.

### Ficha da Viagem

```
VIAGEM
├── Nome (ex: "Floripa com a família — Jan 2026")
├── Destino principal
├── Destinos secundários (lista)
├── Data de ida
├── Data de volta
├── Número de viajantes
├── Capa (foto do destino — automática via API ou upload manual)
├── Status
│   Planejando → Confirmada → Em andamento → Concluída
└── Progresso (% do itinerário preenchido, % do orçamento definido)
```

### Home — Lista de Viagens

Cards organizados por status:
- **Em andamento** (destaque topo)
- **Próximas** (por data de ida)
- **Planejando** (sem data definida)
- **Concluídas** (agrupadas, recolhidas por padrão)

---

## 6. MÓDULO 2 — ITINERÁRIO

### Conceito

Visão dia a dia da viagem. Cada dia tem uma lista ordenada de atividades/lugares/refeições. Arrastar para reordenar.

### Estrutura do Dia

```
DIA
├── Data (ex: "Sábado, 18 Jan")
├── Atividades (lista ordenável)
│   ├── Tipo: atividade / refeição / transporte / hospedagem / livre
│   ├── Nome
│   ├── Lugar (link para cadastro de lugar)
│   ├── Horário previsto (início e fim)
│   ├── Duração estimada
│   ├── Custo estimado
│   ├── Notas
│   └── Status: pendente / confirmado / concluído
└── Total de custos do dia (calculado automaticamente)
```

### Geração Automática de Itinerário — Pro

O usuário informa:
- Destino e duração
- Estilo da viagem (cultural / praia / aventura / gastronômico / relaxamento)
- Ritmo (leve / moderado / intenso)
- Interesses específicos (opcional)

A IA gera um itinerário completo com lugares, tempos estimados e ordem lógica por proximidade geográfica.

O usuário pode aceitar, editar ou descartar qualquer item gerado.

---

## 7. MÓDULO 3 — LUGARES

### Conceito

Banco de lugares do usuário. Pode ser usado dentro de viagens (vinculado ao itinerário) ou como wishlist independente (lugares que quer visitar algum dia).

### Ficha do Lugar

```
LUGAR
├── Nome
├── Tipo: restaurante / hotel / ponto turístico / praia / museu / bar / outro
├── Destino / Cidade
├── Endereço
├── Coordenadas (para mapa)
├── Fonte
│   ├── Adicionado manualmente
│   ├── Importado do Google Places (Pro)
│   └── Sugerido pela IA (Pro)
├── Avaliação Google (se importado)
├── Fotos
│   ├── Do Google (importadas, Pro)
│   └── Próprias (upload manual)
├── Nota pessoal
├── Status: quero ir / já fui / descartado
├── Tags (ex: "vegano", "vista incrível", "barato", "com criança")
└── Viagem associada (se vinculado a uma)
```

### Busca de Lugares — Pro

Integração com Google Places API. O usuário busca "restaurante em Florianópolis" e vê resultados com:
- Foto
- Nota (estrelas)
- Tipo de culinária / categoria
- Horário de funcionamento
- Link Google Maps

Pode adicionar direto ao banco de lugares ou direto ao itinerário de uma viagem.

### Mapa

Visualização de todos os lugares de uma viagem no mapa, agrupados por dia do itinerário. Útil para ver se a ordem do roteiro faz sentido geograficamente.

---

## 8. MÓDULO 4 — COTAÇÕES E CUSTOS

### Conceito

Dois subcomponentes distintos, mas relacionados:
- **Cotações**: pesquisa de preços antes de decidir (hotel A vs hotel B, voo X vs voo Y)
- **Gastos**: registro do que foi efetivamente pago durante a viagem

### 8.1 Cotações

```
COTAÇÃO
├── Tipo: hospedagem / passagem aérea / terrestre / passeio / outro
├── Fornecedor / Nome
├── Período (check-in / check-out ou data do voo)
├── Valor total
├── Valor por pessoa (calculado)
├── Link (booking, passagens, etc.)
├── Notas
└── Status: em análise / escolhido / descartado
```

Funcionalidade de **comparativo**: o usuário vê lado a lado todas as cotações de hospedagem de uma viagem, com valor total e por pessoa.

### 8.2 Gastos

```
GASTO
├── Descrição
├── Categoria: transporte / hospedagem / alimentação / passeio / compras / outro
├── Valor
├── Data
├── Pago por (se viagem em grupo — Pro)
├── Dividir entre (se viagem em grupo — Pro)
└── Comprovante (foto)
```

### Painel Financeiro

| Indicador | Descrição |
|---|---|
| Orçamento total | Valor alvo definido pelo usuário |
| Cotações confirmadas | Soma das cotações com status "escolhido" |
| Já gasto | Soma dos gastos registrados |
| Saldo disponível | Orçamento − (cotações + gastos) |
| Custo estimado por dia | Total / duração da viagem |

### Sugestão de Orçamento — Pro

Com base no destino, duração e número de viajantes, a IA sugere:
- Faixa de orçamento (econômico / confortável / premium)
- Estimativa por categoria (hospedagem, alimentação, transporte, passeios)
- Comparação com viagens similares (crowd-sourced data ou LLM knowledge)

---

## 9. MÓDULO 5 — IA E AUTOMAÇÕES (PRO)

### 9.1 Geração de Itinerário

**Input:** destino, datas, estilo, ritmo, interesses
**Output:** itinerário completo dia a dia, com lugares reais (Places API), horários, notas e custo estimado

**Tecnologia:** LLM (OpenAI GPT-4o ou Claude Sonnet) + Google Places API para enriquecer com dados reais de lugares.

### 9.2 Busca Inteligente de Lugares

Usuário digita em linguagem natural: "restaurante japonês bem avaliado perto do centro de Curitiba" → sistema busca via Places API e retorna resultados com fotos e avaliações.

### 9.3 Resumo de Viagem Pós-Trip

Ao marcar uma viagem como "Concluída", a IA gera um resumo automático:
- Destinos visitados
- Highlights do roteiro
- Total gasto vs orçamento
- Lugares favoritos (baseado em notas do usuário)

Pode ser exportado como PDF ou compartilhado como imagem (story).

### 9.4 Checklist Automático

Com base no destino, época do ano e duração, a IA gera uma lista de itens para levar (documentos, roupas, itens específicos do destino — ex: protetor solar extra para litoral, adaptador elétrico para internacional).

---

## 10. MODELO DE DADOS

### Mapa de Entidades

```
USUARIO
  └──< VIAGEM >──< ITINERARIO_DIA >──< ATIVIDADE
                │
                ├──< LUGAR (wishlist/vinculado)
                │
                ├──< COTACAO
                │
                └──< GASTO

LUGAR >── pode ser vinculado a múltiplas ATIVIDADES
```

### Entidades e Campos

#### `usuarios`
```
id, nome, email, foto_url, plano (free|pro),
pro_expira_em, criado_em, ultimo_acesso
```

#### `viagens`
```
id, usuario_id, nome, destino_principal,
destinos_secundarios (json), data_ida, data_volta,
num_viajantes, capa_url, status, orcamento_total,
notas, criado_em, atualizado_em
```

#### `itinerario_dias`
```
id, viagem_id, data, ordem, resumo_dia
```

#### `atividades`
```
id, dia_id, viagem_id, lugar_id (nullable),
tipo (atividade|refeicao|transporte|hospedagem|livre),
nome, horario_inicio, horario_fim, duracao_min,
custo_estimado, notas, status (pendente|confirmado|concluido),
ordem, criado_em
```

#### `lugares`
```
id, usuario_id, nome, tipo, cidade, estado, pais,
endereco, lat, lng, google_place_id (nullable),
nota_google (nullable), fotos (json), nota_pessoal,
status (quero_ir|ja_fui|descartado), tags (json),
fonte (manual|google|ia), criado_em
```

#### `cotacoes`
```
id, viagem_id, tipo, fornecedor, periodo_inicio,
periodo_fim, valor_total, valor_por_pessoa, link,
notas, status (analise|escolhido|descartado), criado_em
```

#### `gastos`
```
id, viagem_id, descricao, categoria, valor,
data, comprovante_url, notas, criado_em
```

#### `checklists`
```
id, viagem_id, item, categoria, concluido, ordem, origem (manual|ia)
```

---

## 11. REGRAS DE NEGÓCIO

| # | Regra | Módulo |
|---|---|---|
| RN01 | Usuário Free pode ter no máximo 3 viagens com status ≠ Concluída | Viagens |
| RN02 | Usuário Free pode ter no máximo 20 lugares por viagem | Lugares |
| RN03 | Usuário Free pode ter no máximo 10 cotações por viagem | Cotações |
| RN04 | Viagem Concluída não conta no limite de viagens ativas do Free | Viagens |
| RN05 | Busca via Google Places requer plano Pro | Lugares |
| RN06 | Geração de itinerário por IA requer plano Pro | Itinerário |
| RN07 | Exportação de PDF requer plano Pro | Itinerário |
| RN08 | Compartilhamento de viagem requer plano Pro | Viagens |
| RN09 | Saldo do painel financeiro é sempre calculado em tempo real | Financeiro |
| RN10 | Lugares vinculados a atividades não podem ser excluídos sem desvinculação | Lugares |
| RN11 | Ao cancelar Pro, usuário mantém dados mas perde funcionalidades (não deleta) | Plano |
| RN12 | Viagem em andamento (data entre ida e volta) recebe destaque na home | Viagens |

---

## 12. ARQUITETURA TÉCNICA

### Stack

| Camada | Tecnologia |
|---|---|
| Mobile | React Native (Expo) |
| Backend / API | Node.js + Fastify |
| Banco de dados | PostgreSQL + Prisma |
| Auth | Clerk ou Supabase Auth |
| Storage (fotos) | Cloudflare R2 ou AWS S3 |
| Pagamento | RevenueCat (in-app purchase iOS/Android) |
| IA | OpenAI GPT-4o API ou Anthropic Claude |
| Lugares | Google Places API (New) |
| PDF | React Native PDF ou server-side Puppeteer |
| Hospedagem backend | Railway ou Render |

### RevenueCat — Gestão de Assinatura

RevenueCat é a solução padrão para in-app purchases em apps React Native. Abstrai a complexidade do StoreKit (iOS) e Google Play Billing (Android). Features relevantes:
- Verificação de entitlement em tempo real
- Webhooks para atualizar status no backend
- Dashboard de MRR, churn, LTV

### Performance

- Abertura de viagem: < 1.5s
- Busca de lugares (Places API): < 2s
- Geração de itinerário IA: < 8s (com skeleton loader)

### Offline

MVP funciona offline para leitura. Edições em offline entram em fila e sincronizam ao reconectar (Pro — sync multi-device). Free: apenas local storage.

---

## 13. MONETIZAÇÃO E PAYWALL

### Princípios de UX do Paywall

1. **Nunca bloquear o conteúdo existente** — só bloquear a ação que excede o limite
2. **Mostrar o benefício antes do preço** — "Acesse lugares do Google com fotos e avaliações"
3. **Oferecer trial de 7 dias** no primeiro upsell
4. **Preço anual em destaque** com economia calculada ("Economize R$ 89/ano")
5. **Não usar linguagem de urgência falsa** — sem "oferta por tempo limitado" fake

### Tela de Paywall

Componentes obrigatórios:
- Headline com benefício principal ("Planeje sem limites")
- Lista de 4–5 features Pro com ícone
- Toggle Mensal / Anual (anual selecionado por padrão)
- CTA principal: "Começar trial grátis de 7 dias"
- Sub-texto: "Cancele quando quiser. Sem fidelidade."
- Link "Ver o que está incluso no Free"

### Métricas a Monitorar

| Métrica | Meta Inicial |
|---|---|
| Conversão Free → Pro Trial | > 8% |
| Conversão Trial → Pago | > 40% |
| Churn mensal Pro | < 5% |
| DAU/MAU ratio | > 25% |

---

## 14. ROADMAP

### Fase 1 — MVP Free (8–10 semanas)

- [ ] Auth (cadastro, login, Google SSO)
- [ ] Criar / editar / excluir viagens
- [ ] Itinerário manual (dia a dia, arrastar para reordenar)
- [ ] Cadastro de lugares manual
- [ ] Cotações e comparativo
- [ ] Registro de gastos e painel financeiro básico
- [ ] Checklist manual
- [ ] Limite Free (3 viagens, 20 lugares, 10 cotações)

### Fase 2 — Pro Core (4–6 semanas)

- [ ] RevenueCat integration (iOS + Android)
- [ ] Paywall nativo
- [ ] Trial de 7 dias
- [ ] Google Places API (busca de lugares com fotos)
- [ ] Mapa interativo dos lugares da viagem
- [ ] Exportar roteiro em PDF
- [ ] Backup e sync em nuvem (Pro)

### Fase 3 — IA (4–6 semanas)

- [ ] Geração de itinerário por IA
- [ ] Sugestão de orçamento por destino
- [ ] Checklist automático por destino
- [ ] Resumo de viagem pós-trip (PDF + imagem compartilhável)

### Fase 4 — Social e Grupo (3–4 semanas)

- [ ] Compartilhar viagem com acompanhantes (co-edição)
- [ ] Divisão de gastos em grupo
- [ ] Feed de viagens do usuário (histórico visual)

---

## 15. GLOSSÁRIO

| Termo | Definição |
|---|---|
| **Viagem** | Container central do sistema. Agrupa itinerário, lugares, cotações e gastos de um destino em um período |
| **Itinerário** | Planejamento dia a dia de uma viagem. Cada dia tem lista de atividades ordenadas |
| **Lugar** | Local de interesse — restaurante, hotel, ponto turístico, etc. Pode estar na wishlist ou vinculado a uma viagem |
| **Cotação** | Pesquisa de preço para um serviço (hotel, passagem) antes da decisão de compra |
| **Gasto** | Valor efetivamente pago durante a viagem. Alimenta o controle financeiro real |
| **Entitlement** | Status de acesso Pro do usuário, gerenciado via RevenueCat |
| **Trial** | Período de 7 dias grátis do plano Pro, oferecido na primeira conversão |
| **Wishlist** | Lista de lugares que o usuário quer visitar, independente de viagem específica |
| **Places API** | Google Places API (New) — usada para buscar lugares com dados reais, fotos e avaliações |
| **Orçamento** | Valor total alvo definido pelo usuário para uma viagem |

---

*ViaWay | Documento de Produto v1.0*
*Desenvolvido pela [Axellion](https://axellion.com.br/)*
