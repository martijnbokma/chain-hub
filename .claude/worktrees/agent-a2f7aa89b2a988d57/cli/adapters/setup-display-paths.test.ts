import { describe, expect, test } from "bun:test"
import { getMarketingSymlinkRows, formatMarketingTerminalLine } from "./setup-display-paths"

describe("setup-display-paths", () => {
  test("marketing rows cover every adapter in MARKETING order with real tilde paths", () => {
    const rows = getMarketingSymlinkRows()
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row.tildePath).toMatch(/^~\//)
      expect(formatMarketingTerminalLine(row)).toContain(row.tildePath)
    }
  })
})
