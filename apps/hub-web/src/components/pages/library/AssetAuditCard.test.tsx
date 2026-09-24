import { render, screen, within } from "@testing-library/react";
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
  it("opens the audit modal by default when findings are present", () => {
    renderCard();

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Audit findings" })).toBeInTheDocument();
    expect(within(dialog).getByText("One field-reported gap.")).toBeInTheDocument();
  });

  it("does not open the modal by default when there are no findings", () => {
    renderCard({ audit: audit({ findings: [] }) });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("No findings")).toBeInTheDocument();
  });

  it("labels only learning-sourced findings and shows how many field reports were checked", () => {
    renderCard({ defaultOpenModal: false });

    expect(screen.getAllByText("From learnings")).toHaveLength(1);
    expect(screen.getByText("Checked against 3 field reports from Learnings.")).toBeInTheDocument();
  });

  it("hides the field report line when none were considered", () => {
    renderCard({ audit: audit({ learningsConsidered: 0 }), defaultOpenModal: false });

    expect(screen.queryByText(/field report/)).not.toBeInTheDocument();
  });

  it("applies improvements for editable assets from inline card", async () => {
    const { onImprove } = renderCard({ defaultOpenModal: false });

    await userEvent.click(screen.getByRole("button", { name: "Apply improvements" }));

    expect(onImprove).toHaveBeenCalledOnce();
  });

  it("points upstream skills with field-report findings to fork or contribute", () => {
    renderCard({ defaultOpenModal: false, isUpstreamSkill: true });

    expect(screen.queryByRole("button", { name: "Apply improvements" })).not.toBeInTheDocument();
    expect(screen.getByText(/contribute the field-report findings to the upstream repo/)).toBeInTheDocument();
  });

  it("allows closing the modal and reopening via 'View in modal'", async () => {
    renderCard();

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "View in modal" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("opens modal focused on a specific finding and allows cycling with Next and Previous", async () => {
    renderCard({ defaultOpenModal: false });

    await userEvent.click(screen.getByText("SVG click targets"));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Finding 1 of 2")).toBeInTheDocument();
    expect(within(dialog).getByText("Use Element.closest.")).toBeInTheDocument();

    // Click Next finding
    await userEvent.click(within(dialog).getByRole("button", { name: "Next finding" }));

    expect(within(dialog).getByText("Finding 2 of 2")).toBeInTheDocument();
    expect(within(dialog).getByText("Add when-to-use phrases.")).toBeInTheDocument();

    // Click Previous finding
    await userEvent.click(within(dialog).getByRole("button", { name: "Previous finding" }));

    expect(within(dialog).getByText("Finding 1 of 2")).toBeInTheDocument();
    expect(within(dialog).getByText("Use Element.closest.")).toBeInTheDocument();
  });

  it("applies improvements from within the modal", async () => {
    const { onImprove } = renderCard();

    const dialog = screen.getByRole("dialog");
    const improveButton = within(dialog).getByRole("button", { name: "Apply improvements" });
    await userEvent.click(improveButton);

    expect(onImprove).toHaveBeenCalledOnce();
  });

  it("shows auditing loading state in dialog and inline card when isAuditing is true", () => {
    renderCard({ audit: null, isAuditing: true, assetName: "my-skill" });

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Auditing my-skill" })).toBeInTheDocument();
    expect(within(dialog).getByText("Auditing…")).toBeInTheDocument();
    expect(within(dialog).getByText("Checking content against field reports and best practice rules")).toBeInTheDocument();
    expect(screen.getByText("Evaluating content against field reports and quality standards…")).toBeInTheDocument();
  });
});
