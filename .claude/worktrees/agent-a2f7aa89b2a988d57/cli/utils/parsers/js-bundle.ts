export interface PromptStyle {
  id: string
  name: string | null
  content: string | null
}

export function unescapeJsSingleQuoted(raw: string): string {
  let out = ""
  let i = 0
  while (i < raw.length) {
    const c = raw[i]
    if (c === "\\" && i + 1 < raw.length) {
      const n = raw[i + 1]
      const escapes: Record<string, string> = { "n": "\n", "r": "\r", "t": "\t", "'": "'", "\"": '"', "\\": "\\" }
      if (escapes[n]) {
        out += escapes[n]
        i += 2
        continue
      }
      out += n
      i += 2
      continue
    }
    out += c
    i++
  }
  return out
}

export function extractContentValue(window: string): string | null {
  let i = window.indexOf("content:")
  if (i === -1) return null
  i += "content:".length
  while (i < window.length && [" ", "\n", "\t"].includes(window[i])) i++
  if (i >= window.length) return null

  const q = window[i]
  if (q === "`") {
    i++
    let out = ""
    while (i < window.length) {
      const c = window[i]
      if (c === "\\" && i + 1 < window.length) {
        out += window.substring(i, i + 2)
        i += 2
        continue
      }
      if (c === "`") {
        return out.replace(/\\`/g, "`").replace(/\\\\/g, "\\")
      }
      out += c
      i++
    }
    return null
  }
  if (q === "'") {
    i++
    let raw = ""
    while (i < window.length) {
      const c = window[i]
      if (c === "\\" && i + 1 < window.length) {
        raw += c + window[i + 1]
        i += 2
        continue
      }
      if (c === "'") {
        return unescapeJsSingleQuoted(raw)
      }
      raw += c
      i++
    }
    return null
  }
  return null
}

export function extractNameNearId(window: string): string | null {
  const match = window.substring(0, 8000).match(/name:"([^"\\]*(?:\\.[^"\\]*)*)"/)
  if (!match) return null
  try {
    return match[1].replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
  } catch {
    return match[1]
  }
}

export function parseBundle(js: string): PromptStyle[] {
  const ids = Array.from(new Set(Array.from(js.matchAll(/id:"([a-z0-9-]+)"/g)).map(m => m[1]))).sort()
  const styles: PromptStyle[] = []

  for (const slug of ids) {
    const needle = `id:"${slug}"`
    const idx = js.indexOf(needle)
    if (idx === -1) continue
    const windowStr = js.substring(idx, idx + 120000)
    styles.push({
      id: slug,
      name: extractNameNearId(windowStr),
      content: extractContentValue(windowStr)
    })
  }
  return styles
}
