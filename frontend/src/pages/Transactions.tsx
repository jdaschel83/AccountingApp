import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';

interface Category {
  id: number;
  name: string;
  type: string;
  color: string;
}

interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: 'expense' | 'income';
  category_id: number | null;
  category_name: string | null;
  category_color: string | null;
  source: string;
  notes: string;
}

interface TransactionForm {
  date: string;
  description: string;
  amount: string;
  type: 'expense' | 'income';
  category_id: string;
  source: string;
  notes: string;
}

const emptyForm: TransactionForm = {
  date: '',
  description: '',
  amount: '',
  type: 'expense',
  category_id: '',
  source: '',
  notes: '',
};

function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

const PER_PAGE = 50;

const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  // Selection
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [form, setForm] = useState<TransactionForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Create Rule sub-form
  const [ruleFormOpen, setRuleFormOpen] = useState(false);
  const [rulePattern, setRulePattern] = useState('');
  const [ruleCategoryId, setRuleCategoryId] = useState('');
  const [ruleSaving, setRuleSaving] = useState(false);

  // Bulk categorize
  const [bulkCategoryId, setBulkCategoryId] = useState('');

  useEffect(() => {
    api.getCategories().then((cats: Category[]) => setCategories(cats)).catch(() => {});
  }, []);

  const fetchTransactions = useCallback(() => {
    setLoading(true);
    setError(null);

    const params: Record<string, string> = {
      page: String(page),
      per_page: String(PER_PAGE),
    };
    if (search) params.search = search;
    if (filterCategory) params.category_id = filterCategory;
    if (filterType) params.type = filterType;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    api
      .getTransactions(params)
      .then((result: { transactions: Transaction[]; total: number }) => {
        setTransactions(result.transactions);
        setTotal(result.total);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [page, search, filterCategory, filterType, startDate, endDate]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, filterCategory, filterType, startDate, endDate]);

  // Clear selection when data changes
  useEffect(() => {
    setSelected(new Set());
  }, [transactions]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const openCreateModal = () => {
    setEditingTransaction(null);
    setForm({ ...emptyForm, date: new Date().toISOString().split('T')[0] });
    setRuleFormOpen(false);
    setModalOpen(true);
  };

  const openEditModal = (tx: Transaction) => {
    setEditingTransaction(tx);
    setForm({
      date: tx.date,
      description: tx.description,
      amount: String(tx.amount),
      type: tx.type,
      category_id: tx.category_id ? String(tx.category_id) : '',
      source: tx.source || '',
      notes: tx.notes || '',
    });
    setRuleFormOpen(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingTransaction(null);
    setRuleFormOpen(false);
  };

  const handleFormChange = (field: keyof TransactionForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        date: form.date,
        description: form.description,
        amount: parseFloat(form.amount),
        type: form.type,
        category_id: form.category_id ? parseInt(form.category_id) : null,
        source: form.source,
        notes: form.notes,
      };
      if (editingTransaction) {
        await api.updateTransaction(editingTransaction.id, data);
      } else {
        await api.createTransaction(data);
      }
      closeModal();
      fetchTransactions();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingTransaction) return;
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    setSaving(true);
    try {
      await api.deleteTransaction(editingTransaction.id);
      closeModal();
      fetchTransactions();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRule = async () => {
    if (!rulePattern || !ruleCategoryId) return;
    setRuleSaving(true);
    try {
      await api.createRule({ pattern: rulePattern, category_id: parseInt(ruleCategoryId) });
      setRuleFormOpen(false);
      setRulePattern('');
      setRuleCategoryId('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRuleSaving(false);
    }
  };

  const openRuleForm = () => {
    setRulePattern(form.description.toLowerCase());
    setRuleCategoryId(form.category_id || '');
    setRuleFormOpen(true);
  };

  // Selection handlers
  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === transactions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(transactions.map((tx) => tx.id)));
    }
  };

  const handleBulkCategorize = async () => {
    if (!bulkCategoryId || selected.size === 0) return;
    try {
      await api.bulkCategorize(Array.from(selected), parseInt(bulkCategoryId));
      setBulkCategoryId('');
      fetchTransactions();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} selected transaction(s)?`)) return;
    try {
      await api.bulkDelete(Array.from(selected));
      fetchTransactions();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Pagination range
  const getPageNumbers = (): number[] => {
    const pages: number[] = [];
    const maxVisible = 7;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, page - 2);
      let end = Math.min(totalPages - 1, page + 2);
      if (page <= 3) {
        end = Math.min(totalPages - 1, 5);
      }
      if (page >= totalPages - 2) {
        start = Math.max(2, totalPages - 4);
      }
      if (start > 2) pages.push(-1); // ellipsis
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push(-2); // ellipsis
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div>
      <div className="page-header">
        <h1>Transactions</h1>
        <button className="btn btn-primary" onClick={openCreateModal}>
          Add Transaction
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Filter Toolbar */}
      <div className="toolbar">
        <input
          type="text"
          className="form-control search-input"
          placeholder="Search transactions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="form-control"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={String(cat.id)}>
              {cat.name}
            </option>
          ))}
        </select>
        <select
          className="form-control"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
        <input
          type="date"
          className="form-control"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          placeholder="Start date"
        />
        <input
          type="date"
          className="form-control"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          placeholder="End date"
        />
      </div>

      {/* Bulk Actions Bar */}
      {selected.size > 0 && (
        <div className="toolbar" style={{ background: '#eff6ff', padding: '10px 16px', borderRadius: '8px' }}>
          <span style={{ fontWeight: 600, color: '#1e40af' }}>
            {selected.size} selected
          </span>
          <select
            className="form-control"
            style={{ width: 'auto', minWidth: '160px' }}
            value={bulkCategoryId}
            onChange={(e) => {
              setBulkCategoryId(e.target.value);
            }}
          >
            <option value="">Categorize...</option>
            {categories.map((cat) => (
              <option key={cat.id} value={String(cat.id)}>
                {cat.name}
              </option>
            ))}
          </select>
          <button
            className="btn btn-primary btn-sm"
            disabled={!bulkCategoryId}
            onClick={handleBulkCategorize}
          >
            Apply
          </button>
          <div className="spacer" />
          <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
            Delete Selected
          </button>
        </div>
      )}

      {/* Transaction Table */}
      {loading ? (
        <div className="loading">
          <div className="spinner" />
          Loading transactions...
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={transactions.length > 0 && selected.size === transactions.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th>Date</th>
                  <th>Description</th>
                  <th className="amount">Amount</th>
                  <th>Category</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-muted" style={{ padding: '24px' }}>
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} style={{ cursor: 'pointer' }}>
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(tx.id)}
                          onChange={() => toggleSelect(tx.id)}
                        />
                      </td>
                      <td onClick={() => openEditModal(tx)}>{tx.date}</td>
                      <td onClick={() => openEditModal(tx)}>{tx.description}</td>
                      <td
                        className={`amount ${tx.type === 'income' ? 'amount-positive' : 'amount-negative'}`}
                        onClick={() => openEditModal(tx)}
                      >
                        {formatUSD(tx.amount)}
                      </td>
                      <td onClick={() => openEditModal(tx)}>
                        {tx.category_name ? (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: tx.category_color ? `${tx.category_color}20` : undefined,
                              color: tx.category_color || undefined,
                            }}
                          >
                            {tx.category_name}
                          </span>
                        ) : (
                          <span className="text-muted">Uncategorized</span>
                        )}
                      </td>
                      <td onClick={() => openEditModal(tx)}>{tx.source || <span className="text-muted">--</span>}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage(page - 1)}>
                Prev
              </button>
              {getPageNumbers().map((p, i) =>
                p < 0 ? (
                  <span key={`ellipsis-${i}`} style={{ padding: '6px 4px', color: '#94a3b8' }}>
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    className={p === page ? 'active' : ''}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                )
              )}
              <button disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Edit / Create Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
      >
        <div className="form-row">
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              className="form-control"
              value={form.date}
              onChange={(e) => handleFormChange('date', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select
              className="form-control"
              value={form.type}
              onChange={(e) => handleFormChange('type', e.target.value)}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Description</label>
          <input
            type="text"
            className="form-control"
            value={form.description}
            onChange={(e) => handleFormChange('description', e.target.value)}
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Amount</label>
            <input
              type="number"
              step="0.01"
              className="form-control"
              value={form.amount}
              onChange={(e) => handleFormChange('amount', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Category</label>
            <select
              className="form-control"
              value={form.category_id}
              onChange={(e) => handleFormChange('category_id', e.target.value)}
            >
              <option value="">-- Select Category --</option>
              {categories
                .filter((cat) => cat.type === form.type)
                .map((cat) => (
                  <option key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Source</label>
          <input
            type="text"
            className="form-control"
            value={form.source}
            onChange={(e) => handleFormChange('source', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Notes</label>
          <textarea
            className="form-control"
            value={form.notes}
            onChange={(e) => handleFormChange('notes', e.target.value)}
          />
        </div>

        {/* Create Rule sub-form */}
        {editingTransaction && !ruleFormOpen && (
          <button
            className="btn btn-secondary btn-sm mt-1"
            onClick={openRuleForm}
          >
            Create Rule
          </button>
        )}
        {ruleFormOpen && (
          <div
            style={{
              marginTop: '16px',
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          >
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#0f172a' }}>
              Create Auto-Categorization Rule
            </h3>
            <div className="form-group">
              <label>Pattern</label>
              <input
                type="text"
                className="form-control"
                value={rulePattern}
                onChange={(e) => setRulePattern(e.target.value)}
              />
              <div className="form-help">
                Transactions matching this text will be auto-categorized
              </div>
            </div>
            <div className="form-group">
              <label>Category</label>
              <select
                className="form-control"
                value={ruleCategoryId}
                onChange={(e) => setRuleCategoryId(e.target.value)}
              >
                <option value="">-- Select Category --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="btn-group">
              <button
                className="btn btn-primary btn-sm"
                onClick={handleCreateRule}
                disabled={ruleSaving || !rulePattern || !ruleCategoryId}
              >
                {ruleSaving ? 'Saving...' : 'Save Rule'}
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setRuleFormOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="form-actions">
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : editingTransaction ? 'Save Changes' : 'Create Transaction'}
          </button>
          {editingTransaction && (
            <button
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={saving}
            >
              Delete
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn btn-secondary" onClick={closeModal}>
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Transactions;
