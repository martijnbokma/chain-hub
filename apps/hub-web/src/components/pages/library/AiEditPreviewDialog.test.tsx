import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AiEditPreviewDialog, type PendingAiEdit } from "./AiEditPreviewDialog";

describe("AiEditPreviewDialog", () => {
  it("renders nothing when closed", () => {
    render(
      <AiEditPreviewDialog onApprove={vi.fn()} onDiscard={vi.fn()} onOpenChange={vi.fn()} open={false} pendingEdit={null} />
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the diff and enables Approve when the edit changes content", () => {
    const pendingEdit: PendingAiEdit = { label: "Fix description", before: "old line\n", after: "new line\n" };
    render(
      <AiEditPreviewDialog onApprove={vi.fn()} onDiscard={vi.fn()} onOpenChange={vi.fn()} open pendingEdit={pendingEdit} />
    );

    expect(screen.getByText("Fix description")).toBeInTheDocument();
    expect(screen.getByText("old line", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("new line", { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeEnabled();
  });

  it("shows a no-changes message and disables Approve when before equals after", () => {
    const pendingEdit: PendingAiEdit = { label: "No-op edit", before: "same\n", after: "same\n" };
    render(
      <AiEditPreviewDialog onApprove={vi.fn()} onDiscard={vi.fn()} onOpenChange={vi.fn()} open pendingEdit={pendingEdit} />
    );

    expect(screen.getByText("No changes — the AI returned the same content.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled();
  });

  it("calls onApprove and onDiscard", async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    const onDiscard = vi.fn();
    const pendingEdit: PendingAiEdit = { label: "Fix description", before: "old\n", after: "new\n" };

    render(
      <AiEditPreviewDialog onApprove={onApprove} onDiscard={onDiscard} onOpenChange={vi.fn()} open pendingEdit={pendingEdit} />
    );

    await user.click(screen.getByRole("button", { name: "Approve" }));
    expect(onApprove).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });
});
