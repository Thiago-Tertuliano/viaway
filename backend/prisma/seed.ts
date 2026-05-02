import { PrismaClient, Plano, StatusViagem } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.DEV_USER_EMAIL ?? "dev@viaway.local";
  const nome = process.env.DEV_USER_NOME ?? "Dev Local";

  const usuario = await prisma.usuario.upsert({
    where: { email },
    create: {
      email,
      nome,
      plano: Plano.free,
    },
    update: {
      nome,
      ultimoAcesso: new Date(),
    },
  });

  const seedViagens = [
    {
      nome: "Floripa Jan 2026",
      destinoPrincipal: "Florianopolis, SC",
      destinosSecundarios: ["Bombinhas", "Governador Celso Ramos"],
      numViajantes: 4,
      status: StatusViagem.planejando,
      orcamentoTotal: "8000.00",
      notas: "Viagem seed para testes de API.",
    },
    {
      nome: "Sao Paulo - Bate e volta",
      destinoPrincipal: "Sao Paulo, SP",
      destinosSecundarios: [],
      numViajantes: 2,
      status: StatusViagem.confirmada,
      orcamentoTotal: "1500.00",
      notas: "Viagem de teste confirmada.",
    },
  ];

  for (const viagem of seedViagens) {
    const existente = await prisma.viagem.findFirst({
      where: {
        usuarioId: usuario.id,
        nome: viagem.nome,
      },
      select: { id: true },
    });

    if (existente) {
      await prisma.viagem.update({
        where: { id: existente.id },
        data: { ...viagem, deletadoEm: null },
      });
    } else {
      await prisma.viagem.create({
        data: {
          usuarioId: usuario.id,
          ...viagem,
        },
      });
    }
  }

  const totalViagens = await prisma.viagem.count({
    where: { usuarioId: usuario.id, deletadoEm: null },
  });

  console.log("Seed concluido.", {
    usuarioId: usuario.id,
    email,
    totalViagens,
  });
}

main()
  .catch((error) => {
    console.error("Falha no seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
