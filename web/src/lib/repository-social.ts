import type { CachedForkView, CachedRepoView, QueuedRepoView, RepoView } from "./repository-service"

export type RepoSocialSummary = {
  title: string
  description: string
  imageTitle: string
  imageSubtitle: string
  statsLine: string
  forkHighlights: string[]
}

function clip(text: string, maxLength: number): string {
  const normalized = text.replace(/\s+/g, " ").trim()
  if (normalized.length <= maxLength) {
    return normalized
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

function compactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value)
}

function findFork(view: CachedRepoView, fullName: string): CachedForkView | undefined {
  return view.forks.find((fork) => fork.fullName === fullName)
}

function cachedForkHighlights(view: CachedRepoView): string[] {
  const recommendedForks = [
    view.recommendations.bestMaintained,
    view.recommendations.mostFeatureRich,
    view.recommendations.closestToUpstream,
  ]
    .map((name) => findFork(view, name))
    .filter((fork): fork is CachedForkView => Boolean(fork))

  const featureHighlights = recommendedForks.flatMap((fork) =>
    fork.additionalFeatures.slice(0, 2).map((feature) => `${fork.fullName}: ${clip(feature, 90)}`),
  )

  if (featureHighlights.length > 0) {
    return Array.from(new Set(featureHighlights)).slice(0, 3)
  }

  return view.forks.slice(0, 3).map((fork) => `${fork.fullName}: ${clip(fork.summary, 90)}`)
}

function cachedDescription(view: CachedRepoView): string {
  const recommendationBits = [
    view.recommendations.bestMaintained !== "None" ? `Best maintained: ${view.recommendations.bestMaintained}` : null,
    view.recommendations.mostFeatureRich !== "None" ? `Most feature-rich: ${view.recommendations.mostFeatureRich}` : null,
  ].filter(Boolean)

  const base = clip(view.upstreamSummary, 150)
  const suffix = recommendationBits.join(" • ")
  return clip([base, suffix].filter(Boolean).join(" • "), 260)
}

function queuedDescription(view: QueuedRepoView): string {
  if (view.status === "processing") {
    return clip(`Discofork is currently processing ${view.fullName}. ${view.progress?.detail ?? "The analysis pipeline is running now."}`, 260)
  }

  if (view.status === "failed") {
    return clip(`The latest Discofork run for ${view.fullName} failed. ${view.errorMessage ?? "Retry the analysis to refresh the upstream and fork brief."}`, 260)
  }

  return clip(
    `Discofork has queued ${view.fullName} for analysis${typeof view.queuePosition === "number" ? ` at queue position #${view.queuePosition}` : ""}. Open the link to watch queue position and live worker progress.`,
    260,
  )
}

export function buildRepoSocialSummary(view: RepoView): RepoSocialSummary {
  if (view.kind === "cached") {
    return {
      title: `${view.fullName} · Discofork`,
      description: cachedDescription(view),
      imageTitle: view.fullName,
      imageSubtitle: clip(view.upstreamSummary, 180),
      statsLine: `${compactNumber(view.stats.stars)} stars • ${compactNumber(view.stats.forks)} forks • ${view.forks.length} cached fork briefs`,
      forkHighlights: cachedForkHighlights(view),
    }
  }

  return {
    title: `${view.fullName} · Discofork`,
    description: queuedDescription(view),
    imageTitle: view.fullName,
    imageSubtitle:
      view.status === "processing"
        ? clip(view.progress?.detail ?? "Discofork is actively processing this repository.", 180)
        : view.status === "failed"
          ? clip(view.errorMessage ?? "The latest Discofork run failed and needs a retry.", 180)
          : clip(view.queueHint, 180),
    statsLine:
      view.status === "queued" && typeof view.queuePosition === "number"
        ? `Queued for analysis • position #${view.queuePosition}`
        : view.status === "processing"
          ? "Analysis in progress"
          : "Analysis needs a retry",
    forkHighlights:
      view.status === "processing"
        ? ["Live worker progress is available on the Discofork page.", "This preview updates when the cached brief is ready."]
        : ["Discofork will surface the strongest forks after the backend run completes.", "Open the page to watch queue position and live progress."],
  }
}

export function getSiteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "https://discofork.ai"
}
