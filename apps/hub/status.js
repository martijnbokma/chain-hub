function el(tag, className, text) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (typeof text === "string") node.textContent = text
  return node
}

function statusMark(status) {
  if (status === "ok") return { icon: "✓", className: "ok" }
  if (status === "warning") return { icon: "⚠", className: "warn-text" }
  return { icon: "✗", className: "err" }
}

export function createStatusView({ root, setChainHomeBar, apiRequest }) {
  let statusData = null
  let feedback = ""
  let feedbackClass = "ok"

  async function loadStatus() {
    feedback = ""
    try {
      statusData = await apiRequest("/api/status")
      setChainHomeBar(statusData.chainHome, statusData.source)
      render()
    } catch (error) {
      feedback = error.message
      feedbackClass = "err"
      render()
    }
  }

  async function runSetup(ide) {
    feedback = ""
    try {
      await apiRequest("/api/setup", {
        method: "POST",
        body: ide ? { ide } : {},
      })
      feedback = ide ? `Setup completed for ${ide}.` : "Setup completed."
      feedbackClass = "ok"
      await loadStatus()
    } catch (error) {
      feedback = error.message
      feedbackClass = "err"
      render()
    }
  }

  function buildSummary(adapterList) {
    let issueCount = 0
    for (const adapter of adapterList) {
      for (const link of adapter.links ?? []) {
        if (link.status !== "ok") issueCount += 1
      }
    }
    return issueCount
  }

  function renderAdapter(adapter) {
    const card = el("div", "adapter-card")
    const header = el("div", "adapter-header")
    const name = el("strong", "adapter-name", adapter.name)
    const url = el("span", "adapter-url", adapter.infoUrl ?? "")
    header.append(name)
    if (adapter.infoUrl) header.append(url)

    if (!adapter.detected) {
      const status = el("span", "warn-text", "not detected")
      header.append(status)
      card.append(header)
      return card
    }

    const issues = (adapter.links ?? []).filter((link) => link.status !== "ok").length
    const state =
      issues === 0
        ? el("span", "ok", "healthy")
        : el("span", issues > 0 ? "err" : "warn-text", `${issues} issue(s)`)
    header.append(state)
    card.append(header)

    for (const link of adapter.links ?? []) {
      const row = el("div", "link-row")
      const mark = statusMark(link.status)
      row.appendChild(el("span", mark.className, mark.icon))
      row.appendChild(el("span", "", link.description))
      if (link.resolvedPath) {
        row.appendChild(el("span", "adapter-url", `→ ${link.resolvedPath}`))
      }
      if (link.status !== "ok") {
        const button = el("button", "btn warn", "Fix")
        button.type = "button"
        button.addEventListener("click", () => void runSetup(adapter.name))
        row.appendChild(button)
      }
      card.appendChild(row)
    }

    return card
  }

  function render() {
    const container = document.createDocumentFragment()
    const header = el("div", "page-header")
    header.appendChild(el("h1", "page-title", "Status"))
    container.appendChild(header)

    if (!statusData) {
      if (feedback) container.appendChild(el("div", `msg ${feedbackClass}`, feedback))
      root.replaceChildren(container)
      return
    }

    const adapters = Array.isArray(statusData.adapters) ? statusData.adapters : []
    const issues = buildSummary(adapters)
    if (issues > 0) {
      const summary = el("div", "status-summary")
      summary.appendChild(el("span", "", `${issues} issue(s) detected`))
      const fixAll = el("button", "btn warn", "Fix all")
      fixAll.type = "button"
      fixAll.addEventListener("click", () => void runSetup(undefined))
      summary.appendChild(fixAll)
      container.appendChild(summary)
    }

    for (const adapter of adapters) {
      container.appendChild(renderAdapter(adapter))
    }

    if (feedback) {
      container.appendChild(el("div", `msg ${feedbackClass}`, feedback))
    }
    root.replaceChildren(container)
  }

  return {
    async mount() {
      await loadStatus()
    },
  }
}
