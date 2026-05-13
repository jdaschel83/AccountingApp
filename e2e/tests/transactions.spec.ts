import { test, expect } from '@playwright/test';
import { TransactionsPage } from '../pages/transactions.page';
import * as api from '../helpers/api-client';

test.describe('Transactions', () => {
  test('create a transaction and see it in the list', async ({ page }) => {
    const desc = `E2E-TX-CREATE-${Date.now()}`;
    const txPage = new TransactionsPage(page);
    await txPage.goto();
    await txPage.clickAddTransaction();
    await txPage.fillTransactionForm({ description: desc, amount: '42.50', type: 'expense', date: '2025-01-15' });
    await txPage.submitForm('Create Transaction');
    await txPage.searchFor(desc);
    await expect(await txPage.getRowByDescription(desc)).toBeVisible();
    // Cleanup
    const found = await api.findTransactionByDescription(desc);
    if (found) await api.deleteTransaction(found.id);
  });

  test('edit a transaction and see the updated description', async ({ page }) => {
    const original = `E2E-TX-EDIT-${Date.now()}`;
    const updated = `${original}-UPD`;
    const created = await api.createTransaction({ date: '2025-01-15', description: original, amount: 10, type: 'expense' });
    const txPage = new TransactionsPage(page);
    await txPage.goto();
    await txPage.searchFor(original);
    await txPage.openEditForDescription(original);
    await page.locator('.modal-box input[type="text"]').first().fill(updated);
    await txPage.submitForm('Save Changes');
    await txPage.searchFor(updated);
    await expect(await txPage.getRowByDescription(updated)).toBeVisible();
    // Cleanup
    await api.deleteTransaction(created.id);
  });

  test('delete a transaction via the edit modal', async ({ page }) => {
    const desc = `E2E-TX-DEL-${Date.now()}`;
    await api.createTransaction({ date: '2025-01-15', description: desc, amount: 10, type: 'expense' });
    const txPage = new TransactionsPage(page);
    await txPage.goto();
    await txPage.searchFor(desc);
    await txPage.openEditForDescription(desc);
    page.once('dialog', (d) => d.accept());
    await page.locator('.modal-box .btn-danger:has-text("Delete")').click();
    await txPage.searchFor(desc);
    await txPage.expectEmptyState();
  });

  test('search filters transactions by description', async ({ page }) => {
    const needle = `E2E-TX-SEARCH-${Date.now()}`;
    const created = await api.createTransaction({ date: '2025-01-15', description: needle, amount: 5, type: 'expense' });
    const txPage = new TransactionsPage(page);
    await txPage.goto();
    await txPage.searchFor(needle);
    const rows = page.locator('table tbody tr');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText(needle);
    await api.deleteTransaction(created.id);
  });

  test('type filter shows only matching transactions', async ({ page }) => {
    const expDesc = `E2E-TX-EXP-${Date.now()}`;
    const incDesc = `E2E-TX-INC-${Date.now()}`;
    const e = await api.createTransaction({ date: '2025-01-15', description: expDesc, amount: 5, type: 'expense' });
    const i = await api.createTransaction({ date: '2025-01-15', description: incDesc, amount: 5, type: 'income' });
    const txPage = new TransactionsPage(page);
    await txPage.goto();
    await txPage.filterByType('expense');
    await txPage.searchFor(expDesc);
    await expect(await txPage.getRowByDescription(expDesc)).toBeVisible();
    await txPage.searchFor(incDesc);
    await txPage.expectEmptyState();
    await api.deleteTransaction(e.id);
    await api.deleteTransaction(i.id);
  });

  test('empty search shows no transactions message', async ({ page }) => {
    const txPage = new TransactionsPage(page);
    await txPage.goto();
    await txPage.searchFor('ZZZ-NO-MATCH-99999999');
    await txPage.expectEmptyState();
  });
});
