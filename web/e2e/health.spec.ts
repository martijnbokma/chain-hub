import { expect, test } from "@playwright/test";

test.describe("Health page", () => {
  test("shows a status card for every subsystem", async ({ page }) => {
    await page.goto("/health");

    await expect(page.getByRole("heading", { name: "Health" })).toBeVisible();
    for (const label of [
      "Hub structure",
      "Skills & updates",
      "Editors",
      "Sync & backup",
      "Security scans",
      "AI provider"
    ]) {
      await expect(page.getByRole("heading", { name: label })).toBeVisible();
    }
  });

  test("reports a fresh hub as clean", async ({ page }) => {
    await page.goto("/health");

    // A fresh e2e hub has no validation, skill, sync or scan issues.
    await expect(page.getByText("No open issues; every subsystem is in good shape.")).toBeVisible();
  });
});
