import { test, expect } from '@playwright/test';
import { InvoicesPage } from '../pages/invoices.page';
import * as api from '../helpers/api-client';

test.describe('Invoices', () => {
  test('create invoice with line items shows correct total', async ({ page }) => {
    const invNum = `E2E-INV-${Date.now()}`;
    const invoicesPage = new InvoicesPage(page);
    await invoicesPage.goto();
    await invoicesPage.clickNewInvoice();
    // Fill invoice number
    await page.locator('input.form-control').first().fill(invNum);
    // Fill client name (no placeholder — target by label)
    await page.locator('.form-group:has(label:text("Client Name")) input').fill('E2E Test Client');
    // Line item: description, qty=2, rate=50 → $100
    await page.locator('table input[type="text"]').first().fill('Test Service');
    await page.locator('table input[type="number"]').nth(0).fill('2');
    await page.locator('table input[type="number"]').nth(1).fill('50');
    // Grand total should show $100.00
    await expect(page.locator('.invoice-totals .grand-total')).toContainText('100.00');
    // Save
    await page.locator('.btn-primary:has-text("Create Invoice")').click();
    await page.waitForURL(/invoices/);
    await invoicesPage.expectRowVisible(invNum);
    // Cleanup
    const found = await api.findInvoiceByNumber(invNum);
    if (found) await api.deleteInvoice(found.id);
  });

  test('invoice list shows client name and status', async ({ page }) => {
    const invNum = `E2E-INV-LIST-${Date.now()}`;
    const created = await api.createInvoice({
      invoice_number: invNum,
      client_name: 'E2E List Client',
      date: '2025-01-15',
      due_date: '2025-02-15',
    });
    const invoicesPage = new InvoicesPage(page);
    await invoicesPage.goto();
    const row = await invoicesPage.getRowByInvoiceNumber(invNum);
    await expect(row).toContainText('E2E List Client');
    await expect(row).toContainText('Unpaid');
    await api.deleteInvoice(created.id);
  });

  test('status filter shows only matching invoices', async ({ page }) => {
    const paidNum = `E2E-INV-PAID-${Date.now()}`;
    const unpaidNum = `E2E-INV-UNP-${Date.now()}`;
    const paid = await api.createInvoice({ invoice_number: paidNum, client_name: 'C', date: '2025-01-01', due_date: '2025-02-01', status: 'paid' });
    const unpaid = await api.createInvoice({ invoice_number: unpaidNum, client_name: 'C', date: '2025-01-01', due_date: '2025-02-01' });
    const invoicesPage = new InvoicesPage(page);
    await invoicesPage.goto();
    await invoicesPage.filterByStatus('paid');
    await expect(await invoicesPage.getRowByInvoiceNumber(paidNum)).toBeVisible();
    await expect(await invoicesPage.getRowByInvoiceNumber(unpaidNum)).toHaveCount(0);
    await api.deleteInvoice(paid.id);
    await api.deleteInvoice(unpaid.id);
  });

  test('delete invoice removes it from list', async ({ page }) => {
    const invNum = `E2E-INV-DEL-${Date.now()}`;
    await api.createInvoice({ invoice_number: invNum, client_name: 'Del Client', date: '2025-01-01', due_date: '2025-02-01' });
    const invoicesPage = new InvoicesPage(page);
    await invoicesPage.goto();
    await invoicesPage.clickDeleteForInvoice(invNum);
    await invoicesPage.confirmDelete();
    await expect(await invoicesPage.getRowByInvoiceNumber(invNum)).toHaveCount(0);
  });

  test('cancel on new invoice form returns to invoices list', async ({ page }) => {
    await page.goto('/accounting/invoices/new');
    await page.locator('.btn-secondary:has-text("Cancel")').click();
    await page.waitForURL(/invoices/);
  });
});
