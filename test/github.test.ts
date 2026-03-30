import { describe, expect, test } from "bun:test"

import { parseGitHubRepoInput, parseLsRemoteHeadSha } from "../src/services/github.ts"

describe("parseGitHubRepoInput", () => {
  test("parses full GitHub URLs", () => {
    expect(parseGitHubRepoInput("https://github.com/openai/codex").fullName).toBe("openai/codex")
    expect(parseGitHubRepoInput("https://github.com/openai/codex.git").cloneUrl).toBe(
      "https://github.com/openai/codex.git",
    )
  })

  test("parses owner/name shorthand", () => {
    expect(parseGitHubRepoInput("cli/cli")).toEqual({
      owner: "cli",
      name: "cli",
      fullName: "cli/cli",
      url: "https://github.com/cli/cli",
      cloneUrl: "https://github.com/cli/cli.git",
    })
  })
})

describe("parseLsRemoteHeadSha", () => {
  test("extracts the branch head sha from git ls-remote output", () => {
    expect(parseLsRemoteHeadSha("0123456789abcdef0123456789abcdef01234567\trefs/heads/main\n")).toBe(
      "0123456789abcdef0123456789abcdef01234567",
    )
  })

  test("returns null for empty or malformed output", () => {
    expect(parseLsRemoteHeadSha("")).toBeNull()
    expect(parseLsRemoteHeadSha("not-a-sha\trefs/heads/main\n")).toBeNull()
  })
})
