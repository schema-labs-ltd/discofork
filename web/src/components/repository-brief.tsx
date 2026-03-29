"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowUpRight, Clock3, Database, GitFork, Radar, Star } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import type { CachedRepoView, QueuedRepoView } from "@/lib/repository-service"
import { cn } from "@/lib/utils"

function SectionList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="space-y-3">
      <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{title}</div>
      <ul className="list-disc space-y-1 pl-5 text-sm leading-7 text-slate-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  )
}

export function QueuedRepositoryBrief({ view }: { view: QueuedRepoView }) {
  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_360px]">
      <div className="rounded-md border border-border bg-white p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="warning">Queued lookup</Badge>
          <Badge variant="muted">queued {view.queuedAt}</Badge>
        </div>

        <div className="mt-6 space-y-4">
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">No cached brief yet</h2>
          <p className="max-w-3xl text-[15px] leading-7 text-slate-700">{view.queueHint}</p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-md border border-border bg-slate-50 p-4">
            <Radar className="h-5 w-5 text-primary" />
            <div className="mt-3 text-sm font-medium text-slate-900">Lookup requested</div>
          </div>
          <div className="rounded-md border border-border bg-slate-50 p-4">
            <Database className="h-5 w-5 text-primary" />
            <div className="mt-3 text-sm font-medium text-slate-900">Database miss</div>
          </div>
          <div className="rounded-md border border-border bg-slate-50 p-4">
            <Clock3 className="h-5 w-5 text-primary" />
            <div className="mt-3 text-sm font-medium text-slate-900">Awaiting backend run</div>
          </div>
        </div>
      </div>

      <aside className="rounded-md border border-border bg-white p-6">
        <div className="space-y-3">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Repository source</div>
          <a
            href={view.githubUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "outline" }), "w-full justify-between rounded-md px-5 py-6")}
          >
            Open on GitHub
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>

        <div className="mt-8 space-y-3">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">What happens next</div>
          <ul className="space-y-3 text-sm leading-7 text-muted-foreground">
            <li>The backend will eventually enqueue this repo in Redis.</li>
            <li>Discofork will run the local analysis pipeline and save the result in Postgres.</li>
            <li>This route will switch from queued state to a cached repo brief once that data exists.</li>
          </ul>
        </div>
      </aside>
    </section>
  )
}

export function CachedRepositoryBrief({ view }: { view: CachedRepoView }) {
  const [selectedForkName, setSelectedForkName] = useState(view.forks[0]?.fullName ?? "")
  const selectedFork = view.forks.find((fork) => fork.fullName === selectedForkName) ?? view.forks[0]

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <div className="rounded-md border border-border bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="success">Cached analysis</Badge>
                <Badge variant="muted">cached {view.cachedAt}</Badge>
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">{view.fullName}</h2>
                <p className="mt-3 max-w-[110ch] text-[14px] leading-7 text-slate-700">{view.upstreamSummary}</p>
              </div>
            </div>

            <a
              href={view.githubUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline" }), "gap-2 rounded-md px-4")}
            >
              GitHub
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-4">
            <MetaItem label="Stars" value={view.stats.stars.toLocaleString()} />
            <MetaItem label="Forks" value={view.stats.forks.toLocaleString()} />
            <MetaItem label="Default branch" value={view.stats.defaultBranch} />
            <MetaItem label="Last pushed" value={view.stats.lastPushedAt} />
          </div>

          <div className="mt-6 grid gap-x-8 gap-y-3 border-t border-border pt-4 md:grid-cols-2">
            <MetaItem label="Best maintained" value={view.recommendations.bestMaintained} />
            <MetaItem label="Closest to upstream" value={view.recommendations.closestToUpstream} />
            <MetaItem label="Most feature-rich" value={view.recommendations.mostFeatureRich} />
            <MetaItem label="Most opinionated" value={view.recommendations.mostOpinionated} />
          </div>
        </div>

        <div className="rounded-md border border-border bg-white p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Forks</div>
              <h3 className="mt-2 text-base font-semibold tracking-tight text-slate-950">Choose a fork to inspect</h3>
            </div>
            <div className="text-xs text-muted-foreground">{view.forks.length} cached fork briefs</div>
          </div>

          <div className="mt-5 overflow-hidden rounded-md border border-border">
            {view.forks.map((fork) => {
              const active = fork.fullName === selectedFork?.fullName

              return (
                <button
                  key={fork.fullName}
                  type="button"
                  onClick={() => setSelectedForkName(fork.fullName)}
                  className={cn(
                    "w-full border-b px-4 py-3 text-left transition-colors last:border-b-0",
                    active
                      ? "border-l-2 border-l-primary border-r-0 border-t-0 border-b border-border bg-blue-50/60"
                      : "border-l-2 border-l-transparent border-r-0 border-t-0 border-b border-border bg-white hover:bg-slate-50",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-950">{fork.fullName}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant={fork.maintenance === "active" ? "success" : "muted"}>{fork.maintenance}</Badge>
                        <Badge variant="muted">{fork.changeMagnitude}</Badge>
                      </div>
                    </div>
                    {active ? <span className="text-xs font-medium text-primary">Selected</span> : null}
                  </div>
                  <p className="mt-2 max-w-[100ch] text-sm leading-6 text-slate-600">{fork.summary}</p>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <aside className="rounded-md border border-border bg-white p-6">
        {selectedFork ? (
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Fork comparison</div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold tracking-tight text-slate-950">{selectedFork.fullName}</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={selectedFork.maintenance === "active" ? "success" : "muted"}>{selectedFork.maintenance}</Badge>
                  <Badge variant="muted">{selectedFork.changeMagnitude}</Badge>
                </div>
                <p className="text-[15px] leading-7 text-slate-700">{selectedFork.summary}</p>
              </div>
            </div>

            <section className="space-y-4 rounded-md border border-border bg-slate-50 p-5">
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Likely purpose</div>
              <p className="text-sm leading-7 text-slate-700">{selectedFork.likelyPurpose}</p>
              <div className="pt-1">
                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Best for</div>
                <p className="mt-2 text-sm leading-7 text-slate-700">{selectedFork.bestFor}</p>
              </div>
            </section>

            <SectionList title="Additional features" items={selectedFork.additionalFeatures} />
            <SectionList title="Missing features" items={selectedFork.missingFeatures} />
            <SectionList title="Strengths" items={selectedFork.strengths} />
            <SectionList title="Risks" items={selectedFork.risks} />
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No fork details available.</div>
        )}
      </aside>
    </section>
  )
}
