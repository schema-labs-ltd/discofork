export const REPO_LIST_PAGE_SIZE = 25

export type RepoListItem = {
  fullName: string
  owner: string
  repo: string
  githubUrl: string
  status: "queued" | "processing" | "ready" | "failed"
  queuedAt: string | null
  processingStartedAt: string | null
  cachedAt: string | null
  updatedAt: string
  stars: number | null
  forks: number | null
  defaultBranch: string | null
  lastPushedAt: string | null
  upstreamSummary: string | null
  forkBriefCount: number
}

export type RepoListView = {
  items: RepoListItem[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasPrevious: boolean
  hasNext: boolean
  databaseEnabled: boolean
}
