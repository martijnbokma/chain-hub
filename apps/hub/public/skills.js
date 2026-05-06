import { renderMarkdown } from "./markdown.js"
import { showToast } from "./toast.js"
import { el } from "./dom.js"
import {
  btn,
  btnPrimary,
  btnWarn,
  btnDanger,
  btnDetailHeader,
  msgClassForKind,
  focusRing,
  pageHeader,
  pageTitle,
  sectionLabel,
} from "./ui-classes.js"

const skillGridHeader =
  "mb-[0.35rem] grid grid-cols-[12px_minmax(150px,180px)_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-hub-border px-[0.78rem] pt-1 pb-[0.55rem] max-[980px]:grid-cols-[12px_minmax(120px,1fr)_auto]"

const skillGridHeaderCell =
  "overflow-hidden text-ellipsis whitespace-nowrap text-[0.66rem] tracking-wide text-hub-text-faint uppercase"

const skillRowBase = `w-full cursor-pointer rounded-md border border-hub-border bg-[color-mix(in_oklab,var(--color-hub-surface-1)_85%,transparent)] px-[0.78rem] py-[0.72rem] text-left text-inherit transition-[background-color,border-color,transform] duration-[140ms] ease-in-out hover:-translate-y-px hover:border-hub-border-strong hover:bg-[color-mix(in_oklab,var(--color-hub-surface-2)_88%,transparent)] ${focusRing} grid grid-cols-[12px_minmax(150px,180px)_minmax(0,1fr)_auto] items-start gap-x-3 max-[980px]:grid-cols-[12px_minmax(120px,1fr)_auto]`

const skillRowSelected =
  "border-[color-mix(in_oklab,var(--color-hub-accent)_52%,var(--color-hub-border))] bg-[color-mix(in_oklab,var(--color-hub-accent)_11%,var(--color-hub-surface-2))]"

const skillName =
  "min-w-0 font-semibold leading-snug text-[#f2f6ff] max-[980px]:col-start-2 max-[980px]:row-start-1"

const skillDesc =
  "max-[980px]:[grid-column:2/4] line-clamp-2 min-w-0 overflow-hidden text-[0.77rem] leading-[1.45] text-hub-text-dim max-[980px]:col-start-2 max-[980px]:row-start-2"

const skillBadge =
  "self-center whitespace-nowrap rounded-full border border-hub-border-strong px-[0.44rem] py-[0.16rem] text-[0.66rem] text-hub-text-faint max-[980px]:col-start-3 max-[980px]:row-start-1 max-[980px]:justify-self-end max-[980px]:self-start"

const dotCore =
  "mt-[0.3rem] size-2 rounded-full bg-hub-core shadow-[0_0_0_2px_color-mix(in_oklab,var(--color-hub-core)_26%,transparent)]"

const dotUser =
  "mt-[0.3rem] size-2 rounded-full bg-hub-user shadow-[0_0_0_2px_color-mix(in_oklab,var(--color-hub-user)_24%,transparent)]"

const detailShell =
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border border-hub-border bg-[rgba(11,16,32,0.7)]"

const detailHeader =
  "flex shrink-0 flex-wrap items-center gap-2 border-b border-hub-border px-[0.7rem] py-[0.55rem] max-[640px]:flex-wrap"

const detailTitle = "flex-1 text-[0.85rem]"

const editorGrid =
  "grid min-h-0 min-w-0 flex-1 grid-cols-2 items-stretch max-[980px]:grid-cols-1 max-[980px]:[grid-template-rows:minmax(0,1fr)_minmax(0,1fr)]"

/** Single-column layout when inline preview pane is hidden. */
const editorGridEditorOnly = "grid min-h-0 min-w-0 flex-1 grid-cols-1 items-stretch"

const INLINE_PREVIEW_STORAGE_KEY = "chain-hub-inline-preview-visible"
const INLINE_EDITOR_STORAGE_KEY = "chain-hub-inline-editor-visible"
const EDITOR_FOCUS_START_STORAGE_KEY = "chain-hub-editor-focus-start-top"

const pane = "flex min-h-0 min-w-0 flex-col"

const paneDivider = `${pane} border-l border-hub-border max-[980px]:border-t max-[980px]:border-l-0 max-[980px]:border-hub-border`

const paneLabel =
  "shrink-0 border-b border-hub-border px-[0.6rem] py-[0.45rem] text-[0.67rem] tracking-wide text-hub-text-faint uppercase"

const paneLabelRow =
  "shrink-0 flex items-center justify-between gap-2 border-b border-hub-border px-[0.6rem] py-[0.45rem] text-[0.67rem] tracking-wide text-hub-text-faint uppercase"

/** Compact icon button used by editor toolbar controls. */
const previewIconBtn = `${btn} ${btnDetailHeader} inline-flex size-9 shrink-0 items-center justify-center px-0 py-0 text-hub-text leading-none tracking-normal normal-case hover:brightness-110`

/** Compact text button for focus-start mode (top vs cursor). */
const focusStartModeBtn =
  `${btn} ${btnDetailHeader} inline-flex h-9 shrink-0 items-center justify-center px-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.04em] text-hub-text hover:brightness-110`

const editorToolbarActions = "flex flex-wrap items-center justify-end gap-1.5 shrink-0"

const editorTextarea = `min-h-0 w-full flex-1 resize-none overflow-y-auto border-0 bg-[#0a1020] p-[0.7rem] font-inherit text-hub-text outline-none focus:outline-none ${focusRing}`

