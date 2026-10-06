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
  await page.getByText("More options", { exact: false }).click();
  await page.getByLabel("Barcode", { exact: true }).fill("STOQO-TEST-M");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add product" })
    .click();
  await expect(page.getByText("A new product on your shelves")).toBeVisible();
  await page
    .getByRole("button", { name: "Scan barcode", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Scan a photo")
    .setInputFiles("e2e/fixtures/barcode.svg");
  await expect(
    page.getByRole("dialog").getByText("10 units", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page
    .getByRole("link", { name: "Inventory", exact: true })
    .first()
    .click();
  await page
    .locator(".product-name")
    .filter({ hasText: "Everyday Tee" })
    .click();
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
  await page
    .locator(".product-name")
    .filter({ hasText: "Everyday Tee" })
    .click();
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
  await page
    .getByRole("link", { name: "Checkout", exact: true })
    .last()
    .click();
  await page
    .getByLabel("Scan or enter barcode", { exact: true })
    .fill("STOQO-TEST-M");
  await page.getByRole("button", { name: "Add to cart", exact: true }).click();
  await page.getByLabel("Quantity Everyday Tee", { exact: true }).fill("2");
  await page.getByLabel("Customer name (optional)").fill("Asha");
  await page.getByLabel("Phone (optional)").fill("9876543210");
  await page.getByRole("button", { name: "Hold bill", exact: true }).click();
  await expect(page.locator(".checkout-lines")).not.toContainText(
    "Everyday Tee",
  );
  await page.reload();
  await page
    .getByLabel("Scan or enter barcode", { exact: true })
    .fill("STOQO-TEST-M");
  await page.getByRole("button", { name: "Add to cart", exact: true }).click();
  await page
    .getByRole("button", { name: "Held bills (1/10)", exact: true })
    .click();
  await page.getByRole("button", { name: "Resume bill", exact: true }).click();
  await expect(
    page.getByLabel("Quantity Everyday Tee", { exact: true }),
  ).toHaveValue("2");
  await page.reload();
  await expect(
    page.getByLabel("Quantity Everyday Tee", { exact: true }),
  ).toHaveValue("2");
  await page
    .getByRole("button", { name: "Held bills (1/10)", exact: true })
    .click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Discard", exact: true }).click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  // The server completes the sale but the browser loses its response.
  await page.route(
    "**/api/backend/sales",
    async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.fetch();
      await route.abort("failed");
    },
    { times: 1 },
  );

  await page
    .getByRole("button", { name: "Complete sale & create bill" })
    .click();
  await page.getByRole("button", { name: "Confirm sale", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Try again", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Try again", exact: true }).click();

  await expect(
    page.locator(".receipt").getByText("₹1,198.00", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).last().click();
  await page.reload();
  await page.getByRole("tab", { name: "Bills", exact: true }).click();
  await expect(page.locator(".bill-history-row")).toHaveCount(1);
  await page.locator(".bill-history-row").first().click();
  await expect(page.locator(".receipt")).toContainText("Everyday Tee");
  await page.getByRole("button", { name: "Close", exact: true }).last().click();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("App language", { exact: true }).selectOption("hi");
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await expect(
    page.getByRole("heading", { name: "आपका व्यवसाय", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "बंद करें", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "अब बिल बनाना आसान।" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await expect(
    page.getByRole("button", { name: "बिल रोकें", exact: true }),
  ).toBeVisible();
  await page.goto("/app/inventory");
  await expect(page.getByPlaceholder("नाम, SKU या बारकोड खोजें")).toBeVisible();
  await expect(
    page.locator(".product-name").filter({ hasText: "Everyday Tee" }),
  ).toBeVisible();
  await page
    .locator(".product-name")
    .filter({ hasText: "Everyday Tee" })
    .click();
  await page.getByRole("button", { name: "आया स्टॉक", exact: true }).click();
  await page.getByLabel("मात्रा", { exact: true }).fill("1");
  await page.getByRole("button", { name: "स्टॉक जोड़ें", exact: true }).click();
  await expect(
    page.getByText("1 इकाइयां जोड़े गए। स्टॉक अपडेट हुआ।", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await page.goto("/app/reports");
  await expect(
    page.getByRole("heading", { name: "अपने आंकड़े जानें", exact: false }),
  ).toBeVisible();
  const daily = page.getByRole("region", {
    name: "दुकान का दैनिक सारांश",
    exact: true,
  });
  await expect(
    daily.getByText("₹1,198.00", { exact: true }).first(),
  ).toBeVisible();
  await expect(daily.locator(".daily-transaction")).toHaveCount(1);
  const exportDownload = page.waitForEvent("download");
  await daily
    .getByRole("button", { name: "दैनिक CSV डाउनलोड करें", exact: true })
    .click();
  const exported = await exportDownload;
  expect(exported.suggestedFilename()).toMatch(
    /^stoqo-daily-summary-\d{4}-\d{2}-\d{2}\.csv$/,
  );
  const stream = await exported.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  expect(Buffer.concat(chunks).toString("utf8")).toContain("छूट के बाद बिक्री");
  const summaryDate = daily.getByLabel("सारांश की तारीख", { exact: true });
  const originalDate = await summaryDate.inputValue();
  await daily.getByRole("button", { name: "पिछला दिन", exact: true }).click();
  await expect(summaryDate).not.toHaveValue(originalDate);
  await daily.getByRole("button", { name: "अगला दिन", exact: true }).click();
  await expect(summaryDate).toHaveValue(originalDate);
  await expect(daily.locator(".daily-transaction")).toHaveCount(1);

  await daily.locator(".daily-transaction").first().click();
  await expect(page.locator(".receipt")).toContainText("Everyday Tee");
  await page
    .getByRole("button", { name: "बंद करें", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "सेटिंग्स", exact: true }).click();
  await page.getByLabel("ऐप की भाषा", { exact: true }).selectOption("en");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.goto("/app/product-setup");
  await page
    .getByRole("button", { name: "Create product group", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Product group name", { exact: true })
    .fill("Classic Tee");
  await page.getByLabel("Sizes", { exact: true }).fill("M, L");
  await page.getByLabel("Colours", { exact: true }).fill("Black, White");
  await page.getByLabel("Variant selling price").fill("499");
  await page.getByLabel("Variant opening stock").fill("5");
  await page.getByRole("button", { name: "Preview combinations" }).click();
  await page
    .getByRole("button", { name: "Create 4 variants", exact: true })
    .click();
  await expect(page.locator(".setup-variant-list>div")).toHaveCount(4);
  await page.getByRole("button", { name: "Print group labels" }).click();
  await expect(page.locator(".barcode-label")).toHaveCount(4);
  await expect(page.locator(".barcode-label svg rect").first()).toBeAttached();
  const svg = await page
    .locator(".barcode-label svg")
    .first()
    .evaluate((el) => new XMLSerializer().serializeToString(el));
  await page.getByRole("button", { name: "Close", exact: true }).last().click();
  await page.getByRole("button", { name: "Close", exact: true }).last().click();
  await page.goto("/app/checkout");
  await page
    .getByRole("main")
    .getByRole("button", { name: "Scan barcode", exact: true })
    .click();
  await page.getByLabel("Scan a photo").setInputFiles({
    name: "internal.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from(svg),
  });
  await expect(page.locator(".checkout-line")).toHaveCount(1);
  await expect(page.getByLabel("Scan a photo")).toBeEnabled();
  await page.getByLabel("Scan a photo").setInputFiles({
    name: "internal.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from(svg),
  });
  await expect(
    page.getByLabel("Quantity Classic Tee", { exact: true }),
  ).toHaveValue("2");
  await page.getByRole("button", { name: "Close", exact: true }).last().click();
  await page.goto("/app/subscription");
  await expect(
    page.getByRole("heading", { name: "Plans & usage" }),
  ).toBeVisible();
  await page
    .locator(".subscription-plan")
    .filter({
      has: page.getByRole("heading", { name: "Business", exact: true }),
    })
    .getByRole("button", { name: "Request plan", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save plan request", exact: true })
    .click();
  await expect(
    page.getByText("Business request pending", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Business request pending", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cancel request", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm cancellation", exact: true })
    .click();
  await expect(
    page
      .locator(".subscription-history")
      .getByText("cancelled", { exact: true }),
  ).toBeVisible();
  await page.goto("/app/checkout");
  await page
    .getByRole("tab", { name: "Customer history", exact: true })
    .click();
  await page.getByLabel("Customer phone", { exact: true }).fill("98765 43210");
  await page
    .getByRole("button", { name: "Find purchases", exact: true })
    .click();
  await expect(page.locator(".bill-history-row")).toHaveCount(1);
  await page.locator(".bill-history-row").click();
  await page.getByRole("button", { name: "Return items", exact: true }).click();
  await page
    .getByLabel("Recorded refund method", { exact: true })
    .selectOption("upi");
  await page
    .getByLabel("Return quantity Everyday Tee", { exact: false })
    .fill("1");
  await page
    .getByLabel("Item condition Everyday Tee", { exact: false })
    .selectOption("damaged");
  await page
    .getByLabel("Reason for return", { exact: true })
    .fill("Damaged packaging");
  await page
    .getByRole("button", { name: "Confirm return", exact: true })
    .click();
  await expect(page.locator(".return-record")).toContainText("upi");
  await expect(page.locator(".return-record")).toContainText("damaged");
  await page.getByRole("button", { name: "Close", exact: true }).last().click();
  await page.goto("/app/restocking");
  await page.getByRole("button", { name: "Add supplier", exact: true }).click();
  await page.getByLabel("Supplier name", { exact: true }).fill("Local Supply");
  await page
    .getByRole("button", { name: "Save supplier", exact: true })
    .click();
  await expect(page.getByText("Supplier saved", { exact: true })).toBeVisible();
  await page.getByLabel("Show all products to link suppliers").check();
  await page
    .getByLabel("Search products", { exact: true })
    .fill("Everyday Tee");
  await page
    .getByLabel("Supplier Everyday Tee", { exact: true })
    .selectOption({ label: "Local Supply" });
  await expect(
    page.getByLabel("Supplier Everyday Tee", { exact: true }),
  ).toHaveValue(/\d+/);
  await page
    .getByRole("button", { name: "Receive stock", exact: true })
    .click();
  await page.getByLabel("Quantity", { exact: true }).fill("10");
  await page.getByRole("button", { name: "Add stock", exact: true }).click();
  await expect(
    page.getByText("Current stock: 16 units", { exact: true }),
  ).toBeVisible();
  const secondShop = await page.evaluate(async () => {
    const response = await fetch("/api/backend/businesses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business: {
          name: "Second Store",
          business_type: "Retail",
          currency: "INR",
          timezone: "Asia/Kolkata",
          country: "IN",
        },
      }),
    });
    return response.ok;
  });
  expect(secondShop).toBe(true);
  await page.reload();
  await page
    .getByRole("button", { name: "Switch business", exact: true })
    .locator("svg")
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Second Store", exact: true })
    .click();
  await expect(page.locator(".workspace-picker")).toContainText("Second Store");
  await expect(page.getByText("Local Supply", { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".workspace-picker")).toContainText("Second Store");
  await page
    .getByRole("button", { name: "Switch business", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Everyday Store", exact: true })
    .click();
  await expect(page.locator(".workspace-picker")).toContainText(
    "Everyday Store",
  );
  await page.screenshot({
    path: "test-results/inventory-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
