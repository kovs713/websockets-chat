import Fastify, { FastifyInstance } from "fastify";
import fastifyEnv from "@fastify/env";

const schema = {
  type: "object",
  required: ["NODE_ENV", "PORT"],
  properties: {
    NODE_ENV: {
      type: "string",
    },
    PORT: {
      type: "number",
      default: 4000,
    },
  },
};

const options = {
  schema: schema,
  dotenv: true,
  data: process.env,
};

const server: FastifyInstance = Fastify({
  logger: true,
});

await server.register(fastifyEnv, options);

server.get("/", async (request, reply) => {
  return { hello: "world" };
});

await server.ready();

const start = async () => {
  try {
    await server.listen({ port: server.config.PORT });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
