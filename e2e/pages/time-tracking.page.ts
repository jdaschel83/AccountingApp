import { Page, expect } from '@playwright/test';

export class TimeTrackingPage {
  constructor(readonly page: Page) {}

  async goto() {
    await this.page.goto('/accounting/time-tracking');
    await this.page.locator('.page-header h1').waitFor();
  }

  async clickManualEntry() {
    await this.page.locator('button:has-text("+ Manual Entry")').click();
    await this.page.locator('.modal-overlay').waitFor();
  }

  async fillEntryForm(data: { description: string; hours: string; date?: string }) {
    if (data.date) {
      await this.page.locator('.modal-overlay input[type="date"]').fill(data.date);
    }
    await this.page.locator('input[placeholder="What did you work on?"]').fill(data.description);
    await this.page.locator('input[placeholder="1.5"]').fill(data.hours);
  }

  async submitEntryForm() {
    await this.page.locator('.modal-overlay .btn-primary:has-text("Save")').click();
    await this.page.locator('.modal-overlay').waitFor({ state: 'hidden' });
  }

  async clickStartTimer() {
    await this.page.locator('button:has-text("Start Timer")').click();
    await this.page.locator('.modal-overlay').waitFor();
  }

  async fillTimerDescription(desc: string) {
    await this.page.locator('input[placeholder*="Client call"]').fill(desc);
  }

  async submitTimerForm() {
    await this.page.locator('.modal-overlay .btn-success:has-text("Start Timer")').click();
    await this.page.locator('.modal-overlay').waitFor({ state: 'hidden' });
  }

  async clickStopTimer() {
    await this.page.locator('button:has-text("Stop & Save")').click();
  }

  async filterByBilledStatus(value: 'false' | 'true' | '') {
    await this.page.locator('.toolbar select').nth(1).selectOption(value);
    await this.page.waitForTimeout(300);
  }

  async getRowByDescription(desc: string) {
    return this.page.locator(`table tbody tr:has-text("${desc}")`);
  }

  async expectTimerBannerVisible() {
    await expect(this.page.locator('.alert-success')).toBeVisible();
  }

  async expectTimerBannerHidden() {
    await expect(this.page.locator('.alert-success')).toHaveCount(0);
  }
}
