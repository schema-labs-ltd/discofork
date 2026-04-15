import { describe, expect, test } from "bun:test"

import {
  MAX_COMPARE_REPOS,
  addCompareSelectionRepo,
  normalizeCompareSelection,
  parseCompareSelectionValue,
  removeCompareSelectionRepo,
  replaceCompareSelectionRepo,
} from "../web/src/lib/compare-selection"

describe("compare selection helpers", () => {
  test("normalizeCompareSelection trims, deduplicates, and caps the selection", () => {
    expect(
      normalizeCompareSelection([
        " vultuk/discofork ",
        "openai/codex",
        "vultuk/discofork",
        "schema-labs-ltd/discofork",
        "extra/repo",
      ]),
    ).toEqual(["vultuk/discofork", "openai/codex", "schema-labs-ltd/discofork"])
    expect(normalizeCompareSelection(["", "   "])).toEqual([])
    expect(normalizeCompareSelection(["one/two", "three/four", "five/six"]).length).toBe(MAX_COMPARE_REPOS)
  })

  test("parseCompareSelectionValue preserves shareable compare URL ordering", () => {
    expect(parseCompareSelectionValue("vultuk/discofork,openai/codex,schema-labs-ltd/discofork")).toEqual([
      "vultuk/discofork",
      "openai/codex",
      "schema-labs-ltd/discofork",
    ])
    expect(parseCompareSelectionValue("vultuk/discofork,,openai/codex")).toEqual([
      "vultuk/discofork",
      "openai/codex",
    ])
    expect(parseCompareSelectionValue(null)).toEqual([])
  })

  test("addCompareSelectionRepo appends only when room is available", () => {
    const initial = ["vultuk/discofork"]
    expect(addCompareSelectionRepo(initial, "openai/codex")).toEqual(["vultuk/discofork", "openai/codex"])
    expect(addCompareSelectionRepo(initial, "vultuk/discofork")).toEqual(initial)
    expect(addCompareSelectionRepo(["a/b", "c/d", "e/f"], "g/h")).toEqual(["a/b", "c/d", "e/f"])
  })

  test("removeCompareSelectionRepo keeps the remaining compare order", () => {
    expect(removeCompareSelectionRepo(["a/b", "c/d", "e/f"], "c/d")).toEqual(["a/b", "e/f"])
    expect(removeCompareSelectionRepo(["a/b", "c/d"], "missing/repo")).toEqual(["a/b", "c/d"])
  })

  test("replaceCompareSelectionRepo swaps in place and respects the compare cap", () => {
    expect(replaceCompareSelectionRepo(["a/b", "c/d", "e/f"], "c/d", "g/h")).toEqual(["a/b", "g/h", "e/f"])
    expect(replaceCompareSelectionRepo(["a/b", "c/d", "e/f"], "c/d", "a/b")).toEqual(["a/b", "e/f"])
    expect(replaceCompareSelectionRepo(["a/b", "c/d"], null, "e/f")).toEqual(["a/b", "c/d", "e/f"])
    expect(replaceCompareSelectionRepo(["a/b", "c/d", "e/f"], null, "g/h")).toEqual(["a/b", "c/d", "e/f"])
  })
})
