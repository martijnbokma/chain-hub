import { el } from "./dom.js"
import { renderMarkdown } from "./markdown.js"
import { showToast } from "./toast.js"
import {
  btn,
  btnPrimary,
  btnWarn,
  btnDanger,
  msgClassForKind,
  pageHeader,
  pageTitle,
  focusRing,
} from "./ui-classes.js"

const rowBase = `w-full cursor-pointer rounded-md border border-hub-border bg-[color-mix(in_oklab,var(--color-hub-surface-1)_85%,transparent)] px-[0.72rem] py-[0.62rem] text-left text-hub-text transition-[background-color,border-color] duration-[120ms] ease-in-out hover:border-hub-border-strong hover:bg-[color-mix(in_oklab,var(--color-hub-surface-2)_88%,transparent)] ${focusRing}`
const rowSelected = "border-hub-accent bg-[color-mix(in_oklab,var(--color-hub-accent)_12%,var(--color-hub-surface-2))]"
const detailShell = "mt-3 flex min-h-0 min-w-0 flex-1 flex-col border border-hub-border bg-[rgba(11,16,32,0.7)]"
const detailHeader = "flex flex-wrap items-center gap-2 border-b border-hub-border px-[0.7rem] py-[0.55rem]"
const detailTitle = "flex-1 text-[0.85rem]"
const editorGrid = "grid min-h-0 min-w-0 flex-1 grid-cols-2 max-[980px]:grid-cols-1 max-[980px]:[grid-template-rows:minmax(0,1fr)_minmax(0,1fr)]"
const editorGridSingle = "grid min-h-0 min-w-0 flex-1 grid-cols-1"
const pane = "flex min-h-0 min-w-0 flex-col"
const paneDivider = `${pane} border-l border-hub-border max-[980px]:border-l-0 max-[980px]:border-t`
const paneLabelRow = "shrink-0 flex items-center justify-between gap-2 border-b border-hub-border px-[0.6rem] py-[0.45rem] text-[0.67rem] tracking-wide text-hub-text-faint uppercase"
const previewIconBtn = `${btn} inline-flex size-9 shrink-0 items-center justify-center px-0 py-0 text-hub-text leading-none tracking-normal normal-case hover:brightness-110 max-[640px]:!w-auto`
const editorToolbarActions = "flex flex-wrap items-center justify-end gap-1.5 shrink-0"
const editorTextarea = `min-h-0 w-full flex-1 resize-none overflow-y-auto border-0 bg-[#0a1020] p-[0.7rem] font-inherit text-hub-text outline-none ${focusRing}`
const previewBody = "preview min-h-0 flex-1 overflow-y-auto p-3"
const focusModalCloseBtn =
  "fixed right-[max(0.9rem,env(safe-area-inset-right,0px))] top-[max(0.9rem,env(safe-area-inset-top,0px))] z-[60] inline-flex size-10 shrink-0 items-center justify-center pointer-events-auto cursor-pointer rounded-lg border border-[color-mix(in_oklab,var(--color-hub-accent)_62%,var(--color-hub-border-strong))] bg-[color-mix(in_oklab,var(--color-hub-surface-2)_88%,transparent)] p-0 text-hub-accent shadow-[0_10px_26px_rgba(2,4,10,0.48)] backdrop-blur-[1.5px] transition-[transform,filter,border-color,background-color] duration-[140ms] ease-out hover:-translate-y-px hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-accent"
const FOCUS_OVERLAY_ID = "content-focus-overlay-root"
const INLINE_PREVIEW_STORAGE_KEY = "chain-hub-content-inline-preview-visible"
const INLINE_EDITOR_STORAGE_KEY = "chain-hub-content-inline-editor-visible"
const SVG_NS = "http://www.w3.org/2000/svg"

