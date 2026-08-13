import { expect, type Page } from "@playwright/test";

/** Fills and submits the Create Asset dialog for a minimal skill. Leaves the dialog closed. */
export async function createSkillAsset(page: Page, name: string): Promise<void> {
  await page.goto("/library");
  await page.getByRole("button", { name: "Create" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Create asset" })).toBeVisible();

  await dialog.getByLabel("Name").fill(name);
  await dialog.getByLabel("Kind").selectOption("skills");

  await dialog.getByRole("group", { name: "Asset markdown content" }).locator(".cm-content").click();
  await page.keyboard.type(`# ${name}\n\nCreated by Playwright e2e test.`);

  await dialog.getByRole("button", { name: "Create asset" }).click();
  await expect(dialog).toBeHidden();
}
