import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdirSync, rmSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import {
  applyApprovedProposals,
  generateImproveProposals,
  listImproveProposals,
  setProposalStatus,
} from "./improve-service"

describe("improve-service", () => {
  let hub: string

  beforeEach(() => {
    hub = join(tmpdir(), `chain-improve-service-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    mkdirSync(hub, { recursive: true })
    mkdirSync(join(hub, "skills"), { recursive: true })
    mkdirSync(join(hub, "core"), { recursive: true })
  })

  afterEach(() => {
    rmSync(hub, { recursive: true, force: true })
  })

  test("generates and lists proposals", () => {
    const generated = generateImproveProposals(hub, { maxProposals: 2, scopes: ["skills"] })
    expect(generated.generated).toBe(2)
    expect(generated.proposals.length).toBe(2)

    const listed = listImproveProposals(hub)
    expect(listed.proposals.length).toBe(2)
    expect(listed.proposals[0]?.status).toBe("draft")
  })

  test("approve and apply workflow updates proposal status", () => {
    const generated = generateImproveProposals(hub, { maxProposals: 1, scopes: ["skills"] })
    const proposalId = generated.proposals[0]?.id
    expect(typeof proposalId).toBe("string")

    setProposalStatus(hub, proposalId!, "approved")
    let listed = listImproveProposals(hub)
    expect(listed.proposals[0]?.status).toBe("approved")

    const applyResult = applyApprovedProposals(hub, [proposalId!])
    expect(applyResult.applied).toBe(1)
    listed = listImproveProposals(hub)
    expect(listed.proposals[0]?.status).toBe("applied")
  })
})
