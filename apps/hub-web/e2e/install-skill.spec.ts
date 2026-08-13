import { tmpdir } from "node:os";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { writeSkillFixture } from "./helpers";

test("installs a skill from a local folder path", async ({ page }) => {
  // Installing from a path derives the asset name from the folder's basename,
  // not from SKILL.md frontmatter — the fixture folder name must match.
  const skillName = `e2e-install-${Date.now()}`;
  const fixtureDir = path.join(tmpdir(), skillName);
  await writeSkillFixture(fixtureDir, skillName);

  await page.goto("/library?kind=skills");

  await page.getByRole("button", { name: "Install skill" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Install skill" })).toBeVisible();

  await dialog.getByPlaceholder("/Users/you/www/skills/my-skill").fill(fixtureDir);
  await dialog.getByRole("button", { name: "Install" }).click();

  await expect(page.getByText(`Installed skills/${skillName}`)).toBeVisible();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("heading", { name: skillName, exact: true })).toBeVisible();
});
