export const MAX_COMPARE_REPOS = 3

export type CompareSelection = string[]

function normalizeCompareRepoName(fullName: string): string | null {
  const normalized = fullName.trim()
  return normalized ? normalized : null
}

export function normalizeCompareSelection(repos: CompareSelection): CompareSelection {
  const normalized: string[] = []

  for (const repo of repos) {
    const fullName = normalizeCompareRepoName(repo)
    if (!fullName || normalized.includes(fullName)) {
      continue
    }

    normalized.push(fullName)
    if (normalized.length === MAX_COMPARE_REPOS) {
      break
    }
  }

  return normalized
}

export function parseCompareSelectionValue(value: string | null | undefined): CompareSelection {
  if (!value) {
    return []
  }

  return normalizeCompareSelection(value.split(","))
}

export function addCompareSelectionRepo(repos: CompareSelection, fullName: string): CompareSelection {
  const current = normalizeCompareSelection(repos)
  const nextRepo = normalizeCompareRepoName(fullName)

  if (!nextRepo || current.includes(nextRepo) || current.length >= MAX_COMPARE_REPOS) {
    return current
  }

  return [...current, nextRepo]
}

export function removeCompareSelectionRepo(repos: CompareSelection, fullName: string): CompareSelection {
  const current = normalizeCompareSelection(repos)
  const target = normalizeCompareRepoName(fullName)

  if (!target) {
    return current
  }

  return current.filter((repo) => repo !== target)
}

export function replaceCompareSelectionRepo(
  repos: CompareSelection,
  currentFullName: string | null | undefined,
  nextFullName: string,
): CompareSelection {
  const current = normalizeCompareSelection(repos)
  const nextRepo = normalizeCompareRepoName(nextFullName)
  const target = normalizeCompareRepoName(currentFullName ?? "")

  if (!nextRepo) {
    return current
  }

  if (!target || !current.includes(target)) {
    return addCompareSelectionRepo(current, nextRepo)
  }

  if (target === nextRepo) {
    return current
  }

  return normalizeCompareSelection(current.map((repo) => (repo === target ? nextRepo : repo)))
}
