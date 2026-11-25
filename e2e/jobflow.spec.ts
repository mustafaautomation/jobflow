import { expect, test, type Page } from "@playwright/test";

const CEDAR = "11111111-1111-4111-8111-111111111111";

test.describe.configure({ mode: "serial" });

test("other tenant cannot see Cedar HVAC jobs", async ({ page }) => {
  await signIn(page, "lena@summitplumbing.example");
  await expect(page.getByRole("heading", { name: "Today's dispatch" })).toBeVisible();
  await page.goto("/board");
  await expect(page.getByText("Miles Adler")).toBeVisible();
  await expect(page.getByText("Elena Vasquez")).toHaveCount(0);
  await expect(page.getByText("Cedar HVAC")).toHaveCount(0);
  await page.goto("/jobs/101");
  await expect(page.getByText("This job is not on this workspace.")).toBeVisible();
  const response = await page.request.get("/api/jobs");
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { jobs: { tenantId: string; customerName: string }[] };
  expect(body.jobs.some((job) => job.tenantId === CEDAR || job.customerName === "Elena Vasquez")).toBe(false);
  expect(body.jobs.some((job) => job.customerName === "Miles Adler")).toBe(true);
});

test("public demo is read-only", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByTestId("demo-banner")).toBeVisible();
  await expect(page.getByText("Elena Vasquez").first()).toBeVisible();
  const assign = page.getByTestId("assign-job").first();
  await page.goto("/board");
  await expect(assign).toBeDisabled();
  const denied = await page.request.post("/api/jobs", { data: { title: "should fail" } });
  expect(denied.status()).toBe(403);
});

test("request, assign, complete, and pay", async ({ page }) => {
  const stamp = Date.now();
  const name = `Playwright Hale ${stamp}`;
  const email = `pw.${stamp}@example.com`;

  await page.goto("/book/cedar-hvac");
  await page.getByRole("radio", { name: /No-cool diagnostic/ }).check();
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Phone").fill("512-555-0199");
  await page.getByLabel("Street address").fill("1842 Barton Hills Dr, Austin, TX");
  await page.getByLabel("What is going on?").fill("Upstairs is hot and the outdoor fan will not spin.");
  await page.getByTestId("book-submit").click();
  await expect(page.getByText("Request received")).toBeVisible();

  await signIn(page, "marcus@cedarhvac.example");
  await page.goto("/board");
  const card = page.locator("[data-testid^='job-']").filter({ hasText: name });
  await expect(card).toBeVisible();
  await card.getByLabel(`Assign ${name}`).selectOption({ label: "Luis Ortega" });
  await card.getByTestId("assign-job").click();
  await expect(page.getByTestId("lane-1").getByText(name)).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, "luis@cedarhvac.example");
  await page.getByRole("link", { name: new RegExp(name) }).click();
  await page.getByLabel("Note").fill("Replaced the run capacitor. System is cooling.");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByText("Note saved.")).toBeVisible();
  await page.locator("input[type='file']").setInputFiles({
    name: "coil.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
  });
  await page.getByRole("button", { name: "Upload photo" }).click();
  await expect(page.getByRole("img", { name: "Job photo" })).toBeVisible();
  await page.getByRole("button", { name: "Mark en route" }).click();
  await page.getByRole("button", { name: "Mark on site" }).click();
  await page.getByRole("button", { name: "Complete job" }).click();
  await expect(page.getByText("Waiting on payment.")).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 800 });
  await signIn(page, email);
  await page.getByRole("button", { name: "Pay now" }).click();
  await page.getByTestId("mock-pay").click();
  await expect(page.getByTestId("payment-status")).toHaveText("Paid");
});

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Work email").fill(email);
  await page.getByRole("button", { name: "Enter workspace" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}
