import { describe, expect, test } from "bun:test"

import { __private__ } from "../src/services/github-command.ts"

describe("isGitHubRateLimited", () => {
  test("detects primary and secondary GitHub rate limit responses", () => {
    expect(
      __private__.isGitHubRateLimited({
        exitCode: 1,
        stdout: "",
        stderr: "API rate limit exceeded for user ID 123.",
        durationMs: 10,
      }),
    ).toBe(true)

    expect(
      __private__.isGitHubRateLimited({
        exitCode: 1,
        stdout: "",
        stderr: "You have exceeded a secondary rate limit. Please wait a few minutes before you try again.",
        durationMs: 10,
      }),
    ).toBe(true)
  })

  test("ignores unrelated command failures", () => {
    expect(
      __private__.isGitHubRateLimited({
        exitCode: 1,
        stdout: "",
        stderr: "GraphQL: Could not resolve to a Repository with the name 'foo/bar'.",
        durationMs: 10,
      }),
    ).toBe(false)
  })
})

describe("parseGitHubRateLimitSnapshot", () => {
  test("parses core, search, and graphql buckets", () => {
    const snapshot = __private__.parseGitHubRateLimitSnapshot(
      JSON.stringify({
        resources: {
          core: { limit: 5000, remaining: 4200, used: 800, reset: 1770000000 },
          search: { limit: 30, remaining: 28, used: 2, reset: 1770000000 },
          graphql: { limit: 5000, remaining: 4900, used: 100, reset: 1770000000 },
        },
      }),
    )

    expect(snapshot?.core.limit).toBe(5000)
    expect(snapshot?.core.remaining).toBe(4200)
    expect(snapshot?.search.remaining).toBe(28)
    expect(snapshot?.graphql.used).toBe(100)
    expect(snapshot?.core.resetAt).toBe("2026-02-02T02:40:00.000Z")
  })
})
