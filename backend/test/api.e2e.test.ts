import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";

process.env.NODE_ENV = "development";
process.env.DISABLE_AUTH = "true";
process.env.PORT = "3001";

const prisma = new PrismaClient();
let app: FastifyInstance;
let usuarioId = "";

let viagemId = "";
let diaId = "";
let atividadeId = "";
let lugarId = "";
let cotacaoId = "";
let gastoId = "";
let checklistId = "";

before(async () => {
  const { buildServer } = await import("../src/app.js");
  const usuario = await prisma.usuario.upsert({
    where: { email: process.env.DEV_USER_EMAIL ?? "dev@viaway.local" },
    create: {
      email: process.env.DEV_USER_EMAIL ?? "dev@viaway.local",
      nome: process.env.DEV_USER_NOME ?? "Dev Local",
      plano: "pro",
    },
    update: { plano: "pro" },
  });
  usuarioId = usuario.id;

  await prisma.viagem.deleteMany({ where: { usuarioId } });
  app = await buildServer();
  await app.ready();
});

after(async () => {
  await app.close();
  await prisma.viagem.deleteMany({ where: { usuarioId } });
  await prisma.$disconnect();
});

test("health route", async () => {
  const res = await app.inject({ method: "GET", url: "/v1/health" });
  assert.equal(res.statusCode, 200);
});

test("swagger docs routes", async () => {
  const openapi = await app.inject({ method: "GET", url: "/v1/docs/openapi.json" });
  assert.equal(openapi.statusCode, 200);
  assert.equal(openapi.json().info.title, "ViaWay API");

  const docsUi = await app.inject({ method: "GET", url: "/v1/docs" });
  assert.equal(docsUi.statusCode, 200);
});

test("viagens CRUD + listagem", async () => {
  const create = await app.inject({
    method: "POST",
    url: "/v1/viagens",
    payload: {
      nome: "Viagem Teste E2E",
      destinoPrincipal: "Lisboa, PT",
      destinosSecundarios: ["Sintra"],
      numViajantes: 2,
      orcamentoTotal: 4500,
    },
  });
  assert.equal(create.statusCode, 201);
  viagemId = create.json().data.id;

  const list = await app.inject({ method: "GET", url: "/v1/viagens?page=1&pageSize=10" });
  assert.equal(list.statusCode, 200);
  assert.ok(Array.isArray(list.json().data));

  const get = await app.inject({ method: "GET", url: `/v1/viagens/${viagemId}` });
  assert.equal(get.statusCode, 200);

  const update = await app.inject({
    method: "PUT",
    url: `/v1/viagens/${viagemId}`,
    payload: { nome: "Viagem Teste E2E Atualizada", notas: "ok" },
  });
  assert.equal(update.statusCode, 200);
});

test("itinerario CRUD dias/atividades", async () => {
  const dia = await app.inject({
    method: "POST",
    url: "/v1/itinerario/dias",
    payload: { viagemId, data: "2026-05-01", ordem: 1, resumoDia: "Dia 1" },
  });
  assert.equal(dia.statusCode, 201);
  diaId = dia.json().data.id;

  const atividade = await app.inject({
    method: "POST",
    url: "/v1/itinerario/atividades",
    payload: { viagemId, diaId, nome: "Passeio", ordem: 1, custoEstimado: 100 },
  });
  assert.equal(atividade.statusCode, 201);
  atividadeId = atividade.json().data.id;

  const listAtv = await app.inject({
    method: "GET",
    url: `/v1/itinerario/atividades?diaId=${diaId}`,
  });
  assert.equal(listAtv.statusCode, 200);

  const updAtv = await app.inject({
    method: "PUT",
    url: `/v1/itinerario/atividades/${atividadeId}`,
    payload: { status: "confirmado" },
  });
  assert.equal(updAtv.statusCode, 200);

  const delAtv = await app.inject({
    method: "DELETE",
    url: `/v1/itinerario/atividades/${atividadeId}`,
  });
  assert.equal(delAtv.statusCode, 204);

  const delDia = await app.inject({
    method: "DELETE",
    url: `/v1/itinerario/dias/${diaId}`,
  });
  assert.equal(delDia.statusCode, 204);
});

