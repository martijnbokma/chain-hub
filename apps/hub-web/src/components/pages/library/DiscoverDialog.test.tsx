import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DiscoverDialog } from "./DiscoverDialog";
import type { DiscoveredAsset } from "@/types";

const mockCandidates: Record<string, DiscoveredAsset[]> = {
  "Claude Code": [
    {
      editorId: "claude-code",
      kind: "skills",
      name: "21st-ai",
      preview: "21st AI is a fast UI-drafting board.",
      content: "# 21st-ai"
    },
    {
      editorId: "claude-code",
      kind: "skills",
      name: "21st-cli-use",
      preview: "The 21st CLI",
      content: "# 21st-cli-use"
    }
  ],
  Cursor: [
    {
      editorId: "cursor",
      kind: "skills",
      name: "21st-ai",
      preview: "21st AI is a fast UI-drafting board.",
      content: "# 21st-ai"
    },
    {
      editorId: "cursor",
      kind: "skills",
      name: "cursor-skill",
      preview: "A skill in cursor",
      content: "# cursor-skill"
    }
  ]
};

describe("DiscoverDialog", () => {
  it("renders candidates and triggers onImport for single asset", async () => {
    const user = userEvent.setup();
    const onImport = vi.fn();
    const onImportAll = vi.fn();

    render(
      <DiscoverDialog
        groupedDiscovered={mockCandidates}
        isCandidateImporting={() => false}
        isLoading={false}
        onImport={onImport}
        onImportAll={onImportAll}
        onOpenChange={vi.fn()}
        open
      />
    );

    expect(screen.getByRole("heading", { name: "Discover" })).toBeInTheDocument();
    expect(screen.getByText("4 unmanaged assets found")).toBeInTheDocument();

    const importButtons = screen.getAllByRole("button", { name: "Import" });
    expect(importButtons).toHaveLength(4);

    await user.click(importButtons[0]);
    expect(onImport).toHaveBeenCalledWith(mockCandidates["Claude Code"][0]);
  });

  it("triggers onImportAll when clicking the top banner button", async () => {
    const user = userEvent.setup();
    const onImportAll = vi.fn();

    render(
      <DiscoverDialog
        groupedDiscovered={mockCandidates}
        isCandidateImporting={() => false}
        isLoading={false}
        onImport={vi.fn()}
        onImportAll={onImportAll}
        onOpenChange={vi.fn()}
        open
      />
    );

    const importAllButtons = screen.getAllByRole("button", { name: "Import all (4)" });
    expect(importAllButtons.length).toBeGreaterThanOrEqual(1);

    await user.click(importAllButtons[0]);
    expect(onImportAll).toHaveBeenCalledWith([
      ...mockCandidates["Claude Code"],
      ...mockCandidates.Cursor
    ]);
  });

  it("triggers onImportAll with group candidates when clicking group import button", async () => {
    const user = userEvent.setup();
    const onImportAll = vi.fn();

    render(
      <DiscoverDialog
        groupedDiscovered={mockCandidates}
        isCandidateImporting={() => false}
        isLoading={false}
        onImport={vi.fn()}
        onImportAll={onImportAll}
        onOpenChange={vi.fn()}
        open
      />
    );

    const groupButton = screen.getByRole("button", { name: "Import from Claude Code" });
    await user.click(groupButton);
    expect(onImportAll).toHaveBeenCalledWith(mockCandidates["Claude Code"]);
  });

  it("shows progress when isImportingAll is true", () => {
    render(
      <DiscoverDialog
        groupedDiscovered={mockCandidates}
        importProgress={{ current: 2, total: 4 }}
        isCandidateImporting={() => true}
        isImportingAll
        isLoading={false}
        onImport={vi.fn()}
        onImportAll={vi.fn()}
        onOpenChange={vi.fn()}
        open
      />
    );

    const progressButtons = screen.getAllByRole("button", { name: "Importing (2/4)…" });
    expect(progressButtons.length).toBeGreaterThanOrEqual(1);
    expect(progressButtons[0]).toBeDisabled();
  });

  it("renders empty state when no candidates found", () => {
    render(
      <DiscoverDialog
        groupedDiscovered={{}}
        isCandidateImporting={() => false}
        isLoading={false}
        onImport={vi.fn()}
        onImportAll={vi.fn()}
        onOpenChange={vi.fn()}
        open
      />
    );

    expect(
      screen.getByText("Nothing to import — every native asset in your linked editors is already tracked by the hub.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /import all/i })).not.toBeInTheDocument();
  });
});
