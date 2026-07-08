import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

declare global {
  var __dbClient: postgres.Sql | undefined;
}

function getClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — add it to .env.local");
  }

  // Reuse the connection across hot reloads in dev so we don't leak connections.
  if (process.env.NODE_ENV === "development") {
    globalThis.__dbClient ??= postgres(process.env.DATABASE_URL);
    return globalThis.__dbClient;
  }

  return postgres(process.env.DATABASE_URL);
}

export const db = drizzle(getClient(), { schema });
