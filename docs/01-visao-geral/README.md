# 01 — Visão Geral do Produto

> Resumo técnico-executivo do Wandr. Baseado em [`WANDR_PRODUTO.md`](../../WANDR_PRODUTO.md).

---

## O que é o Wandr

Aplicativo mobile de planejamento de viagens para pessoas físicas — solo travelers, casais e famílias. Centraliza roteiro, cotações, controle de custos, lista de lugares e documentos em um único lugar.

**Problema:** Quem planeja viagem hoje usa 4–7 ferramentas diferentes (Google Docs, Sheets, notas, e-mails, Instagram). Nada conversa entre si.

**Solução:** Uma viagem, um lugar. Tudo que precisa para planejar, orçar e executar uma viagem fica dentro do Wandr.

---

## Posicionamento de Mercado

| Ferramenta | Posição |
|---|---|
| Google Trips (descontinuado) | Referência de produto morto com demanda real |
| TripIt | Foco corporativo, importa e-mails, sem apelo consumer |
| Wanderlog | Mais próximo, mas Web first e UX complexa |
| **Wandr** | **Mobile first, simples, com IA como diferencial Pro** |

---

## Personas

### Persona Primária — O Planejador do Grupo
- 25–40 anos, viaja 2–4x por ano
- Viagens nacionais ou curtas internacionais
- Já usa Notion, Google Keep, Nubank
- Quer praticidade + app bonito

### Persona Secundária — O Viajante Frequente
- Viaja sozinho ou a dois com frequência
- Quer construir banco pessoal de lugares
- Disposto a pagar por funcionalidade real

---

## Módulos do Sistema

```
┌──────────────────────────────────────────────────────────┐
│                         WANDR                            │
├──────────────┬───────────────┬──────────────────────────┤
│   VIAGENS    │  ITINERÁRIO   │        LUGARES            │
│  (container) │  (dia a dia)  │  (wishlist + exploração) │
├──────────────┴───────────────┴──────────────────────────┤
│            COTAÇÕES & CUSTOS (por viagem)               │
├─────────────────────────────────────────────────────────┤
│        IA & AUTOMAÇÕES — PRO ONLY                       │
│  (itinerário automático, busca Places, sugestão budget) │
└─────────────────────────────────────────────────────────┘
```

| Módulo | Descrição |
|--------|-----------|
| **Viagens** | Container central. Card por viagem com status, datas, destino, capa, progresso |
| **Itinerário** | Visão dia a dia. Atividades ordenáveis por drag-and-drop |
| **Lugares** | Banco pessoal de locais de interesse. Wishlist + vinculados a viagens |
| **Cotações** | Comparativo de preços (hotel A vs B, voo X vs Y) antes da decisão |
| **Gastos** | Registro do que foi efetivamente pago. Painel financeiro em tempo real |
| **Checklist** | Lista de itens para levar. Manual (Free) ou gerada por IA (Pro) |
| **IA** | Geração de itinerário, sugestão de orçamento, resumo pós-trip (Pro) |

---

## Modelo Free vs Pro

### Filosofia
O Free deve ser genuinamente útil — não uma demo truncada. O usuário precisa conseguir planejar uma viagem real no Free. O Pro desbloqueia automação e escala.

### Limites e Features

| Feature | Free | Pro |
|---|:---:|:---:|
| Viagens ativas | Até 3 | Ilimitado |
| Itinerário manual | ✅ | ✅ |
| Lugares por viagem | Até 20 | Ilimitado |
| Cotações por viagem | Até 10 | Ilimitado |
| Controle de gastos | ✅ | ✅ |
| Checklist manual | ✅ | ✅ |
| Exportar PDF | ❌ | ✅ |
| Busca Google Places | ❌ | ✅ |
| Geração de itinerário IA | ❌ | ✅ |
| Sugestão de orçamento IA | ❌ | ✅ |
| Backup + sync multi-device | ❌ | ✅ |
| Compartilhar viagem | ❌ | ✅ |

### Preços

