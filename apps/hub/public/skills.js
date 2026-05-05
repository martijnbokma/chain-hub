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

const pane = "flex min-h-0 min-w-0 flex-col"

const paneDivider = `${pane} border-l border-hub-border max-[980px]:border-t max-[980px]:border-l-0 max-[980px]:border-hub-border`

const paneLabel =
  "shrink-0 border-b border-hub-border px-[0.6rem] py-[0.45rem] text-[0.67rem] tracking-wide text-hub-text-faint uppercase"

const paneLabelRow =
  "shrink-0 flex items-center justify-between gap-2 border-b border-hub-border px-[0.6rem] py-[0.45rem] text-[0.67rem] tracking-wide text-hub-text-faint uppercase"

/** Opens the fullscreen preview modal (editor toolbars on all breakpoints). */
const previewFocusBtn = `${btn} ${btnDetailHeader} inline-flex shrink-0 items-center justify-center px-[0.55rem] py-[0.28rem] text-[0.72rem] font-normal tracking-normal normal-case`

const editorToolbarActions = "flex flex-wrap items-center justify-end gap-1.5 shrink-0"

const editorTextarea = `min-h-0 w-full flex-1 resize-none overflow-y-auto border-0 bg-[#0a1020] p-[0.7rem] font-inherit text-hub-text outline-none focus:outline-none ${focusRing}`

const previewBody = "preview min-h-0 flex-1 overflow-y-auto p-3"

const validationResults =
  "mt-[0.7rem] border border-hub-border bg-[rgba(10,16,32,0.76)] px-[0.7rem] py-[0.6rem]"

const validationTitleBase =
  "my-[0.35rem] text-[0.72rem] tracking-wide uppercase"

