import { describe, expect, test } from "bun:test"

import type { FinalReport } from "../src/core/types.ts"
import { sanitizeJsonValue, serializeJsonSafely } from "../src/core/json.ts"

const loneHighSurrogate = String.fromCharCode(0xd83e)
const loneLowSurrogate = String.fromCharCode(0xdc00)

const report: FinalReport = {
  generatedAt: "2026-04-04T09:00:00Z",
  repository: {
    owner: "example",
    name: "repo",
    fullName: "example/repo",
    url: "https://github.com/example/repo",
    cloneUrl: "https://github.com/example/repo.git",
  },
  upstream: {
    metadata: {
      fullName: "example/repo",
      description: "Example repo",
      homepageUrl: null,
      defaultBranch: "main",
      isArchived: false,
      forkCount: 12,
      stargazerCount: 34,
      pushedAt: "2026-04-03T09:00:00Z",
      updatedAt: "2026-04-03T09:00:00Z",
    },
    topLevelEntries: ["README.md", "src"],
    topDirectories: ["src"],
    topFiles: ["README.md"],
    readmeExcerpt: "# Repo",
    manifestFiles: [],
    nestedManifestFiles: [],
    workspaceSignals: [],
    workspaceDirectories: [],
    recentCommits: [],
    detectedTech: ["TypeScript"],
    analysis: {
      summary: "Base upstream summary",
      capabilities: ["CLI"],
      targetUsers: ["Developers"],
      architectureNotes: ["Node"],
      evidence: ["README"],
    },
  },
  discovery: {
    totalForkCount: 12,
    scannedForkCount: 1,
    archivedExcluded: 0,
    unchangedExcluded: 0,
    selectionWarning: null,
  },
  forks: [
    {
      metadata: {
        fullName: "forks/one",
        description: "Fork one",
        homepageUrl: null,
        defaultBranch: "main",
        isArchived: false,
        forkCount: 0,
        stargazerCount: 3,
        pushedAt: "2026-04-03T09:00:00Z",
        updatedAt: "2026-04-03T09:00:00Z",
        sourceFullName: "forks/one",
        parentFullName: "example/repo",
        createdAt: null,
        archivedAt: null,
        comparisonStatus: "ahead",
        aheadBy: 1,
        behindBy: 0,
        hasChanges: true,
        pushedDaysAgo: 1,
        score: 9,
        scoreReasons: ["recent"],
        defaultSelected: true,
      },
      diffFacts: {
        mergeBase: "abc123",
        aheadCount: 1,
        behindCount: 0,
        changedFiles: 1,
        insertions: 2,
        deletions: 0,
        renamedFiles: 0,
        topChangedPaths: [],
        topChangedDirectories: [],
        uniqueCommits: [],
        fileKinds: [],
        sampleFileSummaries: [],
      },
      analysis: {
        fork: "forks/one",
        maintenance: "active",
        changeMagnitude: "minor",
        likelyPurpose: "Extends the project",
        changeCategories: ["features"],
        additionalFeatures: ["Plugin hooks"],
        missingFeatures: [],
        strengths: ["Fast-moving"],
        risks: ["Single maintainer"],
        idealUsers: ["Power users"],
        decisionSummary: "Solid option",
        confidence: "medium",
        evidence: ["Ahead by 1"],
      },
    },
  ],
  recommendations: {
    bestMaintained: "forks/one",
    closestToUpstream: "forks/one",
    mostFeatureRich: "forks/one",
    mostOpinionated: null,
  },
}

describe("sanitizeJsonValue", () => {
  test("replaces lone surrogate code units and records the changed paths", () => {
    const broken = {
      safe: "✅ paired emoji stays intact",
      badHigh: `broken ${loneHighSurrogate} value`,
      nested: {
        badLow: `oops ${loneLowSurrogate} here`,
      },
      list: ["ok", `another ${loneHighSurrogate} item`],
    }

    const sanitized = sanitizeJsonValue(broken)

    expect(sanitized.value).toEqual({
      safe: "✅ paired emoji stays intact",
      badHigh: "broken � value",
      nested: {
        badLow: "oops � here",
      },
      list: ["ok", "another � item"],
    })
    expect(sanitized.sanitizedPaths).toEqual(["$.badHigh", "$.nested.badLow", "$.list[1]"])
  })
})

describe("serializeJsonSafely", () => {
  test("produces JSON that does not contain lone surrogate escape sequences", () => {
    const serialized = serializeJsonSafely({
      ...report,
      upstream: {
        ...report.upstream,
        analysis: {
          ...report.upstream.analysis,
          summary: `Bad summary ${loneHighSurrogate} and valid emoji ✅`,
        },
      },
      forks: report.forks.map((fork) => ({
        ...fork,
        analysis: {
          ...fork.analysis,
          decisionSummary: `Broken fork note ${loneHighSurrogate} but valid rocket 🚀`,
        },
      })),
    })

    expect(serialized.sanitizedPaths).toEqual([
      "$.upstream.analysis.summary",
      "$.forks[0].analysis.decisionSummary",
    ])
    const parsed = JSON.parse(serialized.json) as typeof report
    expect(parsed.upstream.analysis.summary).toBe("Bad summary � and valid emoji ✅")
    expect(parsed.forks[0]?.analysis.decisionSummary).toBe("Broken fork note � but valid rocket 🚀")
  })
})