| Plano | Preço |
|---|---|
| Free | R$ 0 |
| Pro Mensal | R$ 19,90/mês |
| Pro Anual | R$ 149,90/ano (~R$ 12,49/mês) |

### Triggers de Upsell (UX natural, nunca popup bloqueante)

1. Tentar criar a 4ª viagem ativa
2. Tentar adicionar o 21º lugar
3. Acessar "Buscar lugar por destino"
4. Tentar exportar PDF
5. Tentar compartilhar viagem

---

## Regras de Negócio

| # | Regra | Módulo |
|---|-------|--------|
| RN01 | Free: máximo 3 viagens com status ≠ Concluída | Viagens |
| RN02 | Free: máximo 20 lugares por viagem | Lugares |
| RN03 | Free: máximo 10 cotações por viagem | Cotações |
| RN04 | Viagem Concluída não conta no limite de viagens ativas | Viagens |
| RN05 | Busca via Google Places requer plano Pro | Lugares |
| RN06 | Geração de itinerário por IA requer Pro | Itinerário |
| RN07 | Exportação de PDF requer Pro | Itinerário |
| RN08 | Compartilhamento requer Pro | Viagens |
| RN09 | Saldo financeiro calculado em tempo real | Financeiro |
| RN10 | Lugar vinculado a atividade não pode ser excluído sem desvinculação | Lugares |
| RN11 | Ao cancelar Pro: dados mantidos, funcionalidades perdidas (sem delete) | Plano |
| RN12 | Viagem com data entre ida e volta recebe destaque na home | Viagens |

---

## Status de Viagem — Ciclo de Vida

```
Planejando → Confirmada → Em andamento → Concluída
```

- **Planejando:** sem data definida ou datas futuras indefinidas
- **Confirmada:** datas definidas, passagem/hotel escolhidos
- **Em andamento:** data atual entre data_ida e data_volta
- **Concluída:** data_volta no passado ou marcada manualmente

**Home — ordenação dos cards:**
1. Em andamento (destaque, topo)
2. Próximas (por data_ida)
3. Planejando (sem data)
4. Concluídas (agrupadas, recolhidas por padrão)

---

## Métricas de Sucesso (MVP)

| Métrica | Meta |
|---------|------|
| Conversão Free → Pro Trial | > 8% |
| Conversão Trial → Pago | > 40% |
| Churn mensal Pro | < 5% |
| DAU/MAU ratio | > 25% |

---

## Mapa de Entidades (Resumo)

```
USUARIO
  └──< VIAGEM >──< ITINERARIO_DIA >──< ATIVIDADE
                │
                ├──< LUGAR (wishlist / vinculado)
                │
                ├──< COTACAO
                │
                ├──< GASTO
                │
                └──< CHECKLIST

LUGAR >── pode ser vinculado a múltiplas ATIVIDADES
```

Schema completo: [`03-banco-de-dados`](../03-banco-de-dados/README.md)

---

## Roadmap por Fase

### Fase 1 — MVP Free (8–10 semanas)
- Auth (cadastro, login, Google SSO)
- CRUD de viagens
- Itinerário manual (arrastar para reordenar)
- Cadastro de lugares manual
- Cotações e comparativo
- Registro de gastos e painel financeiro básico
- Checklist manual
- Limites Free aplicados

### Fase 2 — Pro Core (4–6 semanas)
- RevenueCat iOS + Android
- Paywall nativo + trial 7 dias
- Google Places API
- Mapa interativo dos lugares
- Exportar PDF
- Sync em nuvem

### Fase 3 — IA (4–6 semanas)
- Geração de itinerário por IA
- Sugestão de orçamento
- Checklist automático por destino
- Resumo pós-trip (PDF + imagem)

### Fase 4 — Social (3–4 semanas)
- Compartilhar viagem (co-edição)
- Divisão de gastos em grupo
- Feed visual do histórico

---

*← [Índice](../README.md) | Próximo: [02 — Stack Técnica →](../02-stack-tecnica/README.md)*
