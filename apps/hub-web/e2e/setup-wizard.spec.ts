import { expect, test } from "@playwright/test";

test("connects editors from the setup wizard", async ({ page }) => {
  await page.goto("/setup");

  await expect(page.getByRole("heading", { name: "Get your hub ready" })).toBeVisible();

  // A freshly initialized hub seeds a welcome skill, so structure validation
  // already passes before any user action.
  const validateStep = page.locator("li", { has: page.getByRole("heading", { name: "Validate structure" }) });
  await expect(validateStep.getByText("Done")).toBeVisible();

  const connectStep = page.locator("li", { has: page.getByRole("heading", { name: "Connect editors" }) });
  await connectStep.getByRole("button", { name: "Connect editors" }).click();
  await expect(connectStep.getByText("Done")).toBeVisible();
});
