"use client"

import { useCallback, useEffect, useState } from "react"
import { GitCompareArrows } from "lucide-react"

import { cn } from "@/lib/utils"
import { COMPARE_SELECTION_EVENT, MAX_COMPARE_REPOS, buildCompareHref, getCompareSelection, toggleCompareRepo } from "@/lib/compare"

function syncCompareSelection(
  setRepos: (repos: string[]) => void,
  fullName?: string,
  setSelected?: (selected: boolean) => void,
  reposOverride?: string[],
): void {
  const repos = reposOverride ?? getCompareSelection()
  setRepos(repos)
  if (fullName && setSelected) {
    setSelected(repos.includes(fullName))
  }
}

export function CompareToggle({
  fullName,
  showLabel = false,
}: {
  fullName: string
  showLabel?: boolean
}) {
  const [selected, setSelected] = useState(false)
  const [repos, setRepos] = useState<string[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    syncCompareSelection(setRepos, fullName, setSelected)

    const handleSelectionChange = (event?: Event) => {
      const repos = event instanceof CustomEvent ? event.detail?.repos : undefined
      syncCompareSelection(setRepos, fullName, setSelected, repos)
    }

    window.addEventListener("storage", handleSelectionChange)
    window.addEventListener(COMPARE_SELECTION_EVENT, handleSelectionChange as EventListener)

    return () => {
      window.removeEventListener("storage", handleSelectionChange)
      window.removeEventListener(COMPARE_SELECTION_EVENT, handleSelectionChange as EventListener)
    }
  }, [fullName])

  const atCapacity = repos.length >= MAX_COMPARE_REPOS && !selected

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (atCapacity) {
        return
      }

      const next = toggleCompareRepo(fullName)
      setRepos(next)
      setSelected(next.includes(fullName))
    },
    [atCapacity, fullName],
  )

  if (!mounted) {
    return (
      <button
        type="button"
        disabled
        className="rounded-md p-1.5 text-muted-foreground opacity-50"
        aria-label="Add to compare"
      >
        <GitCompareArrows className="h-3.5 w-3.5" />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-disabled={atCapacity}
      className={cn(
        "flex items-center gap-1.5 rounded-md p-1.5 transition-colors",
        atCapacity && !selected && "cursor-not-allowed opacity-50",
        selected
          ? "bg-primary/10 text-primary hover:bg-primary/20"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      aria-label={selected ? "Remove from compare" : atCapacity ? "Compare limit reached" : "Add to compare"}
    >
      <GitCompareArrows className="h-3.5 w-3.5" />
      {showLabel ? (
        <span className="text-xs">{selected ? "Remove" : atCapacity ? "Limit reached" : "Compare"}</span>
      ) : null}
    </button>
  )
}

export function CompareBar() {
  const [repos, setRepos] = useState<string[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setRepos(getCompareSelection())

    const handleSelectionChange = (event?: Event) => {
      const repos = event instanceof CustomEvent ? event.detail?.repos ?? getCompareSelection() : getCompareSelection()
      setRepos(repos)
    }

    window.addEventListener("storage", handleSelectionChange)
    window.addEventListener(COMPARE_SELECTION_EVENT, handleSelectionChange as EventListener)

    return () => {
      window.removeEventListener("storage", handleSelectionChange)
      window.removeEventListener(COMPARE_SELECTION_EVENT, handleSelectionChange as EventListener)
    }
  }, [])

  if (!mounted || repos.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3">
      <GitCompareArrows className="h-4 w-4 text-primary" />
      <span className="text-sm text-muted-foreground">
        {repos.length} repo{repos.length !== 1 ? "s" : ""} selected
      </span>
      <a
        href={buildCompareHref(repos)}
        className="ml-auto rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Compare now
      </a>
    </div>
  )
}
