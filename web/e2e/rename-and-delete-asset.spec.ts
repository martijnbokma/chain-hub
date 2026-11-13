import { expect, test } from "@playwright/test";

import { createSkillAsset } from "./helpers";

test("renames an asset then deletes it from the library", async ({ page }) => {
  const originalName = `e2e-rename-${Date.now()}`;
  await createSkillAsset(page, originalName);

  // Creating an asset auto-selects it, so its detail panel is already open.
  await expect(page.getByRole("heading", { name: originalName, exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Rename asset" }).click();
  const renamedName = `${originalName}-renamed`;
  const nameInput = page.getByLabel("Asset name");
  await nameInput.fill(renamedName);
  await page.getByRole("button", { name: "Save name" }).click();

  await expect(page.getByText(`Renamed to skills/${renamedName}`)).toBeVisible();
  await expect(page.getByRole("heading", { name: renamedName, exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Delete asset" }).click();
  const confirmDialog = page.getByRole("dialog");
  await expect(confirmDialog.getByRole("heading", { name: "Delete asset" })).toBeVisible();
  await confirmDialog.getByRole("button", { name: "Confirm delete" }).click();

  await expect(confirmDialog).toBeHidden();
  await expect(page.getByRole("heading", { name: renamedName, exact: true })).not.toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(renamedName) })).not.toBeVisible();
});
