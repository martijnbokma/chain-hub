import { el } from "./dom.js"
import { btnWarn, btnDetailHeader, msgClassForKind, pageHeader, pageTitle } from "./ui-classes.js"

function statusMark(status) {
  if (status === "ok") return { icon: "✓", className: "text-hub-user" }
  if (status === "warning") return { icon: "⚠", className: "text-hub-warn" }
  return { icon: "✗", className: "text-hub-err" }
}

const initBanner =
  "mb-[0.9rem] shrink-0 border border-[color-mix(in_oklab,var(--color-hub-warn)_50%,transparent)] bg-[color-mix(in_oklab,var(--color-hub-warn)_12%,transparent)] px-[0.8rem] py-[0.65rem] text-[0.79rem] text-[#ffe3b3]"

const statusSummary =
  "mb-[0.8rem] flex items-center justify-between gap-[0.8rem] border border-[color-mix(in_oklab,var(--color-hub-warn)_45%,var(--color-hub-border))] bg-[color-mix(in_oklab,var(--color-hub-warn)_12%,transparent)] px-[0.7rem] py-[0.6rem] text-[#f8dcb0]"

const adapterCard =
  "mb-[0.6rem] border border-hub-border bg-[color-mix(in_oklab,var(--color-hub-surface-1)_85%,transparent)]"

const adapterHeader =
  "flex items-center gap-[0.55rem] border-b border-hub-border px-[0.65rem] py-[0.55rem]"

const adapterName = "flex-1"

const adapterUrl = "text-[0.72rem] text-hub-text-faint"

const linkRow =
  "flex gap-2 border-t border-[color-mix(in_oklab,var(--color-hub-border)_74%,transparent)] px-[0.65rem] py-[0.45rem] pl-[1.3rem] text-[0.75rem]"

export function createStatusView({ root, setChainHomeBar, apiRequest }) {
  let statusData = null
  let feedback = ""
  let feedbackClass = "ok"
  let setupInProgress = false

  async function pullStatus() {
    statusData = await apiRequest("/api/status")
    setChainHomeBar(statusData.chainHome, statusData.source)
  }

  async function loadStatus() {
    feedback = ""
    feedbackClass = "ok"
    try {
      await pullStatus()
      render()
    } catch (error) {
      feedback = error.message
      feedbackClass = "err"
      render()
    }
  }

  async function runSetup(ide) {
    setupInProgress = true
    feedback = ""
    feedbackClass = "ok"
    render()
    try {
      await apiRequest("/api/setup", {
        method: "POST",
        body: ide ? { ide } : {},
      })
      await pullStatus()
      const adapters = Array.isArray(statusData?.adapters) ? statusData.adapters : []
      const issues = buildSummary(adapters)
      feedback = ide
        ? `Setup completed for ${ide}.`
        : "Setup completed for all detected editors."
      if (issues > 0) {
        feedback +=
          " Some links still show issues because files or folders are missing under CHAIN_HOME (for example rules/global.md). Run chain init from a terminal, or add those paths."
        feedbackClass = "warn"
      } else {
        feedbackClass = "ok"
      }
    } catch (error) {
      feedback = error.message
      feedbackClass = "err"
    } finally {
      setupInProgress = false
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
    const card = el("div", adapterCard)
    const header = el("div", adapterHeader)
    const name = el("strong", adapterName, adapter.name)
    const url = el("span", adapterUrl, adapter.infoUrl ?? "")
    header.append(name)
    if (adapter.infoUrl) header.append(url)

    if (!adapter.detected) {
      const status = el("span", "text-hub-warn", "not detected")
      header.append(status)
      card.append(header)
      return card
    }

    const issues = (adapter.links ?? []).filter((link) => link.status !== "ok").length
    const state =
      issues === 0
        ? el("span", "text-hub-user", "healthy")
        : el("span", issues > 0 ? "text-hub-err" : "text-hub-warn", `${issues} issue(s)`)
    header.append(state)
    card.append(header)

    for (const link of adapter.links ?? []) {
      const row = el("div", linkRow)
      const mark = statusMark(link.status)
      row.appendChild(el("span", mark.className, mark.icon))
      row.appendChild(el("span", "", link.description))
      if (link.resolvedPath) {
        row.appendChild(el("span", adapterUrl, `→ ${link.resolvedPath}`))
      }
      if (link.status !== "ok") {
        const button = el("button", `${btnWarn} ${btnDetailHeader}`, setupInProgress ? "…" : "Fix")
        button.type = "button"
        button.disabled = setupInProgress
        button.addEventListener("click", () => void runSetup(adapter.name))
        row.appendChild(button)
      }
      card.appendChild(row)
    }

    return card
  }

  function render() {
    root.className = "min-w-0"
    const container = document.createDocumentFragment()
    const header = el("div", pageHeader)
    header.appendChild(el("h1", pageTitle, "Status"))
    container.appendChild(header)

    if (!statusData) {
      if (feedback) container.appendChild(el("div", msgClassForKind(feedbackClass), feedback))
      root.replaceChildren(container)
      return
    }

    if (statusData.initialized === false) {
      container.appendChild(
        el("div", initBanner, "Hub not initialized yet. Use Fix actions below to initialize in-place."),
      )
    }

    const adapters = Array.isArray(statusData.adapters) ? statusData.adapters : []
    const issues = buildSummary(adapters)
    if (issues > 0) {
      const summary = el("div", statusSummary)
      summary.appendChild(el("span", "", `${issues} issue(s) detected`))
      const fixAll = el("button", `${btnWarn} ${btnDetailHeader}`, setupInProgress ? "Running setup…" : "Fix all")
      fixAll.type = "button"
      fixAll.disabled = setupInProgress
      fixAll.addEventListener("click", () => void runSetup(undefined))
      summary.appendChild(fixAll)
      container.appendChild(summary)
    }

    if (feedback) {
      const kind = feedbackClass === "warn" ? "warn" : feedbackClass
      container.appendChild(el("div", msgClassForKind(kind), feedback))
    }

    for (const adapter of adapters) {
      container.appendChild(renderAdapter(adapter))
    }
    root.replaceChildren(container)
  }

  return {
    async mount() {
      await loadStatus()
    },
  }
}
