import { createSkillsView } from "./skills.js"
import { createStatusView } from "./status.js"
import { createRegistryView } from "./registry.js"
import { createConfigView } from "./config.js"
import { createReflectView } from "./reflect.js"
import { btn, btnPrimary, btnDanger, focusRing, msgErr } from "./ui-classes.js"

const viewRoot = document.querySelector("#view-root")
const chainHomeBar = document.querySelector("#chain-home-bar")
const globalBanner = document.querySelector("#global-banner")
const modalRoot = document.querySelector("#modal-root")
const appShell = document.querySelector(".app-shell")
const sidebarToggle = document.querySelector("#sidebar-toggle")
const sidebarBackdrop = document.querySelector("#sidebar-backdrop")
const sidebarUrl = document.querySelector("#sidebar-url")
const mobileUrl = document.querySelector("#mobile-url")
const UI_PREFS_KEY = "chain-hub-ui-prefs"

const defaultUiPrefs = {
  defaultRoute: "skills",
  showChainHomeBar: true,
}

let uiPrefs = loadUiPrefs()

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

function loadUiPrefs() {
  try {
    const raw = localStorage.getItem(UI_PREFS_KEY)
    if (!raw) return { ...defaultUiPrefs }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return { ...defaultUiPrefs }
    const defaultRoute = typeof parsed.defaultRoute === "string" ? parsed.defaultRoute : defaultUiPrefs.defaultRoute
    const showChainHomeBar =
      typeof parsed.showChainHomeBar === "boolean"
        ? parsed.showChainHomeBar
        : defaultUiPrefs.showChainHomeBar
    return { defaultRoute, showChainHomeBar }
  } catch {
    return { ...defaultUiPrefs }
  }
}

function applyUiPrefs() {
  if (chainHomeBar instanceof HTMLElement) {
    chainHomeBar.classList.toggle("hidden", !uiPrefs.showChainHomeBar)
  }
}

