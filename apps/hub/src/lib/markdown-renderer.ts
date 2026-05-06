/**
 * Client-side Markdown → DOM for the hub skill preview (no external deps).
 * Ported from public/markdown.js to TypeScript for use in React.
 */

function safeHref(href: string) {
  const t = href.trim()
  if (/^https?:\/\//i.test(t) || t.startsWith("/") || t.startsWith("./") || t.startsWith("../") || t.startsWith("#")) {
    return t
  }
  return null
}

function safeSrc(src: string) {
  return safeHref(src)
}

function appendInline(parent: HTMLElement, text: string) {
  if (!text) return

  const pattern =
    /(`[^`]+`|\*\*[^*]+\*\*|~~[^~]+~~|!?\[[^\]]*]\([^)]+\)|\*[^*]+\*|[^`*~\[!]+|[`*~\[!])/g
  const pieces = text.match(pattern) ?? [text]

  for (const piece of pieces) {
    if (piece.startsWith("```")) {
      parent.appendChild(document.createTextNode(piece))
      continue
    }
    if (piece.startsWith("`") && piece.endsWith("`") && piece.length > 2) {
      const code = document.createElement("code")
      code.textContent = piece.slice(1, -1)
      parent.appendChild(code)
      continue
    }
    if (piece.startsWith("**") && piece.endsWith("**") && piece.length > 4) {
      const strong = document.createElement("strong")
      appendInline(strong, piece.slice(2, -2))
      parent.appendChild(strong)
      continue
    }
    if (piece.startsWith("~~") && piece.endsWith("~~") && piece.length > 4) {
      const del = document.createElement("del")
      appendInline(del, piece.slice(2, -2))
      parent.appendChild(del)
      continue
    }
    const imageMatch = piece.match(/^!\[([^\]]*)]\(([^)]+)\)$/)
    if (imageMatch) {
      const src = safeSrc(imageMatch[2])
      if (src) {
        const img = document.createElement("img")
        img.src = src
        img.alt = imageMatch[1]
        img.loading = "lazy"
        parent.appendChild(img)
      } else {
        parent.appendChild(document.createTextNode(piece))
      }
      continue
    }
    const linkMatch = piece.match(/^\[([^\]]*)]\(([^)]+)\)$/)
    if (linkMatch) {
      const href = safeHref(linkMatch[2])
      if (href) {
        const a = document.createElement("a")
        a.href = href
        a.rel = "noopener noreferrer"
        a.target = "_blank"
        appendInline(a, linkMatch[1])
        parent.appendChild(a)
      } else {
        parent.appendChild(document.createTextNode(piece))
      }
      continue
    }
    if (piece.startsWith("*") && piece.endsWith("*") && piece.length > 2 && !piece.startsWith("**")) {
      const em = document.createElement("em")
      appendInline(em, piece.slice(1, -1))
      parent.appendChild(em)
      continue
    }
    parent.appendChild(document.createTextNode(piece))
  }
}

function flushParagraph(fragment: DocumentFragment | HTMLElement, paragraphBuffer: string[]) {
  if (paragraphBuffer.length === 0) return
  const text = paragraphBuffer.join(" ").trim()
  paragraphBuffer.length = 0
  if (!text) return
  const p = document.createElement("p")
  appendInline(p, text)
  fragment.appendChild(p)
}

function isTableRow(line: string) {
  return line.includes("|") && line.trim().length > 0
}

function isTableSeparator(line: string) {
  const cells = splitTableCells(line)
  if (cells.length < 1) return false
  return cells.every((c) => {
    const t = c.trim().replace(/\s/g, "")
    if (!/-{3,}/.test(t)) return false
    return /^:?-{3,}:?$/.test(t) || /^:-{3,}-:$/.test(t)
  })
}

function splitTableCells(line: string) {
  let s = line.trim()
  if (s.startsWith("|")) s = s.slice(1).trimStart()
  if (s.endsWith("|")) s = s.slice(0, -1).trimEnd()
  if (!s) return []
  return s.split("|").map((c) => c.trim())
}

function tryConsumeTable(lines: string[], start: number, fragment: DocumentFragment | HTMLElement) {
  if (start + 1 >= lines.length) return start
  const headerLine = lines[start]
  const sepLine = lines[start + 1]
  if (!isTableRow(headerLine) || !isTableSeparator(sepLine)) return start

  const headerCells = splitTableCells(headerLine)
  if (headerCells.length === 0) return start

  const table = document.createElement("table")
  const thead = document.createElement("thead")
  const trHead = document.createElement("tr")
  for (const cell of headerCells) {
    const th = document.createElement("th")
    appendInline(th, cell)
    trHead.appendChild(th)
  }
  thead.appendChild(trHead)
  table.appendChild(thead)

  const tbody = document.createElement("tbody")
  let i = start + 2
  while (i < lines.length) {
    const rowLine = lines[i]
    if (rowLine.trim() === "") break
    if (!isTableRow(rowLine)) break
    if (isTableSeparator(rowLine)) {
      i++
      continue
    }
    const cells = splitTableCells(rowLine)
    const tr = document.createElement("tr")
    for (let c = 0; c < headerCells.length; c++) {
      const td = document.createElement("td")
      appendInline(td, cells[c] ?? "")
      tr.appendChild(td)
    }
    tbody.appendChild(tr)
    i++
  }
  table.appendChild(tbody)
  fragment.appendChild(table)
  return i
}