function createExpandIcon() {
  const svg = document.createElementNS(SVG_NS, "svg")
  svg.setAttribute("viewBox", "0 0 24 24")
  svg.setAttribute("fill", "none")
  svg.setAttribute("stroke", "currentColor")
  svg.setAttribute("stroke-width", "2")
  svg.setAttribute("stroke-linecap", "round")
  svg.setAttribute("stroke-linejoin", "round")
  svg.setAttribute("aria-hidden", "true")
  svg.setAttribute("class", "size-[18px]")
  const pathA = document.createElementNS(SVG_NS, "path")
  pathA.setAttribute("d", "M15 3h6v6")
  const pathB = document.createElementNS(SVG_NS, "path")
  pathB.setAttribute("d", "M9 21H3v-6")
  const pathC = document.createElementNS(SVG_NS, "path")
  pathC.setAttribute("d", "M21 3l-7 7")
  const pathD = document.createElementNS(SVG_NS, "path")
  pathD.setAttribute("d", "M3 21l7-7")
  svg.append(pathA, pathB, pathC, pathD)
  return svg
}

function createToggleIcon(showing) {
  const svg = document.createElementNS(SVG_NS, "svg")
  svg.setAttribute("viewBox", "0 0 24 24")
  svg.setAttribute("fill", "none")
  svg.setAttribute("stroke", "currentColor")
  svg.setAttribute("stroke-width", "2")
  svg.setAttribute("stroke-linecap", "round")
  svg.setAttribute("stroke-linejoin", "round")
  svg.setAttribute("aria-hidden", "true")
  svg.setAttribute("class", "size-[18px]")
  const horizontal = document.createElementNS(SVG_NS, "path")
  horizontal.setAttribute("d", "M5 12h14")
  svg.append(horizontal)
  if (!showing) {
    const vertical = document.createElementNS(SVG_NS, "path")
    vertical.setAttribute("d", "M12 5v14")
    svg.append(vertical)
  }
  return svg
}

function createCloseIcon() {
  const svg = document.createElementNS(SVG_NS, "svg")
  svg.setAttribute("viewBox", "0 0 24 24")
  svg.setAttribute("fill", "none")
  svg.setAttribute("stroke", "currentColor")
  svg.setAttribute("stroke-width", "1.85")
  svg.setAttribute("stroke-linecap", "round")
  svg.setAttribute("stroke-linejoin", "round")
  svg.setAttribute("aria-hidden", "true")
  svg.setAttribute("class", "size-[17px]")
  const pathA = document.createElementNS(SVG_NS, "path")
  pathA.setAttribute("d", "M18 6L6 18")
  const pathB = document.createElementNS(SVG_NS, "path")
  pathB.setAttribute("d", "M6 6l12 12")
  svg.append(pathA, pathB)
  return svg
}

function extForCreate(kind, extValue) {
  if (kind !== "rules") return undefined
  if (extValue === ".md" || extValue === ".mdc") return extValue
  return undefined
}

