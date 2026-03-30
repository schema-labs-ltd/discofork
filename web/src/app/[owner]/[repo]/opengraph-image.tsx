import { ImageResponse } from "next/og"

import { resolveRepositoryView } from "@/lib/repository-service"
import { buildRepoSocialSummary } from "@/lib/repository-social"

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = "image/png"

type RepoOgImageProps = {
  params: Promise<{
    owner: string
    repo: string
  }>
}

export default async function RepoOpenGraphImage({ params }: RepoOgImageProps) {
  const { owner, repo } = await params
  const view = await resolveRepositoryView(owner, repo)
  const social = buildRepoSocialSummary(view)

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 45%, #dbeafe 100%)",
          color: "#0f172a",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            padding: "42px 48px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 32 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 760 }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 20,
                  letterSpacing: "0.34em",
                  textTransform: "uppercase",
                  color: "#2563eb",
                }}
              >
                Discofork
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", fontSize: 56, fontWeight: 700, lineHeight: 1.05 }}>{social.imageTitle}</div>
                <div style={{ display: "flex", fontSize: 28, lineHeight: 1.35, color: "#334155" }}>{social.imageSubtitle}</div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                minWidth: 280,
                borderRadius: 28,
                background: "rgba(255,255,255,0.78)",
                border: "1px solid rgba(148,163,184,0.35)",
                padding: "22px 24px",
                boxShadow: "0 20px 45px rgba(15,23,42,0.08)",
              }}
            >
              <div style={{ display: "flex", fontSize: 18, textTransform: "uppercase", letterSpacing: "0.22em", color: "#64748b" }}>
                {view.kind === "cached" ? "Cached brief" : "Queue status"}
              </div>
              <div style={{ display: "flex", fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}>{social.statsLine}</div>
              <div style={{ display: "flex", fontSize: 20, lineHeight: 1.45, color: "#475569" }}>
                {view.kind === "cached"
                  ? `Best maintained: ${view.recommendations.bestMaintained}`
                  : view.status === "queued"
                    ? "Live queue position available on the page."
                    : view.status === "processing"
                      ? "Worker progress is updating live."
                      : "Retry needed to refresh the brief."}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              padding: "24px 28px",
              borderRadius: 30,
              background: "rgba(15,23,42,0.92)",
              color: "#e2e8f0",
            }}
          >
            <div style={{ display: "flex", fontSize: 18, textTransform: "uppercase", letterSpacing: "0.2em", color: "#93c5fd" }}>
              Fork highlights
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {social.forkHighlights.slice(0, 3).map((highlight) => (
                <div key={highlight} style={{ display: "flex", fontSize: 24, lineHeight: 1.35 }}>
                  • {highlight}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  )
}
