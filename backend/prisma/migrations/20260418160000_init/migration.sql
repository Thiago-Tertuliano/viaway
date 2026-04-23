-- CreateEnum
CREATE TYPE "Plano" AS ENUM ('free', 'pro');

-- CreateEnum
CREATE TYPE "StatusViagem" AS ENUM ('planejando', 'confirmada', 'em_andamento', 'concluida');

-- CreateEnum
CREATE TYPE "TipoAtividade" AS ENUM ('atividade', 'refeicao', 'transporte', 'hospedagem', 'livre');

-- CreateEnum
CREATE TYPE "StatusAtividade" AS ENUM ('pendente', 'confirmado', 'concluido');

-- CreateEnum
CREATE TYPE "TipoLugar" AS ENUM ('restaurante', 'hotel', 'ponto_turistico', 'praia', 'museu', 'bar', 'outro');

-- CreateEnum
CREATE TYPE "StatusLugar" AS ENUM ('quero_ir', 'ja_fui', 'descartado');

-- CreateEnum
CREATE TYPE "FonteLugar" AS ENUM ('manual', 'google', 'ia');

-- CreateEnum
CREATE TYPE "TipoCotacao" AS ENUM ('hospedagem', 'passagem_aerea', 'terrestre', 'passeio', 'outro');

-- CreateEnum
CREATE TYPE "StatusCotacao" AS ENUM ('analise', 'escolhido', 'descartado');

-- CreateEnum
CREATE TYPE "CategoriaGasto" AS ENUM ('transporte', 'hospedagem', 'alimentacao', 'passeio', 'compras', 'outro');

