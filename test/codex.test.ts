import { describe, expect, test } from "bun:test"

import type { DiffFacts, ForkAnalysis } from "../src/core/types.ts"
import { enrichForkAnalysis } from "../src/services/codex.ts"

const baseAnalysis: ForkAnalysis = {
  fork: "forks/example",
  maintenance: "active",
  changeMagnitude: "substantial",
  likelyPurpose: "Customized downstream fork.",
  changeCategories: ["architectural_experiment"],
  additionalFeatures: [],
  missingFeatures: [],
  strengths: ["Active maintenance."],
  risks: ["Merge cost."],
  idealUsers: ["Teams with custom requirements."],
  decisionSummary: "Substantial divergence from upstream.",
  confidence: "medium",
  evidence: ["Ahead 20.", "Changed multiple paths."],
}

describe("enrichForkAnalysis", () => {
  test("infers additional features from changed paths and commit subjects", () => {
    const enriched = enrichForkAnalysis(baseAnalysis, {
      mergeBase: "abc123",
      aheadCount: 24,
      behindCount: 6,
      changedFiles: 80,
      insertions: 1200,
      deletions: 300,
      renamedFiles: 2,
      topChangedPaths: [
        { path: "android/app/src/main.ts", changes: 500 },
        { path: "packages/opencode/src/mcp/server.ts", changes: 300 },
        { path: "packages/sdk/schema.ts", changes: 200 },
      ],
      topChangedDirectories: [
        { path: "android/", percent: 40 },
        { path: "packages/opencode/src/mcp/", percent: 25 },
      ],
      uniqueCommits: [
        { sha: "1", authoredAt: "2026-03-29T10:00:00Z", subject: "add android handoff flow" },
        { sha: "2", authoredAt: "2026-03-29T11:00:00Z", subject: "extend sdk schema for mobile client" },
      ],
      fileKinds: [],
      sampleFileSummaries: [
        { path: "android/app/src/main.ts", additions: 400, deletions: 20 },
        { path: "packages/opencode/src/mcp/server.ts", additions: 200, deletions: 50 },
      ],
    })

    expect(enriched.additionalFeatures.length).toBeGreaterThan(0)
    expect(enriched.additionalFeatures.join(" ")).toContain("platform-specific client support")
    expect(enriched.additionalFeatures.join(" ")).toContain("MCP-style extensibility")
    expect(enriched.changeCategories).toContain("features")
  })

  test("infers missing features from removal signals and upstream lag", () => {
    const enriched = enrichForkAnalysis(baseAnalysis, {
      mergeBase: "abc123",
      aheadCount: 12,
      behindCount: 48,
      changedFiles: 25,
      insertions: 200,
      deletions: 600,
      renamedFiles: 0,
      topChangedPaths: [
        { path: "packages/opencode/src/plugins/registry.ts", changes: 120 },
      ],
      topChangedDirectories: [{ path: "packages/opencode/src/plugins/", percent: 60 }],
      uniqueCommits: [
        { sha: "1", authoredAt: "2026-03-29T10:00:00Z", subject: "remove plugin registry and disable remote tools" },
      ],
      fileKinds: [],
      sampleFileSummaries: [
        { path: "packages/opencode/src/plugins/registry.ts", additions: 5, deletions: 220 },
      ],
    })

    expect(enriched.missingFeatures.length).toBeGreaterThan(0)
    expect(enriched.missingFeatures.join(" ")).toContain("removed, disabled, or intentionally stripped down")
    expect(enriched.missingFeatures.join(" ")).toContain("trails upstream by 48 commits")
    expect(enriched.changeCategories).toContain("removes_features")
  })
})
