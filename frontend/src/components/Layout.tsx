import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const moduleLinks = [
  { to: '/', label: 'Home', exact: true },
  { to: '/accounting', label: 'Accounting' },
  { to: '/boards', label: 'Boards' },
  { to: '/settings', label: 'Settings' },
];

const accountingNavItems = [
  { to: '/accounting', label: 'Dashboard', end: true },
  { to: '/accounting/transactions', label: 'Transactions' },
  { to: '/accounting/import', label: 'Import' },
  { to: '/accounting/categories', label: 'Categories' },
  { to: '/accounting/invoices', label: 'Invoices' },
  { to: '/accounting/sales', label: 'Sales' },
  { to: '/accounting/reports', label: 'Reports' },
];

const boardsNavItems = [
  { to: '/boards', label: 'All Boards', end: true },
];

const settingsNavItems = [
  { to: '/settings', label: 'Backup & Data', end: true },
];

type ActiveModule = 'home' | 'accounting' | 'boards' | 'settings';

function getActiveModule(pathname: string): ActiveModule {
  if (pathname.startsWith('/accounting')) return 'accounting';
  if (pathname.startsWith('/boards')) return 'boards';
  if (pathname.startsWith('/settings')) return 'settings';
  return 'home';
}

function getSidebarItems(activeModule: ActiveModule) {
  switch (activeModule) {
    case 'accounting':
      return accountingNavItems;
    case 'boards':
      return boardsNavItems;
    case 'settings':
      return settingsNavItems;
    case 'home':
      return null;
  }
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { pathname } = useLocation();
  const activeModule = getActiveModule(pathname);
  const sidebarItems = getSidebarItems(activeModule);

  return (
    <div className="app-shell">
      {/* Top bar - always visible */}
      <header className="top-bar">
        <NavLink to="/" className="top-bar-brand" style={{ textDecoration: 'none' }}>
          <span className="top-bar-title">Business Hub</span>
        </NavLink>
        <nav className="top-bar-nav">
          {moduleLinks.map((mod) => (
            <NavLink
              key={mod.to}
              to={mod.to}
              end={mod.exact}
              className={({ isActive }) => {
                const active = mod.exact
                  ? isActive
                  : isActive || pathname.startsWith(mod.to);
                return `module-tab${active ? ' module-tab-active' : ''}`;
              }}
            >
              {mod.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <div className="app-body">
        {/* Sidebar - contextual navigation (hidden on home) */}
        {sidebarItems && (
          <aside className="sidebar">
            <nav className="sidebar-nav">
              {sidebarItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `nav-link${isActive ? ' nav-link-active' : ''}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </aside>
        )}

        {/* Main content area */}
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
