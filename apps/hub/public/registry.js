import { btn, btnPrimary, btnInstalled, msgClassForKind, focusRing, pageHeader, pageTitle, sectionLabel } from "./ui-classes.js"
import { el } from "./dom.js"

function normalizeSearchValue(value) {
  return value.trim().toLowerCase()
}

function formatSourceLabel(source) {
  if (source === "bundled") return "bundled fallback"
  if (source === "live") return "live"
  return source ?? "unknown"
}

const registrySearchRow = "mb-[0.6rem]"

const registrySearchInput = `w-full rounded-[5px] border border-hub-border-strong bg-[#0a1020] px-[0.55rem] py-[0.45rem] font-inherit text-hub-text focus:border-hub-accent focus:outline-none ${focusRing}`

const registryGithubRow =
  "mb-[0.8rem] grid grid-cols-[auto_1fr_auto] items-center gap-2 border border-hub-border bg-[rgba(16,24,44,0.64)] p-[0.6rem] max-[980px]:grid-cols-1"

const registryGithubLabel = "text-[0.78rem] text-hub-text-faint"

const registryCards = "grid gap-1"

const registryCard =
  "flex items-start gap-3 border border-hub-border bg-[color-mix(in_oklab,var(--color-hub-surface-1)_85%,transparent)] p-[0.65rem]"

const registryCardInfo = "min-w-0 flex-1"

const registryCardSlug = "mb-[0.2rem] text-[0.82rem] text-[#f3f6ff]"

const registryCardDesc = "text-[0.76rem] leading-snug text-hub-text-dim"

const registryCardMeta = "mt-1 text-[0.7rem] text-hub-text-faint"

