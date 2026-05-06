import { el } from "./dom.js"

function createDefaultSteps() {
  return [
    { id: "request", label: "Maintenance request started", status: "running", note: "Connecting to local hub API..." },
    { id: "apply", label: "Applying setup actions", status: "pending", note: "Refreshing protected assets and relinking adapters..." },
    { id: "refresh", label: "Refreshing visible status", status: "pending", note: "Updating the dashboard with latest health checks..." },
  ]
}

export function createMaintenanceRun(targetLabel) {
  return {
    status: "running",
    targetLabel,
    startedAt: Date.now(),
    endedAt: null,
    summary: "",
    steps: createDefaultSteps(),
    metrics: null,
    adapterResults: [],
    error: "",
    events: [],
  }
}

function getStep(run, id) {
  return run.steps.find((step) => step.id === id) ?? null
}

export function markStep(run, id, patch) {
  const step = getStep(run, id)
  if (!step) return
  Object.assign(step, patch)
}

export function pushRunEvent(run, message, kind = "info") {
  if (!run) return
  run.events.push({
    kind,
    message,
    at: Date.now(),
  })
}

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

export async function waitForStep(ms) {
  if (prefersReducedMotion()) return
  await new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export function completeRun(run, summary, metrics, setupResult = null) {
  run.status = "ok"
  run.summary = summary
  run.metrics = metrics
  run.adapterResults = Array.isArray(setupResult?.results) ? setupResult.results : []
  run.endedAt = Date.now()
}

export function failRun(run, message) {
  run.status = "err"
  run.error = message
  run.endedAt = Date.now()
}

export function buildSetupMetrics(result) {
  const adapterResults = Array.isArray(result?.results) ? result.results : []
  const adapterCount = adapterResults.length
  let totalLinks = 0
  let failedLinks = 0
  const failedAdapters = []

  for (const adapter of adapterResults) {
    const links = Array.isArray(adapter?.links) ? adapter.links : []
    totalLinks += links.length
    const failedForAdapter = links.filter((link) => link?.result === "failed").length
    failedLinks += failedForAdapter
    if (failedForAdapter > 0) {
      failedAdapters.push(`${adapter?.adapterName ?? "unknown"} (${failedForAdapter})`)
    }
  }

  return {
    adapterCount,
    totalLinks,
    failedLinks,
    failedAdapters,
    coreAssetsUpdated: result?.maintenance?.coreAssetsUpdated === true,
    userRegistryEnsured: result?.maintenance?.userRegistryEnsured === true,
    redundantGeminiSymlinkRemoved: result?.maintenance?.redundantGeminiSymlinkRemoved === true,
  }
}

function stepIcon(status) {
  if (status === "ok") return "✓"
  if (status === "err") return "✕"
  if (status === "running") return "●"
  return "○"
}

function stepClass(status) {
  if (status === "ok") return "text-hub-user"
  if (status === "err") return "text-hub-err"
  if (status === "running") return "maintenance-step-dot--running text-hub-accent"
  return "text-hub-text-faint"
}

function runElapsedLabel(run) {
  const end = typeof run.endedAt === "number" ? run.endedAt : Date.now()
  const elapsedMs = Math.max(end - run.startedAt, 0)
  if (elapsedMs < 1000) return "<1s"
  return `${Math.round(elapsedMs / 1000)}s`
}

function eventTimeLabel(run, at) {
  const diffMs = Math.max(at - run.startedAt, 0)
  if (diffMs < 1000) return "+0s"
  return `+${Math.round(diffMs / 1000)}s`
}

function actionTone(result) {
  if (result === "failed") return "text-hub-err"
  if (result === "created" || result === "updated" || result === "relinked") return "text-hub-user"
  return "text-hub-text-dim"
}

function actionBadgeClass(result) {
  if (result === "failed") {
    return "border-[color-mix(in_oklab,var(--color-hub-err)_58%,var(--color-hub-border))] bg-[color-mix(in_oklab,var(--color-hub-err)_12%,transparent)] text-hub-err"
  }
  if (result === "created" || result === "updated" || result === "relinked") {
    return "border-[color-mix(in_oklab,var(--color-hub-user)_52%,var(--color-hub-border))] bg-[color-mix(in_oklab,var(--color-hub-user)_11%,transparent)] text-hub-user"
  }
  return "border-hub-border bg-[rgba(20,24,38,0.68)] text-hub-text-dim"
}

export function renderMaintenancePanel(run) {
  if (!run) return null

  const shell = el(
    "section",
    "maintenance-panel mb-[0.85rem] border border-[color-mix(in_oklab,var(--color-hub-accent)_40%,var(--color-hub-border))] bg-[rgba(14,20,38,0.84)] p-[0.72rem]",
  )
  const header = el("div", "flex items-start justify-between gap-2")
  const title = el(
    "h2",
    "m-0 text-[0.81rem] font-semibold uppercase tracking-wide text-[#e6eaff]",
    run.status === "running" ? "Maintenance in progress" : "Maintenance report",
  )
  const sub = el(
    "div",
    "mt-[0.22rem] text-[0.72rem] text-hub-text-dim",
    `${run.targetLabel} • ${runElapsedLabel(run)}`,
  )
  const left = el("div", "min-w-0")
  left.append(title, sub)
  const badgeClass =
    run.status === "ok"
      ? "text-hub-user"
      : run.status === "err"
        ? "text-hub-err"
        : "maintenance-badge--running text-hub-accent"
  const badge = el(
    "span",
    `shrink-0 text-[0.7rem] uppercase tracking-wide ${badgeClass}`,
    run.status === "running" ? "running" : run.status === "ok" ? "done" : "failed",
  )
  header.append(left, badge)
  shell.appendChild(header)

  const progress = el("div", "maintenance-progress mt-[0.55rem] h-[4px] overflow-hidden rounded-full bg-[rgba(255,255,255,0.07)]")
  const completeCount = run.steps.filter((step) => step.status === "ok").length
  const fraction = run.steps.length > 0 ? completeCount / run.steps.length : 0
  const bar = el(
    "div",
    `maintenance-progress__bar h-full rounded-full ${run.status === "running" ? "maintenance-progress__bar--running" : ""}`,
  )
  bar.style.width = `${Math.max(0.15, fraction) * 100}%`
  progress.appendChild(bar)
  shell.appendChild(progress)

  const list = el("ul", "mt-[0.6rem] space-y-[0.33rem] p-0")
  for (const step of run.steps) {
    const item = el("li", "list-none")
    const row = el("div", "flex items-start gap-[0.45rem] text-[0.75rem]")
    row.appendChild(el("span", stepClass(step.status), stepIcon(step.status)))
    const textWrap = el("div", "min-w-0")
    textWrap.appendChild(el("div", "text-hub-text", step.label))
    if (step.note) {
      textWrap.appendChild(el("div", "text-[0.7rem] text-hub-text-faint", step.note))
    }
    row.appendChild(textWrap)
    item.appendChild(row)
    list.appendChild(item)
  }
  shell.appendChild(list)

  if (run.status === "ok" && run.metrics) {
    const details = el("div", "mt-[0.55rem] grid gap-[0.25rem] text-[0.72rem] text-hub-text-dim")
    details.appendChild(el("div", "", `Adapters touched: ${run.metrics.adapterCount}`))
    details.appendChild(el("div", "", `Links relinked: ${run.metrics.totalLinks}`))
    details.appendChild(
      el("div", run.metrics.failedLinks > 0 ? "text-hub-warn" : "text-hub-user", `Link errors: ${run.metrics.failedLinks}`),
    )
    if (run.metrics.coreAssetsUpdated) details.appendChild(el("div", "", "Core assets refreshed"))
    if (run.metrics.userRegistryEnsured) details.appendChild(el("div", "", "User registry ensured"))
    if (run.metrics.redundantGeminiSymlinkRemoved) {
      details.appendChild(el("div", "", "Removed redundant Gemini symlink"))
    }
    if (Array.isArray(run.metrics.failedAdapters) && run.metrics.failedAdapters.length > 0) {
      details.appendChild(el("div", "text-hub-warn", `Failures by adapter: ${run.metrics.failedAdapters.join(", ")}`))
    }
    shell.appendChild(details)
  }

  if (run.status === "ok" && Array.isArray(run.adapterResults) && run.adapterResults.length > 0) {
    const detailsEl = document.createElement("details")
    detailsEl.className =
      "mt-[0.55rem] border border-hub-border bg-[rgba(8,12,24,0.5)] px-[0.52rem] py-[0.45rem] text-[0.72rem]"
    const summary = document.createElement("summary")
    summary.className = "cursor-pointer text-hub-text-dim select-none"
    summary.textContent = "Expand details: raw link actions per adapter"
    detailsEl.appendChild(summary)

    const body = el("div", "mt-[0.5rem] space-y-[0.4rem]")
    const filterRow = el("label", "mb-[0.35rem] flex items-center gap-[0.35rem] text-[0.69rem] text-hub-text-dim")
    const onlyFailuresToggle = document.createElement("input")
    onlyFailuresToggle.type = "checkbox"
    onlyFailuresToggle.className = "h-[0.8rem] w-[0.8rem]"
    filterRow.appendChild(onlyFailuresToggle)
    filterRow.appendChild(el("span", "", "Show only failures"))
    body.appendChild(filterRow)

    const allActionItems = []
    for (const adapter of run.adapterResults) {
      const adapterName = adapter?.adapterName ?? "Unknown adapter"
      const links = Array.isArray(adapter?.links) ? adapter.links : []
      const adapterBlock = el(
        "div",
        "border border-hub-border bg-[rgba(12,16,30,0.62)] px-[0.45rem] py-[0.4rem]",
      )
      adapterBlock.appendChild(el("div", "text-[0.7rem] font-semibold uppercase tracking-wide text-hub-text-faint", adapterName))
      const list = el("ul", "mt-[0.3rem] m-0 space-y-[0.2rem] p-0")
      for (const link of links) {
        const result = String(link?.result ?? "unknown")
        const item = el("li", "list-none text-[0.72rem]")
        item.dataset.result = result
        item.appendChild(
          el(
            "span",
            `mr-[0.38rem] inline-flex min-w-[72px] items-center justify-center rounded-[4px] border px-[0.28rem] py-[0.1rem] text-[0.62rem] font-semibold uppercase tracking-wide ${actionBadgeClass(result)} ${actionTone(result)}`,
            result,
          ),
        )
        const description = String(link?.description ?? "Unknown link")
        item.appendChild(el("span", "font-hub-mono text-[0.68rem] text-hub-text-dim", description))
        if (typeof link?.error === "string" && link.error.length > 0) {
          item.appendChild(el("span", "ml-[0.35rem] text-hub-err", `(${link.error})`))
        }
        list.appendChild(item)
        allActionItems.push(item)
      }
      adapterBlock.appendChild(list)
      body.appendChild(adapterBlock)
    }
    onlyFailuresToggle.addEventListener("change", () => {
      const onlyFailures = onlyFailuresToggle.checked
      for (const item of allActionItems) {
        const isFailed = item.dataset.result === "failed"
        item.classList.toggle("hidden", onlyFailures && !isFailed)
      }
    })
    detailsEl.appendChild(body)
    shell.appendChild(detailsEl)
  }

  if (run.status === "ok" && run.summary) {
    shell.appendChild(el("div", "mt-[0.5rem] text-[0.74rem] text-hub-user", run.summary))
  }
  if (run.status === "err" && run.error) {
    shell.appendChild(el("div", "mt-[0.5rem] text-[0.74rem] text-hub-err", run.error))
  }

  if (Array.isArray(run.events) && run.events.length > 0) {
    const eventsWrap = el(
      "div",
      "mt-[0.55rem] border border-hub-border bg-[rgba(8,12,24,0.5)] px-[0.52rem] py-[0.45rem]",
    )
    eventsWrap.appendChild(el("div", "mb-[0.35rem] text-[0.68rem] uppercase tracking-wide text-hub-text-faint", "Activity"))
    const eventsList = el("ul", "m-0 space-y-[0.2rem] p-0")
    const recentEvents = run.events.slice(-7)
    for (const event of recentEvents) {
      const row = el("li", "list-none text-[0.71rem]")
      const tone =
        event.kind === "err"
          ? "text-hub-err"
          : event.kind === "ok"
            ? "text-hub-user"
            : event.kind === "warn"
              ? "text-hub-warn"
              : "text-hub-text-dim"
      row.appendChild(el("span", "mr-[0.35rem] text-hub-text-faint", eventTimeLabel(run, event.at)))
      row.appendChild(el("span", tone, event.message))
      eventsList.appendChild(row)
    }
    eventsWrap.appendChild(eventsList)
    shell.appendChild(eventsWrap)
  }

  return shell
}
