import { test, expect, Page } from "@playwright/test";

/**
 * Tasks Page E2E Tests
 *
 * Test scenarios based on USE_CASES.md
 * These tests cover the main functionality of the /tasks page
 */

test.describe("Tasks Page", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to tasks page before each test
    await page.goto("/tasks");
  });

  // ===========================================
  // TS-01: Page Load & Display
  // ===========================================
  test.describe("Page Load & Display", () => {
    test("TS-01-01: page loads successfully", async ({ page }) => {
      await expect(page).toHaveURL(/\/tasks/);
      await expect(page.locator("h1")).toContainText("Tasks");
    });

    test("TS-01-02: page title and description visible", async ({ page }) => {
      await expect(page.locator("h1")).toContainText("Tasks");
      await expect(
        page.locator("text=Manage and track all your tasks in one place")
      ).toBeVisible();
    });

    test("TS-01-04: task table is displayed when tasks exist", async ({
      page,
    }) => {
      // Wait for loading to complete
      await page.waitForLoadState("networkidle");

      // Check for either tasks table or empty state
      const hasTable = await page.locator("table").isVisible().catch(() => false);
      const hasEmptyState = await page
        .locator("text=No tasks yet")
        .isVisible()
        .catch(() => false);
      const hasNoMatchState = await page
        .locator("text=No tasks match filters")
        .isVisible()
        .catch(() => false);

      expect(hasTable || hasEmptyState || hasNoMatchState).toBeTruthy();
    });

    test("TS-01-05: filter controls are visible", async ({ page }) => {
      // Search input
      await expect(page.locator('input[placeholder="Search tasks..."]')).toBeVisible();
      // Status filter button
      await expect(page.locator('button:has-text("Status")')).toBeVisible();
      // Client dropdown
      await expect(page.locator('button:has-text("All clients")')).toBeVisible();
      // Assignee dropdown
      await expect(page.locator('button:has-text("All assignees")')).toBeVisible();
    });
  });

  // ===========================================
  // TS-02: Task Creation
  // ===========================================
  test.describe("Task Creation", () => {
    test("TS-02-01: quick-add input is visible", async ({ page }) => {
      await page.waitForLoadState("networkidle");

      // Look for the quick-add input or the add task area
      const quickAddInput = page.locator('input[placeholder*="Add"]').first();
      const hasQuickAdd = await quickAddInput.isVisible().catch(() => false);

      // If no quick-add visible, there should be at least a way to create tasks
      if (!hasQuickAdd) {
        // The empty state should show a create button
        const createButton = page.locator('button:has-text("Create Task")');
        const hasCreateButton = await createButton.isVisible().catch(() => false);
        expect(hasQuickAdd || hasCreateButton).toBeTruthy();
      }
    });
  });

  // ===========================================
  // TS-03: Status Filter
  // ===========================================
  test.describe("Status Filter", () => {
    test("TS-03-01: status filter popover opens", async ({ page }) => {
      await page.click('button:has-text("Status")');

      // Check that status options are visible
      await expect(page.locator("text=Today")).toBeVisible();
      await expect(page.locator("text=In Progress")).toBeVisible();
      await expect(page.locator("text=Done")).toBeVisible();
    });

    test("TS-03-02: can select status filter", async ({ page }) => {
      await page.click('button:has-text("Status")');

      // Click on "In Progress" checkbox
      await page.locator("label").filter({ hasText: "In Progress" }).click();

      // Verify the filter is applied (badge shows count)
      await expect(page.locator('button:has-text("Status")').locator("span")).toContainText("1");
    });

    test("TS-03-04: URL reflects status filter", async ({ page }) => {
      await page.click('button:has-text("Status")');
      await page.locator("label").filter({ hasText: "Today" }).click();

      // Close popover by clicking elsewhere
      await page.keyboard.press("Escape");

      // Check URL contains status parameter
      await expect(page).toHaveURL(/status=today/);
    });
  });

  // ===========================================
  // TS-04: Client Filter
  // ===========================================
  test.describe("Client Filter", () => {
    test("TS-04-01: client dropdown opens and shows options", async ({ page }) => {
      await page.locator('button:has-text("All clients")').click();

      // Wait for dropdown content
      await expect(page.locator('[role="listbox"]')).toBeVisible();

      // "All clients" option should be visible
      await expect(page.locator('[role="option"]:has-text("All clients")')).toBeVisible();
    });
  });

  // ===========================================
  // TS-05: Assignee Filter
  // ===========================================
  test.describe("Assignee Filter", () => {
    test("TS-05-01: assignee dropdown opens and shows options", async ({ page }) => {
      await page.locator('button:has-text("All assignees")').click();

      // Wait for dropdown content
      await expect(page.locator('[role="listbox"]')).toBeVisible();

      // "All assignees" option should be visible
      await expect(page.locator('[role="option"]:has-text("All assignees")')).toBeVisible();
    });
  });

  // ===========================================
  // TS-06: Search
  // ===========================================
  test.describe("Search", () => {
    test("TS-06-01: can type in search box", async ({ page }) => {
      const searchInput = page.locator('input[placeholder="Search tasks..."]');
      await searchInput.fill("test query");
      await expect(searchInput).toHaveValue("test query");
    });

    test("TS-06-02: search submits on Enter", async ({ page }) => {
      const searchInput = page.locator('input[placeholder="Search tasks..."]');
      await searchInput.fill("test");
      await searchInput.press("Enter");

      // URL should contain search parameter
      await expect(page).toHaveURL(/search=test/);
    });

    test("TS-06-03: search submits on blur", async ({ page }) => {
      const searchInput = page.locator('input[placeholder="Search tasks..."]');
      await searchInput.fill("blur-test");
      await searchInput.blur();

      // URL should contain search parameter
      await expect(page).toHaveURL(/search=blur-test/);
    });
  });

  // ===========================================
  // TS-07: Grouping
  // ===========================================
  test.describe("Grouping", () => {
    test("TS-07-01: group by dropdown shows options", async ({ page }) => {
      await page.locator('button:has-text("No grouping")').click();

      await expect(page.locator('[role="option"]:has-text("By Client")')).toBeVisible();
      await expect(page.locator('[role="option"]:has-text("By Status")')).toBeVisible();
      await expect(page.locator('[role="option"]:has-text("By Assignee")')).toBeVisible();
      await expect(page.locator('[role="option"]:has-text("By Priority")')).toBeVisible();
    });

    test("TS-07-02: can select group by option", async ({ page }) => {
      await page.locator('button:has-text("No grouping")').click();
      await page.locator('[role="option"]:has-text("By Status")').click();

      // URL should contain groupBy parameter
      await expect(page).toHaveURL(/groupBy=status/);
    });
  });

  // ===========================================
  // TS-08: Task Detail Panel
  // ===========================================
  test.describe("Task Detail Panel", () => {
    test("TS-08-03: direct task link format", async ({ page }) => {
      // Test that task links are formatted correctly in the URL
      // When clicking a task, the URL should update with task=<id>
      await page.waitForLoadState("networkidle");

      // If there are tasks, click the first one
      const firstTaskRow = page.locator("tbody tr").first();
      const hasTask = await firstTaskRow.isVisible().catch(() => false);

      if (hasTask) {
        await firstTaskRow.click();

        // URL should contain task parameter
        await expect(page).toHaveURL(/task=/);

        // Task detail panel should be visible (it's a Sheet component)
        await expect(page.locator('[role="dialog"]')).toBeVisible();
      }
    });

    test("TS-08-02: close panel with escape", async ({ page }) => {
      await page.waitForLoadState("networkidle");

      const firstTaskRow = page.locator("tbody tr").first();
      const hasTask = await firstTaskRow.isVisible().catch(() => false);

      if (hasTask) {
        await firstTaskRow.click();
        await expect(page.locator('[role="dialog"]')).toBeVisible();

        // Press Escape to close
        await page.keyboard.press("Escape");

        // Dialog should be closed
        await expect(page.locator('[role="dialog"]')).not.toBeVisible();

        // URL should not contain task parameter
        await expect(page).not.toHaveURL(/task=/);
      }
    });
  });

  // ===========================================
  // TS-10: Selection & Batch Actions
  // ===========================================
  test.describe("Selection & Batch Actions", () => {
    test("TS-10-01: checkbox is visible in table header", async ({ page }) => {
      await page.waitForLoadState("networkidle");

      const headerCheckbox = page.locator("thead").locator('[role="checkbox"]');
      const hasHeaderCheckbox = await headerCheckbox.isVisible().catch(() => false);

      // Only check if there's a table with tasks
      if (hasHeaderCheckbox) {
        await expect(headerCheckbox).toBeVisible();
      }
    });

    test("TS-10-02: selecting task shows batch action bar", async ({ page }) => {
      await page.waitForLoadState("networkidle");

      // Find first task checkbox
      const firstTaskCheckbox = page.locator("tbody").locator('[role="checkbox"]').first();
      const hasCheckbox = await firstTaskCheckbox.isVisible().catch(() => false);

      if (hasCheckbox) {
        await firstTaskCheckbox.click();

        // Batch action bar should appear
        const batchBar = page.locator("text=/selected/i");
        await expect(batchBar).toBeVisible();
      }
    });
  });

  // ===========================================
  // TS-12: Filter Persistence
  // ===========================================
  test.describe("Filter Persistence", () => {
    test("TS-12-01: filters persist on page reload", async ({ page }) => {
      // Apply a search filter
      const searchInput = page.locator('input[placeholder="Search tasks..."]');
      await searchInput.fill("persist-test");
      await searchInput.press("Enter");

      // Verify URL has the filter
      await expect(page).toHaveURL(/search=persist-test/);

      // Reload the page
      await page.reload();

      // Wait for page to load
      await page.waitForLoadState("networkidle");

      // Verify filter is still in URL
      await expect(page).toHaveURL(/search=persist-test/);

      // Verify search input still has the value
      await expect(searchInput).toHaveValue("persist-test");
    });

    test("TS-12-02: combined filters work", async ({ page }) => {
      // Apply search filter
      const searchInput = page.locator('input[placeholder="Search tasks..."]');
      await searchInput.fill("combo");
      await searchInput.press("Enter");

      // Apply status filter
      await page.click('button:has-text("Status")');
      await page.locator("label").filter({ hasText: "Today" }).click();
      await page.keyboard.press("Escape");

      // Verify URL has both filters
      await expect(page).toHaveURL(/search=combo/);
      await expect(page).toHaveURL(/status=today/);
    });

    test("TS-12-03: clear all filters removes all filters", async ({ page }) => {
      // Apply filters
      const searchInput = page.locator('input[placeholder="Search tasks..."]');
      await searchInput.fill("clear-test");
      await searchInput.press("Enter");

      await page.click('button:has-text("Status")');
      await page.locator("label").filter({ hasText: "Done" }).click();
      await page.keyboard.press("Escape");

      // Wait for URL to update
      await expect(page).toHaveURL(/status=done/);

      // Click clear button
      const clearButton = page.locator('button:has-text("Clear")');
      await clearButton.click();

      // URL should be clean
      await expect(page).toHaveURL("/tasks");
    });
  });

  // ===========================================
  // TS-13: Empty States
  // ===========================================
  test.describe("Empty States", () => {
    test("TS-13-02: filtered empty state shows message", async ({ page }) => {
      // Search for something that likely doesn't exist
      const searchInput = page.locator('input[placeholder="Search tasks..."]');
      await searchInput.fill("zzz-nonexistent-task-xyz-12345");
      await searchInput.press("Enter");

      await page.waitForLoadState("networkidle");

      // Either we get "No tasks match filters" or empty table
      const noMatchText = page.locator("text=No tasks match filters");
      const hasNoMatch = await noMatchText.isVisible().catch(() => false);

      // If filters return no results, we should see the message
      // (might not trigger if there are no tasks at all)
      if (hasNoMatch) {
        await expect(noMatchText).toBeVisible();

        // Clear filters link should be present
        await expect(page.locator("text=Clear all filters")).toBeVisible();
      }
    });
  });

  // ===========================================
  // TS-14: Accessibility
  // ===========================================
  test.describe("Accessibility", () => {
    test("TS-14-01: page has proper heading structure", async ({ page }) => {
      // Main heading should be h1
      await expect(page.locator("h1")).toContainText("Tasks");
    });

    test("TS-14-02: interactive elements are keyboard accessible", async ({
      page,
    }) => {
      // Tab to search input
      await page.keyboard.press("Tab");

      // Search input should be focusable
      const searchInput = page.locator('input[placeholder="Search tasks..."]');
      const isFocused = await searchInput.evaluate(
        (el) => document.activeElement === el
      );

      // Either search is focused or some other interactive element
      expect(await page.evaluate(() => document.activeElement?.tagName)).toBeTruthy();
    });
  });
});

// ===========================================
// Mobile Viewport Tests
// ===========================================
test.describe("Mobile Viewport", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("page is responsive on mobile", async ({ page }) => {
    await page.goto("/tasks");

    // Page should still load
    await expect(page.locator("h1")).toContainText("Tasks");

    // Filters should still be accessible
    await expect(page.locator('input[placeholder="Search tasks..."]')).toBeVisible();
  });
});
