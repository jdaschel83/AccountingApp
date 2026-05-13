export const TAB = {
  home: '.module-tab:has-text("Home")',
  accounting: '.module-tab:has-text("Accounting")',
  boards: '.module-tab:has-text("Boards")',
  settings: '.module-tab:has-text("Settings")',
};

export const SIDEBAR_LINK = (label: string) =>
  `.sidebar-nav .nav-link:has-text("${label}")`;

export const ACTIVE_TAB = '.module-tab-active';
export const ACTIVE_NAV_LINK = '.nav-link-active';
export const PAGE_H1 = '.page-header h1';
export const MODAL = '.modal-box';
export const MODAL_TITLE = '.modal-title';
export const ALERT_ERROR = '.alert-error';

export const HOME_TILE = (title: string) =>
  `.home-tile:has(.home-tile-title:text("${title}"))`;
