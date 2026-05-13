import { Page, expect } from '@playwright/test';

export class InvoicesPage {
  constructor(readonly page: Page) {}

  async goto() {
    await this.page.goto('/accounting/invoices');
    await this.page.locator('.page-header h1').waitFor();
  }

  async clickNewInvoice() {
    await this.page.locator('.btn-primary:has-text("New Invoice")').click();
    await this.page.waitForURL('**/invoices/new');
  }

  async filterByStatus(status: string) {
    await this.page.locator('.toolbar select').selectOption(status);
    await this.page.waitForTimeout(300);
  }

  async getRowByInvoiceNumber(num: string) {
    return this.page.locator(`table tbody tr:has-text("${num}")`);
  }

  async clickDeleteForInvoice(num: string) {
    const row = this.page.locator(`table tbody tr:has-text("${num}")`);
    await row.locator('.btn-danger:has-text("Delete")').click();
    await this.page.locator('.modal-box').waitFor();
  }

  async confirmDelete() {
    await this.page.locator('.modal-box .btn-danger').click();
    await this.page.locator('.modal-box').waitFor({ state: 'hidden' });
  }

  async expectRowVisible(num: string) {
    await expect(await this.getRowByInvoiceNumber(num)).toBeVisible();
  }
}
