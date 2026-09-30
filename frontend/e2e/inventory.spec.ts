import { test, expect } from "@playwright/test";
test("owner onboards, updates stock and sees persisted ledger on mobile", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/signup");
  await page.getByLabel("Your name").fill("Gourav");
  await page
    .getByLabel("Email address")
    .fill(`owner-${Date.now()}@example.test`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("stoqo-safe-test-password");
  await page.getByRole("button", { name: "Create your account" }).click();
  await page.getByLabel("Business name").fill("Everyday Store");
  await page.getByRole("button", { name: "Create your workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Hey, Gourav" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add product", exact: true })
    .last()
    .click();
  await page.getByLabel("Product name").fill("Everyday Tee");
  await page.getByLabel("Selling price").fill("599");
  await page.getByLabel("Size (optional)").fill("M");
  await page.getByLabel("Colour (optional)").fill("Black");
  await page.getByLabel("Opening stock").fill("10");
  await page.getByText("More options", {exact: false}).click();
  await page.getByLabel("Barcode", {exact: true}).fill("STOQO-TEST-M");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add product" })
    .click();
  await expect(page.getByText("A new product on your shelves")).toBeVisible();
  await page.getByRole("button", {name: "Scan barcode", exact: true}).first().click();
  await page.getByLabel("Scan a photo").setInputFiles("e2e/fixtures/barcode.svg");
  await expect(page.getByRole("dialog").getByText("10 units", {exact: true})).toBeVisible();
  await page.getByRole("button", {name: "Close", exact: true}).click();
  await page
    .getByRole("link", { name: "Inventory", exact: true })
    .first()
    .click();
  await page.locator(".product-name").filter({ hasText: "Everyday Tee" }).click();
  await expect(
    page.getByRole("dialog").getByText("10 units", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Sold / stock out" })
    .click();
  await page.getByLabel("Quantity", { exact: true }).fill("3");
  await page.getByRole("button", { name: "Remove stock" }).click();
  await expect(page.getByText("3 units removed. Stock updated.")).toBeVisible();
  await page.reload();
  await page.locator(".product-name").filter({ hasText: "Everyday Tee" }).click();
  await expect(
    page.getByRole("dialog").getByText("7 units", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog").getByText("-3", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page
      .getByRole("navigation")
      .getByRole("link", { name: "Inventory", exact: true })
      .last(),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.getByRole("link", {name: "Checkout", exact: true}).last().click();
  await page.getByLabel("Scan or enter barcode", {exact: true}).fill("STOQO-TEST-M");
  await page.getByRole("button", {name: "Add to cart", exact: true}).click();
  await page.getByLabel("Quantity Everyday Tee", {exact: true}).fill("2");
  await page.getByRole("button", {name: "Complete sale & create bill"}).click();
  await page.getByRole("button", {name: "Confirm sale", exact: true}).click();
  await expect(page.locator(".receipt").getByText("₹1,198.00", {exact: true}).first()).toBeVisible();
  await page.getByRole("button", {name: "Close", exact: true}).last().click();
  await page.reload();
  await page.getByRole("tab", {name: "Bills", exact: true}).click();
  await page.locator(".bill-history-row").first().click();
  await expect(page.locator(".receipt")).toContainText("Everyday Tee");
  await page.getByRole("button", {name: "Close", exact: true}).last().click();
  await page.getByLabel("Checkout language").selectOption("hi");
  await expect(page.getByRole("heading", {name: "अब बिल बनाना आसान।"})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await page.goto("/app/product-setup");
  await page.getByRole("button", {name: "Create product group", exact: true}).first().click();
  await page.getByLabel("Product group name", {exact: true}).fill("Classic Tee");
  await page.getByLabel("Sizes", {exact: true}).fill("M, L");
  await page.getByLabel("Colours", {exact: true}).fill("Black, White");
  await page.getByLabel("Variant selling price").fill("499");
  await page.getByLabel("Variant opening stock").fill("5");
  await page.getByRole("button", {name: "Preview combinations"}).click();
  await page.getByRole("button", {name: "Create 4 variants", exact: true}).click();
  await expect(page.locator(".setup-variant-list>div")).toHaveCount(4);
  await page.getByRole("button", {name: "Print group labels"}).click();
  await expect(page.locator(".barcode-label")).toHaveCount(4);
  await expect(page.locator(".barcode-label svg rect").first()).toBeAttached();
  const svg = await page.locator(".barcode-label svg").first().evaluate(el=>new XMLSerializer().serializeToString(el));
  await page.getByRole("button", {name:"Close",exact:true}).last().click();
  await page.getByRole("button", {name:"Close",exact:true}).last().click();
  await page.goto("/app/checkout");
  await page.getByLabel("Checkout language").selectOption("en");
  await page.getByRole("button", {name:"Scan barcode",exact:true}).click();
  await page.getByLabel("Scan a photo").setInputFiles({name:'internal.svg',mimeType:'image/svg+xml',buffer:Buffer.from(svg)});
  await expect(page.locator(".checkout-line")).toHaveCount(1);
  await expect(page.getByLabel("Scan a photo")).toBeEnabled();
  await page.getByLabel("Scan a photo").setInputFiles({name:'internal.svg',mimeType:'image/svg+xml',buffer:Buffer.from(svg)});
  await expect(page.getByLabel("Quantity Classic Tee", {exact:true})).toHaveValue("2");
  await page.getByRole("button", {name:"Close",exact:true}).last().click();
  await page.screenshot({
    path: "test-results/inventory-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
