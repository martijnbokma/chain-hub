import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { CreateAssetDialog } from "./CreateAssetDialog";

vi.mock("@/components/common/MarkdownSourceEditor", () => ({
  MarkdownSourceEditor: ({
    value,
    onChange,
    "aria-label": ariaLabel
  }: {
    value: string;
    onChange: (value: string) => void;
    "aria-label"?: string;
  }) => (
    <textarea
      aria-label={ariaLabel ?? "Asset markdown content"}
      onChange={(event) => onChange(event.target.value)}
      value={value}
    />
  )
}));

describe("CreateAssetDialog", () => {
  it("enables create for a named skill with content and submits", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onDraftNameChange = vi.fn();
    const onDraftNameLockedChange = vi.fn();
    const onDraftKindChoiceChange = vi.fn();
    const onDraftContentChange = vi.fn();

    const { rerender } = render(
      <MemoryRouter>
        <CreateAssetDialog
          draftContent="# Hello"
          draftIntent=""
          draftKindChoice="skills"
          draftName=""
          draftNameLocked={false}
          isDrafting={false}
          isSubmitting={false}
          kindReason={null}
          onDraftContentChange={onDraftContentChange}
          onDraftIntentChange={vi.fn()}
          onDraftKindChoiceChange={onDraftKindChoiceChange}
          onDraftNameChange={onDraftNameChange}
          onDraftNameLockedChange={onDraftNameLockedChange}
          onDraftWithAi={vi.fn()}
          onOpenChange={vi.fn()}
          onSubmit={onSubmit}
          open
          resolvedKind="skills"
        />
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: "Create asset" })).toBeDisabled();

    await user.type(screen.getByPlaceholderText("auto from intent…"), "review-pr");
    expect(onDraftNameChange).toHaveBeenCalled();

    rerender(
      <MemoryRouter>
        <CreateAssetDialog
          draftContent="# Hello"
          draftIntent=""
          draftKindChoice="skills"
          draftName="review-pr"
          draftNameLocked
          isDrafting={false}
          isSubmitting={false}
          kindReason={null}
          onDraftContentChange={onDraftContentChange}
          onDraftIntentChange={vi.fn()}
          onDraftKindChoiceChange={onDraftKindChoiceChange}
          onDraftNameChange={onDraftNameChange}
          onDraftNameLockedChange={onDraftNameLockedChange}
          onDraftWithAi={vi.fn()}
          onOpenChange={vi.fn()}
          onSubmit={onSubmit}
          open
          resolvedKind="skills"
        />
      </MemoryRouter>
    );

    const createButton = screen.getByRole("button", { name: "Create asset" });
    expect(createButton).toBeEnabled();
    await user.click(createButton);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
