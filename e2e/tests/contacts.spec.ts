import { test, expect } from '@playwright/test';
import { ContactsPage } from '../pages/contacts.page';
import * as api from '../helpers/api-client';

test.describe('Contacts', () => {
  test('create a contact with a valid name succeeds', async ({ page }) => {
    const name = `E2E-Contact-${Date.now()}`;
    const contactsPage = new ContactsPage(page);
    await contactsPage.goto();
    await contactsPage.clickNewContact();
    await contactsPage.fillName(name);
    await contactsPage.submitForm('Create Contact');
    await page.locator('.modal-box').waitFor({ state: 'hidden' });
    await contactsPage.searchFor(name);
    await expect(await contactsPage.getRowByName(name)).toBeVisible();
    // Cleanup
    const found = await api.findContactByName(name);
    if (found) await api.deleteContact(found.id);
  });

  test('create contact without name shows validation error', async ({ page }) => {
    const contactsPage = new ContactsPage(page);
    await contactsPage.goto();
    await contactsPage.clickNewContact();
    await contactsPage.submitForm('Create Contact');
    await contactsPage.expectErrorMessage('Name is required');
    await expect(page.locator('.modal-box')).toBeVisible();
  });

  test('search filters contacts by name', async ({ page }) => {
    const name = `E2E-Search-${Date.now()}`;
    const created = await api.createContact({ name });
    const contactsPage = new ContactsPage(page);
    await contactsPage.goto();
    await contactsPage.searchFor(name);
    await expect(await contactsPage.getRowByName(name)).toBeVisible();
    await expect(page.locator('table tbody tr')).toHaveCount(1);
    await api.deleteContact(created.id);
  });

  test('edit a contact updates the name', async ({ page }) => {
    const original = `E2E-Edit-${Date.now()}`;
    const updated = `${original}-UPD`;
    const created = await api.createContact({ name: original });
    const contactsPage = new ContactsPage(page);
    await contactsPage.goto();
    await contactsPage.searchFor(original);
    await contactsPage.clickEditForName(original);
    await page.locator('.modal-box input[placeholder="Full name or business name"]').fill(updated);
    await contactsPage.submitForm('Save Changes');
    await page.locator('.modal-box').waitFor({ state: 'hidden' });
    await contactsPage.searchFor(updated);
    await expect(await contactsPage.getRowByName(updated)).toBeVisible();
    // Cleanup
    const found = await api.findContactByName(updated);
    if (found) await api.deleteContact(found.id);
    else await api.deleteContact(created.id);
  });

  test('delete a contact removes it from the list', async ({ page }) => {
    const name = `E2E-Del-${Date.now()}`;
    await api.createContact({ name });
    const contactsPage = new ContactsPage(page);
    await contactsPage.goto();
    await contactsPage.searchFor(name);
    await contactsPage.clickDeleteForName(name);
    await contactsPage.confirmDelete();
    await contactsPage.searchFor(name);
    await contactsPage.expectNoResults();
  });
});