-- CreateEnum
CREATE TYPE "OrigemChecklist" AS ENUM ('manual', 'ia');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fotoUrl" TEXT,
    "plano" "Plano" NOT NULL DEFAULT 'free',
    "proExpiraEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoAcesso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletadoEm" TIMESTAMP(3),

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viagens" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "destinoPrincipal" TEXT NOT NULL,
    "destinosSecundarios" JSONB NOT NULL DEFAULT '[]',
    "dataIda" TIMESTAMP(3),
    "dataVolta" TIMESTAMP(3),
    "numViajantes" INTEGER NOT NULL DEFAULT 1,
    "capaUrl" TEXT,
    "status" "StatusViagem" NOT NULL DEFAULT 'planejando',
    "orcamentoTotal" DECIMAL(10,2),
    "notas" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "deletadoEm" TIMESTAMP(3),

    CONSTRAINT "viagens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itinerario_dias" (
    "id" TEXT NOT NULL,
    "viagemId" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "ordem" INTEGER NOT NULL,
    "resumoDia" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "itinerario_dias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atividades" (
    "id" TEXT NOT NULL,
    "diaId" TEXT NOT NULL,
    "viagemId" TEXT NOT NULL,
    "lugarId" TEXT,
    "tipo" "TipoAtividade" NOT NULL DEFAULT 'atividade',
    "nome" TEXT NOT NULL,
    "horarioInicio" TIME,
    "horarioFim" TIME,
    "duracaoMin" INTEGER,
    "custoEstimado" DECIMAL(10,2),
    "notas" TEXT,
    "status" "StatusAtividade" NOT NULL DEFAULT 'pendente',
    "ordem" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "atividades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lugares" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "viagemId" TEXT,
    "nome" TEXT NOT NULL,
    "tipo" "TipoLugar" NOT NULL DEFAULT 'outro',
    "cidade" TEXT,
    "estado" TEXT,
    "pais" TEXT,
    "endereco" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "googlePlaceId" TEXT,
    "notaGoogle" DOUBLE PRECISION,
    "fotos" JSONB NOT NULL DEFAULT '[]',
    "notaPessoal" TEXT,
    "status" "StatusLugar" NOT NULL DEFAULT 'quero_ir',
    "tags" JSONB NOT NULL DEFAULT '[]',
    "fonte" "FonteLugar" NOT NULL DEFAULT 'manual',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "deletadoEm" TIMESTAMP(3),

    CONSTRAINT "lugares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotacoes" (
    "id" TEXT NOT NULL,
    "viagemId" TEXT NOT NULL,
    "tipo" "TipoCotacao" NOT NULL,
    "fornecedor" TEXT NOT NULL,
    "periodoInicio" DATE,
    "periodoFim" DATE,
    "valorTotal" DECIMAL(10,2) NOT NULL,
    "valorPorPessoa" DECIMAL(10,2),
    "link" TEXT,
    "notas" TEXT,
    "status" "StatusCotacao" NOT NULL DEFAULT 'analise',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cotacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gastos" (
    "id" TEXT NOT NULL,
    "viagemId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" "CategoriaGasto" NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "data" DATE NOT NULL,
    "comprovanteUrl" TEXT,
    "notas" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gastos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklists" (
    "id" TEXT NOT NULL,
    "viagemId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "categoria" TEXT,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL,
    "origem" "OrigemChecklist" NOT NULL DEFAULT 'manual',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklists_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_clerkId_key" ON "usuarios"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_clerkId_idx" ON "usuarios"("clerkId");

-- CreateIndex
CREATE INDEX "usuarios_email_idx" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_plano_idx" ON "usuarios"("plano");

-- CreateIndex
CREATE INDEX "viagens_usuarioId_idx" ON "viagens"("usuarioId");

-- CreateIndex
CREATE INDEX "viagens_status_idx" ON "viagens"("status");

-- CreateIndex
CREATE INDEX "viagens_dataIda_idx" ON "viagens"("dataIda");

-- CreateIndex
CREATE INDEX "viagens_usuarioId_status_idx" ON "viagens"("usuarioId", "status");

-- CreateIndex
CREATE INDEX "itinerario_dias_viagemId_idx" ON "itinerario_dias"("viagemId");

-- CreateIndex
CREATE INDEX "itinerario_dias_viagemId_ordem_idx" ON "itinerario_dias"("viagemId", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "itinerario_dias_viagemId_data_key" ON "itinerario_dias"("viagemId", "data");

-- CreateIndex
CREATE INDEX "atividades_diaId_idx" ON "atividades"("diaId");

-- CreateIndex
CREATE INDEX "atividades_viagemId_idx" ON "atividades"("viagemId");

-- CreateIndex
CREATE INDEX "atividades_lugarId_idx" ON "atividades"("lugarId");

-- CreateIndex
CREATE INDEX "atividades_diaId_ordem_idx" ON "atividades"("diaId", "ordem");

-- CreateIndex
CREATE INDEX "lugares_usuarioId_idx" ON "lugares"("usuarioId");

-- CreateIndex
CREATE INDEX "lugares_viagemId_idx" ON "lugares"("viagemId");

-- CreateIndex
CREATE INDEX "lugares_googlePlaceId_idx" ON "lugares"("googlePlaceId");

-- CreateIndex
CREATE INDEX "lugares_usuarioId_status_idx" ON "lugares"("usuarioId", "status");

-- CreateIndex
CREATE INDEX "lugares_usuarioId_viagemId_idx" ON "lugares"("usuarioId", "viagemId");

-- CreateIndex
CREATE INDEX "cotacoes_viagemId_idx" ON "cotacoes"("viagemId");

-- CreateIndex
CREATE INDEX "cotacoes_viagemId_status_idx" ON "cotacoes"("viagemId", "status");

-- CreateIndex
CREATE INDEX "gastos_viagemId_idx" ON "gastos"("viagemId");

-- CreateIndex
CREATE INDEX "gastos_viagemId_data_idx" ON "gastos"("viagemId", "data");

-- CreateIndex
CREATE INDEX "gastos_viagemId_categoria_idx" ON "gastos"("viagemId", "categoria");

-- CreateIndex
CREATE INDEX "checklists_viagemId_idx" ON "checklists"("viagemId");

-- CreateIndex
CREATE INDEX "checklists_viagemId_concluido_idx" ON "checklists"("viagemId", "concluido");

-- AddForeignKey
ALTER TABLE "viagens" ADD CONSTRAINT "viagens_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerario_dias" ADD CONSTRAINT "itinerario_dias_viagemId_fkey" FOREIGN KEY ("viagemId") REFERENCES "viagens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atividades" ADD CONSTRAINT "atividades_diaId_fkey" FOREIGN KEY ("diaId") REFERENCES "itinerario_dias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atividades" ADD CONSTRAINT "atividades_viagemId_fkey" FOREIGN KEY ("viagemId") REFERENCES "viagens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atividades" ADD CONSTRAINT "atividades_lugarId_fkey" FOREIGN KEY ("lugarId") REFERENCES "lugares"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lugares" ADD CONSTRAINT "lugares_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lugares" ADD CONSTRAINT "lugares_viagemId_fkey" FOREIGN KEY ("viagemId") REFERENCES "viagens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotacoes" ADD CONSTRAINT "cotacoes_viagemId_fkey" FOREIGN KEY ("viagemId") REFERENCES "viagens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_viagemId_fkey" FOREIGN KEY ("viagemId") REFERENCES "viagens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_viagemId_fkey" FOREIGN KEY ("viagemId") REFERENCES "viagens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

