import { createSkillsView } from "./skills.js"
import { createStatusView } from "./status.js"
import { createRegistryView } from "./registry.js"
import { btn, btnPrimary, focusRing, msgErr } from "./ui-classes.js"

const viewRoot = document.querySelector("#view-root")
const chainHomeBar = document.querySelector("#chain-home-bar")
const globalBanner = document.querySelector("#global-banner")
const modalRoot = document.querySelector("#modal-root")
const appShell = document.querySelector(".app-shell")
const sidebarToggle = document.querySelector("#sidebar-toggle")
const sidebarBackdrop = document.querySelector("#sidebar-backdrop")
const sidebarUrl = document.querySelector("#sidebar-url")
const mobileUrl = document.querySelector("#mobile-url")

if (!(viewRoot instanceof HTMLElement)) {
  throw new Error("Missing #view-root")
}

if (sidebarUrl instanceof HTMLElement) {
  sidebarUrl.textContent = window.location.host
}
if (mobileUrl instanceof HTMLElement) {
  mobileUrl.textContent = window.location.host
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
      card.className =
        "w-[min(500px,calc(100vw-2rem))] rounded-lg border border-hub-border-strong bg-[#0f172e] p-[0.9rem]"

      const heading = document.createElement("h2")
      heading.className = "mb-[0.7rem] mt-0 text-[0.9rem]"
      heading.textContent = title
      const input = document.createElement("input")
      input.type = "text"
      input.placeholder = placeholder
      input.autofocus = true
      input.className = `w-full rounded-[5px] border border-hub-border-strong bg-[#0a1020] px-[0.55rem] py-[0.45rem] font-inherit text-hub-text ${focusRing} focus:border-hub-accent focus:outline-none`

      const errorLine = document.createElement("div")
      errorLine.className = msgErr

      const actions = document.createElement("div")
      actions.className = "mt-[0.8rem] flex justify-end gap-2"
      const cancelButton = document.createElement("button")
      cancelButton.className = btn
      cancelButton.type = "button"
      cancelButton.textContent = "Cancel"

      const createButton = document.createElement("button")
      createButton.className = btnPrimary
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
    if (key === route) {
      link.setAttribute("aria-current", "page")
    } else {
      link.removeAttribute("aria-current")
    }
  }
}

function setSidebarOpen(isOpen) {
  if (!(appShell instanceof HTMLElement)) return
  appShell.classList.toggle("sidebar-open", isOpen)
  if (sidebarToggle instanceof HTMLButtonElement) {
    sidebarToggle.setAttribute("aria-expanded", isOpen ? "true" : "false")
  }
  if (sidebarBackdrop instanceof HTMLElement) {
    sidebarBackdrop.classList.toggle("hidden", !isOpen)
  }
}

if (sidebarToggle instanceof HTMLButtonElement) {
  sidebarToggle.addEventListener("click", () => {
    const isOpen = appShell instanceof HTMLElement && appShell.classList.contains("sidebar-open")
    setSidebarOpen(!isOpen)
  })
}

if (sidebarBackdrop instanceof HTMLElement) {
  sidebarBackdrop.addEventListener("click", () => {
    setSidebarOpen(false)
  })
}

for (const link of document.querySelectorAll("[data-nav]")) {
  link.addEventListener("click", () => {
    setSidebarOpen(false)
  })
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setSidebarOpen(false)
  }
})

const modal = createModalManager()
const skillsView = createSkillsView({ root: viewRoot, setChainHomeBar, setBanner, apiRequest, modal })
const statusView = createStatusView({ root: viewRoot, setChainHomeBar, apiRequest })
const registryView = createRegistryView({ root: viewRoot, setBanner, setChainHomeBar, apiRequest })

async function renderRoute() {
  const route = window.location.hash.replace(/^#/, "") || "skills"
  setSidebarOpen(false)
  setActiveNav(route)
  setBanner("")

  if (route === "skills") {
    await skillsView.mount()
    return
  }
  skillsView.dismissOverlays()
  if (route === "status") {
    await statusView.mount()
    return
  }
  if (route === "registry") {
    await registryView.mount()
    return
  }
}

window.addEventListener("hashchange", () => {
  void renderRoute()
})

void renderRoute()
