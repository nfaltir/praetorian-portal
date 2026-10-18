import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env";
import * as schema from "./schema";

/*
  Standard Postgres over TCP. With Neon, use the pooled connection string
  so many short-lived serverless functions share Neon's pooler.
  The pool is kept on globalThis so dev hot reload doesn't leak connections.

  Opening a connection is the expensive part (TCP + TLS + login: several
  round trips). Measured from the US to Sydney it costs ~3 s, versus
  ~150 ms for a query on an open connection. So idle connections are kept
  for 5 minutes instead of being dropped after 10 seconds. 5 minutes also
  matches Neon's default auto-suspend, after which the server closes them
  anyway.
*/
const globalForDb = globalThis as unknown as { pgPool?: Pool };

function createPool() {
  const p = new Pool({
    connectionString: env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 5 * 60_000,
    connectionTimeoutMillis: 15_000,
  });
  // When Neon suspends or recycles a connection, an idle client reports an
  // error. Without a listener Node treats that as unhandled and the server
  // process exits. The pool discards the dead client and opens a new one
  // on the next query, so logging is all that's needed.
  p.on("error", (err) => {
    console.warn("[db] idle connection closed:", err.message);
  });
  return p;
}

const pool = globalForDb.pgPool ?? createPool();

if (process.env.NODE_ENV !== "production") globalForDb.pgPool = pool;

export const db = drizzle(pool, { schema });
export type DB = typeof db;