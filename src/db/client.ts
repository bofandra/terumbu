import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/db/schema";

type Database = PostgresJsDatabase<typeof schema>;

let dbInstance: Database | null = null;

function createDb() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to create a database client.");
  }

  const queryClient = postgres(connectionString, {
    max: 10,
    idle_timeout: 20
  });

  return drizzle(queryClient, { schema });
}

export function getDb() {
  dbInstance ??= createDb();
  return dbInstance;
}

export const db = new Proxy({} as Database, {
  get(_target, property) {
    const database = getDb();
    const value = Reflect.get(database, property, database);

    return typeof value === "function" ? value.bind(database) : value;
  }
});
