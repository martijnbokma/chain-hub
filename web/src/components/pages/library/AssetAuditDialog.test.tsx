import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { AuditAssetResult } from "@/types";

import { AssetAuditDialog, type AssetAuditDialogProps } from "./AssetAuditDialog";

const audit: AuditAssetResult = {
  summary: "Two gaps",
  findings: [
    { severity: "high", title: "Missing trigger", detail: "Say when to use the skill.", source: "learning" },
    { severity: "low", title: "Long intro", detail: "Trim the opening paragraph.", source: "best-practice" }
  ]
};

function renderDialog(overrides: Partial<AssetAuditDialogProps> = {}) {
  const props: AssetAuditDialogProps = {
    audit,
    activeFindingIndex: null,
    open: true,
    onOpenChange: vi.fn(),
    onSelectFindingIndex: vi.fn(),
    isUpstreamSkill: false,
    isImproving: false,
    canImprove: true,
    onImprove: vi.fn(),
    ...overrides
  };
  render(<AssetAuditDialog {...props} />);
  return props;
}

describe("AssetAuditDialog", () => {
  it("shows a progress state while auditing", () => {
    renderDialog({ audit: null, isLoading: true, assetName: "pr-review" });

    expect(screen.getByRole("heading", { name: "Auditing pr-review" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Apply improvements" })).not.toBeInTheDocument();
  });

  it("opens a finding from the list with a native button", async () => {
    const props = renderDialog();

    await userEvent.click(screen.getByRole("button", { name: /Long intro/ }));

    expect(props.onSelectFindingIndex).toHaveBeenCalledWith(1);
  });

  it("shows the empty state when the asset meets the bar", () => {
    renderDialog({ audit: { summary: "Looks good", findings: [] } });

    expect(screen.getByText("No material findings")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Apply improvements" })).not.toBeInTheDocument();
  });

  it("asks to fork an upstream skill instead of improving it", () => {
    renderDialog({ isUpstreamSkill: true });

    expect(screen.getByText(/Fork this skill first/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Apply improvements" })).not.toBeInTheDocument();
  });
});
