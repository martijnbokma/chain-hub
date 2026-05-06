import { el } from "./dom.js"
import { btn, btnWarn, btnDetailHeader, msgClassForKind, pageHeader, pageTitle } from "./ui-classes.js"
import {
  buildSetupMetrics,
  completeRun,
  createMaintenanceRun,
  failRun,
  markStep,
  pushRunEvent,
  renderMaintenancePanel,
  waitForStep,
} from "./maintenance-ui.js"
import { showToast } from "./toast.js"

function statusMark(status) {
  if (status === "ok") return { icon: "✓", className: "text-hub-user" }
  if (status === "warning") return { icon: "⚠", className: "text-hub-warn" }
  return { icon: "✗", className: "text-hub-err" }
}

function formatInfoUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

const initBanner =
  "mb-[0.9rem] shrink-0 border border-[color-mix(in_oklab,var(--color-hub-warn)_50%,transparent)] bg-[color-mix(in_oklab,var(--color-hub-warn)_12%,transparent)] px-[0.8rem] py-[0.65rem] text-[0.79rem] text-[#ffe3b3]"

const statusSummary =
  "mb-[0.8rem] flex items-center justify-between gap-[0.8rem] border border-[color-mix(in_oklab,var(--color-hub-warn)_45%,var(--color-hub-border))] bg-[color-mix(in_oklab,var(--color-hub-warn)_12%,transparent)] px-[0.7rem] py-[0.6rem] text-[#f8dcb0]"

const adapterCard =
  "mb-[0.6rem] border border-hub-border bg-[color-mix(in_oklab,var(--color-hub-surface-1)_85%,transparent)]"

const adapterHeader =
  "flex items-center gap-[0.55rem] border-b border-hub-border px-[0.65rem] py-[0.55rem]"

const adapterName = "flex flex-1 items-center gap-1.5"

const adapterUrl = "text-[0.72rem] text-hub-text-faint"
const adapterUrlLink =
  "text-[0.72rem] text-hub-text-faint underline underline-offset-2 transition-colors hover:text-hub-user focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-user"
const adapterInfoUrlFallbacks = {
  "Claude Code": "https://www.anthropic.com/claude-code",
  Cursor: "https://cursor.com/",
  Windsurf: "https://windsurf.com/",
  "Gemini CLI": "https://geminicli.com/",
  Kiro: "https://kiro.dev/",
  Trae: "https://www.trae.ai/",
  "Mistral Vibe": "https://mistral.ai/products/vibe",
  Antigravity: "https://antigravity.google/",
}

const linkRow =
  "flex gap-2 border-t border-[color-mix(in_oklab,var(--color-hub-border)_74%,transparent)] px-[0.65rem] py-[0.45rem] pl-[1.3rem] text-[0.75rem]"

