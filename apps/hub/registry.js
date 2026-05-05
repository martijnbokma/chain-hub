function el(tag, className, text) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (typeof text === "string") node.textContent = text
  return node
}

function normalizeSearchValue(value) {
  return value.trim().toLowerCase()
}

function formatSourceLabel(source) {
  if (source === "bundled") return "bundled fallback"
  if (source === "live") return "live"
  return source ?? "unknown"
}

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
    const button = el("button", `btn ${isInstalled ? "installed" : "primary"}`, isInstalled ? "Installed" : "Install")
    button.type = "button"
    button.disabled = isInstalled || loading

    if (!isInstalled) {
      button.addEventListener("click", () => void installSlug(slug))
    }

    return button
  }

  function renderCard(skill) {
    const card = el("div", "registry-card")
    const info = el("div", "registry-card-info")
    const slug = el("div", "registry-card-slug", skill.slug ?? "")
    const description = el("div", "registry-card-desc", skill.description ?? "")
    const sourceText = typeof skill.source === "string" ? skill.source : "unknown source"
    const versionText = typeof skill.version === "string" ? skill.version : "unknown version"
    const meta = el("div", "registry-card-meta", `${versionText} · ${sourceText}`)

    info.append(slug, description, meta)
    card.append(info, createInstallButton(skill))
    return card
  }

  function render() {
    const wrapper = document.createDocumentFragment()
    const header = el("div", "page-header")
    header.appendChild(el("h1", "page-title", "Registry"))
    wrapper.appendChild(header)

    const sourceLabel = el("div", "section-label", `Official registry (${allSkills.length}) · ${formatSourceLabel(source)}`)
    wrapper.appendChild(sourceLabel)

    const searchRow = el("div", "registry-search-row")
    const searchInput = el("input", "registry-search-input")
    searchInput.type = "search"
    searchInput.placeholder = "Search by slug or description"
    searchInput.value = search
    searchInput.addEventListener("input", () => {
      search = searchInput.value
      render()
    })
    searchRow.appendChild(searchInput)
    wrapper.appendChild(searchRow)

    const githubRow = el("div", "registry-github-row")
    const githubLabel = el("label", "registry-github-label", "github:")
    const githubInputEl = el("input", "registry-github-input")
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
    const githubButton = el("button", "btn primary", loading ? "Installing..." : "Install")
    githubButton.type = "button"
    githubButton.disabled = loading
    githubButton.addEventListener("click", () => void installFromGithubInput())
    githubRow.append(githubLabel, githubInputEl, githubButton)
    wrapper.appendChild(githubRow)

    const cards = el("div", "registry-cards")
    const filtered = filteredSkills()
    if (filtered.length === 0) {
      cards.appendChild(el("div", "msg warn-text", "No registry skills match this filter."))
    } else {
      for (const skill of filtered) {
        cards.appendChild(renderCard(skill))
      }
    }
    wrapper.appendChild(cards)

    if (feedback) {
      wrapper.appendChild(el("div", `msg ${feedbackKind}`, feedback))
    }

    root.replaceChildren(wrapper)
  }

  return {
    async mount() {
      await loadRegistry()
    },
  }
}
