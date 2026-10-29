import { expect, test } from "@playwright/test";

test("home page loads with the sample text and renders issues", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("WriteWise")).toBeVisible();
  // The CodeMirror editor should contain the bundled sample paragraph.
  await expect(page.locator(".cm-content")).toContainText("phishing email", { timeout: 10_000 });
  // Analysis should settle to "ready" and surface at least one issue from the sample text
  // (it intentionally contains fillers, hedging, and a wordy phrase).
  await expect(page.getByText("Status:")).toBeVisible();
  await expect(page.getByText(/issue\(s\) found/)).toBeVisible({ timeout: 15_000 });
});

test("switching English variant triggers a new analysis run", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".cm-content")).toContainText("phishing email", { timeout: 10_000 });
  await page.getByRole("combobox").selectOption("gb");
  await expect(page.getByRole("combobox")).toHaveValue("gb");
});

test("Fix All review flow applies a bulk fix", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/issue\(s\) found/)).toBeVisible({ timeout: 15_000 });
  const fixAllButton = page.getByRole("button", { name: /Fix All/ });
  await expect(fixAllButton).toBeVisible();
  await fixAllButton.click();
  await expect(page.getByText(/Review \d+ fix\(es\)/)).toBeVisible();
  const applyButton = page.getByRole("button", { name: /Apply \d+ change/ });
  await applyButton.click();
  await expect(page.getByText(/Review \d+ fix\(es\)/)).not.toBeVisible();
});

test("Rephrase tab shows style options and candidates for a selected sentence", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".cm-content")).toContainText("phishing email", { timeout: 10_000 });
  await page.getByRole("tab", { name: "Rephrase" }).click();
  await page.locator(".cm-content").click();
  await expect(page.getByRole("button", { name: "Concise" })).toBeVisible();
  await page.getByRole("button", { name: "Concise" }).click();
});

test("theme toggle switches between light and dark", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Toggle light/dark theme" });
  await expect(toggle).toBeVisible();
  const before = await page.evaluate(() => document.documentElement.className);
  await toggle.click();
  const after = await page.evaluate(() => document.documentElement.className);
  expect(before).not.toBe(after);
});

test("tabs switch between Issues and Rephrase panels with keyboard navigation", async ({
  page,
}) => {
  await page.goto("/");
  const issuesTab = page.getByRole("tab", { name: "Issues" });
  const rephraseTab = page.getByRole("tab", { name: "Rephrase" });
  await expect(issuesTab).toHaveAttribute("aria-selected", "true");
  await issuesTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(rephraseTab).toHaveAttribute("aria-selected", "true");
});