test("lugares CRUD", async () => {
  const create = await app.inject({
    method: "POST",
    url: "/v1/lugares",
    payload: { viagemId, nome: "Museu E2E", tipo: "museu" },
  });
  assert.equal(create.statusCode, 201);
  lugarId = create.json().data.id;

  const list = await app.inject({ method: "GET", url: `/v1/lugares?viagemId=${viagemId}` });
  assert.equal(list.statusCode, 200);

  const update = await app.inject({
    method: "PUT",
    url: `/v1/lugares/${lugarId}`,
    payload: { status: "ja_fui" },
  });
  assert.equal(update.statusCode, 200);

  const del = await app.inject({ method: "DELETE", url: `/v1/lugares/${lugarId}` });
  assert.equal(del.statusCode, 204);
});

test("cotacoes CRUD + comparativo", async () => {
  const create = await app.inject({
    method: "POST",
    url: "/v1/cotacoes",
    payload: { viagemId, tipo: "hospedagem", fornecedor: "Hotel E2E", valorTotal: 900 },
  });
  assert.equal(create.statusCode, 201);
  cotacaoId = create.json().data.id;

  const list = await app.inject({ method: "GET", url: `/v1/cotacoes?viagemId=${viagemId}` });
  assert.equal(list.statusCode, 200);

  const comparativo = await app.inject({
    method: "GET",
    url: `/v1/cotacoes/comparativo?viagemId=${viagemId}`,
  });
  assert.equal(comparativo.statusCode, 200);

  const update = await app.inject({
    method: "PUT",
    url: `/v1/cotacoes/${cotacaoId}`,
    payload: { status: "escolhido", valorTotal: 850 },
  });
  assert.equal(update.statusCode, 200);

  const del = await app.inject({ method: "DELETE", url: `/v1/cotacoes/${cotacaoId}` });
  assert.equal(del.statusCode, 204);
});

test("gastos CRUD + painel", async () => {
  const create = await app.inject({
    method: "POST",
    url: "/v1/gastos",
    payload: {
      viagemId,
      descricao: "Taxi",
      categoria: "transporte",
      valor: 60,
      data: "2026-05-01",
    },
  });
  assert.equal(create.statusCode, 201);
  gastoId = create.json().data.id;

  const list = await app.inject({ method: "GET", url: `/v1/gastos?viagemId=${viagemId}` });
  assert.equal(list.statusCode, 200);

  const painel = await app.inject({
    method: "GET",
    url: `/v1/gastos/painel?viagemId=${viagemId}`,
  });
  assert.equal(painel.statusCode, 200);

  const update = await app.inject({
    method: "PUT",
    url: `/v1/gastos/${gastoId}`,
    payload: { valor: 75 },
  });
  assert.equal(update.statusCode, 200);

  const del = await app.inject({ method: "DELETE", url: `/v1/gastos/${gastoId}` });
  assert.equal(del.statusCode, 204);
});

test("checklists CRUD + toggle", async () => {
  const create = await app.inject({
    method: "POST",
    url: "/v1/checklists",
    payload: { viagemId, item: "Passaporte", ordem: 1 },
  });
  assert.equal(create.statusCode, 201);
  checklistId = create.json().data.id;

  const list = await app.inject({
    method: "GET",
    url: `/v1/checklists?viagemId=${viagemId}`,
  });
  assert.equal(list.statusCode, 200);

  const toggle = await app.inject({
    method: "PATCH",
    url: `/v1/checklists/${checklistId}/toggle`,
    payload: { concluido: true },
  });
  assert.equal(toggle.statusCode, 200);

  const update = await app.inject({
    method: "PUT",
    url: `/v1/checklists/${checklistId}`,
    payload: { item: "Passaporte + seguro" },
  });
  assert.equal(update.statusCode, 200);

  const del = await app.inject({ method: "DELETE", url: `/v1/checklists/${checklistId}` });
  assert.equal(del.statusCode, 204);
});

