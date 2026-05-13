import { Page, expect } from '@playwright/test';

export class ContactsPage {
  constructor(readonly page: Page) {}

  async goto() {
    await this.page.goto('/accounting/contacts');
    await this.page.locator('.page-header h1').waitFor();
  }

  async clickNewContact() {
    await this.page.locator('.btn-primary:has-text("New Contact")').click();
    await this.page.locator('.modal-box').waitFor();
  }

  async fillName(name: string) {
    await this.page.locator('.modal-box input[placeholder="Full name or business name"]').fill(name);
  }

  async submitForm(buttonText = 'Create Contact') {
    await this.page.locator(`.modal-box .btn-primary:has-text("${buttonText}")`).click();
  }

  async searchFor(text: string) {
    await this.page.locator('input[placeholder="Search by name, company, or email..."]').fill(text);
    await this.page.waitForTimeout(400);
  }

  async getRowByName(name: string) {
    return this.page.locator(`table tbody tr:has-text("${name}")`);
  }

  async clickEditForName(name: string) {
    const row = this.page.locator(`table tbody tr:has-text("${name}")`);
    await row.locator('.btn-secondary:has-text("Edit")').click();
    await this.page.locator('.modal-box').waitFor();
  }

  async clickDeleteForName(name: string) {
    const row = this.page.locator(`table tbody tr:has-text("${name}")`);
    await row.locator('.btn-danger:has-text("Delete")').click();
    await this.page.locator('.modal-box').waitFor();
  }

  async confirmDelete() {
    await this.page.locator('.modal-box .btn-danger:has-text("Delete Contact")').click();
    await this.page.locator('.modal-box').waitFor({ state: 'hidden' });
  }

  async expectErrorMessage(text: string) {
    await expect(this.page.locator('.alert-error')).toContainText(text);
  }

  async expectNoResults() {
    await expect(this.page.locator('text=No contacts match your search.')).toBeVisible();
  }
}
