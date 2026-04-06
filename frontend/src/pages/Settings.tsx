import { useState, useEffect } from 'react';
import { api } from '../api';

interface DatabaseInfo {
  name: string;
  filename: string;
  size: number;
  lastModified: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function Settings() {
  const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [backupPath, setBackupPath] = useState('');
  const [backupStatus, setBackupStatus] = useState<{ type: string; message: string } | null>(null);

  // Business profile
  const [profile, setProfile] = useState({
    business_name: '',
    owner_name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileStatus, setProfileStatus] = useState<{ type: string; message: string } | null>(null);

  useEffect(() => {
    fetchDatabases();
    fetchSettings();
  }, []);

  async function fetchDatabases() {
    setLoading(true);
    try {
      const data = await api.getDatabases();
      setDatabases(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  async function fetchSettings() {
    try {
      const data = await api.getSettings();
      setProfile({
        business_name: data.business_name || '',
        owner_name: data.owner_name || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSaveProfile() {
    setProfileSaving(true);
    setProfileStatus(null);
    try {
      await api.updateSettings(profile);
      setProfileStatus({ type: 'success', message: 'Business profile saved.' });
    } catch (err: any) {
      setProfileStatus({ type: 'error', message: err.message || 'Failed to save profile' });
    }
    setProfileSaving(false);
  }

  async function handleBackupAll() {
    if (!backupPath.trim()) {
      setBackupStatus({ type: 'error', message: 'Please enter a backup destination path' });
      return;
    }
    try {
      const result = await api.backupAll(backupPath.trim());
      setBackupStatus({ type: 'success', message: `Backed up ${result.files.length} database(s) to ${backupPath}` });
    } catch (err: any) {
      setBackupStatus({ type: 'error', message: err.message || 'Backup failed' });
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      {/* Business Profile */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginTop: 0 }}>Business Profile</h2>
        <p className="text-muted">Your business details used for invoices and records.</p>

        <div className="form-row">
          <div className="form-group">
            <label>Business Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. My LLC"
              value={profile.business_name}
              onChange={e => setProfile(p => ({ ...p, business_name: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>Owner Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. John Doe"
              value={profile.owner_name}
              onChange={e => setProfile(p => ({ ...p, owner_name: e.target.value }))}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              className="form-control"
              placeholder="e.g. john@mybusiness.com"
              value={profile.email}
              onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. (555) 123-4567"
              value={profile.phone}
              onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
            />
          </div>
        </div>
        <div className="form-group">
          <label>Address</label>
          <textarea
            className="form-control"
            placeholder="Business address"
            value={profile.address}
            onChange={e => setProfile(p => ({ ...p, address: e.target.value }))}
            rows={2}
          />
        </div>
        <div className="btn-group">
          <button className="btn btn-primary" onClick={handleSaveProfile} disabled={profileSaving}>
            {profileSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
        {profileStatus && (
          <div className={`alert alert-${profileStatus.type}`} style={{ marginTop: '1rem' }}>
            {profileStatus.message}
          </div>
        )}
      </div>

      {/* Databases */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginTop: 0 }}>Databases</h2>
        <p className="text-muted">Your app data is stored in separate SQLite databases. Download individual backups or back up everything at once.</p>

        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Database</th>
                  <th>Filename</th>
                  <th style={{ textAlign: 'right' }}>Size</th>
                  <th>Last Modified</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {databases.length === 0 ? (
                  <tr><td colSpan={5} className="empty-state">No databases found.</td></tr>
                ) : databases.map(db => (
                  <tr key={db.filename}>
                    <td><strong>{db.name}</strong></td>
                    <td className="text-muted">{db.filename}</td>
                    <td style={{ textAlign: 'right' }}>{formatBytes(db.size)}</td>
                    <td>{new Date(db.lastModified).toLocaleString()}</td>
                    <td>
                      <button className="btn btn-sm btn-primary" onClick={() => api.downloadDatabase(db.filename)}>
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Backup All */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Backup All Databases</h2>
        <p className="text-muted">Copy all databases to a folder (e.g. your Google Drive folder).</p>

        <div className="form-row" style={{ alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Destination Path</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. /Users/you/Google Drive/Backups"
              value={backupPath}
              onChange={e => setBackupPath(e.target.value)}
            />
          </div>
          <div className="form-group">
            <button className="btn btn-primary" onClick={handleBackupAll}>
              Backup All
            </button>
          </div>
        </div>

        {backupStatus && (
          <div className={`alert alert-${backupStatus.type}`} style={{ marginTop: '1rem' }}>
            {backupStatus.message}
          </div>
        )}
      </div>
    </div>
  );
}
