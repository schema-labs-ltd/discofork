import { describe, expect, test } from "bun:test"

import type { DiffFacts, ForkAnalysis, ForkMetadata } from "../src/core/types.ts"
import { compareForksForSelection, computeRecommendations, deriveMagnitude, recommendForks, scoreForkCandidate } from "../src/services/heuristics.ts"

const baseFork: ForkMetadata = {
  fullName: "owner/fork",
  description: "desc",
  homepageUrl: null,
  defaultBranch: "main",
  isArchived: false,
  forkCount: 0,
  stargazerCount: 10,
  pushedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  sourceFullName: "owner/fork",
  parentFullName: "upstream/repo",
  createdAt: null,
  archivedAt: null,
  comparisonStatus: "ahead",
  aheadBy: 3,
  behindBy: 1,
  hasChanges: true,
  pushedDaysAgo: 2,
  score: 20,
  scoreReasons: ["recently pushed"],
  defaultSelected: true,
}

const baseDiff: DiffFacts = {
  mergeBase: "abc123",
  aheadCount: 3,
  behindCount: 1,
  changedFiles: 5,
  insertions: 50,
  deletions: 20,
  renamedFiles: 0,
  topChangedPaths: [],
  topChangedDirectories: [],
  uniqueCommits: [],
  fileKinds: [],
  sampleFileSummaries: [],
}

const baseAnalysis: ForkAnalysis = {
  fork: "owner/fork",
  maintenance: "active",
  changeMagnitude: "minor",
  likelyPurpose: "Testing",
  changeCategories: ["features"],
  additionalFeatures: ["Adds something"],
  missingFeatures: [],
  strengths: ["A"],
  risks: ["B"],
  idealUsers: ["C"],
  decisionSummary: "D",
  confidence: "medium",
  evidence: ["E1", "E2"],
}

describe("heuristics", () => {
  test("scores fresh, starred forks higher", () => {
    const score = scoreForkCandidate({
      stargazerCount: 35,
      pushedDaysAgo: 10,
      isArchived: false,
      parentFullName: "upstream/repo",
    })

    expect(score.score).toBeGreaterThan(20)
    expect(score.reasons).toContain("recently pushed")
  })

  test("derives magnitude from diff size", () => {
    expect(deriveMagnitude(baseDiff)).toBe("minor")
    expect(
      deriveMagnitude({
        ...baseDiff,
        aheadCount: 140,
        changedFiles: 260,
        insertions: 9000,
        deletions: 12000,
      }),
    ).toBe("significant_divergence")
  })

  test("computes recommendation buckets", () => {
    const recommendations = computeRecommendations([
      {
        metadata: baseFork,
        diffFacts: baseDiff,
        analysis: baseAnalysis,
      },
      {
        metadata: {
          ...baseFork,
          fullName: "owner/opinionated",
          score: 100,
        },
        diffFacts: {
          ...baseDiff,
          aheadCount: 200,
          changedFiles: 400,
          insertions: 15000,
          deletions: 5000,
        },
        analysis: {
          ...baseAnalysis,
          fork: "owner/opinionated",
          changeCategories: ["architectural_experiment", "significant_divergence"],
        },
      },
    ])

    expect(recommendations.bestMaintained).toBe("owner/opinionated")
    expect(recommendations.closestToUpstream).toBe("owner/fork")
    expect(recommendations.mostOpinionated).toBe("owner/opinionated")
  })

  test("prefers stars by default selection strategy", () => {
    const starFork = {
      ...baseFork,
      fullName: "owner/starred",
      stargazerCount: 80,
      pushedDaysAgo: 20,
    }
    const recentFork = {
      ...baseFork,
      fullName: "owner/recent",
      stargazerCount: 12,
      pushedDaysAgo: 1,
    }

    const recommended = recommendForks([recentFork, starFork], 1, "stars")
    expect(recommended.has("owner/starred")).toBe(true)
    expect(compareForksForSelection(starFork, recentFork, "stars")).toBeLessThan(0)
  })

  test("can switch selection strategy to most recent forks", () => {
    const starFork = {
      ...baseFork,
      fullName: "owner/starred",
      stargazerCount: 80,
      pushedDaysAgo: 20,
    }
    const recentFork = {
      ...baseFork,
      fullName: "owner/recent",
      stargazerCount: 12,
      pushedDaysAgo: 1,
    }

    const recommended = recommendForks([starFork, recentFork], 1, "recent")
    expect(recommended.has("owner/recent")).toBe(true)
    expect(compareForksForSelection(recentFork, starFork, "recent")).toBeLessThan(0)
  })
})
