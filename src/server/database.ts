import { Pool, type QueryResultRow } from "pg"

let pool: Pool | null = null

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error("DATABASE_URL is required.")
  }

  return url
}

export function getDatabasePool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: requireDatabaseUrl(),
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
