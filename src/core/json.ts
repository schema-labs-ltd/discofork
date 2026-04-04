export type JsonSanitizationResult<T> = {
  value: T
  sanitizedPaths: string[]
}

function sanitizeString(input: string): { value: string; changed: boolean } {
  let changed = false
  let result = ""

  for (let index = 0; index < input.length; index += 1) {
    const codePoint = input.charCodeAt(index)

    if (codePoint >= 0xd800 && codePoint <= 0xdbff) {
      const nextCodePoint = input.charCodeAt(index + 1)
      if (nextCodePoint >= 0xdc00 && nextCodePoint <= 0xdfff) {
        result += input[index]! + input[index + 1]!
        index += 1
        continue
      }

      changed = true
      result += "�"
      continue
    }

    if (codePoint >= 0xdc00 && codePoint <= 0xdfff) {
      changed = true
      result += "�"
      continue
    }

    result += input[index]!
  }

  return {
    value: result,
    changed,
  }
}

function sanitizeValue<T>(value: T, path: string, sanitizedPaths: string[]): T {
  if (typeof value === "string") {
    const sanitized = sanitizeString(value)
    if (sanitized.changed) {
      sanitizedPaths.push(path)
    }
    return sanitized.value as T
  }

  if (Array.isArray(value)) {
    return value.map((entry, index) => sanitizeValue(entry, `${path}[${index}]`, sanitizedPaths)) as T
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      sanitizeValue(entry, `${path}.${key}`, sanitizedPaths),
    ])
    return Object.fromEntries(entries) as T
  }

  return value
}

export function sanitizeJsonValue<T>(value: T): JsonSanitizationResult<T> {
  const sanitizedPaths: string[] = []
  return {
    value: sanitizeValue(value, "$", sanitizedPaths),
    sanitizedPaths,
  }
}

export function serializeJsonSafely<T>(value: T): { json: string; sanitizedPaths: string[]; sanitizedValue: T } {
  const sanitized = sanitizeJsonValue(value)
  return {
    json: JSON.stringify(sanitized.value),
    sanitizedPaths: sanitized.sanitizedPaths,
    sanitizedValue: sanitized.value,
  }
}
