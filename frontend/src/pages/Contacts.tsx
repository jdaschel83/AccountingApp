import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';

interface Contact {
  id: number;
  type: 'business' | 'individual';
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  ein: string | null;
  notes: string | null;
}

const emptyForm = {
  type: 'business' as 'business' | 'individual',
  name: '',
  company: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  country: '',
  ein: '',
  notes: '',
};

const Contacts: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [viewingContact, setViewingContact] = useState<Contact | null>(null);

  const fetchContacts = useCallback(() => {
    setLoading(true);
    api.getContacts(search || undefined)
      .then((data: Contact[]) => { setContacts(data); setLoading(false); })
      .catch((err: Error) => { setError(err.message); setLoading(false); });
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchContacts, 300);
    return () => clearTimeout(t);
  }, [fetchContacts]);

  const openCreate = () => {
    setEditingContact(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (c: Contact, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingContact(c);
    setForm({
      type: c.type,
      name: c.name,
      company: c.company || '',
      email: c.email || '',
      phone: c.phone || '',
      address: c.address || '',
      city: c.city || '',
      state: c.state || '',
      zip: c.zip || '',
      country: c.country || '',
      ein: c.ein || '',
      notes: c.notes || '',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingContact(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      const data = {
        type: form.type,
        name: form.name,
        company: form.company || null,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        zip: form.zip || null,
        country: form.country || null,
        ein: form.ein || null,
        notes: form.notes || null,
      };
      if (editingContact) {
        await api.updateContact(editingContact.id, data);
      } else {
        await api.createContact(data);
      }
      closeModal();
      fetchContacts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openDelete = (c: Contact, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingContact(c);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingContact) return;
    setDeleting(true);
    try {
      await api.deleteContact(deletingContact.id);
      setDeleteModalOpen(false);
      setDeletingContact(null);
      if (viewingContact?.id === deletingContact.id) setViewingContact(null);
      fetchContacts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const formatAddress = (c: Contact) => {
    const parts = [c.address, c.city, c.state, c.zip, c.country].filter(Boolean);
    return parts.join(', ') || '—';
  };

  return (
    <div>
      <div className="page-header">
        <h1>Contacts</h1>
        <button className="btn btn-primary" onClick={openCreate}>New Contact</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="toolbar">
        <input
          type="text"
          className="form-control"
          placeholder="Search by name, company, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: '320px' }}
        />
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" />Loading contacts...</div>
      ) : contacts.length === 0 ? (
        <div className="empty-state">
          <p>{search ? 'No contacts match your search.' : 'No contacts yet.'}</p>
          {!search && <button className="btn btn-primary" onClick={openCreate}>Add your first contact</button>}
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Company</th>
                <th>Email</th>
                <th>Phone</th>
                <th>EIN / Tax ID</th>
                <th style={{ width: '120px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} onClick={() => setViewingContact(c)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td>
                    <span className={`badge ${c.type === 'business' ? 'badge-blue' : 'badge-gray'}`}>
                      {c.type === 'business' ? 'Business' : 'Individual'}
                    </span>
                  </td>
                  <td>{c.company || '—'}</td>
                  <td>{c.email || '—'}</td>
                  <td>{c.phone || '—'}</td>
                  <td>{c.ein || '—'}</td>
                  <td>
                    <div className="btn-group">
                      <button className="btn btn-secondary btn-sm" onClick={(e) => openEdit(c, e)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={(e) => openDelete(c, e)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail panel */}
      {viewingContact && (
        <div className="card" style={{ marginTop: '24px' }}>
          <div className="flex-between" style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: 0 }}>
              {viewingContact.name}
            </h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setViewingContact(null)}>Close</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 32px' }}>
            <div><span style={{ color: '#64748b', fontSize: '13px' }}>Type</span><div>{viewingContact.type === 'business' ? 'Business' : 'Individual'}</div></div>
            {viewingContact.company && <div><span style={{ color: '#64748b', fontSize: '13px' }}>Company</span><div>{viewingContact.company}</div></div>}
            {viewingContact.email && <div><span style={{ color: '#64748b', fontSize: '13px' }}>Email</span><div>{viewingContact.email}</div></div>}
            {viewingContact.phone && <div><span style={{ color: '#64748b', fontSize: '13px' }}>Phone</span><div>{viewingContact.phone}</div></div>}
            {viewingContact.ein && <div><span style={{ color: '#64748b', fontSize: '13px' }}>EIN / Tax ID</span><div>{viewingContact.ein}</div></div>}
            <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#64748b', fontSize: '13px' }}>Address</span><div>{formatAddress(viewingContact)}</div></div>
            {viewingContact.notes && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#64748b', fontSize: '13px' }}>Notes</span><div style={{ whiteSpace: 'pre-wrap' }}>{viewingContact.notes}</div></div>}
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editingContact ? 'Edit Contact' : 'New Contact'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="form-row">
            <div className="form-group">
              <label>Type</label>
              <select className="form-control" value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value as any }))}>
                <option value="business">Business</option>
                <option value="individual">Individual</option>
              </select>
            </div>
            <div className="form-group">
              <label>Name *</label>
              <input type="text" className="form-control" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name or business name" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{form.type === 'individual' ? 'Company / Employer' : 'DBA / Trade Name'}</label>
              <input type="text" className="form-control" value={form.company} onChange={(e) => setForm(f => ({ ...f, company: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>EIN / Tax ID</label>
              <input type="text" className="form-control" value={form.ein} onChange={(e) => setForm(f => ({ ...f, ein: e.target.value }))} placeholder="XX-XXXXXXX" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input type="email" className="form-control" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input type="tel" className="form-control" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label>Street Address</label>
            <input type="text" className="form-control" value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>City</label>
              <input type="text" className="form-control" value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>State</label>
              <input type="text" className="form-control" value={form.state} onChange={(e) => setForm(f => ({ ...f, state: e.target.value }))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>ZIP</label>
              <input type="text" className="form-control" value={form.zip} onChange={(e) => setForm(f => ({ ...f, zip: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Country</label>
              <input type="text" className="form-control" value={form.country} onChange={(e) => setForm(f => ({ ...f, country: e.target.value }))} placeholder="USA" />
            </div>
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea className="form-control" rows={3} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingContact ? 'Save Changes' : 'Create Contact'}
            </button>
            <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Contact">
        <p style={{ marginBottom: '16px', color: '#334155' }}>
          Are you sure you want to delete <strong>{deletingContact?.name}</strong>? This cannot be undone.
        </p>
        <div className="form-actions">
          <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete Contact'}
          </button>
          <button className="btn btn-secondary" onClick={() => setDeleteModalOpen(false)}>Cancel</button>
        </div>
      </Modal>
    </div>
  );
};

export default Contacts;
