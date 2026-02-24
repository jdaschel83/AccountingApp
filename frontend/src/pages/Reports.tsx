import React, { useState, useEffect } from 'react';
import { api } from '../api';

interface CategoryData {
  name: string;
  color: string;
  type: string;
  total: number;
  count: number;
}

interface MonthlyData {
  month: string;
  type: string;
  total: number;
}

interface MonthlyRow {
  month: string;
  expense: number;
  income: number;
  net: number;
}

function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

const Reports: React.FC = () => {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const [monthlyRows, setMonthlyRows] = useState<MonthlyRow[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [monthlyError, setMonthlyError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));

  useEffect(() => {
    setCategoryLoading(true);
    setCategoryError(null);
    api
      .getByCategory({ type: 'expense' })
      .then((result: CategoryData[]) => {
        setCategories(result);
        setCategoryLoading(false);
      })
      .catch((err: Error) => {
        setCategoryError(err.message);
        setCategoryLoading(false);
      });
  }, []);

  useEffect(() => {
    setMonthlyLoading(true);
    setMonthlyError(null);
    api
      .getMonthly(selectedYear)
      .then((result: MonthlyData[]) => {
        const rowMap = new Map<string, MonthlyRow>();
        result.forEach((item) => {
          const existing = rowMap.get(item.month) || {
            month: item.month,
            expense: 0,
            income: 0,
            net: 0,
          };
          if (item.type === 'expense') {
            existing.expense = item.total;
          } else if (item.type === 'income') {
            existing.income = item.total;
          }
          existing.net = existing.income - existing.expense;
          rowMap.set(item.month, existing);
        });
        const rows = Array.from(rowMap.values()).sort((a, b) =>
          a.month.localeCompare(b.month)
        );
        setMonthlyRows(rows);
        setMonthlyLoading(false);
      })
      .catch((err: Error) => {
        setMonthlyError(err.message);
        setMonthlyLoading(false);
      });
  }, [selectedYear]);

  const maxCategoryTotal =
    categories.length > 0 ? Math.max(...categories.map((c) => c.total)) : 0;

  return (
    <div>
      <div className="page-header">
        <h1>Reports</h1>
      </div>

      {/* Expenses by Category */}
      <div className="card">
        <h2>Expenses by Category</h2>
        {categoryLoading ? (
          <div className="loading">
            <div className="spinner" />
            Loading categories...
          </div>
        ) : categoryError ? (
          <div className="alert alert-error">Failed to load categories: {categoryError}</div>
        ) : categories.length === 0 ? (
          <div className="empty-state">
            <p>No expense data available</p>
          </div>
        ) : (
          <div>
            {categories.map((cat) => (
              <div
                key={cat.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '12px',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '120px',
                    minWidth: '120px',
                    fontSize: '14px',
                    color: '#334155',
                    fontWeight: 500,
                    textAlign: 'right',
                  }}
                >
                  {cat.name}
                </div>
                <div
                  style={{
                    flex: 1,
                    background: '#f1f5f9',
                    borderRadius: '4px',
                    height: '28px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width:
                        maxCategoryTotal > 0
                          ? `${(cat.total / maxCategoryTotal) * 100}%`
                          : '0%',
                      minWidth: '2px',
                      height: '100%',
                      backgroundColor: cat.color || '#3b82f6',
                      borderRadius: '4px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
                <div
                  style={{
                    width: '110px',
                    minWidth: '110px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#0f172a',
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatUSD(cat.total)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Monthly Trends */}
      <div className="card">
        <div className="flex-between mb-2">
          <h2 style={{ marginBottom: 0 }}>Monthly Trends</h2>
          <select
            className="form-control"
            style={{ width: 'auto', minWidth: '100px' }}
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {yearOptions.map((yr) => (
              <option key={yr} value={String(yr)}>
                {yr}
              </option>
            ))}
          </select>
        </div>
        {monthlyLoading ? (
          <div className="loading">
            <div className="spinner" />
            Loading monthly data...
          </div>
        ) : monthlyError ? (
          <div className="alert alert-error">Failed to load monthly data: {monthlyError}</div>
        ) : monthlyRows.length === 0 ? (
          <div className="empty-state">
            <p>No monthly data available for {selectedYear}</p>
          </div>
        ) : (
          <div className="table-container" style={{ boxShadow: 'none', border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th className="amount">Expenses</th>
                  <th className="amount">Income</th>
                  <th className="amount">Net</th>
                </tr>
              </thead>
              <tbody>
                {monthlyRows.map((row) => (
                  <tr key={row.month}>
                    <td>{row.month}</td>
                    <td className="amount amount-negative">{formatUSD(row.expense)}</td>
                    <td className="amount amount-positive">{formatUSD(row.income)}</td>
                    <td
                      className={`amount ${
                        row.net >= 0 ? 'amount-positive' : 'amount-negative'
                      }`}
                    >
                      {formatUSD(row.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
