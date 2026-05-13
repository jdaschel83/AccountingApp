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

function today(): string {
  return new Date().toISOString().split('T')[0];
}

export default function TimeTracking() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [summary, setSummary] = useState<ContactSummary[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [timerDisplay, setTimerDisplay] = useState('00:00:00');
  const [filterContact, setFilterContact] = useState('');
  const [filterBilled, setFilterBilled] = useState('');

  // Entry modal state
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [entryForm, setEntryForm] = useState({
    contact_id: '',
    date: today(),
    description: '',
    hours: '',
    rate: '',
    billable: true,
    started_at: '',
    stopped_at: '',
  });

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

  const load = useCallback(async () => {
    const params: Record<string, string> = {};
    if (filterContact) params.contact_id = filterContact;
    if (filterBilled !== '') params.billed = filterBilled;
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
  }, [filterContact, filterBilled]);

  useEffect(() => { load(); }, [load]);

  // Live timer tick
  useEffect(() => {
    if (!activeTimer) return;
    const interval = setInterval(() => setTimerDisplay(formatDuration(activeTimer.started_at)), 1000);
    setTimerDisplay(formatDuration(activeTimer.started_at));
    return () => clearInterval(interval);
  }, [activeTimer]);

  async function startTimer() {
    await api.startTimer({ contact_id: timerForm.contact_id || null, description: timerForm.description });
    setShowTimerModal(false);
    setTimerForm({ contact_id: '', description: '' });
    load();
  }

  async function stopTimer() {
    await api.stopTimer();
    load();
  }

  async function discardTimer() {
    await api.discardTimer();
    setActiveTimer(null);
  }

  function openNewEntry() {
    setEditingEntry(null);
    setEntryForm({ contact_id: '', date: today(), description: '', hours: '', rate: '', billable: true, started_at: '', stopped_at: '' });
    setShowEntryModal(true);
  }

  function openEditEntry(e: TimeEntry) {
    setEditingEntry(e);
    setEntryForm({
      contact_id: String(e.contact_id || ''),
      date: e.date,
      description: e.description,
      hours: String(e.hours),
      rate: String(e.rate || ''),
      billable: e.billable === 1,
      started_at: e.started_at || '',
      stopped_at: e.stopped_at || '',
    });
    setShowEntryModal(true);
  }

  async function saveEntry() {
    const data = {
      contact_id: entryForm.contact_id ? Number(entryForm.contact_id) : null,
      date: entryForm.date,
      description: entryForm.description,
      hours: parseFloat(entryForm.hours),
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
  }

  async function deleteEntry(id: number) {
    if (!confirm('Delete this time entry?')) return;
    await api.deleteTimeEntry(id);
    load();
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
    const inv = await api.generateInvoiceFromTime({
      contact_id: Number(invoiceContact),
      entry_ids: selectedEntryIds,
      rate: invoiceRate ? parseFloat(invoiceRate) : 0,
      due_date: invoiceDueDate || undefined,
    });
    alert(`Invoice ${inv.invoice_number} created.`);
    setShowInvoiceModal(false);
    load();
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Time Tracking</h1>
        <div className="flex gap-2">
          <button onClick={openNewEntry} className="btn-secondary">+ Manual Entry</button>
          {!activeTimer && (
            <button onClick={() => setShowTimerModal(true)} className="btn-primary">Start Timer</button>
          )}
        </div>
      </div>

      {/* Active Timer Banner */}
      {activeTimer && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="inline-block w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <span className="font-semibold text-green-800 text-lg">{timerDisplay}</span>
              {activeTimer.description && <span className="text-green-700">{activeTimer.description}</span>}
              {activeTimer.contact_name && <span className="text-green-600 text-sm">— {activeTimer.contact_name}</span>}
            </div>
            <div className="text-xs text-green-600 mt-1">
              Started {new Date(activeTimer.started_at).toLocaleTimeString()}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={discardTimer} className="text-sm text-red-600 hover:underline">Discard</button>
            <button onClick={stopTimer} className="btn-primary bg-green-600 hover:bg-green-700">Stop & Save</button>
          </div>
        </div>
      )}

      {/* Per-client summary cards */}
      {summary.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {summary.map(s => (
            <div key={s.contact_id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="font-semibold text-gray-900 mb-1">{s.contact_name}</div>
              <div className="text-2xl font-bold text-blue-600">{s.hours_this_month.toFixed(1)}h</div>
              <div className="text-xs text-gray-500">this month</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-gray-600">{s.total_hours.toFixed(1)}h total</span>
                {s.unbilled_hours > 0 && (
                  <button
                    onClick={() => openInvoiceModal(s.contact_id)}
                    className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded hover:bg-amber-200"
                  >
                    {s.unbilled_hours.toFixed(1)}h unbilled
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={filterContact}
          onChange={e => setFilterContact(e.target.value)}
          className="input-field w-48"
        >
          <option value="">All Clients</option>
          {contacts.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
        </select>
        <select
          value={filterBilled}
          onChange={e => setFilterBilled(e.target.value)}
          className="input-field w-40"
        >
          <option value="">All Entries</option>
          <option value="false">Unbilled</option>
          <option value="true">Billed</option>
        </select>
      </div>

      {/* Entries table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Client</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Hours</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Rate</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  No time entries yet. Start a timer or add a manual entry.
                </td>
              </tr>
            )}
            {entries.map(entry => (
              <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-700">{entry.date}</td>
                <td className="px-4 py-3 text-gray-700">{entry.contact_name || '—'}</td>
                <td className="px-4 py-3 text-gray-900">{entry.description}</td>
                <td className="px-4 py-3 text-right font-mono">{entry.hours.toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-gray-500">
                  {entry.rate ? `$${entry.rate}/hr` : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  {entry.billed ? (
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">Billed</span>
                  ) : entry.billable ? (
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">Unbilled</span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600">Non-billable</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEditEntry(entry)} className="text-blue-600 hover:underline mr-3 text-xs">Edit</button>
                  <button onClick={() => deleteEntry(entry.id)} className="text-red-500 hover:underline text-xs">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Entry Modal */}
      {showEntryModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">{editingEntry ? 'Edit Entry' : 'New Time Entry'}</h2>
            <div className="space-y-3">
              <div>
                <label className="label">Client</label>
                <select
                  value={entryForm.contact_id}
                  onChange={e => setEntryForm(f => ({ ...f, contact_id: e.target.value }))}
                  className="input-field"
                >
                  <option value="">No client</option>
                  {contacts.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Date</label>
                  <input type="date" value={entryForm.date} onChange={e => setEntryForm(f => ({ ...f, date: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="label">Hours</label>
                  <input type="number" step="0.25" value={entryForm.hours} onChange={e => setEntryForm(f => ({ ...f, hours: e.target.value }))} className="input-field" placeholder="1.5" />
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <input type="text" value={entryForm.description} onChange={e => setEntryForm(f => ({ ...f, description: e.target.value }))} className="input-field" placeholder="What did you work on?" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Rate ($/hr, optional)</label>
                  <input type="number" step="0.01" value={entryForm.rate} onChange={e => setEntryForm(f => ({ ...f, rate: e.target.value }))} className="input-field" placeholder="100" />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={entryForm.billable} onChange={e => setEntryForm(f => ({ ...f, billable: e.target.checked }))} className="rounded" />
                    <span className="text-sm text-gray-700">Billable</span>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Start time (optional)</label>
                  <input type="datetime-local" value={entryForm.started_at} onChange={e => setEntryForm(f => ({ ...f, started_at: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="label">Stop time (optional)</label>
                  <input type="datetime-local" value={entryForm.stopped_at} onChange={e => setEntryForm(f => ({ ...f, stopped_at: e.target.value }))} className="input-field" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowEntryModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={saveEntry} className="btn-primary">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Timer Start Modal */}
      {showTimerModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Start Timer</h2>
            <div className="space-y-3">
              <div>
                <label className="label">Client (optional)</label>
                <select
                  value={timerForm.contact_id}
                  onChange={e => setTimerForm(f => ({ ...f, contact_id: e.target.value }))}
                  className="input-field"
                >
                  <option value="">No client</option>
                  {contacts.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Description (optional)</label>
                <input
                  type="text"
                  value={timerForm.description}
                  onChange={e => setTimerForm(f => ({ ...f, description: e.target.value }))}
                  className="input-field"
                  placeholder="What are you working on?"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowTimerModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={startTimer} className="btn-primary bg-green-600 hover:bg-green-700">Start</button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-1">Generate Invoice</h2>
            <p className="text-sm text-gray-500 mb-4">
              {unbilledForContact.length} unbilled {unbilledForContact.length === 1 ? 'entry' : 'entries'} will be included.
            </p>
            <div className="border border-gray-100 rounded-lg divide-y divide-gray-100 mb-4 max-h-48 overflow-y-auto">
              {unbilledForContact.map(e => (
                <div key={e.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedEntryIds.includes(e.id)}
                    onChange={ev => {
                      if (ev.target.checked) setSelectedEntryIds(ids => [...ids, e.id]);
                      else setSelectedEntryIds(ids => ids.filter(i => i !== e.id));
                    }}
                  />
                  <span className="text-gray-500 w-24 shrink-0">{e.date}</span>
                  <span className="flex-1 text-gray-800 truncate">{e.description}</span>
                  <span className="font-mono text-gray-700">{e.hours.toFixed(2)}h</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Default Rate ($/hr)</label>
                <input type="number" step="0.01" value={invoiceRate} onChange={e => setInvoiceRate(e.target.value)} className="input-field" placeholder="Used if entry has no rate" />
              </div>
              <div>
                <label className="label">Due Date</label>
                <input type="date" value={invoiceDueDate} onChange={e => setInvoiceDueDate(e.target.value)} className="input-field" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowInvoiceModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={generateInvoice} disabled={selectedEntryIds.length === 0} className="btn-primary">
                Create Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
