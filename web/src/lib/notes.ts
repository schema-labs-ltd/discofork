/**
 * Personal notes on repositories and forks, stored in localStorage.
 * Follows the same pattern as tags.ts — keyed by fullName.
 */

const NOTES_STORAGE_KEY = "discofork-notes"

export type NotesMap = Record<string, string>

export function getNotes(): NotesMap {
  if (typeof window === "undefined") {
    return {}
  }

  try {
    const raw = localStorage.getItem(NOTES_STORAGE_KEY)
    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw) as NotesMap
    return typeof parsed === "object" && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

export function getNote(fullName: string): string {
  const notes = getNotes()
  return notes[fullName] ?? ""
}

export function setNote(fullName: string, text: string): void {
  const notes = getNotes()
  if (text.trim()) {
    notes[fullName] = text
  } else {
    delete notes[fullName]
  }
  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes))
}

export function removeNote(fullName: string): void {
  const notes = getNotes()
  delete notes[fullName]
  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes))
}

export function hasNote(fullName: string): boolean {
  const notes = getNotes()
  return Boolean(notes[fullName]?.trim())
}

export function getAllNotesWithRepos(): Array<{ fullName: string; note: string }> {
  const notes = getNotes()
  return Object.entries(notes)
    .filter(([, note]) => note.trim())
    .map(([fullName, note]) => ({ fullName, note }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
}
