import path from "node:path"

import type { ExportPaths, FinalReport } from "../core/types.ts"
import { bulletList, formatRelativeDays } from "../core/format.ts"
import { ensureDir, writeJson, writeText } from "../core/fs.ts"

export function renderMarkdownReport(report: FinalReport): string {
  const lines: string[] = []
  lines.push(`# Discofork Report: ${report.repository.fullName}`)
  lines.push("")
  lines.push(`Generated: ${report.generatedAt}`)
  lines.push(`Repository: ${report.repository.url}`)
  lines.push("")
  lines.push("## Upstream")
  lines.push(report.upstream.analysis.summary)
  lines.push("")
  lines.push("### Capabilities")
  lines.push(bulletList(report.upstream.analysis.capabilities))
  lines.push("")
  lines.push("### Target Users")
  lines.push(bulletList(report.upstream.analysis.targetUsers))
  lines.push("")
  lines.push("### Recommendation Snapshot")
  lines.push(`- Best maintained: ${report.recommendations.bestMaintained ?? "None"}`)
  lines.push(`- Closest to upstream: ${report.recommendations.closestToUpstream ?? "None"}`)
  lines.push(`- Most feature-rich: ${report.recommendations.mostFeatureRich ?? "None"}`)
  lines.push(`- Most opinionated: ${report.recommendations.mostOpinionated ?? "None"}`)
  if (report.discovery.selectionWarning) {
    lines.push(`- Note: ${report.discovery.selectionWarning}`)
  }
  lines.push("")
  lines.push("## Forks")
  lines.push("")

  if (report.forks.length === 0) {
    lines.push("No fork analyses were completed for this run.")
    lines.push("")
  }

  for (const fork of report.forks) {
    lines.push(`### ${fork.metadata.fullName}`)
    lines.push("")
    lines.push(`- Updated: ${formatRelativeDays(fork.metadata.pushedDaysAgo)}`)
    lines.push(`- Stars: ${fork.metadata.stargazerCount}`)
    lines.push(`- Maintenance: ${fork.analysis.maintenance}`)
    lines.push(`- Change magnitude: ${fork.analysis.changeMagnitude}`)
    lines.push(`- Likely purpose: ${fork.analysis.likelyPurpose}`)
    lines.push(`- Decision summary: ${fork.analysis.decisionSummary}`)
    lines.push(`- Categories: ${(fork.analysis.changeCategories ?? []).join(", ") || "none"}`)
    lines.push("")
    lines.push("Additional features:")
    lines.push(bulletList((fork.analysis.additionalFeatures ?? []).length > 0 ? fork.analysis.additionalFeatures : ["None called out."]))
    lines.push("")
    lines.push("Missing features:")
    lines.push(bulletList((fork.analysis.missingFeatures ?? []).length > 0 ? fork.analysis.missingFeatures : ["None called out."]))
    lines.push("")
    lines.push("Strengths:")
    lines.push(bulletList(fork.analysis.strengths ?? ["None called out."]))
    lines.push("")
    lines.push("Risks:")
    lines.push(bulletList(fork.analysis.risks ?? ["None called out."]))
    lines.push("")
    lines.push("Best for:")
    lines.push(bulletList(fork.analysis.idealUsers ?? ["No specific audience called out."]))
    lines.push("")
  }

  return lines.join("\n")
}

export async function exportReport(report: FinalReport, paths: ExportPaths): Promise<void> {
  await Promise.all([ensureDir(path.dirname(paths.jsonPath)), ensureDir(path.dirname(paths.markdownPath))])
  await Promise.all([
    writeJson(paths.jsonPath, report),
    writeText(paths.markdownPath, renderMarkdownReport(report)),
  ])
}
