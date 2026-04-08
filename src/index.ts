import fastifyEnv from "@fastify/env";
import websocket, { WebSocket } from "@fastify/websocket";
import Fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";

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
await server.register(websocket);

server.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
  return {
    hello: "world",
  };
});

server.get(
  "/chat",
  { websocket: true },
  (socket: WebSocket, request: FastifyRequest) => {
    const { chatId } = request.query;

    socket.on("message", (message) => {
      if (message.toString() === "test") {
        socket.send(
          `hello from server to chatId-${chatId} and reqId: ${request.id}`,
        );
      }
    });
  },
);

await server.ready();

await (async () => {
  try {
    await server.listen({ port: server.config.PORT });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
})();
