CREATE INDEX IF NOT EXISTS repo_reports_created_at_idx
  ON repo_reports(created_at DESC);

CREATE INDEX IF NOT EXISTS repo_reports_cached_at_idx
  ON repo_reports(cached_at DESC)
  WHERE cached_at IS NOT NULL;
