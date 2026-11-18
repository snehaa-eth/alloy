// Local development entrypoint only. Vercel uses api/index.ts and never calls listen().
import "dotenv/config";
import { createApp } from "./app";
import { disconnectDb } from "./config/db";
import { loadEnv } from "./config/env";

const env = loadEnv();
const app = createApp({ env });

const server = app.listen(env.PORT, () => {
  console.log(`[api] listening on http://localhost:${env.PORT} (chains: ${env.CHAIN_IDS.join(", ")})`);
});

async function shutdown(signal: string) {
  console.log(`[api] ${signal} received, shutting down`);
  server.close();
  await disconnectDb().catch(() => undefined);
}
process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
