import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';

interface LineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceFormData {
  invoice_number: string;
  client_name: string;
  client_email: string;
  client_address: string;
  date: string;
  due_date: string;
  status: 'unpaid' | 'paid' | 'overdue';
  notes: string;
  items: LineItem[];
}

function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function generateInvoiceNumber(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `INV-${num}`;
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function getDueDateString(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().split('T')[0];
}

const emptyLineItem: LineItem = {
  description: '',
  quantity: 1,
  rate: 0,
  amount: 0,
};

const emptyForm: InvoiceFormData = {
  invoice_number: '',
  client_name: '',
  client_email: '',
  client_address: '',
  date: '',
  due_date: '',
  status: 'unpaid',
  notes: '',
  items: [{ ...emptyLineItem }],
};

const InvoiceForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [form, setForm] = useState<InvoiceFormData>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing) {
      setLoading(true);
      setError(null);
      api
        .getInvoice(parseInt(id))
        .then((invoice: any) => {
          setForm({
            invoice_number: invoice.invoice_number || '',
            client_name: invoice.client_name || '',
            client_email: invoice.client_email || '',
            client_address: invoice.client_address || '',
            date: invoice.date || '',
            due_date: invoice.due_date || '',
            status: invoice.status || 'unpaid',
            notes: invoice.notes || '',
            items: invoice.items && invoice.items.length > 0
              ? invoice.items.map((item: any) => ({
                  description: item.description || '',
                  quantity: item.quantity ?? 1,
                  rate: item.rate ?? 0,
                  amount: item.amount ?? (item.quantity ?? 1) * (item.rate ?? 0),
                }))
              : [{ ...emptyLineItem }],
          });
          setLoading(false);
        })
        .catch((err: Error) => {
          setError(err.message);
          setLoading(false);
        });
    } else {
      // New invoice defaults
      setForm({
        ...emptyForm,
        invoice_number: generateInvoiceNumber(),
        date: getTodayString(),
        due_date: getDueDateString(),
        items: [{ ...emptyLineItem }],
      });
    }
  }, [id, isEditing]);

  const updateField = (field: keyof Omit<InvoiceFormData, 'items'>, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    setForm((prev) => {
      const newItems = [...prev.items];
      const item = { ...newItems[index] };

      if (field === 'description') {
        item.description = value as string;
      } else if (field === 'quantity') {
        item.quantity = parseFloat(value as string) || 0;
        item.amount = item.quantity * item.rate;
      } else if (field === 'rate') {
        item.rate = parseFloat(value as string) || 0;
        item.amount = item.quantity * item.rate;
      }

      newItems[index] = item;
      return { ...prev, items: newItems };
    });
  };

  const addLineItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { ...emptyLineItem }],
    }));
  };

  const removeLineItem = (index: number) => {
    setForm((prev) => {
      if (prev.items.length <= 1) return prev;
      const newItems = prev.items.filter((_, i) => i !== index);
      return { ...prev, items: newItems };
    });
  };

  const total = form.items.reduce((sum, item) => sum + item.amount, 0);

  const handleSave = async () => {
    if (!form.invoice_number || !form.client_name || !form.date) {
      setError('Please fill in the invoice number, client name, and date.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const data = {
        invoice_number: form.invoice_number,
        client_name: form.client_name,
        client_email: form.client_email,
        client_address: form.client_address,
        date: form.date,
        due_date: form.due_date,
        status: form.status,
        notes: form.notes,
        items: form.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.quantity * item.rate,
        })),
      };

      if (isEditing) {
        await api.updateInvoice(parseInt(id), data);
      } else {
        await api.createInvoice(data);
      }

      navigate('/invoices');
    } catch (err: any) {
      setError(err.message || 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/invoices');
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        Loading invoice...
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>{isEditing ? 'Edit Invoice' : 'New Invoice'}</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        {/* Invoice Details */}
        <div className="form-row">
          <div className="form-group">
            <label>Invoice Number</label>
            <input
              type="text"
              className="form-control"
              value={form.invoice_number}
              onChange={(e) => updateField('invoice_number', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select
              className="form-control"
              value={form.status}
              onChange={(e) => updateField('status', e.target.value)}
            >
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              className="form-control"
              value={form.date}
              onChange={(e) => updateField('date', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Due Date</label>
            <input
              type="date"
              className="form-control"
              value={form.due_date}
              onChange={(e) => updateField('due_date', e.target.value)}
            />
          </div>
        </div>

        <div style={{ borderTop: '1px solid #e2e8f0', margin: '24px 0', paddingTop: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
            Client Details
          </h3>
          <div className="form-row">
            <div className="form-group">
              <label>Client Name</label>
              <input
                type="text"
                className="form-control"
                value={form.client_name}
                onChange={(e) => updateField('client_name', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Client Email</label>
              <input
                type="email"
                className="form-control"
                value={form.client_email}
                onChange={(e) => updateField('client_email', e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Client Address</label>
            <textarea
              className="form-control"
              value={form.client_address}
              onChange={(e) => updateField('client_address', e.target.value)}
              rows={3}
            />
          </div>
        </div>

        {/* Line Items */}
        <div style={{ borderTop: '1px solid #e2e8f0', margin: '24px 0', paddingTop: '24px' }}>
          <div className="flex-between" style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: 0 }}>
              Line Items
            </h3>
            <button className="btn btn-secondary btn-sm" onClick={addLineItem}>
              Add Row
            </button>
          </div>

          <div className="invoice-line-items">
            <div className="table-container" style={{ marginBottom: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ minWidth: '240px' }}>Description</th>
                    <th style={{ width: '100px' }} className="amount">Quantity</th>
                    <th style={{ width: '120px' }} className="amount">Rate ($)</th>
                    <th style={{ width: '120px' }} className="amount">Amount</th>
                    <th style={{ width: '60px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Item description"
                          value={item.description}
                          onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          min="0"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(idx, 'quantity', e.target.value)}
                          style={{ textAlign: 'right' }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => updateLineItem(idx, 'rate', e.target.value)}
                          style={{ textAlign: 'right' }}
                        />
                      </td>
                      <td className="amount" style={{ fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                        {formatUSD(item.amount)}
                      </td>
                      <td>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => removeLineItem(idx)}
                          disabled={form.items.length <= 1}
                          title="Remove row"
                        >
                          &times;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total */}
          <div className="invoice-totals">
            <div className="total-row grand-total">
              <span>Total</span>
              <span>{formatUSD(total)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div style={{ borderTop: '1px solid #e2e8f0', margin: '24px 0', paddingTop: '24px' }}>
          <div className="form-group">
            <label>Notes</label>
            <textarea
              className="form-control"
              placeholder="Additional notes or payment instructions..."
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={3}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Invoice'}
          </button>
          <button className="btn btn-secondary" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceForm;
