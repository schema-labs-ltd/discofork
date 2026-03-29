import { headers } from "next/headers"

import type { RepoView } from "./repository-service"

export async function fetchRepositoryView(owner: string, repo: string): Promise<RepoView> {
  const headerStore = await headers()
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host")
  const proto = headerStore.get("x-forwarded-proto") ?? "http"

  if (!host) {
    throw new Error("Could not determine request host for repository lookup.")
  }

  const response = await fetch(`${proto}://${host}/api/repo/${owner}/${repo}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Repository lookup failed with status ${response.status}.`)
  }

  return (await response.json()) as RepoView
}
