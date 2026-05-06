import { el } from "./dom.js"
import { btn, btnPrimary, msgClassForKind, pageHeader, pageTitle } from "./ui-classes.js"
import { showToast } from "./toast.js"

const cardClass =
  "border border-hub-border bg-[color-mix(in_oklab,var(--color-hub-surface-1)_85%,transparent)] px-[0.75rem] py-[0.7rem]"
const rowClass = "mt-[0.7rem] flex flex-wrap items-center gap-2"
const metaClass = "mt-[0.45rem] text-[0.75rem] text-hub-text-dim"
const listClass = "mt-[0.55rem] ml-0 list-disc pl-[1rem] text-[0.75rem] text-hub-text"
const linkClass = "text-hub-accent underline underline-offset-2 transition-colors hover:brightness-110"

function formatRelative(ts) {
  if (!ts) return "Never"
  const diffMs = Date.now() - ts
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000))
  if (diffMinutes < 1) return "just now"
  if (diffMinutes < 60) return `${diffMinutes} min ago`
  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
  const diffDays = Math.round(diffHours / 24)
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
}

export function createReflectView({ root, setChainHomeBar, apiRequest }) {
  let loading = false
  let feedback = ""
  let feedbackKind = "ok"
  let preview = null
  let runResult = null
  let lastRunAt = null

  async function loadStatus() {
    const status = await apiRequest("/api/status")
    setChainHomeBar(status.chainHome, status.source)
  }

  async function runPreview() {
    loading = true
    feedback = ""
    render()
    try {
      preview = await apiRequest("/api/reflect/preview", { method: "POST" })
      runResult = null
      feedback = preview.message
      feedbackKind = preview.hasQueuedEvents ? "ok" : "warn-text"
      showToast(preview.message, preview.hasQueuedEvents ? "ok" : "warn")
    } catch (error) {
      feedback = error.message
      feedbackKind = "err"
      showToast(error.message, "err")
    } finally {
      loading = false
      render()
    }
  }

  async function runReflectNow() {
    loading = true
    feedback = ""
    render()
    try {
      runResult = await apiRequest("/api/reflect/run", { method: "POST" })
      lastRunAt = Date.now()
      feedback = runResult.message
      feedbackKind = "ok"
      showToast(runResult.message, "ok")
      preview = null
    } catch (error) {
      feedback = error.message
      feedbackKind = "err"
      showToast(error.message, "err")
    } finally {
      loading = false
      render()
    }
  }

  function openDraftsPath() {
    if (!runResult?.draftsPath) return
    window.open(`file://${runResult.draftsPath}`, "_blank", "noopener,noreferrer")
  }

  function renderDraftList(files) {
    if (!Array.isArray(files) || files.length === 0) {
      return el("div", metaClass, "No draft files were generated.")
    }
    const list = el("ul", listClass)
    for (const file of files) {
      const item = el("li", "")
      const link = el("a", linkClass, file)
      link.href = `file://${runResult.draftsPath}/${file}`
      link.target = "_blank"
      link.rel = "noopener noreferrer"
      item.appendChild(link)
      list.appendChild(item)
    }
    return list
  }

  function render() {
    root.className = "min-w-0"
    const fragment = document.createDocumentFragment()
    const header = el("div", pageHeader)
    header.appendChild(el("h1", pageTitle, "Reflect"))
    fragment.appendChild(header)

    const card = el("section", cardClass)
    card.appendChild(el("p", "m-0 text-[0.8rem] text-hub-text-dim", "Distill recent queued learnings into draft notes."))
    card.appendChild(el("div", metaClass, `Last run: ${formatRelative(lastRunAt)}`))

    const actionRow = el("div", rowClass)
    const previewButton = el("button", btn, loading ? "Previewing..." : "Preview")
    previewButton.type = "button"
    previewButton.disabled = loading
    previewButton.addEventListener("click", () => void runPreview())
    actionRow.appendChild(previewButton)

    const runButton = el("button", btnPrimary, loading ? "Running..." : "Run now")
    runButton.type = "button"
    runButton.disabled = loading || !preview?.hasQueuedEvents
    runButton.addEventListener("click", () => void runReflectNow())
    actionRow.appendChild(runButton)
    card.appendChild(actionRow)

    if (preview) {
      card.appendChild(el("div", metaClass, `Queued events: ${preview.eventCount}`))
    }

    if (runResult) {
      card.appendChild(el("div", metaClass, `Processed events: ${runResult.eventCount}`))
      card.appendChild(el("div", metaClass, `Drafts path: ${runResult.draftsPath}`))
      const openFolderButton = el("button", btn, "Open drafts folder")
      openFolderButton.type = "button"
      openFolderButton.addEventListener("click", openDraftsPath)
      card.appendChild(el("div", rowClass, "")).appendChild(openFolderButton)
      card.appendChild(renderDraftList(runResult.generated))
    }

    fragment.appendChild(card)

    if (feedback) {
      fragment.appendChild(el("div", msgClassForKind(feedbackKind), feedback))
    }

    root.replaceChildren(fragment)
  }

  return {
    async mount() {
      await loadStatus()
      render()
    },
  }
}
