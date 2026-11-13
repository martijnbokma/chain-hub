import { expect, test } from "@playwright/test";

import { createSkillAsset } from "./helpers";

test("creates a new skill asset and shows it in the library", async ({ page }) => {
  const assetName = `e2e-skill-${Date.now()}`;
  await createSkillAsset(page, assetName);

  await expect(page.getByText(assetName).first()).toBeVisible();
});