const previewBody = "preview min-h-0 flex-1 overflow-y-auto p-3"
const focusModalEditorTextarea = `h-full w-full resize-none border-0 bg-[#0a1020] p-[0.9rem] font-inherit text-hub-text outline-none focus:outline-none ${focusRing}`
const focusModalCloseBtn =
  "fixed right-[max(0.9rem,env(safe-area-inset-right,0px))] top-[max(0.9rem,env(safe-area-inset-top,0px))] z-[60] inline-flex size-10 shrink-0 items-center justify-center pointer-events-auto cursor-pointer rounded-lg border border-[color-mix(in_oklab,var(--color-hub-accent)_62%,var(--color-hub-border-strong))] bg-[color-mix(in_oklab,var(--color-hub-surface-2)_88%,transparent)] p-0 text-hub-accent shadow-[0_10px_26px_rgba(2,4,10,0.48)] backdrop-blur-[1.5px] transition-[transform,filter,border-color,background-color] duration-[140ms] ease-out hover:-translate-y-px hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-accent disabled:cursor-not-allowed disabled:opacity-55 disabled:brightness-100"

const validationResults =
  "mt-[0.7rem] border border-hub-border bg-[rgba(10,16,32,0.76)] px-[0.7rem] py-[0.6rem]"

const validationTitleBase =
  "my-[0.35rem] text-[0.72rem] tracking-wide uppercase"

const validationList =
  "mb-[0.6rem] ml-0 list-disc pl-[1.1rem] text-[0.75rem] leading-snug last:mb-0"

const SVG_NS = "http://www.w3.org/2000/svg"
const listControlsRow = "mb-3 flex flex-wrap items-end gap-2"
const listControlGroup = "flex min-w-[170px] flex-col gap-1"
const listControlLabel = "text-[0.66rem] tracking-wide text-hub-text-faint uppercase"
const listControlInput =
  "w-full rounded-md border border-hub-border-strong bg-[#0a1020] px-2 py-1.5 text-[0.74rem] text-hub-text outline-none focus:border-hub-accent"
const listControlButtonDisabled = "opacity-55 cursor-not-allowed hover:translate-y-0 hover:brightness-100"
const emptyState =
  "rounded-md border border-hub-border bg-[rgba(11,16,32,0.68)] px-3 py-2 text-[0.75rem] text-hub-text-dim"

const BUCKET_LABELS = {
  core: "Core",
  chain_hub: "Chain Hub",
  personal: "Personal",
  packs: "Packs",
  community: "Community",
  cli_packages: "CLI packages",
  unknown: "Unknown",
}

const BUCKET_ORDER = ["core", "chain_hub", "personal", "packs", "community", "cli_packages", "unknown"]

/**
 * Builds a compact Lucide-style "expand" icon for focus/fullscreen actions.
 */
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

/**
 * Builds a compact plus/minus icon used for restore/minimize toggle controls.
 */
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

/**
 * Builds a compact close icon for modal close controls.
 */
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

function setToolbarTooltip(node, text) {
  node.setAttribute("data-toolbar-tooltip", text)
}

