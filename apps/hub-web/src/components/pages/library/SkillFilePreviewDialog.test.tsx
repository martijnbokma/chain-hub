import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { libraryApi } from "@/lib/api";
import { SkillFilePreviewDialog } from "./SkillFilePreviewDialog";

vi.mock("@/lib/api", () => ({
  libraryApi: {
    getSkillFile: vi.fn()
  }
}));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("SkillFilePreviewDialog", () => {
  it("renders nothing when no path is selected", () => {
    renderWithClient(<SkillFilePreviewDialog onOpenChange={vi.fn()} path={null} skillName="review-pr" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the file content and formatted size once loaded", async () => {
    vi.mocked(libraryApi.getSkillFile).mockResolvedValue({
      path: "reference.md",
      content: "# Reference",
      size: 2048,
      truncated: false
    });

    renderWithClient(
      <SkillFilePreviewDialog onOpenChange={vi.fn()} path="reference.md" skillName="review-pr" />
    );

    expect(await screen.findByText("# Reference")).toBeInTheDocument();
    expect(screen.getByText(/2\.0 KB/)).toBeInTheDocument();
    expect(libraryApi.getSkillFile).toHaveBeenCalledWith("review-pr", "reference.md");
  });

  it("shows a truncation notice for files over 1 MB", async () => {
    vi.mocked(libraryApi.getSkillFile).mockResolvedValue({
      path: "big.md",
      content: "partial content",
      size: 2_000_000,
      truncated: true
    });

    renderWithClient(<SkillFilePreviewDialog onOpenChange={vi.fn()} path="big.md" skillName="review-pr" />);

    expect(await screen.findByText(/showing the first part only/)).toBeInTheDocument();
  });

  it("shows an error message when the fetch fails", async () => {
    vi.mocked(libraryApi.getSkillFile).mockRejectedValue(new Error("not found"));

    renderWithClient(<SkillFilePreviewDialog onOpenChange={vi.fn()} path="missing.md" skillName="review-pr" />);

    await waitFor(() => expect(screen.getByText("Unable to load this file.")).toBeInTheDocument());
  });
});
