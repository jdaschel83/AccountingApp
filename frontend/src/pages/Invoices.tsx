import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import Modal from '../components/Modal';

interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface Invoice {
  id: number;
  invoice_number: string;
  client_name: string;
  date: string;
  due_date: string;
  status: 'unpaid' | 'paid' | 'overdue';
  total: number;
  items: InvoiceItem[];
}

type StatusFilter = 'all' | 'unpaid' | 'paid' | 'overdue';

function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'paid':
      return 'badge badge-green';
    case 'unpaid':
      return 'badge badge-yellow';
    case 'overdue':
      return 'badge badge-red';
    default:
      return 'badge badge-gray';
  }
}

const Invoices: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Delete confirmation
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchInvoices = useCallback(() => {
    setLoading(true);
    setError(null);
    const params: Record<string, string> = {};
    if (statusFilter !== 'all') {
      params.status = statusFilter;
    }
    api
      .getInvoices(params)
      .then((result: Invoice[]) => {
        setInvoices(result);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const openDeleteModal = (invoice: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingInvoice(invoice);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeletingInvoice(null);
  };

  const handleDelete = async () => {
    if (!deletingInvoice) return;
    setDeleting(true);
    try {
      await api.deleteInvoice(deletingInvoice.id);
      closeDeleteModal();
      fetchInvoices();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadPDF = (invoice: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = `/api/invoices/${invoice.id}/pdf`;
    link.download = `${invoice.invoice_number}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRowClick = (invoice: Invoice) => {
    navigate(`/invoices/${invoice.id}/edit`);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Invoices</h1>
        <Link to="/invoices/new" className="btn btn-primary">
          New Invoice
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Status Filter */}
      <div className="toolbar">
        <select
          className="form-control"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        >
          <option value="all">All Statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Invoice Table */}
      {loading ? (
        <div className="loading">
          <div className="spinner" />
          Loading invoices...
        </div>
      ) : invoices.length === 0 ? (
        <div className="empty-state">
          <p>No invoices found</p>
          <Link to="/invoices/new" className="btn btn-primary">
            Create your first invoice
          </Link>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client</th>
                <th>Date</th>
                <th>Due Date</th>
                <th className="amount">Total</th>
                <th>Status</th>
                <th style={{ width: '140px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  onClick={() => handleRowClick(invoice)}
                  style={{ cursor: 'pointer' }}
                >
                  <td style={{ fontWeight: 600 }}>{invoice.invoice_number}</td>
                  <td>{invoice.client_name}</td>
                  <td>{invoice.date}</td>
                  <td>{invoice.due_date}</td>
                  <td className="amount">{formatUSD(invoice.total)}</td>
                  <td>
                    <span className={getStatusBadgeClass(invoice.status)}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                  </td>
                  <td>
                    <div className="btn-group">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => handleDownloadPDF(invoice, e)}
                        title="Download PDF"
                      >
                        PDF
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={(e) => openDeleteModal(invoice, e)}
                        title="Delete"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={closeDeleteModal}
        title="Delete Invoice"
      >
        <p style={{ marginBottom: '16px', color: '#334155' }}>
          Are you sure you want to delete invoice{' '}
          <strong>{deletingInvoice?.invoice_number}</strong> for{' '}
          <strong>{deletingInvoice?.client_name}</strong>? This action cannot be undone.
        </p>
        <div className="form-actions">
          <button
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete Invoice'}
          </button>
          <button className="btn btn-secondary" onClick={closeDeleteModal}>
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Invoices;
