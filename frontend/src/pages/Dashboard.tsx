import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

interface DashboardData {
  monthExpenses: number;
  monthIncome: number;
  yearExpenses: number;
  yearIncome: number;
  yearSalesRoyalties: number;
  unpaidInvoices: number;
  recentTransactions: {
    id: number;
    date: string;
    description: string;
    amount: number;
    category: string;
  }[];
}

function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getDashboard()
      .then((result: DashboardData) => {
        setData(result);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        Loading dashboard...
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-error">Failed to load dashboard: {error}</div>;
  }

  if (!data) {
    return null;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      <div className="stats-grid">
        <Link to="/transactions" style={{ textDecoration: 'none' }}>
          <div className="stat-card">
            <div className="stat-card-label">Month Expenses</div>
            <div className="stat-card-value">{formatUSD(data.monthExpenses)}</div>
          </div>
        </Link>

        <Link to="/transactions" style={{ textDecoration: 'none' }}>
          <div className="stat-card">
            <div className="stat-card-label">Month Income</div>
            <div className="stat-card-value">{formatUSD(data.monthIncome)}</div>
          </div>
        </Link>

        <Link to="/transactions" style={{ textDecoration: 'none' }}>
          <div className="stat-card">
            <div className="stat-card-label">Year Expenses</div>
            <div className="stat-card-value">{formatUSD(data.yearExpenses)}</div>
          </div>
        </Link>

        <Link to="/transactions" style={{ textDecoration: 'none' }}>
          <div className="stat-card">
            <div className="stat-card-label">Year Income</div>
            <div className="stat-card-value">{formatUSD(data.yearIncome)}</div>
          </div>
        </Link>

        <div className="stat-card">
          <div className="stat-card-label">Year Book Royalties</div>
          <div className="stat-card-value">{formatUSD(data.yearSalesRoyalties)}</div>
        </div>

        <Link to="/invoices" style={{ textDecoration: 'none' }}>
          <div className="stat-card">
            <div className="stat-card-label">Unpaid Invoices</div>
            <div className="stat-card-value">{formatUSD(data.unpaidInvoices)}</div>
          </div>
        </Link>
      </div>

      <h2 className="mb-2" style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
        Recent Transactions
      </h2>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th className="amount">Amount</th>
              <th>Category</th>
            </tr>
          </thead>
          <tbody>
            {data.recentTransactions.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-muted" style={{ padding: '24px' }}>
                  No recent transactions
                </td>
              </tr>
            ) : (
              data.recentTransactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{tx.date}</td>
                  <td>{tx.description}</td>
                  <td className={`amount ${tx.amount >= 0 ? 'amount-positive' : 'amount-negative'}`}>
                    {formatUSD(Math.abs(tx.amount))}
                  </td>
                  <td>{tx.category || <span className="text-muted">Uncategorized</span>}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
