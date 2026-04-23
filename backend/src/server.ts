import "dotenv/config";
import { buildServer } from "./app.js";

const port = Number(process.env.PORT) || 3001;
const host = process.env.HOST ?? "0.0.0.0";

buildServer()
  .then((app) =>
    app.listen({ port, host }).then(() => {
      app.log.info(`ViaWay API em http://${host}:${port}/v1`);
      app.log.info(`Swagger UI em http://${host}:${port}/v1/docs`);
    }),
  )
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
