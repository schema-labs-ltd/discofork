import { NextResponse } from "next/server"

import { databaseConfigured } from "@/lib/server/database"
import { enqueueRepoJob, queueConfigured } from "@/lib/server/queue"
import { listFailedRepoNames, markReposQueued } from "@/lib/server/reports"

export async function POST() {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 })
  }

  if (!queueConfigured()) {
    return NextResponse.json({ error: "REDIS_URL is not configured." }, { status: 503 })
  }

  const failedRepoNames = await listFailedRepoNames()
  if (failedRepoNames.length === 0) {
    return NextResponse.json({
      failedCount: 0,
      requeuedCount: 0,
    })
  }

  const enqueueResults = await Promise.all(
    failedRepoNames.map(async (fullName) => ({
      fullName,
      queued: await enqueueRepoJob(fullName),
    })),
  )
  const requeuedNames = enqueueResults.filter((result) => result.queued).map((result) => result.fullName)

  await markReposQueued(requeuedNames)

  return NextResponse.json({
    failedCount: failedRepoNames.length,
    requeuedCount: requeuedNames.length,
  })
}