export function createSkillsView({ root, setChainHomeBar, setBanner, apiRequest, modal }) {
  let skills = []
  let selectedSlug = null
  let selectedDetail = null
  let selectedDraft = ""
  let selectedValidation = null
  let view = "list"
  let feedback = ""
  let feedbackKind = "ok"
  let previewModalEscapeAc = null
  let previewModalDomWired = false
  let focusModalMode = "preview"
  let onFocusEditorInput = null
  let listCategoryFilter = "all"
  let listRecencyFilter = "all"
  let listSortMode = "category"

  function getPreviewModalEls() {
    const rootEl = document.getElementById("preview-modal-root")
    if (!rootEl) return null
    return {
      root: rootEl,
      backdrop: rootEl.querySelector(".preview-modal__backdrop"),
      panel: rootEl.querySelector(".preview-modal__panel"),
      header: rootEl.querySelector(".preview-modal__header"),
      title: rootEl.querySelector(".preview-modal__title"),
      body: rootEl.querySelector(".preview-modal__body"),
      close: rootEl.querySelector(".preview-modal__close"),
      focusClose: rootEl.querySelector(".preview-modal__focus-close"),
    }
  }

  function closePreviewModal() {
    const els = getPreviewModalEls()
    if (!els || els.root.classList.contains("hidden")) return
    els.root.classList.add("hidden")
    els.root.setAttribute("aria-hidden", "true")
    els.backdrop?.classList.remove("bg-[#0a1020]")
    els.backdrop?.classList.add("bg-[rgba(0,0,0,0.55)]")
    els.header?.classList.remove("hidden")
    els.focusClose?.classList.add("hidden")
    els.panel?.classList.remove("bg-[#070b16]")
    els.root.classList.remove("overflow-hidden")
    els.body.classList.add("preview")
    els.body.classList.remove("overflow-hidden")
    els.body.classList.add("overflow-y-auto")
    els.body.replaceChildren()
    document.body.classList.remove("overflow-hidden")
    document.documentElement.classList.remove("overflow-hidden")
    previewModalEscapeAc?.abort()
    previewModalEscapeAc = null
    onFocusEditorInput = null
  }

  function openFocusModal({
    mode,
    markdown,
    editorText,
    startAtTop = true,
    selectionStart = 0,
    selectionEnd = 0,
    inlineScrollTop = 0,
  }) {
    const els = getPreviewModalEls()
    if (!els) return
    focusModalMode = mode
    els.backdrop?.classList.remove("bg-[rgba(0,0,0,0.55)]")
    els.backdrop?.classList.add("bg-[#0a1020]")
    els.header?.classList.add("hidden")
    els.focusClose?.classList.remove("hidden")
    els.panel?.classList.add("bg-[#070b16]")
    els.root.classList.add("overflow-hidden")
    if (mode === "editor") {
      els.title.textContent = "Editor focus"
      els.body.classList.remove("preview")
      els.body.classList.remove("overflow-y-auto")
      els.body.classList.add("overflow-hidden")
      const modalEditor = el("textarea", focusModalEditorTextarea)
      modalEditor.value = editorText
      modalEditor.setAttribute("aria-label", "Focused editor")
      modalEditor.addEventListener("input", () => {
        if (typeof onFocusEditorInput === "function") onFocusEditorInput(modalEditor.value)
      })
      els.body.replaceChildren(modalEditor)
      if (startAtTop) {
        modalEditor.scrollTop = 0
        modalEditor.setSelectionRange(0, 0)
      } else {
        modalEditor.scrollTop = Math.max(0, inlineScrollTop)
        modalEditor.setSelectionRange(selectionStart, selectionEnd)
      }
    } else {
      els.title.textContent = "Preview focus"
      els.body.classList.add("preview")
      els.body.classList.remove("overflow-hidden")
      els.body.classList.add("overflow-y-auto")
      els.body.replaceChildren(renderMarkdown(markdown))
      els.body.scrollTop = 0
    }
    els.root.classList.remove("hidden")
    els.root.setAttribute("aria-hidden", "false")
    document.body.classList.add("overflow-hidden")
    document.documentElement.classList.add("overflow-hidden")
    previewModalEscapeAc?.abort()
    previewModalEscapeAc = new AbortController()
    window.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape") {
          event.preventDefault()
          event.stopPropagation()
          closePreviewModal()
        }
      },
      { capture: true, signal: previewModalEscapeAc.signal },
    )
    if (mode === "editor") {
      const modalEditor = els.body.querySelector("textarea")
      if (startAtTop) {
        modalEditor?.scrollTo({ top: 0, left: 0, behavior: "auto" })
      }
      modalEditor?.focus()
    } else {
      els.body.scrollTo({ top: 0, left: 0, behavior: "auto" })
      els.focusClose?.focus()
    }
  }

  function syncOpenPreviewModalBody(markdown) {
    const els = getPreviewModalEls()
    if (!els || els.root.classList.contains("hidden")) return
    if (focusModalMode !== "preview") return
    els.body.replaceChildren(renderMarkdown(markdown))
  }

  function wirePreviewModalDom() {
    if (previewModalDomWired) return
    const els = getPreviewModalEls()
    if (!els) return
    previewModalDomWired = true
    if (els.focusClose) {
      els.focusClose.className = `preview-modal__focus-close ${focusModalCloseBtn}`
      els.focusClose.type = "button"
      els.focusClose.setAttribute("title", "Close focus")
      els.focusClose.setAttribute("data-toolbar-tooltip", "Close focus")
      els.focusClose.replaceChildren(createCloseIcon())
      els.focusClose.classList.add("hidden")
    }
    els.backdrop?.addEventListener("click", closePreviewModal)
    els.close?.addEventListener("click", closePreviewModal)
    els.focusClose?.addEventListener("click", closePreviewModal)
  }

  function syncEditorToggleLabels(showing) {
    for (const node of document.querySelectorAll("[data-inline-editor-toggle]")) {
      if (!(node instanceof HTMLButtonElement)) continue
      node.replaceChildren(createToggleIcon(showing))
      node.setAttribute("aria-label", showing ? "Minimize editor" : "Restore editor")
      node.setAttribute("title", showing ? "Minimize editor" : "Restore editor")
      node.setAttribute("aria-pressed", showing ? "true" : "false")
    }
  }

  function syncInlinePreviewToggleLabels(showing) {
    for (const node of document.querySelectorAll("[data-inline-preview-toggle]")) {
      if (!(node instanceof HTMLButtonElement)) continue
      node.replaceChildren(createToggleIcon(showing))
      node.setAttribute("aria-label", showing ? "Minimize inline preview" : "Restore inline preview")
      node.setAttribute("title", showing ? "Minimize preview" : "Restore preview")
      node.setAttribute("aria-pressed", showing ? "true" : "false")
    }
  }

  function findSkill(slug) {
    return skills.find((item) => item.slug === slug) ?? null
  }

  function sortByNewest(a, b) {
    const aStamp = typeof a.addedAt === "number" ? a.addedAt : 0
    const bStamp = typeof b.addedAt === "number" ? b.addedAt : 0
    if (aStamp !== bStamp) return bStamp - aStamp
    return a.slug.localeCompare(b.slug)
  }

  function getFilteredSkills() {
    const now = Date.now()
    const recencyWindowMs =
      listRecencyFilter === "7d"
        ? 7 * 24 * 60 * 60 * 1000
        : listRecencyFilter === "30d"
          ? 30 * 24 * 60 * 60 * 1000
          : null

    return skills.filter((skill) => {
      if (listCategoryFilter !== "all" && skill.bucket !== listCategoryFilter) {
        return false
      }
      if (recencyWindowMs === null) return true
      if (typeof skill.addedAt !== "number") return false
      return now - skill.addedAt <= recencyWindowMs
    })
  }

  function getCategoryBuckets() {
    const seen = new Set(skills.map((skill) => skill.bucket))
    return BUCKET_ORDER.filter((bucket) => seen.has(bucket))
  }

  /**
   * Ensures the detail view starts at the top after selecting a skill.
   * We scroll both the page and the nearest scrollable container for robust behavior.
   */
  function scrollDetailIntoView() {
    requestAnimationFrame(() => {
      const detailNode = root.firstElementChild
      if (detailNode instanceof HTMLElement) {
        detailNode.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" })
      }

      if (root.parentElement instanceof HTMLElement) {
        root.parentElement.scrollTo({ top: 0, left: 0, behavior: "smooth" })
      }

      const mainContainer = root.closest("main")
      if (mainContainer instanceof HTMLElement) {
        mainContainer.scrollTo({ top: 0, left: 0, behavior: "smooth" })
      }

      const editorNode = root.querySelector("#skill-editor")
      if (editorNode instanceof HTMLElement) {
        editorNode.scrollTop = 0
      }

      const previewNode = root.querySelector("#skill-preview")
      if (previewNode instanceof HTMLElement) {
        previewNode.scrollTop = 0
      }

      window.scrollTo({ top: 0, left: 0, behavior: "smooth" })
    })
  }

  async function loadSkills({ preserveSelection = true } = {}) {
    setBanner("")
    try {
      const payload = await apiRequest("/api/skills")
      const hasValidShape =
        payload &&
        typeof payload === "object" &&
        Array.isArray(payload.skills) &&
        typeof payload.chainHome === "string" &&
        typeof payload.source === "string" &&
        typeof payload.initialized === "boolean"
      if (!hasValidShape) {
        throw new Error("Malformed /api/skills response. Expected { skills, chainHome, source, initialized }.")
      }
      skills = payload.skills
      setChainHomeBar(payload.chainHome, payload.source)
      if (!payload.initialized) {
        setBanner("Hub metadata is still initializing. Retry in a moment.")
      }
      if (!preserveSelection || !selectedSlug || !findSkill(selectedSlug)) {
        selectedSlug = null
        selectedDetail = null
        selectedDraft = ""
        selectedValidation = null
      }
    } catch (error) {
      setBanner(error.message)
      skills = []
      selectedSlug = null
      selectedDetail = null
      selectedDraft = ""
      selectedValidation = null
    }
  }

  async function openSkill(slug) {
    view = "detail"
    feedback = ""
    selectedValidation = null
    try {
      selectedDetail = await apiRequest(`/api/skills/${encodeURIComponent(slug)}`)
      selectedSlug = slug
      selectedDraft = selectedDetail.content ?? ""
      render()
      scrollDetailIntoView()
    } catch (error) {
      feedback = error.message
      feedbackKind = "err"
      render()
    }
  }

  async function saveCurrentSkill() {
    if (!selectedSlug || !selectedDetail || selectedDetail.isCore) return
    const content = selectedDraft
    feedback = ""
    try {
      await apiRequest(`/api/skills/${encodeURIComponent(selectedSlug)}`, {
        method: "PUT",
        body: { content },
      })
      selectedDetail.content = content
      feedback = "Saved successfully."
      feedbackKind = "ok"
      await loadSkills()
      render()
    } catch (error) {
      feedback = error.message
      feedbackKind = "err"
      render()
    }
  }

  async function validateCurrentSkill() {
    if (!selectedSlug) return
    feedback = ""
    try {
      selectedValidation = await apiRequest(`/api/skills/${encodeURIComponent(selectedSlug)}/validate`, {
        method: "POST",
      })
      const errors = Array.isArray(selectedValidation.errors) ? selectedValidation.errors : []
      const warnings = Array.isArray(selectedValidation.warnings) ? selectedValidation.warnings : []
      if (errors.length === 0 && warnings.length === 0) {
        feedback = "Validation passed."
        feedbackKind = "ok"
        showToast("Validation passed.", "ok")
      } else {
        const detail = [
          errors.length > 0 ? `${errors.length} error(s)` : "",
          warnings.length > 0 ? `${warnings.length} warning(s)` : "",
        ]
          .filter(Boolean)
          .join(", ")
        feedback = `Validation: ${detail}`
        feedbackKind = errors.length > 0 ? "err" : "warn-text"
        showToast(
          errors.length > 0 ? `Validation failed: ${detail}` : `Validation finished with ${detail}`,
          errors.length > 0 ? "err" : "warn",
        )
      }
      render()
    } catch (error) {
      feedback = error.message
      feedbackKind = "err"
      selectedValidation = null
      showToast(error.message, "err")
      render()
    }
  }

  async function removeCurrentSkill() {
    if (!selectedSlug || !selectedDetail || selectedDetail.isCore) return
    const confirmed = await modal.confirm({
      title: "Remove skill",
      message: `Remove "${selectedSlug}"? This cannot be undone.`,
      confirmLabel: "Remove",
      cancelLabel: "Cancel",
      danger: true,
    })
    if (!confirmed) return
    feedback = ""
    try {
      await apiRequest(`/api/skills/${encodeURIComponent(selectedSlug)}`, { method: "DELETE" })
      selectedSlug = null
      selectedDetail = null
      view = "list"
      feedback = "Skill removed."
      feedbackKind = "ok"
      await loadSkills({ preserveSelection: false })
      render()
    } catch (error) {
      feedback = error.message
      feedbackKind = "err"
      render()
    }
  }

  async function createNewSkill(slug, description = "") {
    await apiRequest("/api/skills", { method: "POST", body: { slug, description } })
    await loadSkills({ preserveSelection: false })
    await openSkill(slug)
  }

  function renderFeedback(container) {
    if (!feedback) return
    container.appendChild(el("div", msgClassForKind(feedbackKind), feedback))
  }

  function createSkillRow(skill) {
    const isSelected = selectedSlug === skill.slug
    const row = el("button", `${skillRowBase} ${isSelected ? skillRowSelected : ""}`)
    row.type = "button"
    row.dataset.skillSlug = skill.slug
    row.setAttribute("aria-pressed", isSelected ? "true" : "false")

    const dot = el("span", skill.isCore ? dotCore : dotUser)
    const name = el("span", skillName, skill.slug)
    const desc = el("span", skillDesc, skill.description ?? "")
    const badgeEl = el("span", skillBadge, skill.bucket)

    row.append(dot, name, desc, badgeEl)
    row.addEventListener("click", () => void openSkill(skill.slug))
    return row
  }

  function createSection(title, list, { defaultOpen = true } = {}) {
    const section = el("details", "group mb-2", "")
    section.open = defaultOpen

    const summary = el(
      "summary",
      `${sectionLabel} flex cursor-pointer list-none items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-[color-mix(in_oklab,var(--color-hub-surface-2)_78%,transparent)]`,
      "",
    )
    const label = el("span", "", `${title} (${list.length})`)
    const indicator = el(
      "span",
      "text-hub-text-faint transition-transform duration-150 ease-out group-open:rotate-90",
      "›",
    )
    summary.append(label, indicator)
    section.appendChild(summary)

    const content = el("div", "mt-1 space-y-2", "")
    for (const skill of list) {
      content.appendChild(createSkillRow(skill))
    }
    section.appendChild(content)
    return section
  }

  function renderList() {
    closePreviewModal()
    root.className = "min-w-0"
    const wrapper = document.createDocumentFragment()
    const header = el("div", pageHeader)
    const title = el("h1", pageTitle, "Skills")
    const newButton = el("button", btnPrimary, "+ New skill")
    newButton.type = "button"
    newButton.id = "new-skill-btn"

    newButton.addEventListener("click", () => {
      modal.open({
        title: "Create New Skill",
        fields: [
          {
            key: "slug",
            label: "Slug",
            placeholder: "skill-slug",
            required: true,
            autofocus: true,
          },
          {
            key: "description",
            label: "Description (optional)",
            placeholder: "One sentence for the skill frontmatter description",
            type: "textarea",
            rows: 4,
            required: false,
          },
        ],
        onSubmit: async (values, { setInlineError }) => {
          const slug = String(values.slug ?? "").trim()
          const description = String(values.description ?? "").trim()
          if (!slug) {
            setInlineError("Slug is required.")
            return false
          }
          try {
            await createNewSkill(slug, description)
            return true
          } catch (error) {
            setInlineError(error.message)
            return false
          }
        },
      })
    })

    header.append(title, newButton)
    wrapper.appendChild(header)

    const controls = el("div", listControlsRow)
    const categoryGroup = el("label", listControlGroup)
    const categoryLabel = el("span", listControlLabel, "Category")
    const categorySelect = el("select", listControlInput)
    categorySelect.appendChild(el("option", "", "All categories"))
    categorySelect.lastChild.value = "all"
    for (const bucket of getCategoryBuckets()) {
      const option = el("option", "", BUCKET_LABELS[bucket] ?? bucket)
      option.value = bucket
      categorySelect.appendChild(option)
    }
    categorySelect.value = listCategoryFilter
    categorySelect.addEventListener("change", () => {
      listCategoryFilter = categorySelect.value
      render()
    })
    categoryGroup.append(categoryLabel, categorySelect)

    const recencyGroup = el("label", listControlGroup)
    const recencyLabel = el("span", listControlLabel, "Added")
    const recencySelect = el("select", listControlInput)
    const recencyOptions = [
      { value: "all", label: "All" },
      { value: "7d", label: "Last 7 days" },
      { value: "30d", label: "Last 30 days" },
    ]
    for (const optionConfig of recencyOptions) {
      const option = el("option", "", optionConfig.label)
      option.value = optionConfig.value
      recencySelect.appendChild(option)
    }
    recencySelect.value = listRecencyFilter
    recencySelect.addEventListener("change", () => {
      listRecencyFilter = recencySelect.value
      render()
    })
    recencyGroup.append(recencyLabel, recencySelect)

    const sortGroup = el("label", listControlGroup)
    const sortLabel = el("span", listControlLabel, "Sortering")
    const sortSelect = el("select", listControlInput)
    const sortOptions = [
      { value: "category", label: "Badge/category" },
      { value: "newest", label: "Nieuwste eerst" },
    ]
    for (const optionConfig of sortOptions) {
      const option = el("option", "", optionConfig.label)
      option.value = optionConfig.value
      sortSelect.appendChild(option)
    }
    sortSelect.value = listSortMode
    sortSelect.addEventListener("change", () => {
      listSortMode = sortSelect.value
      render()
    })
    sortGroup.append(sortLabel, sortSelect)
    const resetFiltersButton = el("button", btn, "Reset filters")
    resetFiltersButton.type = "button"
    resetFiltersButton.classList.add("h-[34px]")
    const filtersAtDefault =
      listCategoryFilter === "all" && listRecencyFilter === "all" && listSortMode === "category"
    resetFiltersButton.disabled = filtersAtDefault
    for (const className of listControlButtonDisabled.split(" ")) {
      if (!className) continue
      resetFiltersButton.classList.toggle(className, filtersAtDefault)
    }
    resetFiltersButton.addEventListener("click", () => {
      listCategoryFilter = "all"
      listRecencyFilter = "all"
      listSortMode = "category"
      render()
    })
    controls.append(categoryGroup, recencyGroup, sortGroup, resetFiltersButton)
    wrapper.appendChild(controls)

    const gridHeader = el("div", skillGridHeader)
    gridHeader.append(
      el("span", skillGridHeaderCell, ""),
      el("span", skillGridHeaderCell, "Skill"),
      el("span", `${skillGridHeaderCell} max-[980px]:[grid-column:2/4]`, "Description"),
      el("span", `${skillGridHeaderCell} max-[980px]:hidden`, "Bucket"),
    )
    wrapper.appendChild(gridHeader)

    const filteredSkills = getFilteredSkills()
    if (filteredSkills.length === 0) {
      wrapper.appendChild(el("div", emptyState, "No skills found for the selected filters."))
      renderFeedback(wrapper)
      root.replaceChildren(wrapper)
      return
    }

    if (listSortMode === "newest") {
      const newest = [...filteredSkills].sort(sortByNewest)
      wrapper.appendChild(createSection("All matching skills (newest first)", newest, { defaultOpen: true }))
    } else {
      for (const bucket of BUCKET_ORDER) {
        const inBucket = filteredSkills.filter((skill) => skill.bucket === bucket).sort(sortByNewest)
        if (inBucket.length === 0) continue
        wrapper.appendChild(createSection(`${BUCKET_LABELS[bucket] ?? bucket} skills`, inBucket, { defaultOpen: true }))
      }
    }
    renderFeedback(wrapper)

    root.replaceChildren(wrapper)
  }

  function renderDetail() {
    const skillMeta = findSkill(selectedSlug) ?? { slug: selectedSlug, bucket: "unknown" }
    const isCore = Boolean(selectedDetail?.isCore)

    root.className = "flex min-h-0 min-w-0 flex-1 flex-col"
    const wrapper = document.createDocumentFragment()
    if (isCore) {
      wrapper.appendChild(el("div", `${msgClassForKind("warn-text")}`, "Protected core skill: read-only."))
    }
    const shell = el("div", detailShell)
    const header = el("div", detailHeader)

    const backButton = el("button", `${btn} ${btnDetailHeader}`, "← Skills")
    backButton.type = "button"
    backButton.addEventListener("click", () => {
      view = "list"
      selectedDetail = null
      selectedValidation = null
      feedback = ""
      render()
    })

    const title = el("strong", detailTitle, skillMeta.slug)
    const bucketBadge = el("span", skillBadge, skillMeta.bucket)
    const validateButton = el("button", `${btnWarn} ${btnDetailHeader}`, "Validate")
    validateButton.type = "button"
    validateButton.addEventListener("click", () => void validateCurrentSkill())

    header.append(backButton, title, bucketBadge, validateButton)

    if (!isCore) {
      const removeButton = el("button", `${btnDanger} ${btnDetailHeader}`, "Remove")
      removeButton.type = "button"
      removeButton.addEventListener("click", () => void removeCurrentSkill())
      const saveButton = el("button", `${btnPrimary} ${btnDetailHeader}`, "Save")
      saveButton.type = "button"
      saveButton.addEventListener("click", () => void saveCurrentSkill())
      header.append(removeButton, saveButton)
    }

    let showInlinePreview = sessionStorage.getItem(INLINE_PREVIEW_STORAGE_KEY) !== "0"
    let showInlineEditor = sessionStorage.getItem(INLINE_EDITOR_STORAGE_KEY) !== "0"
    let editorFocusStartAtTop = sessionStorage.getItem(EDITOR_FOCUS_START_STORAGE_KEY) !== "0"

    const grid = el("div", editorGrid)
    const editorPane = el("div", pane)
    const previewPane = el("div", paneDivider)

    const editorFileTitle = skillMeta.slug ? `${skillMeta.slug}.md` : "SKILL.md"
    const editorLabelDesktop = el("div", `${paneLabelRow} max-[980px]:hidden`)
    const editorDesktopTitle = el("span", "min-w-0 truncate", editorFileTitle)
    const desktopActions = el("div", editorToolbarActions)
    const focusEditorDesktop = el("button", previewIconBtn)
    focusEditorDesktop.type = "button"
    focusEditorDesktop.setAttribute("aria-label", "Focus editor")
    focusEditorDesktop.setAttribute("title", "Focus editor")
    setToolbarTooltip(focusEditorDesktop, "Focus editor")
    focusEditorDesktop.appendChild(createExpandIcon())
    const focusStartDesktop = el("button", focusStartModeBtn)
    focusStartDesktop.type = "button"
    focusStartDesktop.setAttribute(
      "aria-label",
      editorFocusStartAtTop ? "Focus editor starts at top" : "Focus editor starts at cursor",
    )
    focusStartDesktop.setAttribute(
      "title",
      editorFocusStartAtTop ? "Focus starts at top" : "Focus starts at cursor",
    )
    setToolbarTooltip(
      focusStartDesktop,
      editorFocusStartAtTop ? "Focus starts at top" : "Focus starts at cursor",
    )
    const toggleEditorDesktop = el("button", `${previewIconBtn}`)
    toggleEditorDesktop.type = "button"
    toggleEditorDesktop.setAttribute("data-inline-editor-toggle", "")
    toggleEditorDesktop.setAttribute("aria-pressed", showInlineEditor ? "true" : "false")
    toggleEditorDesktop.setAttribute("aria-controls", "skill-editor")
    toggleEditorDesktop.setAttribute("aria-label", showInlineEditor ? "Minimize editor" : "Restore editor")
    toggleEditorDesktop.setAttribute("title", showInlineEditor ? "Minimize editor" : "Restore editor")
    setToolbarTooltip(toggleEditorDesktop, showInlineEditor ? "Minimize editor" : "Restore editor")
    toggleEditorDesktop.appendChild(createToggleIcon(showInlineEditor))
    desktopActions.append(focusEditorDesktop, focusStartDesktop, toggleEditorDesktop)
    editorLabelDesktop.append(editorDesktopTitle, desktopActions)

    const editorLabelMobile = el("div", `${paneLabelRow} min-[980px]:hidden flex-wrap`)
    const editorLabelMobileTitle = el("span", "min-w-0 shrink", editorFileTitle)
    const mobileActions = el("div", editorToolbarActions)
    const focusEditorMobile = el("button", previewIconBtn)
    focusEditorMobile.type = "button"
    focusEditorMobile.setAttribute("aria-label", "Focus editor")
    focusEditorMobile.setAttribute("title", "Focus editor")
    setToolbarTooltip(focusEditorMobile, "Focus editor")
    focusEditorMobile.appendChild(createExpandIcon())
    const focusStartMobile = el("button", focusStartModeBtn)
    focusStartMobile.type = "button"
    focusStartMobile.setAttribute(
      "aria-label",
      editorFocusStartAtTop ? "Focus editor starts at top" : "Focus editor starts at cursor",
    )
    focusStartMobile.setAttribute(
      "title",
      editorFocusStartAtTop ? "Focus starts at top" : "Focus starts at cursor",
    )
    setToolbarTooltip(
      focusStartMobile,
      editorFocusStartAtTop ? "Focus starts at top" : "Focus starts at cursor",
    )
    const toggleEditorMobile = el("button", `${previewIconBtn}`)
    toggleEditorMobile.type = "button"
    toggleEditorMobile.setAttribute("data-inline-editor-toggle", "")
    toggleEditorMobile.setAttribute("aria-pressed", showInlineEditor ? "true" : "false")
    toggleEditorMobile.setAttribute("aria-controls", "skill-editor")
    toggleEditorMobile.setAttribute("aria-label", showInlineEditor ? "Minimize editor" : "Restore editor")
    toggleEditorMobile.setAttribute("title", showInlineEditor ? "Minimize editor" : "Restore editor")
    setToolbarTooltip(toggleEditorMobile, showInlineEditor ? "Minimize editor" : "Restore editor")
    toggleEditorMobile.appendChild(createToggleIcon(showInlineEditor))
    mobileActions.append(focusEditorMobile, focusStartMobile, toggleEditorMobile)
    editorLabelMobile.append(editorLabelMobileTitle, mobileActions)

    const editor = el("textarea", editorTextarea)
    editor.id = "skill-editor"
    editor.value = selectedDraft
    editor.disabled = isCore

    const preview = el("div", previewBody)
    preview.id = "skill-preview"
    preview.tabIndex = -1
    preview.replaceChildren(renderMarkdown(selectedDraft))

    const previewPanelTitle = skillMeta.slug ? `Preview: ${skillMeta.slug}` : "Preview"
    const previewLabelDesktop = el("div", `${paneLabelRow} max-[980px]:hidden`)
    const previewDesktopTitle = el("span", "min-w-0 truncate", previewPanelTitle)
    const previewDesktopActions = el("div", editorToolbarActions)
    const focusPreviewInlineDesktop = el("button", previewIconBtn)
    focusPreviewInlineDesktop.type = "button"
    focusPreviewInlineDesktop.setAttribute("aria-label", "Focus preview")
    focusPreviewInlineDesktop.setAttribute("title", "Focus preview")
    setToolbarTooltip(focusPreviewInlineDesktop, "Focus preview")
    focusPreviewInlineDesktop.appendChild(createExpandIcon())
    const togglePreviewDesktop = el("button", previewIconBtn)
    togglePreviewDesktop.type = "button"
    togglePreviewDesktop.setAttribute("data-inline-preview-toggle", "")
    togglePreviewDesktop.setAttribute("aria-controls", "skill-preview")
    togglePreviewDesktop.setAttribute("aria-pressed", showInlinePreview ? "true" : "false")
    togglePreviewDesktop.setAttribute("aria-label", showInlinePreview ? "Minimize inline preview" : "Restore inline preview")
    togglePreviewDesktop.setAttribute("title", showInlinePreview ? "Minimize preview" : "Restore preview")
    setToolbarTooltip(togglePreviewDesktop, showInlinePreview ? "Minimize preview" : "Restore preview")
    togglePreviewDesktop.appendChild(createToggleIcon(showInlinePreview))
    previewDesktopActions.append(focusPreviewInlineDesktop, togglePreviewDesktop)
    previewLabelDesktop.append(previewDesktopTitle, previewDesktopActions)

    const previewLabelMobile = el("div", `${paneLabelRow} min-[980px]:hidden flex-wrap`)
    const previewMobileTitle = el("span", "min-w-0 shrink", previewPanelTitle)
    const previewMobileActions = el("div", editorToolbarActions)
    const focusPreviewInlineMobile = el("button", previewIconBtn)
    focusPreviewInlineMobile.type = "button"
    focusPreviewInlineMobile.setAttribute("aria-label", "Focus preview")
    focusPreviewInlineMobile.setAttribute("title", "Focus preview")
    setToolbarTooltip(focusPreviewInlineMobile, "Focus preview")
    focusPreviewInlineMobile.appendChild(createExpandIcon())
    const togglePreviewMobile = el("button", previewIconBtn)
    togglePreviewMobile.type = "button"
    togglePreviewMobile.setAttribute("data-inline-preview-toggle", "")
    togglePreviewMobile.setAttribute("aria-controls", "skill-preview")
    togglePreviewMobile.setAttribute("aria-pressed", showInlinePreview ? "true" : "false")
    togglePreviewMobile.setAttribute("aria-label", showInlinePreview ? "Minimize inline preview" : "Restore inline preview")
    togglePreviewMobile.setAttribute("title", showInlinePreview ? "Minimize preview" : "Restore preview")
    setToolbarTooltip(togglePreviewMobile, showInlinePreview ? "Minimize preview" : "Restore preview")
    togglePreviewMobile.appendChild(createToggleIcon(showInlinePreview))
    previewMobileActions.append(focusPreviewInlineMobile, togglePreviewMobile)
    previewLabelMobile.append(previewMobileTitle, previewMobileActions)

    const focusPreviewInline = focusPreviewInlineDesktop
    const focusPreviewInlineAlt = focusPreviewInlineMobile
    const togglePreview = togglePreviewDesktop
    const togglePreviewAlt = togglePreviewMobile

    function syncDraft(nextValue) {
      selectedDraft = nextValue
      editor.value = nextValue
      preview.replaceChildren(renderMarkdown(nextValue))
      syncOpenPreviewModalBody(nextValue)
    }
    editor.addEventListener("input", () => {
      syncDraft(editor.value)
    })

    function focusEditor() {
      onFocusEditorInput = (nextValue) => syncDraft(nextValue)
      openFocusModal({
        mode: "editor",
        editorText: selectedDraft,
        markdown: selectedDraft,
        startAtTop: editorFocusStartAtTop,
        selectionStart: editor.selectionStart ?? 0,
        selectionEnd: editor.selectionEnd ?? 0,
        inlineScrollTop: editor.scrollTop ?? 0,
      })
    }
    focusEditorDesktop.addEventListener("click", focusEditor)
    focusEditorMobile.addEventListener("click", focusEditor)

    function focusPreview() {
      openFocusModal({ mode: "preview", markdown: selectedDraft, editorText: selectedDraft })
    }
    focusPreviewInline.addEventListener("click", focusPreview)
    focusPreviewInlineAlt.addEventListener("click", focusPreview)

    function syncFocusStartButtons() {
      const label = editorFocusStartAtTop ? "Start: top" : "Start: cursor"
      const ariaLabel = editorFocusStartAtTop ? "Focus editor starts at top" : "Focus editor starts at cursor"
      const title = editorFocusStartAtTop ? "Focus starts at top" : "Focus starts at cursor"
      for (const node of [focusStartDesktop, focusStartMobile]) {
        node.textContent = label
        node.setAttribute("aria-label", ariaLabel)
        node.setAttribute("title", title)
        setToolbarTooltip(node, title)
      }
    }

    function toggleFocusStartMode() {
      editorFocusStartAtTop = !editorFocusStartAtTop
      sessionStorage.setItem(EDITOR_FOCUS_START_STORAGE_KEY, editorFocusStartAtTop ? "1" : "0")
      syncFocusStartButtons()
    }
    syncFocusStartButtons()
    focusStartDesktop.addEventListener("click", toggleFocusStartMode)
    focusStartMobile.addEventListener("click", toggleFocusStartMode)

    function onToggleInlineEditor() {
      showInlineEditor = !showInlineEditor
      sessionStorage.setItem(INLINE_EDITOR_STORAGE_KEY, showInlineEditor ? "1" : "0")
      editor.classList.toggle("hidden", !showInlineEditor)
      syncEditorToggleLabels(showInlineEditor)
    }
    toggleEditorDesktop.addEventListener("click", onToggleInlineEditor)
    toggleEditorMobile.addEventListener("click", onToggleInlineEditor)

    function onToggleInlinePreview() {
      showInlinePreview = !showInlinePreview
      sessionStorage.setItem(INLINE_PREVIEW_STORAGE_KEY, showInlinePreview ? "1" : "0")
      preview.classList.toggle("hidden", !showInlinePreview)
      syncInlinePreviewToggleLabels(showInlinePreview)
    }
    togglePreview.addEventListener("click", onToggleInlinePreview)
    togglePreviewAlt.addEventListener("click", onToggleInlinePreview)

    editorPane.appendChild(editorLabelDesktop)
    editorPane.appendChild(editorLabelMobile)
    editorPane.appendChild(editor)
    previewPane.appendChild(previewLabelDesktop)
    previewPane.appendChild(previewLabelMobile)
    previewPane.appendChild(preview)
    grid.append(editorPane, previewPane)
    shell.append(header, grid)
    wrapper.appendChild(shell)
    if (selectedValidation && (Array.isArray(selectedValidation.errors) || Array.isArray(selectedValidation.warnings))) {
      const validationBlock = el("div", validationResults)
      const errors = Array.isArray(selectedValidation.errors) ? selectedValidation.errors : []
      const warnings = Array.isArray(selectedValidation.warnings) ? selectedValidation.warnings : []
      if (errors.length > 0) {
        validationBlock.appendChild(el("div", `${validationTitleBase} text-hub-err`, "Errors"))
        const list = el("ul", `${validationList} text-hub-err`)
        for (const message of errors) {
          list.appendChild(el("li", "", message))
        }
        validationBlock.appendChild(list)
      }
      if (warnings.length > 0) {
        validationBlock.appendChild(el("div", `${validationTitleBase} text-hub-warn`, "Warnings"))
        const list = el("ul", `${validationList} text-hub-warn`)
        for (const message of warnings) {
          list.appendChild(el("li", "", message))
        }
        validationBlock.appendChild(list)
      }
      wrapper.appendChild(validationBlock)
    }
    renderFeedback(wrapper)

    root.replaceChildren(wrapper)
    editor.classList.toggle("hidden", !showInlineEditor)
    preview.classList.toggle("hidden", !showInlinePreview)
    syncEditorToggleLabels(showInlineEditor)
    syncInlinePreviewToggleLabels(showInlinePreview)
    syncOpenPreviewModalBody(selectedDraft)
  }

  function render() {
    if (view === "list") {
      renderList()
      return
    }
    renderDetail()
  }

  return {
    dismissOverlays() {
      closePreviewModal()
    },
    async mount() {
      wirePreviewModalDom()
      await loadSkills({ preserveSelection: false })
      view = "list"
      render()
    },
  }
}
