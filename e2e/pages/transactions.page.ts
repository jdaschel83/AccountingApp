import { Page, expect } from '@playwright/test';

export class TransactionsPage {
  constructor(readonly page: Page) {}

  async goto() {
    await this.page.goto('/accounting/transactions');
    await this.page.locator('.page-header h1').waitFor();
  }

  async clickAddTransaction() {
    await this.page.locator('.btn-primary:has-text("Add Transaction")').click();
    await this.page.locator('.modal-box').waitFor();
  }

  async fillTransactionForm(data: {
    description: string;
    amount: string;
    type?: 'expense' | 'income';
    date?: string;
  }) {
    if (data.date) {
      await this.page.locator('.modal-box input[type="date"]').fill(data.date);
    }
    if (data.type) {
      await this.page.locator('.modal-box select').first().selectOption(data.type);
    }
    await this.page.locator('.modal-box input[type="text"]').first().fill(data.description);
    await this.page.locator('.modal-box input[type="number"]').first().fill(data.amount);
  }

  async submitForm(buttonText = 'Create Transaction') {
    await this.page.locator(`.modal-box .btn-primary:has-text("${buttonText}")`).click();
    await this.page.locator('.modal-box').waitFor({ state: 'hidden' });
  }

  async searchFor(text: string) {
    await this.page.locator('input[placeholder="Search transactions..."]').fill(text);
    await this.page.waitForTimeout(400);
  }

  async filterByType(type: 'expense' | 'income' | '') {
    // Second select in toolbar — first is category filter
    await this.page.locator('.toolbar select').nth(1).selectOption(type);
    await this.page.waitForTimeout(300);
  }

  async getRowByDescription(desc: string) {
    return this.page.locator(`table tbody tr:has-text("${desc}")`);
  }

  async openEditForDescription(desc: string) {
    await this.page.locator(`table tbody tr:has-text("${desc}")`).click();
    await this.page.locator('.modal-box').waitFor();
  }

  async expectEmptyState() {
    await expect(this.page.locator('text=No transactions found')).toBeVisible();
  }
}
