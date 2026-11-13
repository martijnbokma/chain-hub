import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { SecurityScanRecord } from "@chain-hub/contracts";

import {
  copySecurityScan,
  getSecurityScan,
  readSecurityScans,
  recordSecurityScan,
  removeSecurityScan,
  renameSecurityScan
} from "./security-store.js";

async function makeTmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-security-store-"));
}

function record(overrides: Partial<SecurityScanRecord> = {}): SecurityScanRecord {
  return {
    verdict: "warn",
    findings: [],
    contentHash: "abc",
    scannedAt: "2026-11-01T00:00:00.000Z",
    context: "install",
    engines: ["static"],
    ...overrides
  };
}

describe("security-store", () => {
  it("records and reads back a scan record", async () => {
    const dir = await makeTmpDir();
    await recordSecurityScan(dir, "skills", "demo", record({ verdict: "fail" }));
    const scan = await getSecurityScan(dir, "skills", "demo");
    expect(scan?.verdict).toBe("fail");
  });

  it("returns null for unknown assets", async () => {
    const dir = await makeTmpDir();
    expect(await getSecurityScan(dir, "skills", "nope")).toBeNull();
  });

  it("removes a scan record", async () => {
    const dir = await makeTmpDir();
    await recordSecurityScan(dir, "skills", "demo", record());
    await removeSecurityScan(dir, "skills", "demo");
    expect(await getSecurityScan(dir, "skills", "demo")).toBeNull();
  });

  it("copies a record to a forked asset", async () => {
    const dir = await makeTmpDir();
    await recordSecurityScan(dir, "skills", "demo", record({ verdict: "warn" }));
    await copySecurityScan(dir, "skills", "demo", "skills", "demo-local");
    expect((await getSecurityScan(dir, "skills", "demo-local"))?.verdict).toBe("warn");
  });

  it("moves a record on rename", async () => {
    const dir = await makeTmpDir();
    await recordSecurityScan(dir, "rules", "a", record());
    await renameSecurityScan(dir, "rules", "a", "prompts", "b");
    expect(await getSecurityScan(dir, "rules", "a")).toBeNull();
    expect((await readSecurityScans(dir)).scans["prompts/b"]?.verdict).toBe("warn");
  });
});
