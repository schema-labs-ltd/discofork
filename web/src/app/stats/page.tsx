import type { Metadata } from "next"
import type { ReactNode } from "react"
import { ArrowRight, CircleDollarSign, Database, GitFork, LoaderCircle, Star } from "lucide-react"

import { RepoShell } from "@/components/repo-shell"
import { getOpenAIStats, getRepoDailyStats, getRepoOverviewStats, toRepoStatusSeries, type RepoDailyStatsPoint, type RepoStatusPoint } from "@/lib/server/stats"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Stats · Discofork",
  description: "Operational stats for the Discofork backend.",
}

export const dynamic = "force-dynamic"

function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value)
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: value >= 100 ? 0 : 2,
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value)
}

function formatDateLabel(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function KpiCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string
  value: string
  hint: string
  icon: ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-white px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">{label}</div>
          <div className="text-3xl font-semibold tracking-tight text-slate-950">{value}</div>
        </div>
        {icon}
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{hint}</p>
    </div>
  )
}

function MultiBarChart({
  title,
  subtitle,
  series,
}: {
  title: string
  subtitle: string
  series: RepoDailyStatsPoint[]
}) {
  const maxValue = Math.max(1, ...series.flatMap((point) => [point.added, point.cached]))

  return (
    <section className="rounded-xl border border-border bg-white p-6">
      <div className="space-y-2">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">Repo activity</div>
        <h2 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
        <p className="text-sm leading-6 text-slate-600">{subtitle}</p>
      </div>

      <div className="mt-6 flex items-center gap-5 text-xs text-slate-500">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
          Added
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
          Cached
        </span>
      </div>

      <div className="mt-6 grid grid-cols-10 gap-3 md:grid-cols-15 xl:grid-cols-30">
        {series.map((point) => (
          <div key={point.date} className="space-y-3">
            <div className="flex h-44 items-end justify-center gap-1 rounded-lg bg-slate-50 px-1 py-3">
              <div
                className="w-3 rounded-full bg-slate-900"
                style={{ height: `${Math.max(6, (point.added / maxValue) * 100)}%` }}
                title={`${formatDateLabel(point.date)}: ${point.added} added`}
              />
              <div
                className="w-3 rounded-full bg-primary"
                style={{ height: `${Math.max(6, (point.cached / maxValue) * 100)}%` }}
                title={`${formatDateLabel(point.date)}: ${point.cached} cached`}
              />
            </div>
            <div className="text-center text-[11px] text-slate-500">{formatDateLabel(point.date)}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function HorizontalBars({
  title,
  subtitle,
  points,
}: {
  title: string
  subtitle: string
  points: RepoStatusPoint[]
}) {
  const maxValue = Math.max(1, ...points.map((point) => point.value))

  return (
    <section className="rounded-xl border border-border bg-white p-6">
      <div className="space-y-2">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">Current mix</div>
        <h2 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
        <p className="text-sm leading-6 text-slate-600">{subtitle}</p>
      </div>

      <div className="mt-6 space-y-4">
        {points.map((point) => (
          <div key={point.label} className="space-y-2">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-medium text-slate-900">{point.label}</span>
              <span className="text-slate-600">{point.value.toLocaleString()}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn(
                  "h-full rounded-full",
                  point.label === "Cached"
                    ? "bg-emerald-500"
                    : point.label === "Failed"
                      ? "bg-amber-500"
                      : point.label === "Processing"
                        ? "bg-blue-500"
                        : "bg-slate-800",
                )}
                style={{ width: `${(point.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default async function StatsPage() {
  const [repoOverview, repoDailyStats, openAIStatsResult] = await Promise.all([
    getRepoOverviewStats(),
    getRepoDailyStats(30),
    getOpenAIStats(30),
  ])
  const statusSeries = toRepoStatusSeries(repoOverview)

  return (
    <RepoShell
      eyebrow="Operations stats"
      title="Discofork backend health and throughput in one place."
      description="This dashboard helps operators decide whether the queue is healthy and how quickly new repos are landing and being cached."
      compact
    >
      <section className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Repos Added"
            value={repoOverview.total.toLocaleString()}
            hint="All repository records currently stored by the backend."
            icon={<Database className="h-5 w-5 text-slate-400" />}
          />
          <KpiCard
            label="In Queue"
            value={repoOverview.pending.toLocaleString()}
            hint={`${repoOverview.queued.toLocaleString()} queued and ${repoOverview.processing.toLocaleString()} processing right now.`}
            icon={<LoaderCircle className="h-5 w-5 text-slate-400" />}
          />
          <KpiCard
            label="Cached"
            value={repoOverview.cached.toLocaleString()}
            hint="Repository briefs ready to open without waiting for the worker."
            icon={<Star className="h-5 w-5 text-slate-400" />}
          />
          <KpiCard
            label="Failed"
            value={repoOverview.failed.toLocaleString()}
            hint="Current failed records that may need a retry or investigation."
            icon={<ArrowRight className="h-5 w-5 rotate-45 text-slate-400" />}
          />
        </div>

        {openAIStatsResult.available ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Input Tokens"
              value={formatCompact(openAIStatsResult.data.totalInputTokens)}
              hint="Total input tokens across the selected 30-day range."
              icon={<ArrowRight className="h-5 w-5 text-slate-400" />}
            />
            <KpiCard
              label="Output Tokens"
              value={formatCompact(openAIStatsResult.data.totalOutputTokens)}
              hint="Total output tokens across the selected 30-day range."
              icon={<ArrowRight className="h-5 w-5 rotate-180 text-slate-400" />}
            />
            <KpiCard
              label="Requests"
              value={formatCompact(openAIStatsResult.data.totalRequests)}
              hint="Model requests reported by the completions usage endpoint."
              icon={<GitFork className="h-5 w-5 text-slate-400" />}
            />
            <KpiCard
              label="Cost"
              value={formatCurrency(openAIStatsResult.data.totalCost, openAIStatsResult.data.currency)}
              hint="Cost aggregated from the organization costs endpoint for the same range."
              icon={<CircleDollarSign className="h-5 w-5 text-slate-400" />}
            />
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
          <MultiBarChart
            title="Daily repo intake versus cached completions"
            subtitle="A 30-day view of how many repos entered Discofork each day and how many ended the day cached and ready."
            series={repoDailyStats}
          />
          <HorizontalBars
            title="Current repository status mix"
            subtitle="A quick scan of whether the backend is mostly healthy, actively processing, or building up failed work."
            points={statusSeries}
          />
        </div>
      </section>
    </RepoShell>
  )
}
