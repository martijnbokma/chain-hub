import { el } from "./dom.js"
import { btn, btnPrimary, btnWarn, msgClassForKind, pageHeader, pageTitle, focusRing } from "./ui-classes.js"
import { showToast } from "./toast.js"

const cardClass =
  "mb-[0.8rem] border border-hub-border bg-[color-mix(in_oklab,var(--color-hub-surface-1)_85%,transparent)] p-[0.75rem]"
const labelClass = "mb-[0.3rem] block text-[0.73rem] tracking-wide text-hub-text-faint uppercase"
const inputClass = `w-full rounded-[5px] border border-hub-border-strong bg-[#0a1020] px-[0.55rem] py-[0.48rem] font-inherit text-hub-text ${focusRing} focus:border-hub-accent focus:outline-none`
const helperClass = "mt-[0.42rem] text-[0.74rem] text-hub-text-faint"
const actionRowClass = "mt-[0.66rem] flex flex-wrap gap-2"
const kvClass = "mt-[0.42rem] grid gap-[0.35rem] text-[0.76rem] text-hub-text-dim"

function statusMark(status) {
  if (status === "ok") return "✓"
  if (status === "warning") return "⚠"
  return "✗"
}

function countAdapterIssues(adapter) {
  const links = Array.isArray(adapter?.links) ? adapter.links : []
  let issues = 0
  for (const link of links) {
    if (link?.status !== "ok") issues += 1
  }
  return issues
}

