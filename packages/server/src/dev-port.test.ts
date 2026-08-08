import { describe, expect, it } from "vitest";

import { isAddressInUseError } from "./dev-port.js";

describe("isAddressInUseError", () => {
  it("detects Node errno EADDRINUSE", () => {
    const error = Object.assign(new Error("listen EADDRINUSE: address already in use :::2342"), {
      code: "EADDRINUSE",
    });
    expect(isAddressInUseError(error)).toBe(true);
  });

  it("detects EADDRINUSE from message alone", () => {
    expect(isAddressInUseError(new Error("Error: listen EADDRINUSE :::2342"))).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isAddressInUseError(new Error("ENOENT"))).toBe(false);
    expect(isAddressInUseError(null)).toBe(false);
    expect(isAddressInUseError("boom")).toBe(false);
  });
});