export function createRegistryView({ root, setBanner, setChainHomeBar, apiRequest }) {
  let allSkills = []
  let installed = new Set()
  let search = ""
  let source = "live"
  let feedback = ""
  let feedbackKind = "ok"
  let loading = false
  let githubInput = ""

  async function loadRegistry({ clearFeedback = true } = {}) {
    setBanner("")
    if (clearFeedback) {
      feedback = ""
    }

    try {
      const [registryPayload, skillsPayload] = await Promise.all([
        apiRequest("/api/registry"),
        apiRequest("/api/skills"),
      ])

      const registrySkills = Array.isArray(registryPayload?.skills) ? registryPayload.skills : []
      const installedSlugs = Array.isArray(skillsPayload?.skills)
        ? skillsPayload.skills.map((skill) => skill.slug)
        : []

      allSkills = registrySkills
      source = typeof registryPayload?.source === "string" ? registryPayload.source : "live"
      installed = new Set(installedSlugs)
      if (typeof setChainHomeBar === "function") {
        setChainHomeBar(skillsPayload?.chainHome ?? "", skillsPayload?.source ?? "")
      }

      if (source === "bundled") {
        setBanner("Registry network unavailable. Showing bundled index fallback.")
      }
      render()
    } catch (error) {
      allSkills = []
      installed = new Set()
      source = "live"
      feedback = error.message
      feedbackKind = "err"
      render()
    }
  }

  function filteredSkills() {
    const query = normalizeSearchValue(search)
    if (!query) return allSkills
    return allSkills.filter((skill) => {
      const slug = typeof skill.slug === "string" ? skill.slug.toLowerCase() : ""
      const description = typeof skill.description === "string" ? skill.description.toLowerCase() : ""
      return slug.includes(query) || description.includes(query)
    })
  }

  async function installSlug(slug, { githubRef = null } = {}) {
    loading = true
    feedback = ""
    render()
    try {
      await apiRequest("/api/registry/install", {
        method: "POST",
        body: { slug },
      })
      if (githubRef) {
        githubInput = ""
      }
      await loadRegistry({ clearFeedback: false })
      feedback = githubRef ? `Installed ${githubRef}.` : `Installed ${slug}.`
      feedbackKind = "ok"
    } catch (error) {
      feedback = error.message
      feedbackKind = "err"
    } finally {
      loading = false
      render()
    }
  }

  async function installFromGithubInput() {
    const trimmed = githubInput.trim()
    if (!trimmed) {
      feedback = "GitHub reference is required (owner/repo)."
      feedbackKind = "err"
      render()
      return
    }

    if (!/^[^/\s]+\/[^/\s]+$/.test(trimmed)) {
      feedback = "Invalid GitHub reference. Use owner/repo."
      feedbackKind = "err"
      render()
      return
    }

    const ref = `github:${trimmed}`
    await installSlug(ref, { githubRef: ref })
  }

  function createInstallButton(skill) {
    const slug = typeof skill.slug === "string" ? skill.slug : ""
    const isInstalled = installed.has(slug)
    const button = el(
      "button",
      isInstalled ? btnInstalled : btnPrimary,
      isInstalled ? "Installed" : "Install",
    )
    button.type = "button"
    button.disabled = isInstalled || loading

    if (!isInstalled) {
      button.addEventListener("click", () => void installSlug(slug))
    }

    return button
  }

  function renderCard(skill) {
    const card = el("div", registryCard)
    const info = el("div", registryCardInfo)
    const slug = el("div", registryCardSlug, skill.slug ?? "")
    const description = el("div", registryCardDesc, skill.description ?? "")
    const sourceText = typeof skill.source === "string" ? skill.source : "unknown source"
    const versionText = typeof skill.version === "string" ? skill.version : "unknown version"
    const meta = el("div", registryCardMeta, `${versionText} · ${sourceText}`)

    info.append(slug, description, meta)
    card.append(info, createInstallButton(skill))
    return card
  }

  function render() {
    root.className = "min-w-0"
    const wrapper = document.createDocumentFragment()
    const header = el("div", pageHeader)
    header.appendChild(el("h1", pageTitle, "Registry"))
    wrapper.appendChild(header)

    const sourceLabel = el(
      "div",
      sectionLabel,
      `Official registry (${allSkills.length}) · ${formatSourceLabel(source)}`,
    )
    wrapper.appendChild(sourceLabel)

    const searchRow = el("div", registrySearchRow)
    const searchInput = el("input", registrySearchInput)
    searchInput.type = "search"
    searchInput.placeholder = "Search by slug or description"
    searchInput.value = search
    searchInput.addEventListener("input", () => {
      search = searchInput.value
      render()
    })
    searchRow.appendChild(searchInput)
    wrapper.appendChild(searchRow)

    const githubRow = el("div", registryGithubRow)
    const githubLabel = el("label", registryGithubLabel, "github:")
    const githubInputEl = el("input", registrySearchInput)
    githubInputEl.type = "text"
    githubInputEl.placeholder = "owner/repo"
    githubInputEl.value = githubInput
    githubInputEl.addEventListener("input", () => {
      githubInput = githubInputEl.value
    })
    githubInputEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault()
        void installFromGithubInput()
      }
    })
    const githubButton = el("button", btnPrimary, loading ? "Installing..." : "Install")
    githubButton.type = "button"
    githubButton.disabled = loading
    githubButton.addEventListener("click", () => void installFromGithubInput())
    githubRow.append(githubLabel, githubInputEl, githubButton)
    wrapper.appendChild(githubRow)

    const cards = el("div", registryCards)
    const filtered = filteredSkills()
    if (filtered.length === 0) {
      cards.appendChild(
        el("div", `${msgClassForKind("warn-text")} mt-0`, "No registry skills match this filter."),
      )
    } else {
      for (const skill of filtered) {
        cards.appendChild(renderCard(skill))
      }
    }
    wrapper.appendChild(cards)

    if (feedback) {
      wrapper.appendChild(el("div", msgClassForKind(feedbackKind), feedback))
    }

    root.replaceChildren(wrapper)
  }

  return {
    async mount() {
      await loadRegistry()
    },
  }
}
