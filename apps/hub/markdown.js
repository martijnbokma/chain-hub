function appendInlineText(target, text) {
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g
  const pieces = text.split(pattern).filter((piece) => piece.length > 0)

  for (const piece of pieces) {
    if (piece.startsWith("`") && piece.endsWith("`")) {
      const code = document.createElement("code")
      code.textContent = piece.slice(1, -1)
      target.appendChild(code)
      continue
    }
    if (piece.startsWith("**") && piece.endsWith("**")) {
      const strong = document.createElement("strong")
      strong.textContent = piece.slice(2, -2)
      target.appendChild(strong)
      continue
    }
    if (piece.startsWith("*") && piece.endsWith("*")) {
      const em = document.createElement("em")
      em.textContent = piece.slice(1, -1)
      target.appendChild(em)
      continue
    }
    target.appendChild(document.createTextNode(piece))
  }
}

export function renderMarkdown(raw) {
  const lines = raw.replace(/\r\n/g, "\n").split("\n")
  const fragment = document.createDocumentFragment()
  let inCodeBlock = false
  let listElement = null
  let preElement = null
  let codeElement = null

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (!inCodeBlock) {
        preElement = document.createElement("pre")
        codeElement = document.createElement("code")
        preElement.appendChild(codeElement)
        fragment.appendChild(preElement)
      } else {
        preElement = null
        codeElement = null
      }
      inCodeBlock = !inCodeBlock
      continue
    }

    if (inCodeBlock) {
      if (codeElement) {
        codeElement.textContent += `${line}\n`
      }
      continue
    }

    const closeList = () => {
      listElement = null
    }

    if (line.startsWith("### ") || line.startsWith("## ") || line.startsWith("# ")) {
      closeList()
      const level = line.startsWith("### ") ? "h3" : line.startsWith("## ") ? "h2" : "h1"
      const heading = document.createElement(level)
      appendInlineText(heading, line.replace(/^#{1,3}\s+/, ""))
      fragment.appendChild(heading)
      continue
    }

    if (line.startsWith("- ")) {
      if (!listElement) {
        listElement = document.createElement("ul")
        fragment.appendChild(listElement)
      }
      const li = document.createElement("li")
      appendInlineText(li, line.slice(2))
      listElement.appendChild(li)
      continue
    }

    closeList()

    if (line.trim() === "") {
      fragment.appendChild(document.createElement("br"))
      continue
    }

    const paragraph = document.createElement("p")
    appendInlineText(paragraph, line)
    fragment.appendChild(paragraph)
  }

  return fragment
}
