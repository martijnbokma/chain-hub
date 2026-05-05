import { renderMarkdown } from "./markdown.js"

function el(tag, className, text) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (typeof text === "string") node.textContent = text
  return node
}

export function createSkillsView({ root, setChainHomeBar, setBanner, apiRequest, modal }) {
  let skills = []
  let selectedSlug = null
  let selectedDetail = null
  let selectedDraft = ""
  let selectedValidation = null
  let feedback = ""
  let feedbackKind = "ok"

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
      } else {
        const detail = [
          errors.length > 0 ? `${errors.length} error(s)` : "",
          warnings.length > 0 ? `${warnings.length} warning(s)` : "",
        ]
          .filter(Boolean)
          .join(", ")
        feedback = `Validation: ${detail}`
        feedbackKind = errors.length > 0 ? "err" : "warn-text"
      }
      render()
    } catch (error) {
      feedback = error.message
      feedbackKind = "err"
      selectedValidation = null
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
    container.appendChild(el("div", `msg ${feedbackKind}`, feedback))
  }

  function createSkillRow(skill) {
    const row = el("button", "skill-row")
    row.type = "button"
    row.dataset.skillSlug = skill.slug

    const dot = el("span", `dot ${skill.isCore ? "core" : "user"}`)
    const name = el("span", "skill-name", skill.slug)
    const desc = el("span", "skill-desc", skill.description ?? "")
    const badge = el("span", "badge", skill.bucket)

    row.append(dot, name, desc, badge)
    row.addEventListener("click", () => void openSkill(skill.slug))
    return row
  }

  function createSection(title, list) {
    const container = document.createDocumentFragment()
    container.appendChild(el("div", "section-label", `${title} (${list.length})`))
    for (const skill of list) {
      container.appendChild(createSkillRow(skill))
    }
    return container
  }

  function renderList() {
    const wrapper = document.createDocumentFragment()
    const header = el("div", "page-header")
    const title = el("h1", "page-title", "Skills")
    const newButton = el("button", "btn primary", "+ New skill")
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

    const wrapper = document.createDocumentFragment()
    const shell = el("div", "detail-shell")
    const header = el("div", "detail-header")

    const backButton = el("button", "btn", "← Skills")
    backButton.type = "button"
    backButton.addEventListener("click", () => {
      selectedSlug = null
      selectedDetail = null
      feedback = ""
      render()
    })

    const title = el("strong", "detail-title", skillMeta.slug)
    const badge = el("span", "badge", skillMeta.bucket)
    const validateButton = el("button", "btn warn", "Validate")
    validateButton.type = "button"
    validateButton.addEventListener("click", () => void validateCurrentSkill())

    header.append(backButton, title, badge, validateButton)

    if (!isCore) {
      const removeButton = el("button", "btn danger", "Remove")
      removeButton.type = "button"
      removeButton.addEventListener("click", () => void removeCurrentSkill())
      const saveButton = el("button", "btn primary", "Save")
      saveButton.type = "button"
      saveButton.addEventListener("click", () => void saveCurrentSkill())
      header.append(removeButton, saveButton)
    }

    const grid = el("div", "editor-grid")
    const editorPane = el("div", "pane")
    const previewPane = el("div", "pane")
    editorPane.appendChild(el("div", "pane-label", "SKILL.md"))
    previewPane.appendChild(el("div", "pane-label", "Preview"))

    const editor = el("textarea", "editor-textarea")
    editor.id = "skill-editor"
    editor.value = selectedDraft
    editor.disabled = isCore

    const preview = el("div", "preview")
    preview.id = "skill-preview"
    preview.replaceChildren(renderMarkdown(selectedDraft))

    editor.addEventListener("input", () => {
      selectedDraft = editor.value
      preview.replaceChildren(renderMarkdown(editor.value))
    })

    editorPane.appendChild(editor)
    previewPane.appendChild(preview)
    grid.append(editorPane, previewPane)
    shell.append(header, grid)
    wrapper.appendChild(shell)

    if (isCore) {
      wrapper.appendChild(el("div", "msg warn-text", "Protected core skill: read-only."))
    }
    if (selectedValidation && (Array.isArray(selectedValidation.errors) || Array.isArray(selectedValidation.warnings))) {
      const validationBlock = el("div", "validation-results")
      const errors = Array.isArray(selectedValidation.errors) ? selectedValidation.errors : []
      const warnings = Array.isArray(selectedValidation.warnings) ? selectedValidation.warnings : []
      if (errors.length > 0) {
        validationBlock.appendChild(el("div", "validation-title err", "Errors"))
        const list = el("ul", "validation-list validation-errors")
        for (const message of errors) {
          list.appendChild(el("li", "validation-item", message))
        }
        validationBlock.appendChild(list)
      }
      if (warnings.length > 0) {
        validationBlock.appendChild(el("div", "validation-title warn-text", "Warnings"))
        const list = el("ul", "validation-list validation-warnings")
        for (const message of warnings) {
          list.appendChild(el("li", "validation-item", message))
        }
        validationBlock.appendChild(list)
      }
      wrapper.appendChild(validationBlock)
    }
    renderFeedback(wrapper)

    root.replaceChildren(wrapper)
  }

  function render() {
    if (!selectedSlug) {
      renderList()
      return
    }
    renderDetail()
  }

  return {
    async mount() {
      await loadSkills({ preserveSelection: false })
      render()
    },
  }
}
