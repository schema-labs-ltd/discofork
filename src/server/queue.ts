import { createClient, type RedisClientType } from "redis"

import { REPO_QUEUE_DEDUPE_PREFIX, REPO_QUEUE_DEDUPE_TTL_SECONDS, REPO_QUEUE_KEY } from "./constants.ts"

let client: RedisClientType | null = null

function requireRedisUrl(): string {
  const url = process.env.REDIS_URL
  if (!url) {
    throw new Error("REDIS_URL is required.")
  }

  return url
}

export async function getRedisClient(): Promise<RedisClientType> {
  if (!client) {
    client = createClient({
      url: requireRedisUrl(),
    })
    client.on("error", (error) => {
      console.error("Redis error:", error)
    })
  }

  if (!client.isOpen) {
    await client.connect()
  }

  return client
}

export function queueDedupeKey(fullName: string): string {
  return `${REPO_QUEUE_DEDUPE_PREFIX}${fullName}`
}

export async function enqueueRepoJob(fullName: string): Promise<boolean> {
  const redis = await getRedisClient()
  const key = queueDedupeKey(fullName)
  const wasQueued = await redis.set(key, "1", {
    NX: true,
    EX: REPO_QUEUE_DEDUPE_TTL_SECONDS,
  })

  if (!wasQueued) {
    return false
  }

  await redis.lPush(REPO_QUEUE_KEY, fullName)
  return true
}

export async function dequeueRepoJob(timeoutSeconds: number): Promise<string | null> {
  const redis = await getRedisClient()
  const job = await redis.brPop(REPO_QUEUE_KEY, timeoutSeconds)
  return job?.element ?? null
}

export async function clearRepoJob(fullName: string): Promise<void> {
  const redis = await getRedisClient()
  await redis.del(queueDedupeKey(fullName))
}
