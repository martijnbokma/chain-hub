import { el } from "./dom.js"
import { showToast } from "./toast.js"
import { btn, btnPrimary, msgClassForKind, pageHeader, pageTitle } from "./ui-classes.js"

const cardClass =
  "mb-[0.7rem] border border-hub-border bg-[color-mix(in_oklab,var(--color-hub-surface-1)_85%,transparent)] px-[0.75rem] py-[0.7rem]"
const proposalItemClass =
  "mb-[0.55rem] border border-hub-border bg-[color-mix(in_oklab,var(--color-hub-surface-2)_70%,transparent)] px-[0.65rem] py-[0.58rem]"
const metaClass = "text-[0.72rem] text-hub-text-faint"
const titleClass = "m-0 text-[0.82rem] text-hub-text"
const actionRowClass = "mt-[0.55rem] flex flex-wrap gap-2"

function formatConfidence(value) {
  const number = typeof value === "number" ? value : 0
  return `${Math.round(number * 100)}%`
}

export function createImproveView({ root, setChainHomeBar, apiRequest }) {
  let loading = false
  let feedback = ""
  let feedbackKind = "ok"
  let proposals = []
  let lastRunId = null

  async function loadStatusAndProposals() {
    const [statusPayload, proposalPayload] = await Promise.all([apiRequest("/api/status"), apiRequest("/api/improve/proposals")])
    setChainHomeBar(statusPayload.chainHome, statusPayload.source)
    proposals = Array.isArray(proposalPayload.proposals) ? proposalPayload.proposals : []
  }

  async function mountData() {
    loading = true
    feedback = ""
    try {
      await loadStatusAndProposals()
    } catch (error) {
      feedback = error.message
      feedbackKind = "err"
    } finally {
      loading = false
      render()
    }
  }

  async function generateProposals() {
    loading = true
    feedback = ""
    render()
    try {
      const result = await apiRequest("/api/improve/proposals/generate", {
        method: "POST",
        body: { maxProposals: 3, scopes: ["skills"] },
      })
      lastRunId = result.runId ?? null
      await loadStatusAndProposals()
      feedback = `Generated ${result.generated} proposal(s).`
      feedbackKind = "ok"
      showToast(feedback, "ok")
    } catch (error) {
      feedback = error.message
      feedbackKind = "err"
      showToast(error.message, "err")
    } finally {
      loading = false
      render()
    }
  }

  async function setProposalDecision(proposalId, action) {
    loading = true
    feedback = ""
    render()
    try {
      await apiRequest(`/api/improve/proposals/${encodeURIComponent(proposalId)}/${action}`, { method: "POST" })
      await loadStatusAndProposals()
      feedback = action === "approve" ? "Proposal approved." : "Proposal rejected."
      feedbackKind = "ok"
    } catch (error) {
      feedback = error.message
      feedbackKind = "err"
    } finally {
      loading = false
      render()
    }
  }

  async function applyApproved() {
    const approved = proposals.filter((proposal) => proposal.status === "approved").map((proposal) => proposal.id)
    if (approved.length === 0) {
      feedback = "No approved proposals selected."
      feedbackKind = "warn-text"
      render()
      return
    }

    loading = true
    feedback = ""
    render()
    try {
      const result = await apiRequest("/api/improve/apply", {
        method: "POST",
        body: { proposalIds: approved },
      })
      lastRunId = result.runId ?? null
      await loadStatusAndProposals()
      feedback = `Applied ${result.applied} proposal(s). Validation: ${result.validation}.`
      feedbackKind = result.validation === "ok" ? "ok" : "warn-text"
      showToast(feedback, result.validation === "ok" ? "ok" : "warn")
    } catch (error) {
      feedback = error.message
      feedbackKind = "err"
      showToast(error.message, "err")
    } finally {
      loading = false
      render()
    }
  }

  function renderProposal(proposal) {
    const card = el("article", proposalItemClass)
    card.appendChild(el("h2", titleClass, proposal.summary ?? "Untitled proposal"))
    card.appendChild(el("div", metaClass, `${proposal.kind} • risk: ${proposal.risk_level} • confidence: ${formatConfidence(proposal.confidence)}`))
    card.appendChild(el("p", "my-[0.4rem] text-[0.76rem] text-hub-text-dim", proposal.rationale ?? "No rationale"))
    card.appendChild(el("pre", "m-0 whitespace-pre-wrap text-[0.72rem] text-hub-text-faint", proposal.diff_preview ?? "No preview"))
    card.appendChild(el("div", metaClass, `Status: ${proposal.status}`))

    const actionRow = el("div", actionRowClass)
    const approveButton = el("button", btnPrimary, "Approve")
    approveButton.type = "button"
    approveButton.disabled = loading || proposal.status === "approved" || proposal.status === "applied"
    approveButton.addEventListener("click", () => void setProposalDecision(proposal.id, "approve"))
    actionRow.appendChild(approveButton)

    const rejectButton = el("button", btn, "Reject")
    rejectButton.type = "button"
    rejectButton.disabled = loading || proposal.status === "rejected" || proposal.status === "applied"
    rejectButton.addEventListener("click", () => void setProposalDecision(proposal.id, "reject"))
    actionRow.appendChild(rejectButton)
    card.appendChild(actionRow)

    return card
  }

  function render() {
    root.className = "min-w-0"
    const fragment = document.createDocumentFragment()
    const header = el("div", pageHeader)
    header.appendChild(el("h1", pageTitle, "Improve"))
    fragment.appendChild(header)

    const controls = el("section", cardClass)
    controls.appendChild(el("p", "m-0 text-[0.79rem] text-hub-text-dim", "Generate proposals from learnings, review them, then apply approved items."))
    if (lastRunId) {
      controls.appendChild(el("div", `${metaClass} mt-[0.45rem]`, `Last run: ${lastRunId}`))
    }
    const actionRow = el("div", actionRowClass)
    const generateButton = el("button", btnPrimary, loading ? "Generating..." : "Generate proposals")
    generateButton.type = "button"
    generateButton.disabled = loading
    generateButton.addEventListener("click", () => void generateProposals())
    actionRow.appendChild(generateButton)
    const applyButton = el("button", btn, loading ? "Applying..." : "Apply approved")
    applyButton.type = "button"
    applyButton.disabled = loading
    applyButton.addEventListener("click", () => void applyApproved())
    actionRow.appendChild(applyButton)
    controls.appendChild(actionRow)
    fragment.appendChild(controls)

    const proposalSection = el("section", cardClass)
    proposalSection.appendChild(el("h2", "m-0 text-[0.83rem] text-hub-text", `Proposal queue (${proposals.length})`))
    if (proposals.length === 0) {
      proposalSection.appendChild(el("p", "mb-0 mt-[0.45rem] text-[0.76rem] text-hub-text-dim", "No proposals yet. Generate a first batch to get started."))
    } else {
      const listWrap = el("div", "mt-[0.55rem]")
      for (const proposal of proposals) {
        listWrap.appendChild(renderProposal(proposal))
      }
      proposalSection.appendChild(listWrap)
    }
    fragment.appendChild(proposalSection)

    if (feedback) {
      fragment.appendChild(el("div", msgClassForKind(feedbackKind), feedback))
    }

    root.replaceChildren(fragment)
  }

  return {
    async mount() {
      await mountData()
    },
  }
}
