import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"

const databaseModulePath = new URL("../web/src/lib/server/database.ts", import.meta.url).href
const liveStatusModulePath = new URL("../web/src/lib/server/live-status.ts", import.meta.url).href
const queueModulePath = new URL("../web/src/lib/server/queue.ts", import.meta.url).href
const reportsModulePath = new URL("../web/src/lib/server/reports.ts", import.meta.url).href
const repositoryServiceModulePath = new URL("../web/src/lib/repository-service.ts", import.meta.url).href

const repoExistenceCache = new Map<string, string>()
const enqueueCalls: string[] = []
const touchCalls: Array<{ owner: string; repo: string; queuedNow: boolean }> = []
const fetchCalls: Array<{ url: string; init?: RequestInit }> = []

let databaseEnabled = true
let queueEnabled = true
let repoRecord: unknown = null
let statusSnapshot: unknown = null
let fetchStatus = 200

mock.module(databaseModulePath, () => ({
  databaseConfigured: () => databaseEnabled,
}))

mock.module(liveStatusModulePath, () => ({
  getRepoStatusSnapshot: async () => statusSnapshot,
}))

mock.module(queueModulePath, () => ({
  enqueueRepoJob: async (fullName: string) => {
    enqueueCalls.push(fullName)
    return true
  },
  getRedisClient: async () =>
    ({
      get: async (key: string) => repoExistenceCache.get(key) ?? null,
      set: async (key: string, value: string) => {
        repoExistenceCache.set(key, value)
        return "OK"
      },
    }) as unknown,
  queueConfigured: () => queueEnabled,
}))

mock.module(reportsModulePath, () => ({
  getRepoRecord: async () => repoRecord,
  touchQueuedRepo: async (owner: string, repo: string, queuedNow: boolean) => {
    touchCalls.push({ owner, repo, queuedNow })
  },
}))

const { RepositoryNotFoundError, resolveRepositoryView } = await import(repositoryServiceModulePath)
const originalFetch = globalThis.fetch

beforeEach(() => {
  databaseEnabled = true
  queueEnabled = true
  repoRecord = null
  statusSnapshot = null
  fetchStatus = 200
  repoExistenceCache.clear()
  enqueueCalls.length = 0
  touchCalls.length = 0
  fetchCalls.length = 0
  delete process.env.GH_TOKEN
  delete process.env.GITHUB_TOKEN
  process.env.REDIS_URL = "redis://example.test:6379"

  globalThis.fetch = (async (input: Request | string | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
    fetchCalls.push({ url, init })
    return new Response(null, { status: fetchStatus })
  }) as typeof fetch
})

afterEach(() => {
  globalThis.fetch = originalFetch
  delete process.env.REDIS_URL
  delete process.env.GH_TOKEN
  delete process.env.GITHUB_TOKEN
})

describe("resolveRepositoryView without a GitHub token", () => {
  test("uses a public GitHub probe, caches positive hits, and still queues existing repos", async () => {
    const firstView = await resolveRepositoryView("schema-labs-ltd", "discofork")
    const secondView = await resolveRepositoryView("schema-labs-ltd", "discofork")

    expect(firstView.kind).toBe("queued")
    expect(secondView.kind).toBe("queued")
    expect(fetchCalls).toHaveLength(1)
    expect(fetchCalls[0]).toMatchObject({
      url: "https://github.com/schema-labs-ltd/discofork",
      init: expect.objectContaining({ method: "HEAD" }),
    })
    expect(repoExistenceCache.get("discofork:github-repo-exists:schema-labs-ltd/discofork")).toBe("1")
    expect(enqueueCalls).toEqual(["schema-labs-ltd/discofork", "schema-labs-ltd/discofork"])
    expect(touchCalls).toEqual([
      { owner: "schema-labs-ltd", repo: "discofork", queuedNow: true },
      { owner: "schema-labs-ltd", repo: "discofork", queuedNow: true },
    ])
  })

  test("fails closed for missing repos, caches the negative result, and skips queue state writes", async () => {
    fetchStatus = 404

    await expect(resolveRepositoryView("schema-labs-ltd", "missing-repo")).rejects.toBeInstanceOf(RepositoryNotFoundError)
    await expect(resolveRepositoryView("schema-labs-ltd", "missing-repo")).rejects.toBeInstanceOf(RepositoryNotFoundError)

    expect(fetchCalls).toHaveLength(1)
    expect(repoExistenceCache.get("discofork:github-repo-exists:schema-labs-ltd/missing-repo")).toBe("0")
    expect(enqueueCalls).toEqual([])
    expect(touchCalls).toEqual([])
  })
})