export function createContentView({ kind, title, root, setChainHomeBar, setBanner, apiRequest, modal }) {
  let items = []
  let selectedSlug = null
  let selectedDetail = null
  let draft = ""
  let feedback = ""
  let feedbackKind = "ok"
  let validation = null
  let showInlinePreview = sessionStorage.getItem(`${INLINE_PREVIEW_STORAGE_KEY}:${kind}`) !== "0"
  let showInlineEditor = sessionStorage.getItem(`${INLINE_EDITOR_STORAGE_KEY}:${kind}`) !== "0"

  function writeInlineState() {
    sessionStorage.setItem(`${INLINE_PREVIEW_STORAGE_KEY}:${kind}`, showInlinePreview ? "1" : "0")
    sessionStorage.setItem(`${INLINE_EDITOR_STORAGE_KEY}:${kind}`, showInlineEditor ? "1" : "0")
  }

  function ensureOnePaneVisible(prefer) {
    if (showInlineEditor || showInlinePreview) return
    if (prefer === "editor") {
      showInlineEditor = true
      return
    }
    showInlinePreview = true
  }

  function closeFocusOverlay() {
    const existing = document.getElementById(FOCUS_OVERLAY_ID)
    if (existing) existing.remove()
  }

  function openFocusOverlay({ mode, markdown, editorText, onEditorInput }) {
    closeFocusOverlay()
    const overlay = document.createElement("div")
    overlay.id = FOCUS_OVERLAY_ID
    overlay.className = "fixed inset-0 z-[55] bg-[rgba(6,10,20,0.92)]"
    overlay.setAttribute("role", "dialog")
    overlay.setAttribute("aria-modal", "true")
    overlay.tabIndex = -1

    const panel = document.createElement("div")
    panel.className = "absolute inset-0 min-h-0 min-w-0"

    const closeBtn = document.createElement("button")
    closeBtn.type = "button"
    closeBtn.className = focusModalCloseBtn
    closeBtn.setAttribute("aria-label", "Close focus view")
    closeBtn.appendChild(createCloseIcon())
    closeBtn.addEventListener("click", () => closeFocusOverlay())

    if (mode === "editor") {
      const editor = document.createElement("textarea")
      editor.className = editorTextarea
      editor.value = editorText
      editor.addEventListener("input", () => onEditorInput(editor.value))
      panel.appendChild(editor)
      queueMicrotask(() => editor.focus())
    } else {
      const preview = el("div", "preview h-full overflow-y-auto p-4")
      preview.replaceChildren(renderMarkdown(markdown))
      panel.appendChild(preview)
      queueMicrotask(() => overlay.focus())
    }

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeFocusOverlay()
    })
    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault()
        closeFocusOverlay()
      }
    })

    overlay.append(panel, closeBtn)
    document.body.appendChild(overlay)
  }

  function findItem(slug) {
    return items.find((item) => item.slug === slug) ?? null
  }

  function hasUnsavedChanges() {
    return Boolean(selectedDetail && draft !== (selectedDetail.content ?? ""))
  }

  async function loadItems({ preserveSelection = true } = {}) {
    setBanner("")
    try {
      const payload = await apiRequest(`/api/content/${kind}`)
      if (!payload || !Array.isArray(payload.items)) {
        throw new Error(`Malformed /api/content/${kind} response.`)
      }
      items = payload.items
      if (typeof payload.chainHome === "string" && typeof payload.source === "string") {
        setChainHomeBar(payload.chainHome, payload.source)
      }
      if (!preserveSelection || !selectedSlug || !findItem(selectedSlug)) {
        selectedSlug = null
        selectedDetail = null
        draft = ""
        validation = null
      }
    } catch (error) {
      setBanner(error.message)
      items = []
    }
  }

  async function openItem(slug) {
    if (hasUnsavedChanges()) {
      const proceed = await modal.confirm({
        title: "Discard unsaved changes?",
        message: `You have unsaved changes in ${selectedSlug}. Continue to ${slug}?`,
        confirmLabel: "Discard changes",
        cancelLabel: "Cancel",
        danger: true,
      })
      if (!proceed) return
    }

    try {
      selectedDetail = await apiRequest(`/api/content/${kind}/${encodeURIComponent(slug)}`)
      selectedSlug = slug
      draft = selectedDetail.content ?? ""
      validation = null
      feedback = ""
      render()
    } catch (error) {
      feedback = error.message
      feedbackKind = "err"
      render()
    }
  }

  async function saveCurrent() {
    if (!selectedDetail || selectedDetail.isCore || !selectedSlug) return
    try {
      const body = { content: draft }
      if (kind === "rules" && (selectedDetail.ext === ".md" || selectedDetail.ext === ".mdc")) {
        body.ext = selectedDetail.ext
      }
      await apiRequest(`/api/content/${kind}/${encodeURIComponent(selectedSlug)}`, { method: "PUT", body })
      selectedDetail.content = draft
      feedback = "Saved successfully."
      feedbackKind = "ok"
      showToast("Saved.", "ok")
      await loadItems()
      render()
    } catch (error) {
      feedback = error.message
      feedbackKind = "err"
      showToast(error.message, "err")
      render()
    }
  }

  async function validateCurrent() {
    if (!selectedSlug) return
    try {
      validation = await apiRequest(`/api/content/${kind}/${encodeURIComponent(selectedSlug)}/validate`, {
        method: "POST",
      })
      const errors = Array.isArray(validation.errors) ? validation.errors : []
      const warnings = Array.isArray(validation.warnings) ? validation.warnings : []
      feedback = errors.length === 0 && warnings.length === 0
        ? "Validation passed."
        : `Validation: ${errors.length} error(s), ${warnings.length} warning(s)`
      feedbackKind = errors.length > 0 ? "err" : warnings.length > 0 ? "warn-text" : "ok"
      showToast(feedback, errors.length > 0 ? "err" : warnings.length > 0 ? "warn" : "ok")
      render()
    } catch (error) {
      feedback = error.message
      feedbackKind = "err"
      validation = null
      render()
    }
  }

  async function removeCurrent() {
    if (!selectedSlug || !selectedDetail || selectedDetail.isCore) return
    const confirmed = await modal.confirm({
      title: `Remove ${kind.slice(0, -1)}`,
      message: `Remove "${selectedSlug}"? This cannot be undone.`,
      confirmLabel: "Remove",
      cancelLabel: "Cancel",
      danger: true,
    })
    if (!confirmed) return
    try {
      await apiRequest(`/api/content/${kind}/${encodeURIComponent(selectedSlug)}`, { method: "DELETE" })
      showToast("Removed.", "ok")
      selectedSlug = null
      selectedDetail = null
      draft = ""
      validation = null
      await loadItems({ preserveSelection: false })
      render()
    } catch (error) {
      feedback = error.message
      feedbackKind = "err"
      render()
    }
  }

  async function createNew(values) {
    const slug = String(values.slug ?? "").trim()
    if (!slug) throw new Error("Slug is required.")
    const description = String(values.description ?? "").trim()
    const ext = extForCreate(kind, String(values.ext ?? "").trim())
    let content = ""
    if (description) {
      content = `---\nname: ${slug}\ndescription: ${description}\n---\n`
    }
    await apiRequest(`/api/content/${kind}`, {
      method: "POST",
      body: { slug, content, ext },
    })
    await loadItems({ preserveSelection: false })
    await openItem(slug)
  }

  function renderList() {
    const fragment = document.createDocumentFragment()
    const header = el("div", pageHeader)
    const heading = el("h1", pageTitle, title)
    const createBtn = el("button", btnPrimary, `+ New ${kind.slice(0, -1)}`)
    createBtn.type = "button"
    createBtn.addEventListener("click", () => {
      modal.open({
        title: `Create ${kind.slice(0, -1)}`,
        fields: [
          { key: "slug", label: "Slug", placeholder: "item-slug", required: true, autofocus: true },
          { key: "description", label: "Description (optional)", placeholder: "Short description", required: false },
          ...(kind === "rules"
            ? [{ key: "ext", label: "Extension (.md/.mdc, optional)", placeholder: ".md", required: false }]
            : []),
        ],
        onSubmit: async (values, { setInlineError }) => {
          try {
            await createNew(values)
            return true
          } catch (error) {
            setInlineError(error.message)
            return false
          }
        },
      })
    })
    header.append(heading, createBtn)
    fragment.appendChild(header)

    if (items.length === 0) {
      fragment.appendChild(el("div", msgClassForKind("warn-text"), `No ${title.toLowerCase()} found.`))
    } else {
      const list = el("div", "space-y-2")
      for (const item of items) {
        const row = el("button", `${rowBase} ${selectedSlug === item.slug ? rowSelected : ""}`)
        row.type = "button"
        const label = item.isCore ? `${item.slug} · core` : item.slug
        row.appendChild(el("span", "text-[0.78rem]", label))
        row.addEventListener("click", () => void openItem(item.slug))
        list.appendChild(row)
      }
      fragment.appendChild(list)
    }

    if (feedback) {
      fragment.appendChild(el("div", msgClassForKind(feedbackKind), feedback))
    }

    root.replaceChildren(fragment)
  }

  function renderDetail() {
    if (!selectedDetail || !selectedSlug) {
      renderList()
      return
    }

    const fragment = document.createDocumentFragment()
    const header = el("div", pageHeader)
    const heading = el("h1", pageTitle, title)
    const backBtn = el("button", btn, `← ${title}`)
    backBtn.type = "button"
    backBtn.addEventListener("click", async () => {
      if (hasUnsavedChanges()) {
        const proceed = await modal.confirm({
          title: "Discard unsaved changes?",
          message: "Your changes are not saved.",
          confirmLabel: "Discard",
          cancelLabel: "Cancel",
          danger: true,
        })
        if (!proceed) return
      }
      selectedDetail = null
      selectedSlug = null
      draft = ""
      validation = null
      feedback = ""
      render()
    })
    header.append(heading, backBtn)
    fragment.appendChild(header)

    if (selectedDetail.isCore) {
      fragment.appendChild(el("div", msgClassForKind("warn-text"), "Protected core asset: read-only."))
    }

    const shell = el("div", detailShell)
    const actions = el("div", detailHeader)
    actions.appendChild(el("strong", detailTitle, selectedSlug))
    const validateBtn = el("button", btnWarn, "Validate")
    validateBtn.type = "button"
    validateBtn.addEventListener("click", () => void validateCurrent())
    actions.appendChild(validateBtn)
    if (!selectedDetail.isCore) {
      const removeBtn = el("button", btnDanger, "Remove")
      removeBtn.type = "button"
      removeBtn.addEventListener("click", () => void removeCurrent())
      const saveBtn = el("button", btnPrimary, "Save")
      saveBtn.type = "button"
      saveBtn.disabled = draft === (selectedDetail.content ?? "")
      saveBtn.addEventListener("click", () => void saveCurrent())
      actions.append(removeBtn, saveBtn)
    }
    shell.appendChild(actions)

    ensureOnePaneVisible("editor")
    const gridClass = showInlineEditor && showInlinePreview ? editorGrid : editorGridSingle
    const grid = el("div", gridClass)
    const editorPane = el("div", pane)
    const editorLabelDesktop = el("div", `${paneLabelRow} max-[980px]:hidden`)
    editorLabelDesktop.appendChild(el("span", "min-w-0 truncate", "Editor"))
    const editorActionsDesktop = el("div", editorToolbarActions)
    const focusEditorDesktop = el("button", previewIconBtn)
    focusEditorDesktop.type = "button"
    focusEditorDesktop.setAttribute("aria-label", "Focus editor")
    focusEditorDesktop.setAttribute("title", "Focus editor")
    focusEditorDesktop.appendChild(createExpandIcon())
    const toggleEditorDesktop = el("button", previewIconBtn)
    toggleEditorDesktop.type = "button"
    toggleEditorDesktop.setAttribute("aria-label", showInlineEditor ? "Minimize editor" : "Restore editor")
    toggleEditorDesktop.setAttribute("title", showInlineEditor ? "Minimize editor" : "Restore editor")
    toggleEditorDesktop.appendChild(createToggleIcon(showInlineEditor))
    editorActionsDesktop.append(focusEditorDesktop, toggleEditorDesktop)
    editorLabelDesktop.appendChild(editorActionsDesktop)
    editorPane.appendChild(editorLabelDesktop)

    const editorLabelMobile = el("div", `${paneLabelRow} min-[980px]:hidden`)
    editorLabelMobile.appendChild(el("span", "min-w-0 truncate", "Editor"))
    const editorActionsMobile = el("div", editorToolbarActions)
    const focusEditorMobile = el("button", previewIconBtn)
    focusEditorMobile.type = "button"
    focusEditorMobile.setAttribute("aria-label", "Focus editor")
    focusEditorMobile.setAttribute("title", "Focus editor")
    focusEditorMobile.appendChild(createExpandIcon())
    const toggleEditorMobile = el("button", previewIconBtn)
    toggleEditorMobile.type = "button"
    toggleEditorMobile.setAttribute("aria-label", showInlineEditor ? "Minimize editor" : "Restore editor")
    toggleEditorMobile.setAttribute("title", showInlineEditor ? "Minimize editor" : "Restore editor")
    toggleEditorMobile.appendChild(createToggleIcon(showInlineEditor))
    editorActionsMobile.append(focusEditorMobile, toggleEditorMobile)
    editorLabelMobile.appendChild(editorActionsMobile)
    editorPane.appendChild(editorLabelMobile)

    const editor = el("textarea", editorTextarea)
    editor.id = `${kind}-editor`
    editor.value = draft
    editor.disabled = selectedDetail.isCore
    editor.addEventListener("input", () => {
      draft = editor.value
      preview.replaceChildren(renderMarkdown(draft))
      const saveBtn = actions.querySelector("button:last-child")
      if (saveBtn instanceof HTMLButtonElement && saveBtn.textContent === "Save") {
        saveBtn.disabled = draft === (selectedDetail.content ?? "")
      }
    })
    editorPane.appendChild(editor)

    const previewPane = el("div", paneDivider)
    const previewLabelDesktop = el("div", `${paneLabelRow} max-[980px]:hidden`)
    previewLabelDesktop.appendChild(el("span", "min-w-0 truncate", "Preview"))
    const previewActionsDesktop = el("div", editorToolbarActions)
    const focusPreviewDesktop = el("button", previewIconBtn)
    focusPreviewDesktop.type = "button"
    focusPreviewDesktop.setAttribute("aria-label", "Focus preview")
    focusPreviewDesktop.setAttribute("title", "Focus preview")
    focusPreviewDesktop.appendChild(createExpandIcon())
    const togglePreviewDesktop = el("button", previewIconBtn)
    togglePreviewDesktop.type = "button"
    togglePreviewDesktop.setAttribute("aria-label", showInlinePreview ? "Minimize preview" : "Restore preview")
    togglePreviewDesktop.setAttribute("title", showInlinePreview ? "Minimize preview" : "Restore preview")
    togglePreviewDesktop.appendChild(createToggleIcon(showInlinePreview))
    previewActionsDesktop.append(focusPreviewDesktop, togglePreviewDesktop)
    previewLabelDesktop.appendChild(previewActionsDesktop)
    previewPane.appendChild(previewLabelDesktop)

    const previewLabelMobile = el("div", `${paneLabelRow} min-[980px]:hidden`)
    previewLabelMobile.appendChild(el("span", "min-w-0 truncate", "Preview"))
    const previewActionsMobile = el("div", editorToolbarActions)
    const focusPreviewMobile = el("button", previewIconBtn)
    focusPreviewMobile.type = "button"
    focusPreviewMobile.setAttribute("aria-label", "Focus preview")
    focusPreviewMobile.setAttribute("title", "Focus preview")
    focusPreviewMobile.appendChild(createExpandIcon())
    const togglePreviewMobile = el("button", previewIconBtn)
    togglePreviewMobile.type = "button"
    togglePreviewMobile.setAttribute("aria-label", showInlinePreview ? "Minimize preview" : "Restore preview")
    togglePreviewMobile.setAttribute("title", showInlinePreview ? "Minimize preview" : "Restore preview")
    togglePreviewMobile.appendChild(createToggleIcon(showInlinePreview))
    previewActionsMobile.append(focusPreviewMobile, togglePreviewMobile)
    previewLabelMobile.appendChild(previewActionsMobile)
    previewPane.appendChild(previewLabelMobile)

    const preview = el("div", previewBody)
    preview.id = `${kind}-preview`
    preview.replaceChildren(renderMarkdown(draft))
    previewPane.appendChild(preview)

    function syncPaneToggles() {
      toggleEditorDesktop.replaceChildren(createToggleIcon(showInlineEditor))
      toggleEditorMobile.replaceChildren(createToggleIcon(showInlineEditor))
      toggleEditorDesktop.setAttribute("aria-label", showInlineEditor ? "Minimize editor" : "Restore editor")
      toggleEditorDesktop.setAttribute("title", showInlineEditor ? "Minimize editor" : "Restore editor")
      toggleEditorMobile.setAttribute("aria-label", showInlineEditor ? "Minimize editor" : "Restore editor")
      toggleEditorMobile.setAttribute("title", showInlineEditor ? "Minimize editor" : "Restore editor")
      togglePreviewDesktop.replaceChildren(createToggleIcon(showInlinePreview))
      togglePreviewMobile.replaceChildren(createToggleIcon(showInlinePreview))
      togglePreviewDesktop.setAttribute("aria-label", showInlinePreview ? "Minimize preview" : "Restore preview")
      togglePreviewDesktop.setAttribute("title", showInlinePreview ? "Minimize preview" : "Restore preview")
      togglePreviewMobile.setAttribute("aria-label", showInlinePreview ? "Minimize preview" : "Restore preview")
      togglePreviewMobile.setAttribute("title", showInlinePreview ? "Minimize preview" : "Restore preview")
    }

    function toggleEditorPane() {
      showInlineEditor = !showInlineEditor
      ensureOnePaneVisible("preview")
      writeInlineState()
      render()
    }

    function togglePreviewPane() {
      showInlinePreview = !showInlinePreview
      ensureOnePaneVisible("editor")
      writeInlineState()
      render()
    }

    function focusEditorPane() {
      openFocusOverlay({
        mode: "editor",
        editorText: draft,
        markdown: draft,
        onEditorInput(nextValue) {
          draft = nextValue
          editor.value = nextValue
          preview.replaceChildren(renderMarkdown(nextValue))
          const saveBtn = actions.querySelector("button:last-child")
          if (saveBtn instanceof HTMLButtonElement && saveBtn.textContent === "Save") {
            saveBtn.disabled = draft === (selectedDetail.content ?? "")
          }
        },
      })
    }

    function focusPreviewPane() {
      openFocusOverlay({ mode: "preview", markdown: draft, editorText: draft, onEditorInput() {} })
    }

    focusEditorDesktop.addEventListener("click", focusEditorPane)
    focusEditorMobile.addEventListener("click", focusEditorPane)
    focusPreviewDesktop.addEventListener("click", focusPreviewPane)
    focusPreviewMobile.addEventListener("click", focusPreviewPane)
    toggleEditorDesktop.addEventListener("click", toggleEditorPane)
    toggleEditorMobile.addEventListener("click", toggleEditorPane)
    togglePreviewDesktop.addEventListener("click", togglePreviewPane)
    togglePreviewMobile.addEventListener("click", togglePreviewPane)
    syncPaneToggles()

    if (showInlineEditor) grid.appendChild(editorPane)
    if (showInlinePreview) grid.appendChild(previewPane)
    shell.appendChild(grid)
    fragment.appendChild(shell)

    if (validation && (Array.isArray(validation.errors) || Array.isArray(validation.warnings))) {
      const errors = Array.isArray(validation.errors) ? validation.errors : []
      const warnings = Array.isArray(validation.warnings) ? validation.warnings : []
      if (errors.length > 0) {
        fragment.appendChild(el("div", msgClassForKind("err"), errors.join("\n")))
      }
      if (warnings.length > 0) {
        fragment.appendChild(el("div", msgClassForKind("warn-text"), warnings.join("\n")))
      }
    }
    if (feedback) {
      fragment.appendChild(el("div", msgClassForKind(feedbackKind), feedback))
    }

    root.replaceChildren(fragment)
  }

  function render() {
    root.className = "min-w-0"
    if (!selectedDetail) {
      renderList()
      return
    }
    renderDetail()
  }

  return {
    dismissOverlays() {
      closeFocusOverlay()
    },
    async mount() {
      await loadItems({ preserveSelection: false })
      render()
    },
  }
}
