import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test"

const repositoryServiceModulePath = new URL("../web/src/lib/repository-service.ts", import.meta.url).href
const routeModulePath = new URL("../web/src/app/api/repo/[owner]/[repo]/route.ts", import.meta.url).href

class MockRepositoryNotFoundError extends Error {
  constructor(fullName: string) {
    super(`Repository not found on GitHub: ${fullName}`)
    this.name = "RepositoryNotFoundError"
  }
}

let nextResult: unknown = null
let shouldThrowNotFound = false

mock.module(repositoryServiceModulePath, () => ({
  RepositoryNotFoundError: MockRepositoryNotFoundError,
  getRepositoryPageView: async (owner: string, repo: string) => {
    if (shouldThrowNotFound) {
      throw new MockRepositoryNotFoundError(`${owner}/${repo}`)
    }

    return nextResult
  },
}))

const { GET } = await import(routeModulePath)

beforeEach(() => {
  shouldThrowNotFound = false
  nextResult = {
    kind: "queued",
    fullName: "openai/codex",
  }
})

describe("repo API route", () => {
  test("returns a 404 payload when repository lookup rejects the route", async () => {
    shouldThrowNotFound = true

    const response = await GET(new Request("https://discofork.ai/api/repo/admin/.env"), {
      params: Promise.resolve({ owner: "admin", repo: ".env" }),
    })

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: "Repository not found." })
  })

  test("returns the repository payload for valid routes", async () => {
    const response = await GET(new Request("https://discofork.ai/api/repo/openai/codex"), {
      params: Promise.resolve({ owner: "openai", repo: "codex" }),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(nextResult)
  })
})


afterAll(() => {
  mock.restore()
})
