import path from "node:path"

import { toErrorMessage } from "./core/errors.ts"
import { loadDiscovery, runAnalysis } from "./services/analysis.ts"
import { parseGitHubRepoInput } from "./services/github.ts"
import { clearRepoJob, dequeueRepoJob } from "./server/queue.ts"
import { markRepoFailed, markRepoProcessing, markRepoReady } from "./server/reports.ts"

const workerOptions = {
  includeArchived: false,
  forkScanLimit: Number(process.env.DISCOFORK_FORK_SCAN_LIMIT ?? "25"),
  recommendedForkLimit: Number(process.env.DISCOFORK_RECOMMENDED_FORK_LIMIT ?? "6"),
  compareConcurrency: Number(process.env.DISCOFORK_COMPARE_CONCURRENCY ?? "3"),
}

async function processRepo(fullName: string): Promise<void> {
  const repo = parseGitHubRepoInput(fullName)
  await markRepoProcessing(repo.fullName)

  const discovery = await loadDiscovery(
    repo,
    {
      includeArchived: workerOptions.includeArchived,
      forkScanLimit: workerOptions.forkScanLimit,
      recommendedForkLimit: workerOptions.recommendedForkLimit,
    },
    process.cwd(),
    `worker-discovery-${Date.now()}`,
  )

  const selectedForks =
    discovery.forks.filter((fork) => fork.defaultSelected).length > 0
      ? discovery.forks.filter((fork) => fork.defaultSelected)
      : discovery.forks.slice(0, Math.min(workerOptions.recommendedForkLimit, discovery.forks.length))

  const result = await runAnalysis(
    repo,
    selectedForks,
    {
      includeArchived: workerOptions.includeArchived,
      forkScanLimit: workerOptions.forkScanLimit,
      recommendedForkLimit: workerOptions.recommendedForkLimit,
      compareConcurrency: workerOptions.compareConcurrency,
      selectedForks: selectedForks.map((fork) => fork.fullName),
      maxCommitSamples: 12,
      maxChangedFiles: 12,
      workspaceRoot: path.join(process.cwd(), ".discofork"),
      runId: `worker-${Date.now()}`,
    },
    process.cwd(),
    (event) => {
      if (event.type === "phase") {
        console.log(`[${repo.fullName}] ${event.phase}: ${event.detail}`)
      } else if (event.type === "fork") {
        console.log(`[${repo.fullName}] fork ${event.fork}: ${event.detail}`)
      } else {
        console.log(`[${repo.fullName}] ${event.message}`)
      }
    },
  )

  await markRepoReady(result.report)
}

async function main(): Promise<void> {
  console.log("Discofork worker started")

  while (true) {
    const fullName = await dequeueRepoJob(0)
    if (!fullName) {
      continue
    }

    console.log(`Dequeued ${fullName}`)

    try {
      await processRepo(fullName)
      console.log(`Completed ${fullName}`)
    } catch (error) {
      const message = toErrorMessage(error)
      console.error(`Failed ${fullName}: ${message}`)
      await markRepoFailed(fullName, message)
    } finally {
      await clearRepoJob(fullName)
    }
  }
}

await main()