function tryConsumeBlockquote(lines: string[], start: number, fragment: DocumentFragment | HTMLElement) {
  const parts: string[] = []
  let i = start
  while (i < lines.length) {
    const line = lines[i]
    if (line.trim() === "") break
    const m = line.match(/^>\s?(.*)$/)
    if (!m) break
    parts.push(m[1])
    i++
  }
  if (parts.length === 0) return start

  const bq = document.createElement("blockquote")
  const inner = parts.join("\n")
  const sub = renderMarkdownBlockInner(inner)
  while (sub.firstChild) {
    bq.appendChild(sub.firstChild)
  }
  fragment.appendChild(bq)
  return i
}

function renderMarkdownBlockInner(raw: string) {
  const lines = raw.replace(/\r\n/g, "\n").split("\n")
  const fragment = document.createDocumentFragment()
  parseBlockLines(lines, fragment)
  return fragment
}

function parseBlockLines(lines: string[], fragment: DocumentFragment | HTMLElement) {
  let i = 0
  let inCode = false
  let codeBuffer: string[] = []
  let codeLang = ""
  let paragraphBuffer: string[] = []
  let listEl: HTMLElement | null = null
  let listOrdered = false

  const closeList = () => {
    listEl = null
    listOrdered = false
  }

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith("```")) {
      flushParagraph(fragment, paragraphBuffer)
      closeList()
      if (!inCode) {
        inCode = true
        codeLang = line.slice(3).trim()
        codeBuffer = []
      } else {
        const pre = document.createElement("pre")
        const code = document.createElement("code")
        if (codeLang) code.className = `language-${codeLang}`
        code.textContent = codeBuffer.join("\n")
        pre.appendChild(code)
        fragment.appendChild(pre)
        inCode = false
        codeLang = ""
        codeBuffer = []
      }
      i++
      continue
    }

    if (inCode) {
      codeBuffer.push(line)
      i++
      continue
    }

    const trimmed = line.trim()

    if (trimmed === "") {
      flushParagraph(fragment, paragraphBuffer)
      closeList()
      i++
      continue
    }

    const hrMatch = trimmed.match(/^([-*_])(\1\1+)\s*$/)
    if (hrMatch && hrMatch[2].length >= 2) {
      flushParagraph(fragment, paragraphBuffer)
      closeList()
      fragment.appendChild(document.createElement("hr"))
      i++
      continue
    }

    const hMatch = line.match(/^(#{1,6})\s+(.*)$/)
    if (hMatch) {
      flushParagraph(fragment, paragraphBuffer)
      closeList()
      const level = Math.min(hMatch[1].length, 6)
      const h = document.createElement(`h${level}`)
      appendInline(h, hMatch[2].trim())
      fragment.appendChild(h)
      i++
      continue
    }

    const tableNext = tryConsumeTable(lines, i, fragment)
    if (tableNext > i) {
      flushParagraph(fragment, paragraphBuffer)
      closeList()
      i = tableNext
      continue
    }

    const bqNext = tryConsumeBlockquote(lines, i, fragment)
    if (bqNext > i) {
      flushParagraph(fragment, paragraphBuffer)
      closeList()
      i = bqNext
      continue
    }

    const ulMatch = line.match(/^[-*]\s+(.*)$/)
    if (ulMatch) {
      flushParagraph(fragment, paragraphBuffer)
      if (!listEl || listOrdered) {
        closeList()
        listEl = document.createElement("ul")
        fragment.appendChild(listEl)
        listOrdered = false
      }
      const li = document.createElement("li")
      appendInline(li, ulMatch[1])
      listEl.appendChild(li)
      i++
      continue
    }

    const olMatch = line.match(/^(\d+)\.\s+(.*)$/)
    if (olMatch) {
      flushParagraph(fragment, paragraphBuffer)
      if (!listEl || !listOrdered) {
        closeList()
        listEl = document.createElement("ol")
        fragment.appendChild(listEl)
        listOrdered = true
      }
      const li = document.createElement("li")
      appendInline(li, olMatch[2])
      listEl.appendChild(li)
      i++
      continue
    }

    closeList()
    paragraphBuffer.push(trimmed)
    i++
  }

  flushParagraph(fragment, paragraphBuffer)
}

function stripLeadingYamlFrontmatter(text: string) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/)
  if (!m) return text
  return text.slice(m[0].length)
}

export function renderMarkdown(raw: string) {
  const body = stripLeadingYamlFrontmatter(raw.replace(/^\uFEFF/, ""))
  const fragment = document.createDocumentFragment()
  const lines = body.replace(/\r\n/g, "\n").split("\n")
  parseBlockLines(lines, fragment)
  return fragment
}