function updateUiPrefs(nextPrefs) {
  uiPrefs = { ...uiPrefs, ...nextPrefs }
  localStorage.setItem(UI_PREFS_KEY, JSON.stringify(uiPrefs))
  applyUiPrefs()
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
    return { open() {}, async confirm() { return false } }
  }

  const CLOSE_ANIMATION_MS = 180
  let escapeAbortController = null
  let closeHandler = null
  let closeTimer = null

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  }

  function close() {
    modalRoot.setAttribute("aria-hidden", "true")
    escapeAbortController?.abort()
    escapeAbortController = null
    if (closeTimer !== null) {
      window.clearTimeout(closeTimer)
      closeTimer = null
    }
    const finalizeClose = () => {
      modalRoot.classList.add("hidden")
      modalRoot.replaceChildren()
      document.body.classList.remove("overflow-hidden")
    }
    if (prefersReducedMotion()) {
      finalizeClose()
    } else {
      closeTimer = window.setTimeout(() => {
        closeTimer = null
        finalizeClose()
      }, CLOSE_ANIMATION_MS)
    }
    const onClose = closeHandler
    closeHandler = null
    onClose?.()
  }

  function openCard(card, { initialFocus = null, closeOnBackdrop = true, onClose = null } = {}) {
    if (closeTimer !== null) {
      window.clearTimeout(closeTimer)
      closeTimer = null
    }
    modalRoot.classList.remove("hidden")
    modalRoot.setAttribute("aria-hidden", "false")
    modalRoot.replaceChildren(card)
    document.body.classList.add("overflow-hidden")
    closeHandler = typeof onClose === "function" ? onClose : null
    if (initialFocus instanceof HTMLElement) {
      initialFocus.focus()
    }

    escapeAbortController?.abort()
    escapeAbortController = new AbortController()
    window.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Escape") return
        event.preventDefault()
        event.stopPropagation()
        close()
      },
      { capture: true, signal: escapeAbortController.signal },
    )

    if (closeOnBackdrop) {
      card.addEventListener("click", (event) => event.stopPropagation())
      modalRoot.addEventListener(
        "click",
        () => {
          close()
        },
        { once: true },
      )
    }
  }

  return {
    open({ title, placeholder, fields, onSubmit }) {
      const card = document.createElement("div")
      card.className =
        `hub-modal-card w-[min(500px,calc(100vw-2rem))] rounded-lg border border-hub-border-strong bg-[#0f172e] p-[0.9rem] shadow-[0_30px_70px_rgba(2,4,10,0.5)]`

      const heading = document.createElement("h2")
      heading.className = "mb-[0.7rem] mt-0 text-[0.9rem]"
      heading.textContent = title
      const normalizedFields = Array.isArray(fields) && fields.length > 0
        ? fields
        : [{ key: "value", placeholder, required: true, autofocus: true }]
      const inputsByKey = new Map()
      const inputGroup = document.createElement("div")
      inputGroup.className = "space-y-2"
      let initialFocusInput = null

      for (const field of normalizedFields) {
        const fieldKey = String(field.key ?? "").trim()
        if (!fieldKey) continue
        const wrapper = document.createElement("label")
        wrapper.className = "block"
        const fieldLabel = document.createElement("div")
        fieldLabel.className = "mb-[0.3rem] text-[0.72rem] uppercase tracking-wide text-hub-text-faint"
        const labelText = String(field.label ?? fieldKey)
        fieldLabel.textContent = field.required ? labelText : `${labelText}`

        const wantsTextarea = field.type === "textarea"
        const input = wantsTextarea
          ? document.createElement("textarea")
          : document.createElement("input")
        if (!wantsTextarea) {
          input.type = "text"
        }
        input.placeholder = String(field.placeholder ?? "")
        input.required = Boolean(field.required)
        input.className = `w-full rounded-[5px] border border-hub-border-strong bg-[#0a1020] px-[0.55rem] py-[0.45rem] font-inherit text-hub-text ${focusRing} focus:border-hub-accent focus:outline-none`
        if (wantsTextarea) {
          const rows = Number(field.rows)
          input.rows = Number.isFinite(rows) ? Math.max(2, rows) : 3
          input.className = `${input.className} resize-y leading-relaxed`
        }
        wrapper.append(fieldLabel, input)
        inputGroup.appendChild(wrapper)
        inputsByKey.set(fieldKey, input)
        if (!initialFocusInput || field.autofocus) {
          initialFocusInput = input
        }
      }

      const errorLine = document.createElement("div")
      errorLine.className = `${msgErr} hidden`

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
        errorLine.textContent = ""
        errorLine.classList.add("hidden")
        const values = {}
        for (const [key, input] of inputsByKey.entries()) {
          values[key] = input.value
        }
        const ok = await onSubmit(values, {
          setInlineError(message) {
            const normalizedMessage = String(message ?? "").trim()
            errorLine.textContent = normalizedMessage
            errorLine.classList.toggle("hidden", !normalizedMessage)
          },
        })
        if (ok) close()
      })
      for (const input of inputsByKey.values()) {
        input.addEventListener("keydown", (event) => {
          if (input instanceof HTMLTextAreaElement) {
            return
          }
          if (event.key === "Enter") {
            event.preventDefault()
            createButton.click()
          }
        })
      }

      actions.append(cancelButton, createButton)
      card.append(heading, inputGroup, errorLine, actions)
      openCard(card, { initialFocus: initialFocusInput })
    },
    async confirm({ title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", danger = false }) {
      return await new Promise((resolve) => {
        let settled = false
        const settle = (result) => {
          if (settled) return
          settled = true
          resolve(result)
        }

        const card = document.createElement("div")
        card.className =
          "hub-modal-card w-[min(520px,calc(100vw-2rem))] rounded-lg border border-hub-border-strong bg-[rgba(10,15,30,0.98)] p-[1rem] shadow-[0_36px_74px_rgba(2,4,10,0.56)]"

        const heading = document.createElement("h2")
        heading.className = "m-0 text-[0.94rem] text-[#f5f8ff]"
        heading.textContent = title

        const body = document.createElement("p")
        body.className = "mb-0 mt-[0.5rem] text-[0.8rem] leading-relaxed text-hub-text-dim"
        body.textContent = message

        const actions = document.createElement("div")
        actions.className = "mt-[1rem] flex flex-wrap justify-end gap-2"

        const cancelButton = document.createElement("button")
        cancelButton.className = btn
        cancelButton.type = "button"
        cancelButton.textContent = cancelLabel

        const confirmButton = document.createElement("button")
        confirmButton.className = danger ? `${btnDanger} !text-hub-err` : btnPrimary
        confirmButton.type = "button"
        confirmButton.textContent = confirmLabel

        const cancel = () => {
          closeHandler = null
          close()
          settle(false)
        }
        const confirm = () => {
          closeHandler = null
          close()
          settle(true)
        }

        cancelButton.addEventListener("click", cancel)
        confirmButton.addEventListener("click", confirm)
        card.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            confirm()
          }
        })

        actions.append(cancelButton, confirmButton)
        card.append(heading, body, actions)
        openCard(card, { initialFocus: cancelButton, onClose: () => settle(false) })
      })
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
const registryView = createRegistryView({ root: viewRoot, setBanner, setChainHomeBar, apiRequest, modal })
const configView = createConfigView({
  root: viewRoot,
  setBanner,
  setChainHomeBar,
  apiRequest,
  getUiPrefs: () => ({ ...uiPrefs }),
  updateUiPrefs,
})
const reflectView = createReflectView({ root: viewRoot, setChainHomeBar, apiRequest })

async function renderRoute() {
  const route = window.location.hash.replace(/^#/, "") || uiPrefs.defaultRoute || "skills"
  setSidebarOpen(false)
  setActiveNav(route)
  setBanner("")

  if (route === "skills") {
    await skillsView.mount()
    return
  }
  skillsView.dismissOverlays()
  if (route === "config") {
    await configView.mount()
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
  if (route === "reflect") {
    await reflectView.mount()
    return
  }
}

window.addEventListener("hashchange", () => {
  void renderRoute()
})

applyUiPrefs()
void renderRoute()
