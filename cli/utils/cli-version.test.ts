import { expect, test } from "bun:test"
import { readCliVersion } from "./cli-version"

test("readCliVersion reads semver from package.json", () => {
  const v = readCliVersion()
  expect(v).toMatch(/^\d+\.\d+\.\d+/)
})
