import { createSkillsView } from "./skills.js"
import { createStatusView } from "./status.js"
import { createRegistryView } from "./registry.js"

const viewRoot = document.querySelector("#view-root")
const chainHomeBar = document.querySelector("#chain-home-bar")
const globalBanner = document.querySelector("#global-banner")
const modalRoot = document.querySelector("#modal-root")
const sidebarUrl = document.querySelector("#sidebar-url")

if (!(viewRoot instanceof HTMLElement)) {
  throw new Error("Missing #view-root")
}

if (sidebarUrl instanceof HTMLElement) {
  sidebarUrl.textContent = window.location.host
}

function setChainHomeBar(path, source) {
  if (!(chainHomeBar instanceof HTMLElement)) return
  if (!path) {
    chainHomeBar.textContent = ""
    return
  }
  chainHomeBar.textContent = `CHAIN_HOME: ${path}${source ? ` (${source})` : ""}`
}

function setBanner(message) {
  if (!(globalBanner instanceof HTMLElement)) return
  if (!message) {
    globalBanner.textContent = ""
    globalBanner.classList.add("hidden")
    return
  }
  globalBanner.textContent = message
  globalBanner.classList.remove("hidden")
}

async function apiRequest(path, options = {}) {
  const headers = { "content-type": "application/json", ...(options.headers ?? {}) }
  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = payload?.error ?? `Request failed (${response.status})`
    throw new Error(error)
  }
  return payload
}

function createModalManager() {
  if (!(modalRoot instanceof HTMLElement)) {
    return { open() {} }
  }

  function close() {
    modalRoot.classList.add("hidden")
    modalRoot.setAttribute("aria-hidden", "true")
    modalRoot.replaceChildren()
  }

  return {
    open({ title, placeholder, onSubmit }) {
      modalRoot.classList.remove("hidden")
      modalRoot.setAttribute("aria-hidden", "false")

      const card = document.createElement("div")
      card.className = "modal"

      const heading = document.createElement("h2")
      heading.textContent = title
      const input = document.createElement("input")
      input.type = "text"
      input.placeholder = placeholder
      input.autofocus = true

      const errorLine = document.createElement("div")
      errorLine.className = "msg err"

      const actions = document.createElement("div")
      actions.className = "modal-actions"
      const cancelButton = document.createElement("button")
      cancelButton.className = "btn"
      cancelButton.type = "button"
      cancelButton.textContent = "Cancel"

      const createButton = document.createElement("button")
      createButton.className = "btn primary"
      createButton.type = "button"
      createButton.textContent = "Create"

      cancelButton.addEventListener("click", close)
      createButton.addEventListener("click", async () => {
        const ok = await onSubmit(input.value, {
          setInlineError(message) {
            errorLine.textContent = message
          },
        })
        if (ok) close()
      })
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault()
          createButton.click()
        }
      })

      actions.append(cancelButton, createButton)
      card.append(heading, input, errorLine, actions)
      modalRoot.replaceChildren(card)
      input.focus()
    },
  }
}

function setActiveNav(route) {
  for (const link of document.querySelectorAll("[data-nav]")) {
    const key = link.getAttribute("data-nav")
    link.classList.toggle("active", key === route)
  }
}

const modal = createModalManager()
const skillsView = createSkillsView({ root: viewRoot, setChainHomeBar, setBanner, apiRequest, modal })
const statusView = createStatusView({ root: viewRoot, setChainHomeBar, apiRequest })
const registryView = createRegistryView({ root: viewRoot, setBanner, setChainHomeBar, apiRequest })

async function renderRoute() {
  const route = window.location.hash.replace(/^#/, "") || "skills"
  setActiveNav(route)
  setBanner("")

  if (route === "skills") {
    await skillsView.mount()
    return
  }
  if (route === "status") {
    await statusView.mount()
    return
  }
  if (route === "registry") {
    await registryView.mount()
    return
  }

  const wrapper = document.createElement("div")
  wrapper.className = "page-header"
  const title = document.createElement("h1")
  title.className = "page-title"
  title.textContent = "Registry view ships in T4."
  wrapper.appendChild(title)
  viewRoot.replaceChildren(wrapper)
}

window.addEventListener("hashchange", () => {
  void renderRoute()
})

void renderRoute()
