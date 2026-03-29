import { readFile } from "node:fs/promises"

import type {
  DiffFacts,
  ForkAnalysis,
  ForkMetadata,
  RepoFacts,
  RepoMetadata,
  UpstreamAnalysis,
} from "../core/types.ts"
import { writeJson } from "../core/fs.ts"

const UPSTREAM_CACHE_VERSION = 1
const FORK_CACHE_VERSION = 2

type RepoSnapshot = {
  fullName: string
  defaultBranch: string
  pushedAt: string | null
  updatedAt: string | null
}

type UpstreamCacheEntry = {
  version: typeof UPSTREAM_CACHE_VERSION
  cachedAt: string
  upstream: RepoSnapshot
  repoFacts: RepoFacts
  analysis: UpstreamAnalysis
}

type ForkCacheEntry = {
  version: typeof FORK_CACHE_VERSION
  cachedAt: string
  upstream: RepoSnapshot
  fork: RepoSnapshot
  diffFacts: DiffFacts
  analysis: ForkAnalysis
}

function normalizeForkAnalysis(analysis: Partial<ForkAnalysis> & Pick<ForkAnalysis, "fork">): ForkAnalysis {
  const normalized: ForkAnalysis = {
    maintenance: "unknown",
    changeMagnitude: "minor",
    likelyPurpose: "",
    changeCategories: [],
    additionalFeatures: [],
    missingFeatures: [],
    strengths: [],
    risks: [],
    idealUsers: [],
    decisionSummary: "",
    confidence: "medium",
    evidence: [],
    ...analysis,
    fork: analysis.fork,
  }

  normalized.changeCategories = analysis.changeCategories ?? []
  normalized.additionalFeatures = analysis.additionalFeatures ?? []
  normalized.missingFeatures = analysis.missingFeatures ?? []
  normalized.strengths = analysis.strengths ?? []
  normalized.risks = analysis.risks ?? []
  normalized.idealUsers = analysis.idealUsers ?? []
  normalized.evidence = analysis.evidence ?? []

  return normalized
}

function snapshot(metadata: RepoMetadata | ForkMetadata): RepoSnapshot {
  return {
    fullName: metadata.fullName,
    defaultBranch: metadata.defaultBranch,
    pushedAt: metadata.pushedAt,
    updatedAt: metadata.updatedAt,
  }
}

function sameSnapshot(left: RepoSnapshot, right: RepoSnapshot): boolean {
  return (
    left.fullName === right.fullName &&
    left.defaultBranch === right.defaultBranch &&
    left.pushedAt === right.pushedAt
  )
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, "utf8")
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export async function loadUpstreamCache(
  filePath: string,
  upstream: RepoMetadata,
): Promise<UpstreamCacheEntry | null> {
  const entry = await readJsonFile<UpstreamCacheEntry>(filePath)
  if (!entry || entry.version !== UPSTREAM_CACHE_VERSION) {
    return null
  }

  return sameSnapshot(entry.upstream, snapshot(upstream)) ? entry : null
}

export async function saveUpstreamCache(
  filePath: string,
  upstream: RepoMetadata,
  repoFacts: RepoFacts,
  analysis: UpstreamAnalysis,
): Promise<void> {
  await writeJson(filePath, {
    version: UPSTREAM_CACHE_VERSION,
    cachedAt: new Date().toISOString(),
    upstream: snapshot(upstream),
    repoFacts,
    analysis,
  } satisfies UpstreamCacheEntry)
}

export async function loadForkCache(
  filePath: string,
  fork: ForkMetadata,
  upstream: RepoMetadata,
): Promise<ForkCacheEntry | null> {
  const entry = await readJsonFile<ForkCacheEntry>(filePath)
  if (!entry || entry.version !== FORK_CACHE_VERSION) {
    return null
  }

  if (!(sameSnapshot(entry.upstream, snapshot(upstream)) && sameSnapshot(entry.fork, snapshot(fork)))) {
    return null
  }

  return {
    ...entry,
    analysis: normalizeForkAnalysis(entry.analysis),
  }
}

export async function saveForkCache(
  filePath: string,
  fork: ForkMetadata,
  upstream: RepoMetadata,
  diffFacts: DiffFacts,
  analysis: ForkAnalysis,
): Promise<void> {
  await writeJson(filePath, {
    version: FORK_CACHE_VERSION,
    cachedAt: new Date().toISOString(),
    upstream: snapshot(upstream),
    fork: snapshot(fork),
    diffFacts,
    analysis: normalizeForkAnalysis(analysis),
  } satisfies ForkCacheEntry)
}
