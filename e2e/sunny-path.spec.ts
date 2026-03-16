import { test, expect, type Page, type BrowserContext } from "@playwright/test";

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------

const HOUSEHOLD_A = "Smith Family";
const HOUSEHOLD_B = "Johnson Family";
const GROUP_NAME = "Sunday Shoppers";

const ITEMS_A = [
  { name: "Whole Milk", qty: "2", unit: "L" },
  { name: "Sourdough Bread", qty: "1", unit: "loaf" },
  { name: "Free Range Eggs", qty: "1", unit: "dozen" },
];
const ITEMS_B = [
  { name: "Olive Oil", qty: "1", unit: "bottle" },
  { name: "Pasta", qty: "2", unit: "pack" },
];
const LAST_MINUTE = { name: "Avocados", qty: "3", unit: "pcs" };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Enter household name on the landing page.
 * The app stores identity in localStorage via `saveHouseholdIdentity`.
 */
async function setupHousehold(page: Page, name: string) {
  await page.goto("/");
  await expect(page.getByText("What's your household name?")).toBeVisible();
  await page.getByPlaceholder("e.g. Smith Family").fill(name);
  await page.getByPlaceholder("e.g. Smith Family").press("Enter");
  // Wait until the setup phase completes -- Create/Join options should appear
  await expect(page.getByRole("link", { name: "Create Group" })).toBeVisible({
    timeout: 10_000,
  });
}

/**
 * Open the AddItemForm bottom sheet (FAB click) and fill + submit one item.
 * The sheet stays open after each add for multi-item entry, so this helper
 * auto-detects whether the dialog is already open before clicking the FAB.
 */
async function addItem(
  page: Page,
  item: { name: string; qty: string; unit: string },
) {
  // Only open the bottom sheet if it's not already visible
  const dialogVisible = await page
    .locator('[role="dialog"][aria-modal="true"]')
    .isVisible();
  if (!dialogVisible) {
    await page.getByLabel("Add item").first().click();
    // Wait for the sheet to animate in
    await expect(page.getByText("Add Item")).toBeVisible({ timeout: 5_000 });
  }

  // Fill name via the combobox input
  const nameInput = page.locator("#add-item-name");
  await nameInput.fill(item.name);
  // Click the qty input to blur the combobox and dismiss its dropdown
  // (pressing Escape would also close the bottom sheet, so we avoid it)
  await page.locator("#add-item-qty").click();

  // Fill quantity
  await page.locator("#add-item-qty").fill(item.qty);

  // Select unit
  await page.locator("#add-item-unit").selectOption(item.unit);

  // Submit
  await page.getByRole("button", { name: "Add to List" }).click();

  // Wait for the form to clear (fields reset after successful add)
  await expect(nameInput).toHaveValue("", { timeout: 5_000 });
}

/**
 * Close the AddItemForm bottom sheet.
 */
async function closeAddItemSheet(page: Page) {
  await page.getByLabel("Close").click();
}

// ---------------------------------------------------------------------------
// Main sunny-path test
// ---------------------------------------------------------------------------

