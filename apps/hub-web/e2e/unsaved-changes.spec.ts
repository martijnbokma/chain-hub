import { expect, test } from "@playwright/test";

import { createSkillAsset } from "./helpers";

test("warns before discarding unsaved edits when switching assets", async ({ page }) => {
  const first = `e2e-dirty-a-${Date.now()}`;
  const second = `e2e-dirty-b-${Date.now()}`;
  await createSkillAsset(page, first);
  await createSkillAsset(page, second);

  await page.getByText(first, { exact: true }).first().click();
  const editor = page.getByRole("group", { name: /^Edit skills / }).locator(".cm-content");
  await expect(page.getByRole("group", { name: `Edit skills ${first}` })).toBeVisible();
  await editor.click();
  await page.keyboard.press("End");
  await page.keyboard.type(" unsaved edit");

  await page.getByText(second, { exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Discard unsaved changes?" })).toBeVisible();

  await dialog.getByRole("button", { name: "Keep editing" }).click();
  await expect(dialog).toBeHidden();
  await expect(editor).toContainText("unsaved edit");

  await page.getByText(second, { exact: true }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Discard changes" }).click();
  await expect(page.getByRole("group", { name: `Edit skills ${second}` })).toBeVisible();
  await expect(editor).not.toContainText("unsaved edit");
});
