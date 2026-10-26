import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { SkillBatchItemResult } from "@/types";

import { SkillUpdateResultsDialog } from "./SkillUpdateResultsDialog";

const results: SkillBatchItemResult[] = [
  {
    name: "fresh-skill",
    status: "updated",
    previousCommitSha: "aaa1111bbbb",
    lockEntry: { source: "git://example/repo" } as SkillBatchItemResult["lockEntry"]
  },
  { name: "stable-skill", status: "skipped", previousCommitSha: null },
  { name: "broken-skill", status: "failed", error: "remote unreachable" }
];

describe("SkillUpdateResultsDialog", () => {
  it("renders nothing when results are null", () => {
    render(<SkillUpdateResultsDialog onOpenChange={vi.fn()} results={null} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("summarizes updated, up-to-date and failed counts", () => {
    render(<SkillUpdateResultsDialog onOpenChange={vi.fn()} results={results} />);

    expect(screen.getByText("3 checked · 1 updated · 1 up to date · 1 failed")).toBeInTheDocument();
    expect(screen.getByText("fresh-skill")).toBeInTheDocument();
    expect(screen.getByText("Updated")).toBeInTheDocument();
    expect(screen.getByText("Up to date")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("remote unreachable")).toBeInTheDocument();
  });

  it("shows the sha transition for updated skills", () => {
    render(<SkillUpdateResultsDialog onOpenChange={vi.fn()} results={results} />);
    expect(screen.getByText(/aaa1111/)).toBeInTheDocument();
  });

  it("closes via the Done button", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<SkillUpdateResultsDialog onOpenChange={onOpenChange} results={results} />);

    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