export function createStatusView({ root, setChainHomeBar, apiRequest }) {
  let statusData = null
  let feedback = ""
  let feedbackClass = "ok"
  let setupInProgress = false
  let maintenanceRun = null

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
    maintenanceRun = createMaintenanceRun(ide ? `Target: ${ide}` : "Target: all detected adapters")
    pushRunEvent(maintenanceRun, ide ? `Maintenance started for ${ide}.` : "Maintenance started for all detected adapters.")
    showToast(ide ? `Running maintenance for ${ide}...` : "Running maintenance...", "warn", {
      id: "status-maintenance-progress",
      durationMs: 2000,
    })
    render()
    try {
      markStep(maintenanceRun, "request", { status: "running" })
      pushRunEvent(maintenanceRun, "Connecting to setup API...")
      render()
      const setupResult = await apiRequest("/api/setup", {
        method: "POST",
        body: ide ? { ide } : {},
      })
      await waitForStep(450)
      markStep(maintenanceRun, "request", { status: "ok", note: "Connected to local hub API." })
      pushRunEvent(maintenanceRun, "Setup API accepted the request.", "ok")
      markStep(maintenanceRun, "apply", { status: "running", note: "Applying setup actions..." })
      pushRunEvent(maintenanceRun, "Applying link repairs and core sync...")
      render()
      await waitForStep(520)
      markStep(maintenanceRun, "apply", {
        status: "ok",
        note: "Setup completed on backend. Gathering updated status...",
      })
      markStep(maintenanceRun, "refresh", { status: "running" })
      pushRunEvent(maintenanceRun, "Refreshing status checks...")
      render()
      await waitForStep(320)
      await pullStatus()
      await waitForStep(360)
      markStep(maintenanceRun, "refresh", { status: "ok", note: "Status refreshed with latest link checks." })
      const metrics = buildSetupMetrics(setupResult)
      markStep(maintenanceRun, "apply", {
        status: "ok",
        note:
          metrics.failedLinks > 0
            ? `Setup completed with ${metrics.failedLinks} link error(s).`
            : `Setup completed for ${metrics.adapterCount} adapter(s), ${metrics.totalLinks} link(s).`,
      })
      pushRunEvent(
        maintenanceRun,
        metrics.failedLinks > 0
          ? `Completed with ${metrics.failedLinks} link error(s).`
          : `Completed: ${metrics.adapterCount} adapters, ${metrics.totalLinks} links.`,
        metrics.failedLinks > 0 ? "warn" : "ok",
      )
      const adapters = Array.isArray(statusData?.adapters) ? statusData.adapters : []
      const issues = buildSummary(adapters)
      feedback = ide
        ? `Setup completed for ${ide}.`
        : "Setup completed for all detected editors."
      if (issues > 0) {
        feedback +=
          " Some links still show issues because files or folders are missing under CHAIN_HOME (for example rules/global.md). Run chain init from a terminal, or add those paths."
        feedbackClass = "warn"
        showToast(feedback, "warn", { id: "status-maintenance-result" })
      } else {
        feedbackClass = "ok"
        showToast(feedback, "ok", { id: "status-maintenance-result" })
      }
      completeRun(maintenanceRun, feedback, metrics, setupResult)
    } catch (error) {
      feedback = error.message
      feedbackClass = "err"
      markStep(maintenanceRun, "apply", { status: "err", note: "Maintenance stopped before completion." })
      markStep(maintenanceRun, "refresh", { status: "pending", note: "Skipped because setup did not complete." })
      pushRunEvent(maintenanceRun, `Maintenance failed: ${error.message}`, "err")
      failRun(maintenanceRun, error.message)
      showToast(error.message, "err", { id: "status-maintenance-result" })
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
    const nameWrap = el("div", adapterName)
    const name = el("strong", "", adapter.name)
    nameWrap.append(name)
    const infoUrl = adapter.infoUrl ?? adapterInfoUrlFallbacks[adapter.name] ?? ""
    if (infoUrl) {
      nameWrap.append(el("span", adapterUrl, "·"))
      const url = el("a", adapterUrlLink, formatInfoUrl(infoUrl))
      url.href = infoUrl
      url.target = "_blank"
      url.rel = "noopener noreferrer"
      nameWrap.append(url)
    }
    header.append(nameWrap)

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
      card.appendChild(row)
    }

    if (issues > 0) {
      const actionRow = el(
        "div",
        "flex gap-2 border-t border-[color-mix(in_oklab,var(--color-hub-border)_74%,transparent)] px-[0.65rem] py-[0.55rem]",
      )
      const repairButton = el(
        "button",
        `${btnWarn} ${btnDetailHeader}`,
        setupInProgress ? "Running..." : `Repair ${adapter.name} links`,
      )
      repairButton.type = "button"
      repairButton.disabled = setupInProgress
      repairButton.addEventListener("click", () => void runSetup(adapter.name))
      actionRow.appendChild(repairButton)
      card.appendChild(actionRow)
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
        el("div", initBanner, "Hub not initialized yet. Use maintenance actions below to initialize in-place."),
      )
    }
    const maintenancePanel = renderMaintenancePanel(maintenanceRun)
    if (maintenancePanel) {
      container.appendChild(maintenancePanel)
    }

    const adapters = Array.isArray(statusData.adapters) ? statusData.adapters : []
    const issues = buildSummary(adapters)
    if (issues > 0) {
      const summary = el("div", statusSummary)
      summary.appendChild(el("span", "", `${issues} issue(s) detected`))
      const repairAll = el(
        "button",
        `${btnWarn} ${btnDetailHeader}`,
        setupInProgress ? "Running maintenance..." : "Repair all links",
      )
      repairAll.type = "button"
      repairAll.disabled = setupInProgress
      repairAll.addEventListener("click", () => void runSetup(undefined))
      summary.appendChild(repairAll)
      container.appendChild(summary)
    } else {
      const summary = el(
        "div",
        "mb-[0.8rem] flex items-center justify-between gap-[0.8rem] border border-[color-mix(in_oklab,var(--color-hub-user)_45%,var(--color-hub-border))] bg-[color-mix(in_oklab,var(--color-hub-user)_10%,transparent)] px-[0.7rem] py-[0.6rem] text-hub-user",
      )
      summary.appendChild(el("span", "", "All detected adapter links are healthy"))
      const maintenance = el(
        "button",
        `${btn} ${btnDetailHeader}`,
        setupInProgress ? "Running maintenance..." : "Run maintenance",
      )
      maintenance.type = "button"
      maintenance.disabled = setupInProgress
      maintenance.addEventListener("click", () => void runSetup(undefined))
      summary.appendChild(maintenance)
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
