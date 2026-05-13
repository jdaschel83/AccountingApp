import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

interface TimeEntry {
  id: number;
  contact_id: number | null;
  contact_name: string | null;
  date: string;
  description: string;
  hours: number;
  rate: number | null;
  billable: number;
  billed: number;
  invoice_id: number | null;
  started_at: string | null;
  stopped_at: string | null;
}

interface ActiveTimer {
  id: number;
  contact_id: number | null;
  contact_name: string | null;
  description: string;
  started_at: string;
}

interface ContactSummary {
  contact_id: number;
  contact_name: string;
  total_hours: number;
  unbilled_hours: number;
  hours_this_month: number;
}

interface Contact {
  id: number;
  name: string;
}

function formatDuration(startedAt: string): string {
  const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = Math.floor(elapsed % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

const emptyEntryForm = {
  contact_id: '',
  date: todayStr(),
  description: '',
  hours: '',
  rate: '',
  billable: true,
  started_at: '',
  stopped_at: '',
};

export default function TimeTracking() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [summary, setSummary] = useState<ContactSummary[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [timerDisplay, setTimerDisplay] = useState('00:00:00');
  const [filterContact, setFilterContact] = useState('');
  const [filterBilled, setFilterBilled] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Entry modal
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [entryForm, setEntryForm] = useState(emptyEntryForm);
  const [entrySaving, setEntrySaving] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);

  // Timer start modal
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timerForm, setTimerForm] = useState({ contact_id: '', description: '' });

  // Invoice modal
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceContact, setInvoiceContact] = useState('');
  const [invoiceRate, setInvoiceRate] = useState('');
  const [invoiceDueDate, setInvoiceDueDate] = useState('');
  const [selectedEntryIds, setSelectedEntryIds] = useState<number[]>([]);
  const [unbilledForContact, setUnbilledForContact] = useState<TimeEntry[]>([]);
  const [invoiceSaving, setInvoiceSaving] = useState(false);

  const load = useCallback(async () => {
    const params: Record<string, string> = {};
    if (filterContact) params.contact_id = filterContact;
    if (filterBilled !== '') params.billed = filterBilled;
    try {
      const [e, s, c, t] = await Promise.all([
        api.getTimeEntries(params),
        api.getTimeSummary(),
        api.getContacts(),
        api.getActiveTimer(),
      ]);
      setEntries(e);
      setSummary(s);
      setContacts(c);
      setActiveTimer(t);
    } catch (err: any) {
      setError(err.message);
    }
  }, [filterContact, filterBilled]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!activeTimer) return;
    const interval = setInterval(() => setTimerDisplay(formatDuration(activeTimer.started_at)), 1000);
    setTimerDisplay(formatDuration(activeTimer.started_at));
    return () => clearInterval(interval);
  }, [activeTimer]);

  async function startTimer() {
    try {
      await api.startTimer({ contact_id: timerForm.contact_id || null, description: timerForm.description });
      setShowTimerModal(false);
      setTimerForm({ contact_id: '', description: '' });
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function stopTimer() {
    try {
      await api.stopTimer();
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function discardTimer() {
    try {
      await api.discardTimer();
      setActiveTimer(null);
    } catch (err: any) {
      setError(err.message);
    }
  }

  function openNewEntry() {
    setEditingEntry(null);
    setEntryForm({ ...emptyEntryForm, date: todayStr() });
    setEntryError(null);
    setShowEntryModal(true);
  }

  function openEditEntry(e: TimeEntry) {
    setEditingEntry(e);
    setEntryForm({
      contact_id: String(e.contact_id || ''),
      date: e.date,
      description: e.description,
      hours: String(e.hours),
      rate: e.rate != null ? String(e.rate) : '',
      billable: e.billable === 1,
      started_at: e.started_at || '',
      stopped_at: e.stopped_at || '',
    });
    setEntryError(null);
    setShowEntryModal(true);
  }

  async function saveEntry() {
    setEntryError(null);
    if (!entryForm.date) { setEntryError('Date is required.'); return; }
    if (!entryForm.description.trim()) { setEntryError('Description is required.'); return; }
    const hours = parseFloat(entryForm.hours);
    if (!entryForm.hours || isNaN(hours) || hours <= 0) { setEntryError('Enter a valid number of hours.'); return; }

    setEntrySaving(true);
    try {
      const data = {
        contact_id: entryForm.contact_id ? Number(entryForm.contact_id) : null,
        date: entryForm.date,
        description: entryForm.description.trim(),
        hours,
        rate: entryForm.rate ? parseFloat(entryForm.rate) : null,
        billable: entryForm.billable,
        started_at: entryForm.started_at || null,
        stopped_at: entryForm.stopped_at || null,
        ...(editingEntry ? { billed: editingEntry.billed } : {}),
      };
      if (editingEntry) {
        await api.updateTimeEntry(editingEntry.id, data);
      } else {
        await api.createTimeEntry(data);
      }
      setShowEntryModal(false);
      load();
    } catch (err: any) {
      setEntryError(err.message);
    } finally {
      setEntrySaving(false);
    }
  }

  async function deleteEntry(id: number) {
    if (!confirm('Delete this time entry?')) return;
    try {
      await api.deleteTimeEntry(id);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function openInvoiceModal(contactId: number) {
    const unbilled = entries.filter(e => e.contact_id === contactId && e.billed === 0 && e.billable === 1);
    setInvoiceContact(String(contactId));
    setSelectedEntryIds(unbilled.map(e => e.id));
    setUnbilledForContact(unbilled);
    setInvoiceRate('');
    setInvoiceDueDate('');
    setShowInvoiceModal(true);
  }

  async function generateInvoice() {
    if (selectedEntryIds.length === 0) return;
    setInvoiceSaving(true);
    try {
      const inv = await api.generateInvoiceFromTime({
        contact_id: Number(invoiceContact),
        entry_ids: selectedEntryIds,
        rate: invoiceRate ? parseFloat(invoiceRate) : 0,
        due_date: invoiceDueDate || undefined,
      });
      alert(`Invoice ${inv.invoice_number} created successfully.`);
      setShowInvoiceModal(false);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setInvoiceSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Time Tracking</h1>
        <div className="btn-group">
          <button className="btn btn-secondary" onClick={openNewEntry}>+ Manual Entry</button>
          {!activeTimer && (
            <button className="btn btn-primary" onClick={() => setShowTimerModal(true)}>Start Timer</button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Active Timer Banner */}
      {activeTimer && (
        <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#16a34a' }} />
              <strong style={{ fontSize: '20px', fontVariantNumeric: 'tabular-nums' }}>{timerDisplay}</strong>
              {activeTimer.description && <span>{activeTimer.description}</span>}
              {activeTimer.contact_name && <span style={{ color: '#166534', opacity: 0.8 }}>— {activeTimer.contact_name}</span>}
            </div>
            <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>
              Started {new Date(activeTimer.started_at).toLocaleTimeString()}
            </div>
          </div>
          <div className="btn-group">
            <button className="btn btn-secondary btn-sm" onClick={discardTimer} style={{ color: '#dc2626', borderColor: '#fca5a5' }}>Discard</button>
            <button className="btn btn-success" onClick={stopTimer}>Stop & Save</button>
          </div>
        </div>
      )}

      {/* Per-client summary cards */}
      {summary.length > 0 && (
        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          {summary.map(s => (
            <div key={s.contact_id} className="stat-card">
              <div className="stat-card-label">{s.contact_name}</div>
              <div className="stat-card-value">{s.hours_this_month.toFixed(1)}h</div>
              <div className="stat-card-sub">this month · {s.total_hours.toFixed(1)}h total</div>
              {s.unbilled_hours > 0 && (
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: '12px' }}
                  onClick={() => openInvoiceModal(s.contact_id)}
                >
                  {s.unbilled_hours.toFixed(1)}h unbilled → Invoice
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="toolbar">
        <select
          value={filterContact}
          onChange={e => setFilterContact(e.target.value)}
          className="form-control"
          style={{ width: '200px' }}
        >
          <option value="">All Clients</option>
          {contacts.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
        </select>
        <select
          value={filterBilled}
          onChange={e => setFilterBilled(e.target.value)}
          className="form-control"
          style={{ width: '160px' }}
        >
          <option value="">All Entries</option>
          <option value="false">Unbilled</option>
          <option value="true">Billed</option>
        </select>
      </div>

      {/* Entries table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Client</th>
              <th>Description</th>
              <th className="amount">Hours</th>
              <th className="amount">Rate</th>
              <th style={{ textAlign: 'center' }}>Status</th>
              <th style={{ width: '120px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                  No time entries yet. Start a timer or add a manual entry.
                </td>
              </tr>
            ) : entries.map(entry => (
              <tr key={entry.id}>
                <td>{entry.date}</td>
                <td>{entry.contact_name || '—'}</td>
                <td>{entry.description}</td>
                <td className="amount" style={{ fontVariantNumeric: 'tabular-nums' }}>{entry.hours.toFixed(2)}</td>
                <td className="amount" style={{ color: '#64748b' }}>{entry.rate ? `$${entry.rate}/hr` : '—'}</td>
                <td style={{ textAlign: 'center' }}>
                  {entry.billed ? (
                    <span className="badge badge-gray">Billed</span>
                  ) : entry.billable ? (
                    <span className="badge badge-yellow">Unbilled</span>
                  ) : (
                    <span className="badge badge-blue">Non-billable</span>
                  )}
                </td>
                <td>
                  <div className="btn-group">
                    <button className="btn btn-secondary btn-sm" onClick={() => openEditEntry(entry)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteEntry(entry.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Entry Modal */}
      {showEntryModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <span className="modal-title">{editingEntry ? 'Edit Entry' : 'New Time Entry'}</span>
              <button className="modal-close" onClick={() => setShowEntryModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {entryError && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{entryError}</div>}
              <div className="form-group">
                <label>Client</label>
                <select
                  value={entryForm.contact_id}
                  onChange={e => setEntryForm(f => ({ ...f, contact_id: e.target.value }))}
                  className="form-control"
                >
                  <option value="">No client</option>
                  {contacts.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Date *</label>
                  <input type="date" value={entryForm.date} onChange={e => setEntryForm(f => ({ ...f, date: e.target.value }))} className="form-control" />
                </div>
                <div className="form-group">
                  <label>Hours *</label>
                  <input type="number" step="0.25" min="0" value={entryForm.hours} onChange={e => setEntryForm(f => ({ ...f, hours: e.target.value }))} className="form-control" placeholder="1.5" />
                </div>
              </div>
              <div className="form-group">
                <label>Description *</label>
                <input type="text" value={entryForm.description} onChange={e => setEntryForm(f => ({ ...f, description: e.target.value }))} className="form-control" placeholder="What did you work on?" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Rate ($/hr, optional)</label>
                  <input type="number" step="0.01" min="0" value={entryForm.rate} onChange={e => setEntryForm(f => ({ ...f, rate: e.target.value }))} className="form-control" placeholder="100" />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'normal' }}>
                    <input type="checkbox" checked={entryForm.billable} onChange={e => setEntryForm(f => ({ ...f, billable: e.target.checked }))} />
                    Billable
                  </label>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start time (optional)</label>
                  <input type="datetime-local" value={entryForm.started_at} onChange={e => setEntryForm(f => ({ ...f, started_at: e.target.value }))} className="form-control" />
                </div>
                <div className="form-group">
                  <label>Stop time (optional)</label>
                  <input type="datetime-local" value={entryForm.stopped_at} onChange={e => setEntryForm(f => ({ ...f, stopped_at: e.target.value }))} className="form-control" />
                </div>
              </div>
              <div className="form-actions">
                <button className="btn btn-secondary" onClick={() => setShowEntryModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveEntry} disabled={entrySaving}>
                  {entrySaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timer Start Modal */}
      {showTimerModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <span className="modal-title">Start Timer</span>
              <button className="modal-close" onClick={() => setShowTimerModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Client (optional)</label>
                <select
                  value={timerForm.contact_id}
                  onChange={e => setTimerForm(f => ({ ...f, contact_id: e.target.value }))}
                  className="form-control"
                >
                  <option value="">No client</option>
                  {contacts.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>What are you working on? (optional)</label>
                <input
                  type="text"
                  value={timerForm.description}
                  onChange={e => setTimerForm(f => ({ ...f, description: e.target.value }))}
                  className="form-control"
                  placeholder="e.g. Client call, Design review…"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && startTimer()}
                />
              </div>
              <div className="form-actions">
                <button className="btn btn-secondary" onClick={() => setShowTimerModal(false)}>Cancel</button>
                <button className="btn btn-success" onClick={startTimer}>Start Timer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate Invoice Modal */}
      {showInvoiceModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <span className="modal-title">Generate Invoice from Time</span>
              <button className="modal-close" onClick={() => setShowInvoiceModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
                Select which unbilled entries to include, then create an invoice.
              </p>
              <div className="table-container" style={{ maxHeight: '220px', overflowY: 'auto', marginBottom: '20px' }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}></th>
                      <th>Date</th>
                      <th>Description</th>
                      <th className="amount">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unbilledForContact.map(e => (
                      <tr key={e.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedEntryIds.includes(e.id)}
                            onChange={ev => {
                              if (ev.target.checked) setSelectedEntryIds(ids => [...ids, e.id]);
                              else setSelectedEntryIds(ids => ids.filter(i => i !== e.id));
                            }}
                          />
                        </td>
                        <td>{e.date}</td>
                        <td>{e.description}</td>
                        <td className="amount">{e.hours.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Default Rate ($/hr)</label>
                  <input type="number" step="0.01" min="0" value={invoiceRate} onChange={e => setInvoiceRate(e.target.value)} className="form-control" placeholder="Used if entry has no rate" />
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input type="date" value={invoiceDueDate} onChange={e => setInvoiceDueDate(e.target.value)} className="form-control" />
                </div>
              </div>
              <div className="form-actions">
                <button className="btn btn-secondary" onClick={() => setShowInvoiceModal(false)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={generateInvoice}
                  disabled={selectedEntryIds.length === 0 || invoiceSaving}
                >
                  {invoiceSaving ? 'Creating…' : `Create Invoice (${selectedEntryIds.length} entries)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
