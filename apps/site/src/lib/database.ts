import { Pool } from "pg"

const databaseUrl = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/onerouter"

// Keep one pool per Next.js worker so Better Auth and the usage ledger share
// connections instead of multiplying pools in serverless or multi-worker
// deployments. Operators can tune these through standard pg connection
// options embedded in DATABASE_URL when needed.
export const database = new Pool({
  connectionString: databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})
