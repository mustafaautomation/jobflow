import { expect, test } from "@playwright/test";

const dir = "docs/screenshots";

test("capture product screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /finishes the day/i })).toBeVisible();
  await page.screenshot({ path: `${dir}/landing.png` });

  await page.goto("/book/cedar-hvac");
  await expect(page.getByRole("heading", { name: /Request Cedar HVAC/ })).toBeVisible();
  await page.screenshot({ path: `${dir}/booking.png` });

  await page.goto("/login");
  await page.getByRole("button", { name: "Continue as Marcus Hale" }).click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByTestId("stat-jobs-today")).toBeVisible();
  await page.screenshot({ path: `${dir}/dashboard.png` });

  await page.goto("/board");
  await expect(page.getByTestId("board")).toBeVisible();
  await page.screenshot({ path: `${dir}/board.png` });

  await page.goto("/calendar");
  await expect(page.getByRole("heading", { name: "Week" })).toBeVisible();
  await page.screenshot({ path: `${dir}/calendar.png` });

  await page.goto("/map");
  await expect(page.getByRole("heading", { name: "Austin map" })).toBeVisible();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${dir}/map.png` });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel("Work email").fill("luis@cedarhvac.example");
  await page.getByRole("button", { name: "Enter workspace" }).click();
  await page.waitForURL("**/tech");
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  await page.screenshot({ path: `${dir}/tech.png` });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/login");
  await page.getByLabel("Work email").fill("jordan@rivera.example");
  await page.getByRole("button", { name: "Enter workspace" }).click();
  await page.waitForURL("**/portal");
  await expect(page.getByRole("heading", { name: "Your visits" })).toBeVisible();
  await page.screenshot({ path: `${dir}/portal.png` });
});
