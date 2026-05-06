import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdirSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { UserError } from "../utils/errors"
import { runReflect } from "./reflect"

describe("runReflect", () => {
  let tmp: string
  let originalChainHome: string | undefined

  beforeEach(() => {
    tmp = join(tmpdir(), `chain-reflect-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    mkdirSync(tmp, { recursive: true })
    originalChainHome = process.env.CHAIN_HOME
    process.env.CHAIN_HOME = tmp
  })

  afterEach(() => {
    if (originalChainHome === undefined) delete process.env.CHAIN_HOME
    else process.env.CHAIN_HOME = originalChainHome
    rmSync(tmp, { recursive: true, force: true })
  })

  test("wraps inbox parse errors as UserError", async () => {
    mkdirSync(join(tmp, "learnings", "queue"), { recursive: true })
    writeFileSync(join(tmp, "learnings", "queue", "inbox.jsonl"), "not-json\n", "utf-8")
    const err = await runReflect({ dryRun: true }).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(UserError)
    expect((err as UserError).message).toMatch(/Could not distill learnings:/)
  })
})
