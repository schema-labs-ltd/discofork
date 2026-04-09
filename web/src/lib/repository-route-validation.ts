const suspiciousOwnerNames = [".well-known"] as const
// Keep pair-specific denies tightly scoped to production-style path probes so legitimate dotted repo names
// such as github/.github and vercel/next.js are not treated as invalid lookups.
const suspiciousRoutePairs = ["admin/.env", "wp-admin/admin-ajax.php"] as const

const suspiciousOwnerNameSet = new Set<string>(suspiciousOwnerNames)
const suspiciousRoutePairSet = new Set<string>(suspiciousRoutePairs)

function quoteSqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

function joinSqlLiterals(values: readonly string[]): string {
  return values.map((value) => quoteSqlLiteral(value)).join(", ")
}

export const SUSPICIOUS_REPOSITORY_ROUTE_SQL_PREDICATE = [
  "owner like '.%'",
  "position('%' in owner) > 0",
  "position('%' in repo) > 0",
  "position('/' in owner) > 0",
  "position('/' in repo) > 0",
  "position(chr(92) in owner) > 0",
  "position(chr(92) in repo) > 0",
  "position('..' in owner) > 0",
  "position('..' in repo) > 0",
  `lower(owner) in (${joinSqlLiterals(suspiciousOwnerNames)})`,
  `lower(owner || '/' || repo) in (${joinSqlLiterals(suspiciousRoutePairs)})`,
].join(" or ")

export function describeSuspiciousRepositoryRoute(owner: string, repo: string): string | null {
  const normalizedOwner = owner.toLowerCase()
  const normalizedRepo = repo.toLowerCase()
  const normalizedFullName = `${normalizedOwner}/${normalizedRepo}`

  if (owner.startsWith(".")) {
    return "Owner segment starts with a hidden-path prefix."
  }

  if (owner.includes("%") || repo.includes("%")) {
    return "Owner or repository name still contains URL-encoded path characters."
  }

  if (owner.includes("/") || repo.includes("/") || owner.includes("\\") || repo.includes("\\")) {
    return "Owner or repository name contains path separators."
  }

  if (owner.includes("..") || repo.includes("..")) {
    return "Owner or repository name contains path traversal markers."
  }

  if (suspiciousOwnerNameSet.has(normalizedOwner)) {
    return "Owner segment matches a known web probe path."
  }

  if (suspiciousRoutePairSet.has(normalizedFullName)) {
    return "Owner and repository pair matches a known web probe route."
  }

  return null
}

export function isSuspiciousRepositoryRoute(owner: string, repo: string): boolean {
  return describeSuspiciousRepositoryRoute(owner, repo) !== null
}