const validationList =
  "mb-[0.6rem] ml-0 list-disc pl-[1.1rem] text-[0.75rem] leading-snug last:mb-0"

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

  function getPreviewModalEls() {
    const rootEl = document.getElementById("preview-modal-root")
    if (!rootEl) return null
    return {
      root: rootEl,
      backdrop: rootEl.querySelector(".preview-modal__backdrop"),
      body: rootEl.querySelector(".preview-modal__body"),
      close: rootEl.querySelector(".preview-modal__close"),
    }
  }

  function closePreviewModal() {
    const els = getPreviewModalEls()
    if (!els || els.root.classList.contains("hidden")) return
    els.root.classList.add("hidden")
    els.root.setAttribute("aria-hidden", "true")
    document.body.classList.remove("overflow-hidden")
    previewModalEscapeAc?.abort()
    previewModalEscapeAc = null
  }

  function openPreviewModal(markdown) {
    const els = getPreviewModalEls()
    if (!els) return
    els.body.replaceChildren(renderMarkdown(markdown))
    els.root.classList.remove("hidden")
    els.root.setAttribute("aria-hidden", "false")
    document.body.classList.add("overflow-hidden")
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
    els.close?.focus()
  }

  function syncOpenPreviewModalBody() {
    const els = getPreviewModalEls()
    if (!els || els.root.classList.contains("hidden")) return
    els.body.replaceChildren(renderMarkdown(selectedDraft))
  }

  function wirePreviewModalDom() {
    if (previewModalDomWired) return
    const els = getPreviewModalEls()
    if (!els) return
    previewModalDomWired = true
    els.backdrop?.addEventListener("click", closePreviewModal)
    els.close?.addEventListener("click", closePreviewModal)
  }

  function syncInlinePreviewToggleLabels(showing) {
    for (const node of document.querySelectorAll("[data-inline-preview-toggle]")) {
      if (!(node instanceof HTMLButtonElement)) continue
      node.textContent = showing ? "Hide preview" : "Show preview"
      node.setAttribute("aria-pressed", showing ? "true" : "false")
    }
  }

  function findSkill(slug) {
    return skills.find((item) => item.slug === slug) ?? null
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
    if (!window.confirm(`Remove '${selectedSlug}'? This cannot be undone.`)) return
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

  async function createNewSkill(slug) {
    await apiRequest("/api/skills", { method: "POST", body: { slug } })
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

  function createSection(title, list) {
    const container = document.createDocumentFragment()
    container.appendChild(el("div", sectionLabel, `${title} (${list.length})`))
    for (const skill of list) {
      container.appendChild(createSkillRow(skill))
    }
    return container
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
        placeholder: "skill-slug",
        onSubmit: async (value, { setInlineError }) => {
          const slug = value.trim()
          if (!slug) {
            setInlineError("Slug is required.")
            return false
          }
          try {
            await createNewSkill(slug)
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

    const gridHeader = el("div", skillGridHeader)
    gridHeader.append(
      el("span", skillGridHeaderCell, ""),
      el("span", skillGridHeaderCell, "Skill"),
      el("span", `${skillGridHeaderCell} max-[980px]:[grid-column:2/4]`, "Description"),
      el("span", skillGridHeaderCell, "Bucket"),
    )
    wrapper.appendChild(gridHeader)

    const coreSkills = skills.filter((skill) => skill.isCore)
    const userSkills = skills.filter((skill) => !skill.isCore)
    wrapper.appendChild(createSection("Protected core skills", coreSkills))
    wrapper.appendChild(createSection("User-installed skills", userSkills))
    renderFeedback(wrapper)

    root.replaceChildren(wrapper)
  }

  function renderDetail() {
    const skillMeta = findSkill(selectedSlug) ?? { slug: selectedSlug, bucket: "unknown" }
    const isCore = Boolean(selectedDetail?.isCore)

    root.className = "flex min-h-0 min-w-0 flex-1 flex-col"
    const wrapper = document.createDocumentFragment()
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

    const showInlinePreview = sessionStorage.getItem(INLINE_PREVIEW_STORAGE_KEY) !== "0"

    const grid = el("div", showInlinePreview ? editorGrid : editorGridEditorOnly)
    const editorPane = el("div", pane)
    const previewPane = el("div", showInlinePreview ? paneDivider : `${paneDivider} hidden`)

    const editorLabelDesktop = el("div", `${paneLabelRow} max-[980px]:hidden`)
    const editorDesktopTitle = el("span", "min-w-0 truncate", "SKILL.md")
    const desktopActions = el("div", editorToolbarActions)
    const focusPreviewDesktop = el("button", previewFocusBtn, "Focus")
    focusPreviewDesktop.type = "button"
    focusPreviewDesktop.setAttribute("aria-haspopup", "dialog")
    focusPreviewDesktop.setAttribute("aria-label", "Open rendered markdown preview fullscreen")
    const togglePreviewDesktop = el(
      "button",
      `${previewFocusBtn}`,
      showInlinePreview ? "Hide preview" : "Show preview",
    )
    togglePreviewDesktop.type = "button"
    togglePreviewDesktop.setAttribute("data-inline-preview-toggle", "")
    togglePreviewDesktop.setAttribute("aria-pressed", showInlinePreview ? "true" : "false")
    togglePreviewDesktop.setAttribute("aria-controls", "skill-preview")
    desktopActions.append(focusPreviewDesktop, togglePreviewDesktop)
    editorLabelDesktop.append(editorDesktopTitle, desktopActions)

    const editorLabelMobile = el("div", `${paneLabelRow} min-[980px]:hidden flex-wrap`)
    const editorLabelMobileTitle = el("span", "min-w-0 shrink", "SKILL.md")
    const mobileActions = el("div", editorToolbarActions)
    const focusPreviewMobile = el("button", previewFocusBtn, "Focus")
    focusPreviewMobile.type = "button"
    focusPreviewMobile.setAttribute("aria-haspopup", "dialog")
    focusPreviewMobile.setAttribute("aria-label", "Open rendered markdown preview fullscreen")
    const togglePreviewMobile = el(
      "button",
      `${previewFocusBtn}`,
      showInlinePreview ? "Hide preview" : "Show preview",
    )
    togglePreviewMobile.type = "button"
    togglePreviewMobile.setAttribute("data-inline-preview-toggle", "")
    togglePreviewMobile.setAttribute("aria-pressed", showInlinePreview ? "true" : "false")
    togglePreviewMobile.setAttribute("aria-controls", "skill-preview")
    mobileActions.append(focusPreviewMobile, togglePreviewMobile)
    editorLabelMobile.append(editorLabelMobileTitle, mobileActions)

    const editor = el("textarea", editorTextarea)
    editor.id = "skill-editor"
    editor.value = selectedDraft
    editor.disabled = isCore

    const preview = el("div", previewBody)
    preview.id = "skill-preview"
    preview.replaceChildren(renderMarkdown(selectedDraft))

    editor.addEventListener("input", () => {
      selectedDraft = editor.value
      preview.replaceChildren(renderMarkdown(editor.value))
      syncOpenPreviewModalBody()
    })

    function openFocusPreview() {
      openPreviewModal(editor.value)
    }
    focusPreviewDesktop.addEventListener("click", openFocusPreview)
    focusPreviewMobile.addEventListener("click", openFocusPreview)

    function onToggleInlinePreview() {
      const currentlyShowing = !previewPane.classList.contains("hidden")
      const nextShow = !currentlyShowing
      sessionStorage.setItem(INLINE_PREVIEW_STORAGE_KEY, nextShow ? "1" : "0")
      previewPane.classList.toggle("hidden", !nextShow)
      grid.className = nextShow ? editorGrid : editorGridEditorOnly
      syncInlinePreviewToggleLabels(nextShow)
    }
    togglePreviewDesktop.addEventListener("click", onToggleInlinePreview)
    togglePreviewMobile.addEventListener("click", onToggleInlinePreview)

    previewPane.appendChild(el("div", paneLabel, "Preview"))
    editorPane.appendChild(editorLabelDesktop)
    editorPane.appendChild(editorLabelMobile)
    editorPane.appendChild(editor)
    previewPane.appendChild(preview)
    grid.append(editorPane, previewPane)
    shell.append(header, grid)
    wrapper.appendChild(shell)

    if (isCore) {
      wrapper.appendChild(el("div", `${msgClassForKind("warn-text")}`, "Protected core skill: read-only."))
    }
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
    syncOpenPreviewModalBody()
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