export function createConfigView({
  root,
  setBanner,
  setChainHomeBar,
  apiRequest,
  getUiPrefs = () => ({ defaultRoute: "skills", showChainHomeBar: true }),
  updateUiPrefs = () => {},
}) {
  let configData = null
  let chainHomeInput = ""
  let saving = false
  let runningSetup = false
  let feedback = ""
  let feedbackKind = "ok"
  let uiPrefs = getUiPrefs()

  async function loadConfig() {
    try {
      const payload = await apiRequest("/api/config")
      configData = payload
      chainHomeInput = payload?.chainHome ?? ""
      setChainHomeBar(payload?.chainHome ?? "", payload?.source ?? "")
      if (payload?.envOverrideActive) {
        setBanner("CHAIN_HOME env var is active. Config updates are saved but env still has priority.")
      } else {
        setBanner("")
      }
    } catch (error) {
      configData = null
      feedback = error.message
      feedbackKind = "err"
    }
  }

  async function saveChainHome() {
    saving = true
    feedback = ""
    showToast("Saving CHAIN_HOME...", "warn", { id: "config-chain-home-progress", durationMs: 2000 })
    render()
    try {
      const payload = await apiRequest("/api/config/chain-home", {
        method: "POST",
        body: { chainHome: chainHomeInput },
      })
      configData = {
        ...(configData ?? {}),
        ...payload,
        configuredChainHome: payload.requestedChainHome ?? payload.chainHome,
      }
      chainHomeInput = payload.chainHome
      setChainHomeBar(payload.chainHome, payload.source)
      feedback = "CHAIN_HOME updated."
      feedbackKind = payload.envOverrideActive ? "warn" : "ok"
      if (payload.envOverrideActive) {
        feedback = "CHAIN_HOME saved, but env override is still active."
      }
      showToast(feedback, payload.envOverrideActive ? "warn" : "ok", {
        id: "config-chain-home-result",
      })
      if (payload.status) {
        configData.status = payload.status
      }
    } catch (error) {
      feedback = error.message
      feedbackKind = "err"
      showToast(error.message, "err", { id: "config-chain-home-result" })
    } finally {
      saving = false
      render()
    }
  }

  async function runSetup(ide) {
    runningSetup = true
    feedback = ""
    showToast(ide ? `Running maintenance for ${ide}...` : "Running maintenance...", "warn", {
      id: "config-maintenance-progress",
      durationMs: 2000,
    })
    render()
    try {
      await apiRequest("/api/setup", { method: "POST", body: ide ? { ide } : {} })
      await loadConfig()
      feedback = ide ? `Setup completed for ${ide}.` : "Setup completed for all detected adapters."
      feedbackKind = "ok"
      showToast(feedback, "ok", { id: "config-maintenance-result" })
    } catch (error) {
      feedback = error.message
      feedbackKind = "err"
      showToast(error.message, "err", { id: "config-maintenance-result" })
    } finally {
      runningSetup = false
      render()
    }
  }

  function renderAdapters(container) {
    const adapters = Array.isArray(configData?.status?.adapters) ? configData.status.adapters : []
    const card = el("section", cardClass)
    card.appendChild(el("h2", "m-0 text-[0.86rem] text-[#f3f6ff]", "Adapters"))

    if (adapters.length === 0) {
      card.appendChild(el("div", helperClass, "No adapter status available."))
      container.appendChild(card)
      return
    }

    for (const adapter of adapters) {
      const row = el("div", "mt-[0.55rem] border border-hub-border bg-[rgba(8,13,24,0.72)] p-[0.55rem]")
      const header = el("div", "flex items-center justify-between gap-2")
      const title = el("strong", "text-[0.78rem] text-[#f3f6ff]", adapter.name)
      const issues = countAdapterIssues(adapter)
      const state = !adapter.detected
        ? "Not detected"
        : issues > 0
          ? `${issues} issue${issues === 1 ? "" : "s"}`
          : "Healthy"
      const stateClass = !adapter.detected
        ? "text-[0.72rem] text-hub-text-faint"
        : issues > 0
          ? "text-[0.72rem] text-hub-warn"
          : "text-[0.72rem] text-hub-user"
      const stateEl = el("span", stateClass, state)
      header.append(title, stateEl)
      row.appendChild(header)

      if (adapter.detected) {
        const links = Array.isArray(adapter.links) ? adapter.links : []
        for (const link of links) {
          row.appendChild(
            el(
              "div",
              "mt-[0.25rem] text-[0.73rem] text-hub-text-dim",
              `${statusMark(link.status)} ${link.description}${link.resolvedPath ? ` -> ${link.resolvedPath}` : ""}`,
            ),
          )
        }
        if (issues > 0) {
          const actionRow = el("div", actionRowClass)
          const button = el("button", btnWarn, runningSetup ? "Running..." : `Repair ${adapter.name} links`)
          button.type = "button"
          button.disabled = runningSetup
          button.addEventListener("click", () => void runSetup(adapter.name))
          actionRow.appendChild(button)
          row.appendChild(actionRow)
        }
      }
      card.appendChild(row)
    }

    container.appendChild(card)
  }

  function render() {
    root.className = "min-w-0"
    const wrapper = document.createDocumentFragment()
    const header = el("div", pageHeader)
    header.appendChild(el("h1", pageTitle, "Config"))
    wrapper.appendChild(header)

    const chainHomeCard = el("section", cardClass)
    chainHomeCard.appendChild(el("h2", "m-0 text-[0.86rem] text-[#f3f6ff]", "CHAIN_HOME"))
    chainHomeCard.appendChild(el("label", labelClass, "Hub path"))
    const input = el("input", inputClass)
    input.type = "text"
    input.value = chainHomeInput
    input.placeholder = "/Users/you/chain-hub"
    input.addEventListener("input", () => {
      chainHomeInput = input.value
    })
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault()
        void saveChainHome()
      }
    })
    chainHomeCard.appendChild(input)
    chainHomeCard.appendChild(
      el(
        "div",
        helperClass,
        configData?.envOverrideActive
          ? "Env override is active: saved config may still be overridden by CHAIN_HOME env."
          : "Stored in the CLI config.",
      ),
    )

    const info = el("div", kvClass)
    info.appendChild(el("div", "", `Source: ${configData?.source ?? "unknown"}`))
    info.appendChild(el("div", "", `Config file: ${configData?.configPath ?? "-"}`))
    chainHomeCard.appendChild(info)

    const saveButton = el("button", btnPrimary, saving ? "Saving..." : "Save CHAIN_HOME")
    saveButton.type = "button"
    saveButton.disabled = saving || runningSetup
    saveButton.addEventListener("click", () => void saveChainHome())
    chainHomeCard.appendChild(el("div", actionRowClass)).appendChild(saveButton)
    wrapper.appendChild(chainHomeCard)

    const uiCard = el("section", cardClass)
    uiCard.appendChild(el("h2", "m-0 text-[0.86rem] text-[#f3f6ff]", "Hub UI preferences"))
    uiCard.appendChild(el("label", labelClass, "Default start tab"))
    const defaultTabSelect = el("select", inputClass)
    for (const route of ["skills", "config", "status", "registry"]) {
      const option = el("option", "", route)
      option.value = route
      option.selected = uiPrefs.defaultRoute === route
      defaultTabSelect.appendChild(option)
    }
    defaultTabSelect.addEventListener("change", () => {
      uiPrefs = { ...uiPrefs, defaultRoute: defaultTabSelect.value }
      updateUiPrefs({ defaultRoute: defaultTabSelect.value })
      feedback = "UI preferences saved."
      feedbackKind = "ok"
      showToast(feedback, "ok")
      render()
    })
    uiCard.appendChild(defaultTabSelect)

    const toggleRow = el("div", "mt-[0.6rem] flex items-center gap-2")
    const showChainHomeCheckbox = el("input", "")
    showChainHomeCheckbox.type = "checkbox"
    showChainHomeCheckbox.checked = uiPrefs.showChainHomeBar !== false
    showChainHomeCheckbox.addEventListener("change", () => {
      uiPrefs = { ...uiPrefs, showChainHomeBar: showChainHomeCheckbox.checked }
      updateUiPrefs({ showChainHomeBar: showChainHomeCheckbox.checked })
      feedback = "UI preferences saved."
      feedbackKind = "ok"
      showToast(feedback, "ok")
      render()
    })
    const toggleLabel = el("label", "text-[0.78rem] text-hub-text-dim", "Show CHAIN_HOME bar at the top")
    toggleRow.append(showChainHomeCheckbox, toggleLabel)
    uiCard.appendChild(toggleRow)
    uiCard.appendChild(
      el("div", helperClass, "These settings are stored locally in your browser."),
    )
    wrapper.appendChild(uiCard)

    const runtimeCard = el("section", cardClass)
    runtimeCard.appendChild(el("h2", "m-0 text-[0.86rem] text-[#f3f6ff]", "Runtime actions"))
    runtimeCard.appendChild(
      el(
        "div",
        helperClass,
        "Run setup to relink adapters and refresh protected core assets for the active CHAIN_HOME.",
      ),
    )
    const maintenanceButton = el(
      "button",
      btn,
      runningSetup ? "Running maintenance..." : "Run maintenance",
    )
    maintenanceButton.type = "button"
    maintenanceButton.disabled = runningSetup || saving
    maintenanceButton.addEventListener("click", () => void runSetup(undefined))
    runtimeCard.appendChild(el("div", actionRowClass)).appendChild(maintenanceButton)
    wrapper.appendChild(runtimeCard)

    renderAdapters(wrapper)

    if (feedback) {
      wrapper.appendChild(el("div", msgClassForKind(feedbackKind), feedback))
    }

    root.replaceChildren(wrapper)
  }

  return {
    async mount() {
      uiPrefs = getUiPrefs()
      await loadConfig()
      render()
    },
  }
}
