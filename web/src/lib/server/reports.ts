import { query } from "./database"

export type StoredReportRecord = {
  full_name: string
  owner: string
  repo: string
  github_url: string
  status: "queued" | "processing" | "ready" | "failed"
  report_json: Record<string, unknown> | null
  error_message: string | null
  last_requested_at: string
  queued_at: string | null
  processing_started_at: string | null
  cached_at: string | null
  created_at: string
  updated_at: string
}

export async function getRepoRecord(fullName: string): Promise<StoredReportRecord | null> {
  const rows = await query<StoredReportRecord>(
    `select
      full_name,
      owner,
      repo,
      github_url,
      status,
      report_json,
      error_message,
      last_requested_at,
      queued_at,
      processing_started_at,
      cached_at,
      created_at,
      updated_at
    from repo_reports
    where full_name = $1`,
    [fullName],
  )

  return rows[0] ?? null
}

export async function touchQueuedRepo(owner: string, repo: string): Promise<void> {
  const fullName = `${owner}/${repo}`
  const githubUrl = `https://github.com/${fullName}`

  await query(
    `insert into repo_reports (
      full_name, owner, repo, github_url, status, last_requested_at, queued_at, updated_at
    ) values ($1, $2, $3, $4, 'queued', now(), now(), now())
    on conflict (full_name) do update
    set
      owner = excluded.owner,
      repo = excluded.repo,
      github_url = excluded.github_url,
      status = case
        when repo_reports.status = 'ready' and repo_reports.report_json is not null then repo_reports.status
        else 'queued'
      end,
      error_message = case
        when repo_reports.status = 'ready' and repo_reports.report_json is not null then repo_reports.error_message
        else null
      end,
      last_requested_at = now(),
      queued_at = case
        when repo_reports.status = 'ready' and repo_reports.report_json is not null then repo_reports.queued_at
        else now()
      end,
      updated_at = now()`,
    [fullName, owner, repo, githubUrl],
  )
}
