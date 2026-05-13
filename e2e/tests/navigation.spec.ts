import { test, expect } from '@playwright/test';
import { LayoutPage } from '../pages/layout.page';
import { HOME_TILE } from '../helpers/test-ids';

test.describe('Navigation', () => {
  test('home page renders all tiles and sidebar is hidden', async ({ page }) => {
    const layout = new LayoutPage(page);
    await page.goto('/');
    await layout.expectSidebarHidden();
    for (const title of ['Accounting', 'Invoices', 'Sales', 'Import', 'Boards', 'Reports', 'Settings']) {
      await expect(page.locator(HOME_TILE(title))).toBeVisible();
    }
  });

  test('clicking Accounting tile navigates to /accounting', async ({ page }) => {
    await page.goto('/');
    await page.locator(HOME_TILE('Accounting')).click();
    await page.waitForURL('**/accounting');
  });

  test('Accounting tab in top bar is active when on /accounting/transactions', async ({ page }) => {
    const layout = new LayoutPage(page);
    await page.goto('/accounting/transactions');
    await layout.expectActiveTab('Accounting');
  });

  test('sidebar Transactions link is active on /accounting/transactions', async ({ page }) => {
    const layout = new LayoutPage(page);
    await page.goto('/accounting/transactions');
    await layout.expectActiveSidebarLink('Transactions');
  });

  test('sidebar links navigate to correct pages', async ({ page }) => {
    const layout = new LayoutPage(page);
    await page.goto('/accounting');
    for (const [label, urlPart] of [
      ['Transactions', '/accounting/transactions'],
      ['Invoices', '/accounting/invoices'],
      ['Contacts', '/accounting/contacts'],
      ['Time Tracking', '/accounting/time-tracking'],
    ] as const) {
      await layout.clickSidebarLink(label);
      await expect(page).toHaveURL(new RegExp(urlPart));
      await layout.expectActiveSidebarLink(label);
    }
  });
});
