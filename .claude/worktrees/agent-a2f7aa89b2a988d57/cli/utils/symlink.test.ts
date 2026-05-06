import { expect, test, describe, beforeEach, afterEach } from "bun:test"
import { forceRelink } from "./symlink"
import { mkdirSync, readlinkSync, existsSync, rmSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"

describe("forceRelink", () => {
  let tmp: string

  beforeEach(() => {
    tmp = join(tmpdir(), `chain-test-${Date.now()}`)
    mkdirSync(tmp, { recursive: true })
  })

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true })
  })

  test("creates a new symlink", () => {
    const target = join(tmp, "target")
    const link = join(tmp, "link")
    mkdirSync(target)
    const result = forceRelink(target, link)
    expect(result).toBe("created")
    expect(readlinkSync(link)).toBe(target)
  })

  test("returns skipped when symlink already correct", () => {
    const target = join(tmp, "target")
    const link = join(tmp, "link")
    mkdirSync(target)
    forceRelink(target, link)
    const result = forceRelink(target, link)
    expect(result).toBe("skipped")
  })

  test("updates stale symlink pointing to wrong target", () => {
    const target1 = join(tmp, "target1")
    const target2 = join(tmp, "target2")
    const link = join(tmp, "link")
    mkdirSync(target1)
    mkdirSync(target2)
    forceRelink(target1, link)
    const result = forceRelink(target2, link)
    expect(result).toBe("created")
    expect(readlinkSync(link)).toBe(target2)
  })

  test("backs up real directory and creates symlink", () => {
    const target = join(tmp, "target")
    const link = join(tmp, "link")
    mkdirSync(target)
    mkdirSync(link)
    const result = forceRelink(target, link)
    expect(result).toBe("backed-up")
    expect(readlinkSync(link)).toBe(target)
    expect(existsSync(`${link}.backup`)).toBe(true)
  })
})
