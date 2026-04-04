import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"

const databaseModulePath = new URL("../web/src/lib/server/database.ts", import.meta.url).href
const queueModulePath = new URL("../web/src/lib/server/queue.ts", import.meta.url).href
const statsModulePath = new URL("../web/src/lib/server/stats.ts?stats-test", import.meta.url).href

const originalDatabaseModule = await import(new URL("../web/src/lib/server/database.ts?stats-original", import.meta.url).href)
const originalQueueModule = await import(new URL("../web/src/lib/server/queue.ts?stats-original", import.meta.url).href)

const redisStore = new Map<string, string>()

mock.module(databaseModulePath, () => ({
  query: async <T>(sql: string) => {
    if (sql.includes("count(*)::int as total")) {
      return [
        {
          total: 0,
          queued: 0,
          processing: 0,
          pending: 0,
          cached: 0,
          failed: 0,
        },
      ] as T[]
    }

    if (sql.includes("with dates as")) {
      return [] as T[]
    }

    return [] as T[]
  },
}))

mock.module(queueModulePath, () => ({
  queueConfigured: () => true,
  getRedisClient: async () => ({
    get: async (key: string) => redisStore.get(key) ?? null,
    set: async (key: string, value: string) => {
      redisStore.set(key, value)
      return "OK"
    },
  }) as unknown,
}))

const { getOpenAIStats, refreshStatsSnapshot } = await import(statsModulePath)
const originalFetch = globalThis.fetch

beforeEach(() => {
  redisStore.clear()
  process.env.OPENAI_ADMIN_KEY = "test-admin-key"
  delete process.env.OPENAI_USAGE_API_KEY_ID
  delete process.env.OPENAI_PROJECT_ID
})

afterEach(() => {
  globalThis.fetch = originalFetch
  delete process.env.OPENAI_ADMIN_KEY
  delete process.env.OPENAI_USAGE_API_KEY_ID
  delete process.env.OPENAI_PROJECT_ID
  delete process.env.GITHUB_TOKEN
  mock.module(databaseModulePath, () => originalDatabaseModule)
  mock.module(queueModulePath, () => originalQueueModule)
})

describe("getOpenAIStats", () => {
  test("retries transient OpenAI 500s and still returns fresh stats", async () => {
    let completionAttempts = 0

    globalThis.fetch = (async (input: Request | string | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url

      if (url.includes("/organization/usage/completions")) {
        completionAttempts += 1
        if (completionAttempts === 1) {
          return new Response(JSON.stringify({ error: "temporary" }), { status: 500 })
        }

        return Response.json({
          data: [
            {
              start_time: 1712188800,
              results: [
                {
                  input_tokens: 12,
                  output_tokens: 7,
                  input_cached_tokens: 3,
                  num_model_requests: 2,
                },
              ],
            },
          ],
        })
      }

      if (url.includes("/organization/costs")) {
        return Response.json({
          data: [
            {
              start_time: 1712188800,
              results: [
                {
                  amount: {
                    value: 1.5,
                    currency: "usd",
                  },
                },
              ],
            },
          ],
        })
      }

      throw new Error(`Unexpected fetch: ${url}`)
    }) as typeof fetch

    const result = await getOpenAIStats({ fresh: true })

    expect(result.available).toBe(true)
    if (!result.available) {
      throw new Error("expected available stats")
    }
    expect(result.data.freshness).toBe("fresh")
    expect(result.data.note).toBeNull()
    expect(result.data.totalRequests).toBe(2)
    expect(completionAttempts).toBe(2)
  })

  test("falls back to the last good cached stats when the project lookup fails", async () => {
    process.env.OPENAI_PROJECT_ID = "proj_123"
    redisStore.set(
      "stats:openai:v4:all-keys:proj_123",
      JSON.stringify({
        available: true,
        data: {
          scopeLabel: "Project proj_123",
          totalInputTokens: 100,
          totalOutputTokens: 50,
          totalCachedTokens: 10,
          totalRequests: 5,
          totalCost: 2.5,
          currency: "usd",
          usageSeries: [],
          costSeries: [],
          fetchedAt: "2026-04-04T08:00:00Z",
          freshness: "fresh",
          note: null,
        },
      }),
    )

    globalThis.fetch = (async (input: Request | string | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
      if (url.includes("/organization/projects/proj_123")) {
        return new Response(JSON.stringify({ error: "upstream failure" }), { status: 500 })
      }

      throw new Error(`Unexpected fetch: ${url}`)
    }) as typeof fetch

    const result = await getOpenAIStats({ fresh: true })

    expect(result.available).toBe(true)
    if (!result.available) {
      throw new Error("expected cached fallback stats")
    }
    expect(result.data.freshness).toBe("stale")
    expect(result.data.note).toContain("status 500")
    expect(result.data.totalInputTokens).toBe(100)
  })
})

describe("refreshStatsSnapshot", () => {
  test("keeps the overall snapshot healthy when OpenAI falls back to stale cached data", async () => {
    process.env.OPENAI_PROJECT_ID = "proj_123"
    redisStore.set(
      "stats:openai:v4:all-keys:proj_123",
      JSON.stringify({
        available: true,
        data: {
          scopeLabel: "Project proj_123",
          totalInputTokens: 100,
          totalOutputTokens: 50,
          totalCachedTokens: 10,
          totalRequests: 5,
          totalCost: 2.5,
          currency: "usd",
          usageSeries: [],
          costSeries: [],
          fetchedAt: "2026-04-04T08:00:00Z",
          freshness: "fresh",
          note: null,
        },
      }),
    )

    globalThis.fetch = (async (input: Request | string | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
      if (url.includes("/organization/projects/proj_123")) {
        return new Response(JSON.stringify({ error: "upstream failure" }), { status: 500 })
      }
      if (url.includes("https://api.github.com/rate_limit")) {
        return Response.json({
          resources: {
            core: { limit: 5000, remaining: 4999, used: 1, reset: 1712192400 },
            search: { limit: 30, remaining: 30, used: 0, reset: 1712192400 },
            graphql: { limit: 5000, remaining: 5000, used: 0, reset: 1712192400 },
          },
        })
      }

      throw new Error(`Unexpected fetch: ${url}`)
    }) as typeof fetch
    process.env.GITHUB_TOKEN = "test-gh-token"

    const snapshot = await refreshStatsSnapshot()

    expect(snapshot.openAIStats.available).toBe(true)
    if (!snapshot.openAIStats.available) {
      throw new Error("expected stale cached OpenAI stats")
    }
    expect(snapshot.openAIStats.data.freshness).toBe("stale")
    expect(snapshot.githubRateLimit.available).toBe(true)

    delete process.env.GITHUB_TOKEN
  })
})