test("sunny path: two households share a grocery list end-to-end", async ({
  browser,
}) => {
  test.setTimeout(120_000);

  // Create two isolated browser contexts (separate localStorage / sessions)
  const ctxA: BrowserContext = await browser.newContext();
  const ctxB: BrowserContext = await browser.newContext();
  const pageA: Page = await ctxA.newPage();
  const pageB: Page = await ctxB.newPage();

  // ================================================================
  // Phase 1 -- Household Setup
  // ================================================================
  await setupHousehold(pageA, HOUSEHOLD_A);
  await setupHousehold(pageB, HOUSEHOLD_B);

  // ================================================================
  // Phase 2 -- Group Creation (ctxA)
  // ================================================================
  await pageA.getByRole("link", { name: "Create Group" }).click();
  await expect(pageA.getByLabel("Group Name")).toBeVisible();

  await pageA.getByLabel("Group Name").fill(GROUP_NAME);
  await pageA.getByRole("button", { name: "Create Group" }).click();

  // Should land on holding state
  await expect(
    pageA.getByText("Waiting for another household to join...")
  ).toBeVisible({ timeout: 10_000 });

  // Capture invite code (rendered as a 3xl font-mono bold paragraph)
  const inviteCodeLocator = pageA.locator("p.text-3xl.font-mono.font-bold");
  await expect(inviteCodeLocator).toBeVisible();
  const inviteCode = (await inviteCodeLocator.textContent())!.trim();
  expect(inviteCode).toMatch(/^[A-Z0-9]{6}$/);

  // Capture groupId from URL
  const groupIdMatch = pageA.url().match(/\/group\/([^/]+)/);
  expect(groupIdMatch).toBeTruthy();
  const groupId = groupIdMatch![1];

  // ================================================================
  // Phase 3 -- Group Join (ctxB)
  // ================================================================
  await pageB.getByRole("link", { name: "Join Group" }).click();
  await expect(pageB.getByLabel("Invite Code")).toBeVisible();

  await pageB.getByLabel("Invite Code").fill(inviteCode);
  await pageB.getByRole("button", { name: "Join Group" }).click();

  // ctxB lands on active group view (2 households)
  await expect(pageB.getByText(GROUP_NAME)).toBeVisible({ timeout: 10_000 });
  await expect(pageB.getByText("2 households")).toBeVisible({ timeout: 10_000 });

  // ctxA auto-transitions from holding to active via onSnapshot
  await expect(pageA.getByText("2 households")).toBeVisible({ timeout: 10_000 });

  // ================================================================
  // Phase 4 -- Adding Items
  // ================================================================

  // ctxA adds 3 items
  for (const item of ITEMS_A) {
    await addItem(pageA, item);
  }
  await closeAddItemSheet(pageA);

  // ctxB adds 2 items
  for (const item of ITEMS_B) {
    await addItem(pageB, item);
  }
  await closeAddItemSheet(pageB);

  // Cross-context visibility: ctxB sees ctxA's items
  for (const item of ITEMS_A) {
    await expect(pageB.getByText(item.name).first()).toBeVisible({
      timeout: 10_000,
    });
  }
  // ctxA sees ctxB's items
  for (const item of ITEMS_B) {
    await expect(pageA.getByText(item.name).first()).toBeVisible({
      timeout: 10_000,
    });
  }

  // ================================================================
  // Phase 5 -- Attribution
  // ================================================================

  // ItemRow renders household name in an attribution pill.
  // ctxA's items show "Smith Family", ctxB's show "Johnson Family".
  await expect(pageB.locator(`text="${HOUSEHOLD_A}"`).first()).toBeVisible({
    timeout: 5_000,
  });
  await expect(pageA.locator(`text="${HOUSEHOLD_B}"`).first()).toBeVisible({
    timeout: 5_000,
  });

  // ================================================================
  // Phase 6 -- Edit + Delete + Undo
  // ================================================================

  // --- Edit: ctxA edits "Sourdough Bread" -> "Rye Bread" ---
  // Find the edit button on the Sourdough Bread row (ctxA owns it, so the
  // edit pencil icon is rendered). We click the first "Edit item" button which
  // corresponds to the first item in the list that belongs to ctxA.
  // Items are sorted by createdAt oldest-first, so Whole Milk is first.
  // We need the second edit button (Sourdough Bread).
  // More robust: locate the row containing the text, then find its edit button.
  const sourdoughEditBtn = pageA
    .locator("div")
    .filter({ hasText: /^Sourdough Bread/ })
    .getByLabel("Edit item");
  // If the above doesn't find a unique match, fall back to nth
  await pageA.getByLabel("Edit item").nth(1).click();

  // Wait for inline edit form with pre-filled "Sourdough Bread"
  const editNameInput = pageA.locator('input[placeholder="Item name"]');
  await expect(editNameInput).toBeVisible();
  await editNameInput.clear();
  await editNameInput.fill("Rye Bread");

  await pageA.getByLabel("Save changes").click();

  // Verify edit is visible locally and propagates to ctxB
  await expect(pageA.getByText("Rye Bread").first()).toBeVisible({
    timeout: 5_000,
  });
  await expect(pageB.getByText("Rye Bread").first()).toBeVisible({
    timeout: 10_000,
  });

  // --- Delete + Undo: ctxA deletes "Free Range Eggs", then undoes ---
  // Items are ordered by createdAt: Whole Milk (nth 0), Rye Bread (nth 1),
  // Free Range Eggs (nth 2). Only ctxA's items have delete buttons, so
  // the 3rd delete button (nth(2)) belongs to Free Range Eggs.
  await pageA.getByLabel("Delete item").nth(2).click();

  // Item should disappear (soft-deleted, filtered out in onSnapshot).
  // Use exact:true so the still-visible sonner toast "Free Range Eggs removed"
  // does not satisfy the locator (its text content is "Free Range Eggs removed",
  // not exactly "Free Range Eggs").
  await expect(
    pageA.getByText("Free Range Eggs", { exact: true })
  ).not.toBeVisible({ timeout: 5_000 });

  // Click Undo in the sonner toast
  await expect(pageA.getByRole("button", { name: "Undo" })).toBeVisible({
    timeout: 3_000,
  });
  await pageA.getByRole("button", { name: "Undo" }).click();

  // Item should reappear (exact match so we're targeting the row span, not the toast)
  await expect(
    pageA.getByText("Free Range Eggs", { exact: true }).first()
  ).toBeVisible({ timeout: 5_000 });

  // --- Ownership gate: ctxB cannot edit ctxA's items ---
  // ItemActions returns null when itemHouseholdId !== currentHouseholdId,
  // so "Rye Bread" row in ctxB should have no edit button.
  const ryeBreadRowB = pageB
    .locator("div")
    .filter({ hasText: /Rye Bread/ })
    .first();
  await expect(ryeBreadRowB.getByLabel("Edit item")).not.toBeVisible();

  // ================================================================
  // Phase 7 -- Shopper Mode
  // ================================================================

  await pageA.getByRole("button", { name: "Start Shopping" }).click();

  // ctxA navigates to /group/:id/shopper
  await expect(pageA).toHaveURL(new RegExp(`/group/${groupId}/shopper`), {
    timeout: 10_000,
  });
  await expect(pageA.getByText("Shopper Mode")).toBeVisible();

  // ctxB sees trip-in-progress on the group page
  await expect(pageB.getByText(/Shopping in progress by/)).toBeVisible({
    timeout: 10_000,
  });

  // ================================================================
  // Phase 8 -- Check-off
  // ================================================================

  // ShopperSubRow aria-labels: "Check off <item> for <household>"
  await pageA.getByLabel(/Check off Whole Milk/i).click();
  await pageA.getByLabel(/Check off Olive Oil/i).click();
  await pageA.getByLabel(/Check off Rye Bread/i).click();

  // Progress: "3 of 5 items checked"
  await expect(pageA.getByText(/3 of 5 items checked/)).toBeVisible({
    timeout: 5_000,
  });

  // Uncheck Rye Bread
  await pageA.getByLabel(/Uncheck Rye Bread/i).click();
  await expect(pageA.getByText(/2 of 5 items checked/)).toBeVisible({
    timeout: 5_000,
  });

  // Re-check Rye Bread
  await pageA.getByLabel(/Check off Rye Bread/i).click();
  await expect(pageA.getByText(/3 of 5 items checked/)).toBeVisible({
    timeout: 5_000,
  });

  // ================================================================
  // Phase 9 -- Last-minute item
  // ================================================================

  // ctxB adds Avocados from the group page
  await addItem(pageB, LAST_MINUTE);
  await closeAddItemSheet(pageB);

  // ctxA sees Avocados in Shopper Mode with "New" badge
  await expect(pageA.getByText("Avocados").first()).toBeVisible({
    timeout: 10_000,
  });
  await expect(pageA.getByText("New").first()).toBeVisible({ timeout: 5_000 });

  // Total is now 6, still 3 checked
  await expect(pageA.getByText(/3 of 6 items checked/)).toBeVisible({
    timeout: 5_000,
  });

  // ================================================================
  // Phase 10 -- Trip Completion
  // ================================================================

  // Per the spec, trip completion archives "bought" items into the trip doc
  // and hard-deletes them from the items collection. Pending items remain.
  //
  // Currently checked: Whole Milk, Olive Oil, Rye Bread (3 bought)
  // Pending: Free Range Eggs, Pasta, Avocados (3 pending -- remain after trip)
  //
  // The spec says "5 items shown" in trip summary, which would require 5 bought.
  // However, the spec's Phase 12 post-condition says "only Pasta + Free Range Eggs
  // remain on the group list." That means Avocados must also be checked off,
  // leaving exactly Pasta + Free Range Eggs pending.
  //
  // So we need to check off Avocados too: 3 + 1 = 4 bought items.
  // Remaining: Free Range Eggs + Pasta.
  // Trip summary shows 4 items purchased.
  //
  // But the spec says "5 items shown". We reconcile by also checking off one more.
  // Looking again: the spec says ctxA checks Whole Milk, Olive Oil, Rye Bread in
  // Phase 8, and Phase 10 says "5 items shown". The missing 2 must come from
  // checking Free Range Eggs during the trip... but then it would not remain.
  //
  // Final interpretation: follow the spec's post-condition (authoritative).
  // Check off Avocados so that Pasta + Free Range Eggs remain = 2 items.
  // Trip summary shows 4 items purchased.

  // Check off Avocados before completing
  await pageA.getByLabel(/Check off Avocados/i).click();
  await expect(pageA.getByText(/4 of 6 items checked/)).toBeVisible({
    timeout: 5_000,
  });

  // Click "Complete Trip"
  await pageA.getByRole("button", { name: "Complete Trip" }).click();

  // ctxA redirected to trip summary
  await expect(pageA.getByText("Trip Complete!")).toBeVisible({
    timeout: 15_000,
  });

  // ================================================================
  // Phase 11 -- Trip Summary
  // ================================================================

  // Verify "Items purchased" count
  await expect(pageA.getByText("Items purchased")).toBeVisible();
  const purchasedCount = pageA
    .locator("div")
    .filter({ hasText: /Items purchased/ })
    .locator("span.text-lg.font-bold");
  await expect(purchasedCount).toHaveText("4");

  // Per-household grouping:
  // Smith Family: Whole Milk, Rye Bread = 2 items
  // Johnson Family: Olive Oil, Avocados? No -- Avocados was added by ctxB (Johnson Family).
  // Wait: Avocados was added by ctxB but with ctxB's householdId. So:
  // Smith Family: Whole Milk, Rye Bread = 2 items
  // Johnson Family: Olive Oil, Avocados = 2 items
  const smithSection = pageA
    .getByRole("button")
    .filter({ hasText: HOUSEHOLD_A });
  await expect(smithSection).toBeVisible();
  await expect(smithSection.locator("text=2 items")).toBeVisible();

  const johnsonSection = pageA
    .getByRole("button")
    .filter({ hasText: HOUSEHOLD_B });
  await expect(johnsonSection).toBeVisible();
  await expect(johnsonSection.locator("text=2 items")).toBeVisible();

  // ctxB navigates to trip history and views the same summary
  await pageB.getByRole("button", { name: "Trip History" }).click();
  await expect(pageB.getByText("Trip History")).toBeVisible({
    timeout: 10_000,
  });

  // Click on the completed trip card
  await expect(pageB.getByText(/4 items? purchased/)).toBeVisible({
    timeout: 10_000,
  });
  await pageB.getByText(/4 items? purchased/).click();

  // ctxB sees the same trip summary
  await expect(pageB.getByText("Trip Complete!")).toBeVisible({
    timeout: 10_000,
  });

  // ================================================================
  // Phase 12 -- Post-conditions
  // ================================================================

  // Navigate ctxA back to the group page
  await pageA.getByRole("button", { name: "Done" }).click();
  await expect(pageA.getByText(GROUP_NAME)).toBeVisible({ timeout: 10_000 });

  // Only pending items should remain: Free Range Eggs + Pasta
  await expect(pageA.getByText("Free Range Eggs").first()).toBeVisible({
    timeout: 10_000,
  });
  await expect(pageA.getByText("Pasta").first()).toBeVisible({
    timeout: 10_000,
  });

  // Bought items should NOT be on the list (hard-deleted during trip completion)
  await expect(pageA.getByText("Whole Milk")).not.toBeVisible({
    timeout: 3_000,
  });
  await expect(pageA.getByText("Rye Bread")).not.toBeVisible({
    timeout: 3_000,
  });
  await expect(pageA.getByText("Olive Oil")).not.toBeVisible({
    timeout: 3_000,
  });
  await expect(pageA.getByText("Avocados")).not.toBeVisible({
    timeout: 3_000,
  });

  // Cleanup
  await ctxA.close();
  await ctxB.close();
});
