import path from "node:path";

import { expect, test } from "@playwright/test";

import { writeSkillFixture } from "./helpers";

test("discovers and imports an unmanaged skill from a linked editor", async ({ page }) => {
  // Target paths are deterministic (~/.cursor/skills etc.) regardless of connection
  // state, and discovery scans them unconditionally — no need to run editor setup
  // first. Skipping it also avoids racing setup-wizard.spec.ts, which shares this
  // suite's single server/hub instance and asserts on the pre-connect state.
  const integrations = (await (await page.request.get("/api/integrations")).json()) as Array<{
    id: string;
    label: string;
    targetPaths: string[];
  }>;
  const cursor = integrations.find((integration) => integration.id === "cursor");
  if (!cursor) {
    throw new Error("Cursor integration not found in /api/integrations response");
  }

  const skillName = `e2e-discover-${Date.now()}`;
  await writeSkillFixture(path.join(cursor.targetPaths[0], skillName), skillName);

  await page.goto("/library");
  await page.getByRole("button", { name: "Discover" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Discover" })).toBeVisible();

  const candidateRow = dialog.locator("li", { hasText: skillName });
  await expect(candidateRow).toBeVisible();
  await candidateRow.getByRole("button", { name: "Import" }).click();

  await expect(page.getByText(`Imported skills/${skillName}`)).toBeVisible();

  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: new RegExp(skillName) })).toBeVisible();
});
