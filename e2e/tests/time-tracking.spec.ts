import { test, expect } from '@playwright/test';
import { TimeTrackingPage } from '../pages/time-tracking.page';
import * as api from '../helpers/api-client';

test.describe('Time Tracking', () => {
  test.afterEach(async () => {
    await api.discardActiveTimer();
  });

  test('create manual entry with valid data appears in list', async ({ page }) => {
    const desc = `E2E-Time-${Date.now()}`;
    const ttPage = new TimeTrackingPage(page);
    await ttPage.goto();
    await ttPage.clickManualEntry();
    await ttPage.fillEntryForm({ description: desc, hours: '2.5' });
    await ttPage.submitEntryForm();
    await expect(await ttPage.getRowByDescription(desc)).toBeVisible();
    // Cleanup
    const found = await api.findTimeEntryByDescription(desc);
    if (found) await api.deleteTimeEntry(found.id);
  });

  test('manual entry with missing hours shows validation error', async ({ page }) => {
    const ttPage = new TimeTrackingPage(page);
    await ttPage.goto();
    await ttPage.clickManualEntry();
    // Fill description but not hours
    await page.locator('input[placeholder="What did you work on?"]').fill('No hours entry');
    await page.locator('.modal-overlay .btn-primary:has-text("Save")').click();
    // Modal stays open, error is shown
    await expect(page.locator('.modal-overlay')).toBeVisible();
    await expect(page.locator('.modal-overlay .alert-error')).toContainText('valid number of hours');
    await page.locator('.modal-overlay .btn-secondary:has-text("Cancel")').click();
  });

  test('start timer shows active timer banner', async ({ page }) => {
    const ttPage = new TimeTrackingPage(page);
    await ttPage.goto();
    await ttPage.clickStartTimer();
    await ttPage.fillTimerDescription('E2E timer test');
    await ttPage.submitTimerForm();
    await ttPage.expectTimerBannerVisible();
    await expect(page.locator('button:has-text("Start Timer")')).toHaveCount(0);
  });

  test('stop timer converts to a time entry', async ({ page }) => {
    const ttPage = new TimeTrackingPage(page);
    await ttPage.goto();
    await ttPage.clickStartTimer();
    await ttPage.fillTimerDescription('E2E-StopTimer');
    await ttPage.submitTimerForm();
    await ttPage.expectTimerBannerVisible();
    await ttPage.clickStopTimer();
    await ttPage.expectTimerBannerHidden();
    await expect(page.locator('table tbody tr')).not.toHaveCount(0);
  });

  test('filter by unbilled shows unbilled entries and hides billed', async ({ page }) => {
    const desc = `E2E-Unbilled-${Date.now()}`;
    const created = await api.createTimeEntry({ date: '2025-01-15', description: desc, hours: 1 });
    const ttPage = new TimeTrackingPage(page);
    await ttPage.goto();
    await ttPage.filterByBilledStatus('false');
    await expect(await ttPage.getRowByDescription(desc)).toBeVisible();
    await ttPage.filterByBilledStatus('true');
    await expect(await ttPage.getRowByDescription(desc)).toHaveCount(0);
    await api.deleteTimeEntry(created.id);
  });
});
