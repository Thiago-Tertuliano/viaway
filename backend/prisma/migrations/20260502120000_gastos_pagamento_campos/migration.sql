-- CreateEnum
CREATE TYPE "MetodoPagamento" AS ENUM (
  'cartao_internacional',
  'cartao_nacional',
  'pix',
  'dinheiro',
  'transferencia',
  'outro'
);

-- AlterTable
ALTER TABLE "gastos" ADD COLUMN "descricaoPagamento" TEXT;
ALTER TABLE "gastos" ADD COLUMN "metodoPagamento" "MetodoPagamento" NOT NULL DEFAULT 'outro';
ALTER TABLE "gastos" ADD COLUMN "cartaoNome" TEXT;
ALTER TABLE "gastos" ADD COLUMN "parcelas" INTEGER;
ALTER TABLE "gastos" ADD COLUMN "moeda" TEXT NOT NULL DEFAULT 'BRL';
ALTER TABLE "gastos" ADD COLUMN "valorOriginal" DECIMAL(12, 2);
ALTER TABLE "gastos" ADD COLUMN "cotacaoMoeda" DECIMAL(12, 6);
ALTER TABLE "gastos" ADD COLUMN "valorConvertido" DECIMAL(12, 2);
ALTER TABLE "gastos" ADD COLUMN "iofPercentual" DECIMAL(5, 2);
ALTER TABLE "gastos" ADD COLUMN "taxaPercentual" DECIMAL(5, 2);
ALTER TABLE "gastos" ADD COLUMN "milhasEstimadas" INTEGER;
