import { useNavigate } from 'react-router-dom';

const modules = [
  {
    title: 'Accounting',
    description: 'Track expenses, income, and manage categories',
    path: '/accounting',
    color: '#3b82f6',
    icon: '$',
  },
  {
    title: 'Invoices',
    description: 'Create and manage invoices for clients',
    path: '/accounting/invoices',
    color: '#8b5cf6',
    icon: '#',
  },
  {
    title: 'Sales',
    description: 'Track book sales from Amazon KDP & IngramSpark',
    path: '/accounting/sales',
    color: '#22c55e',
    icon: '\u2191',
  },
  {
    title: 'Import',
    description: 'Import bank statements and sales data via CSV',
    path: '/accounting/import',
    color: '#f59e0b',
    icon: '\u21e7',
  },
  {
    title: 'Boards',
    description: 'Kanban boards for project management',
    path: '/boards',
    color: '#14b8a6',
    icon: '\u2630',
  },
  {
    title: 'Reports',
    description: 'View spending by category and monthly trends',
    path: '/accounting/reports',
    color: '#ec4899',
    icon: '\u2261',
  },
  {
    title: 'Settings',
    description: 'Business profile, backup & data management',
    path: '/settings',
    color: '#64748b',
    icon: '\u2699',
  },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div>
      <div className="page-header">
        <h1>Welcome to Business Hub</h1>
      </div>
      <p className="text-muted" style={{ marginBottom: '2rem', fontSize: '15px' }}>
        Select an area to get started.
      </p>

      <div className="home-tiles">
        {modules.map((mod) => (
          <div
            key={mod.path}
            className="home-tile"
            onClick={() => navigate(mod.path)}
            style={{ borderTopColor: mod.color }}
          >
            <div className="home-tile-icon" style={{ color: mod.color }}>
              {mod.icon}
            </div>
            <div className="home-tile-title">{mod.title}</div>
            <div className="home-tile-desc">{mod.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
