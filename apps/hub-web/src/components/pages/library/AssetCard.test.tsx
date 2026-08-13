import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { AssetRecord } from "@/types";
import { AssetCard } from "./AssetCard";

function asset(overrides: Partial<AssetRecord> = {}): AssetRecord {
  return {
    id: "1",
    name: "review-pr",
    kind: "skills",
    relativePath: "skills/review-pr/SKILL.md",
    updatedAt: "2026-01-01T00:00:00.000Z",
    provenance: null,
    ...overrides
  };
}

describe("AssetCard", () => {
  it("renders the asset name and kind badge", () => {
    render(<AssetCard asset={asset()} onSelect={vi.fn()} selected={false} />);

    expect(screen.getByText("review-pr")).toBeInTheDocument();
    expect(screen.getByText("Skill")).toBeInTheDocument();
  });

  it("shows a source-type badge and source line for skills", () => {
    render(
      <AssetCard
        asset={asset({ provenance: { sourceType: "git", source: "https://github.com/a/b", subdir: null, installedAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" } })}
        onSelect={vi.fn()}
        selected={false}
      />
    );

    expect(screen.getByText("git")).toBeInTheDocument();
    expect(screen.getByText("Source · https://github.com/a/b")).toBeInTheDocument();
  });

  it("hides the source line for non-skill kinds", () => {
    render(<AssetCard asset={asset({ kind: "prompts" })} onSelect={vi.fn()} selected={false} />);
    expect(screen.queryByText("Source ·", { exact: false })).not.toBeInTheDocument();
  });

  it("shows the author line only when an author is present", () => {
    render(<AssetCard asset={asset({ author: "Martijn Bokma" })} onSelect={vi.fn()} selected={false} />);
    expect(screen.getByText("Author · Martijn Bokma")).toBeInTheDocument();
  });

  it("flags assets with a missing-description compat error", () => {
    render(
      <AssetCard
        asset={asset({ compatIssues: [{ code: "missing_description", severity: "error", message: "no description" }] })}
        onSelect={vi.fn()}
        selected={false}
      />
    );

    expect(screen.getByText("Missing description")).toBeInTheDocument();
  });

  it("hides the updated-date paragraph in compact mode", () => {
    const { rerender } = render(<AssetCard asset={asset()} compact={false} onSelect={vi.fn()} selected={false} />);
    expect(screen.getByText("Updated 1/1/2026")).toBeInTheDocument();

    rerender(<AssetCard asset={asset()} compact onSelect={vi.fn()} selected={false} />);
    expect(screen.queryByText("Updated 1/1/2026")).not.toBeInTheDocument();
  });

  it("calls onSelect when clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<AssetCard asset={asset()} onSelect={onSelect} selected={false} />);

    await user.click(screen.getByRole("button", { name: /review-pr/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
