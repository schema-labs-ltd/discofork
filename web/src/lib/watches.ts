import { createArrayStore } from "./local-storage"

export type WatchEntry = {
  fullName: string
  owner: string
  repo: string
  watchedAt: string
  lastVisitedAt: string
}

const WATCHES_STORAGE_KEY = "discofork-watches"

const store = createArrayStore<WatchEntry>({
  storageKey: WATCHES_STORAGE_KEY,
  keyOf: (entry) => entry.fullName,
  createEntry: (owner, repo) => ({
    fullName: `${owner}/${repo}`,
    owner,
    repo,
    watchedAt: new Date().toISOString(),
    lastVisitedAt: new Date().toISOString(),
  }),
})

export const WATCHES_CHANGE_EVENT = "discofork:watch-change"

function emitWatchesChange(watches: WatchEntry[] = getWatches()): void {
  if (typeof window === "undefined") {
    return
  }

  window.dispatchEvent(
    new CustomEvent<{ watches: WatchEntry[] }>(WATCHES_CHANGE_EVENT, {
      detail: { watches },
    }),
  )
}

export const getWatches = store.getAll
export const isWatched = store.has

export function addWatch(owner: string, repo: string): WatchEntry {
  const entry = store.add(owner, repo)
  emitWatchesChange(getWatches())
  return entry
}

export function removeWatch(fullName: string): void {
  store.remove(fullName)
  emitWatchesChange(getWatches())
}

export function toggleWatch(owner: string, repo: string): boolean {
  const next = store.toggle(owner, repo)
  emitWatchesChange(getWatches())
  return next
}

export function touchWatch(fullName: string): void {
  const watches = getWatches()
  const entry = watches.find((e) => e.fullName === fullName)
  if (entry) {
    entry.lastVisitedAt = new Date().toISOString()
    if (typeof window !== "undefined") {
      localStorage.setItem(WATCHES_STORAGE_KEY, JSON.stringify(watches))
      emitWatchesChange(watches)
    }
  }
}

export function hasUpdate(watch: WatchEntry, cachedAt: string): boolean {
  const watchedDate = new Date(watch.lastVisitedAt)
  const cachedDate = new Date(cachedAt)
  return cachedDate > watchedDate
}
