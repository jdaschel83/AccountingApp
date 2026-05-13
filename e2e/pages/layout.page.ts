import { Page, expect } from '@playwright/test';
import { TAB, SIDEBAR_LINK, ACTIVE_TAB, ACTIVE_NAV_LINK } from '../helpers/test-ids';

export class LayoutPage {
  constructor(readonly page: Page) {}

  async clickModuleTab(name: 'home' | 'accounting' | 'boards' | 'settings') {
    await this.page.locator(TAB[name]).click();
  }

  async clickSidebarLink(label: string) {
    await this.page.locator(SIDEBAR_LINK(label)).click();
  }

  async expectActiveTab(label: string) {
    await expect(this.page.locator(ACTIVE_TAB)).toContainText(label);
  }

  async expectActiveSidebarLink(label: string) {
    await expect(this.page.locator(ACTIVE_NAV_LINK)).toContainText(label);
  }

  async expectSidebarVisible() {
    await expect(this.page.locator('.sidebar')).toBeVisible();
  }

  async expectSidebarHidden() {
    await expect(this.page.locator('.sidebar')).not.toBeVisible();
  }
}
