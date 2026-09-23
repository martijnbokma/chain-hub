import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { AuditAssetResult } from "@/types";
import { AssetAuditCard } from "./AssetAuditCard";

function audit(overrides: Partial<AuditAssetResult> = {}): AuditAssetResult {
  return {
    summary: "One field-reported gap.",
    findings: [
      { severity: "medium", title: "SVG click targets", detail: "Use Element.closest.", source: "learning" },
      { severity: "low", title: "Triggers", detail: "Add when-to-use phrases.", source: "best-practice" }
    ],
    learningsConsidered: 3,
    ...overrides
  };
}

function renderCard(props: Partial<Parameters<typeof AssetAuditCard>[0]> = {}) {
  const onImprove = vi.fn();
  render(
    <AssetAuditCard
      audit={audit()}
      canImprove
      isImproving={false}
      isUpstreamSkill={false}
      onImprove={onImprove}
      {...props}
    />
  );
  return { onImprove };
}

describe("AssetAuditCard", () => {
  it("labels only learning-sourced findings and shows how many field reports were checked", () => {
    renderCard();

    expect(screen.getAllByText("From learnings")).toHaveLength(1);
    expect(screen.getByText("Checked against 3 field reports from Learnings.")).toBeInTheDocument();
  });

  it("hides the field report line when none were considered", () => {
    renderCard({ audit: audit({ learningsConsidered: 0 }) });

    expect(screen.queryByText(/field report/)).not.toBeInTheDocument();
  });

  it("applies improvements for editable assets", async () => {
    const { onImprove } = renderCard();

    await userEvent.click(screen.getByRole("button", { name: "Apply improvements" }));

    expect(onImprove).toHaveBeenCalledOnce();
  });

  it("points upstream skills with field-report findings to fork or contribute", () => {
    renderCard({ isUpstreamSkill: true });

    expect(screen.queryByRole("button", { name: "Apply improvements" })).not.toBeInTheDocument();
    expect(screen.getByText(/contribute the field-report findings to the upstream repo/)).toBeInTheDocument();
  });
});
