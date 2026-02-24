import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const formatUSD = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

interface Sale {
  id: number;
  source: string;
  title: string;
  units: number;
  royalty: number;
  marketplace: string | null;
  date: string;
}

interface SalesSummary {
  source: string;
  title: string;
  total_units: number;
  total_royalty: number;
  entries: number;
}

export default function Sales() {
  const [view, setView] = useState<'list' | 'summary'>('summary');
  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<SalesSummary[]>([]);
  const [source, setSource] = useState('');
  const [titleFilter, setTitleFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (source) params.source = source;
      if (titleFilter) params.title = titleFilter;

      if (view === 'summary') {
        const data = await api.getSalesSummary(params);
        setSummary(data);
      } else {
        const data = await api.getSales(params);
        setSales(data);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [view, source, titleFilter]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const totalRoyalties = view === 'summary'
    ? summary.reduce((s, r) => s + r.total_royalty, 0)
    : sales.reduce((s, r) => s + r.royalty, 0);

  const totalUnits = view === 'summary'
    ? summary.reduce((s, r) => s + r.total_units, 0)
    : sales.reduce((s, r) => s + r.units, 0);

  return (
    <div>
      <div className="page-header flex-between">
        <h1>Sales</h1>
        <Link to="/import" className="btn btn-primary">Import Sales CSV</Link>
      </div>

      <div className="toolbar">
        <div className="btn-group">
          <button className={`btn btn-sm ${view === 'summary' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('summary')}>Summary</button>
          <button className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('list')}>All Records</button>
        </div>
        <input type="text" className="form-control" placeholder="Filter by title..." value={titleFilter} onChange={e => setTitleFilter(e.target.value)} style={{ width: 200 }} />
        <input type="text" className="form-control" placeholder="Filter by source..." value={source} onChange={e => setSource(e.target.value)} style={{ width: 200 }} />
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-card-label">Total Royalties</div>
          <div className="stat-card-value">{formatUSD(totalRoyalties)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total Units</div>
          <div className="stat-card-value">{totalUnits.toLocaleString()}</div>
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : view === 'summary' ? (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Title</th>
                <th style={{ textAlign: 'right' }}>Units</th>
                <th style={{ textAlign: 'right' }}>Royalties</th>
                <th style={{ textAlign: 'right' }}>Records</th>
              </tr>
            </thead>
            <tbody>
              {summary.length === 0 ? (
                <tr><td colSpan={5} className="empty-state">No sales data. Import a CSV from your POD platform.</td></tr>
              ) : summary.map((s, i) => (
                <tr key={i}>
                  <td>{s.source}</td>
                  <td>{s.title}</td>
                  <td style={{ textAlign: 'right' }}>{s.total_units.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }} className="amount-positive">{formatUSD(s.total_royalty)}</td>
                  <td style={{ textAlign: 'right' }}>{s.entries}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Source</th>
                <th>Title</th>
                <th>Marketplace</th>
                <th style={{ textAlign: 'right' }}>Units</th>
                <th style={{ textAlign: 'right' }}>Royalty</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr><td colSpan={6} className="empty-state">No sales data.</td></tr>
              ) : sales.map(s => (
                <tr key={s.id}>
                  <td>{s.date}</td>
                  <td>{s.source}</td>
                  <td>{s.title}</td>
                  <td>{s.marketplace || '—'}</td>
                  <td style={{ textAlign: 'right' }}>{s.units}</td>
                  <td style={{ textAlign: 'right' }} className="amount-positive">{formatUSD(s.royalty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
