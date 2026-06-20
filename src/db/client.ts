import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/db/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to create a database client.");
}

const queryClient = postgres(connectionString, {
  max: 10,
  idle_timeout: 20
});

export const db = drizzle(queryClient, { schema });

