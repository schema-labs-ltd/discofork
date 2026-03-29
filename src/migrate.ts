import { readdir } from "node:fs/promises"
import path from "node:path"

import { getDatabasePool } from "./server/database.ts"

const migrationsDir = path.join(process.cwd(), "migrations")

async function main(): Promise<void> {
  const pool = getDatabasePool()
  const client = await pool.connect()

  try {
    await client.query(
      `create table if not exists schema_migrations (
        version text primary key,
        applied_at timestamptz not null default now()
      )`,
    )

    const files = (await readdir(migrationsDir))
      .filter((file) => file.endsWith(".sql"))
      .sort()

    for (const file of files) {
      const alreadyApplied = await client.query<{ version: string }>(
        "select version from schema_migrations where version = $1",
        [file],
      )

      if (alreadyApplied.rowCount) {
        continue
      }

      const sql = await Bun.file(path.join(migrationsDir, file)).text()
      await client.query("begin")

      try {
        await client.query(sql)
        await client.query("insert into schema_migrations (version) values ($1)", [file])
        await client.query("commit")
        console.log(`Applied migration ${file}`)
      } catch (error) {
        await client.query("rollback")
        throw error
      }
    }
  } finally {
    client.release()
    await pool.end()
  }
}

await main()
