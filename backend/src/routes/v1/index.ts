import type { FastifyPluginAsync } from "fastify";
import healthRoutes from "./health.js";
import authRoutes from "./auth.js";
import viagensRoutes from "./viagens.js";
import itinerarioRoutes from "./itinerario.js";
import lugaresRoutes from "./lugares.js";
import cotacoesRoutes from "./cotacoes.js";
import gastosRoutes from "./gastos.js";
import checklistsRoutes from "./checklists.js";

const v1: FastifyPluginAsync = async (app) => {
  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(viagensRoutes, { prefix: "/viagens" });
  await app.register(itinerarioRoutes, { prefix: "/itinerario" });
  await app.register(lugaresRoutes, { prefix: "/lugares" });
  await app.register(cotacoesRoutes, { prefix: "/cotacoes" });
  await app.register(gastosRoutes, { prefix: "/gastos" });
  await app.register(checklistsRoutes, { prefix: "/checklists" });
};

export default v1;
