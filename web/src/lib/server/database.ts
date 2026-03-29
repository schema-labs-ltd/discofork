import { Pool, type QueryResultRow } from "pg"

let pool: Pool | null = null

export function databaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL)
}

function getDatabasePool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.")
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    })
  }

  return pool
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await getDatabasePool().query<T>(text, params)
  return result.rows
}
