import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import Modal from '../components/Modal';

interface Board {
  id: number;
  name: string;
  color: string;
  list_count: number;
  card_count: number;
  created_at: string;
}

interface BoardForm {
  name: string;
  color: string;
}

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#ef4444', // red
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f97316', // orange
  '#14b8a6', // teal
];

const emptyForm: BoardForm = {
  name: '',
  color: PRESET_COLORS[0],
};

const BoardsList: React.FC = () => {
  const navigate = useNavigate();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Board modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [form, setForm] = useState<BoardForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Import modal
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const fetchBoards = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .getBoards()
      .then((result: Board[]) => {
        setBoards(result);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  const openCreateModal = () => {
    setEditingBoard(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  };

  const openEditModal = (board: Board) => {
    setEditingBoard(board);
    setForm({
      name: board.name,
      color: board.color || PRESET_COLORS[0],
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingBoard(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingBoard) {
        await api.updateBoard(editingBoard.id, form);
      } else {
        await api.createBoard(form);
      }
      closeModal();
      fetchBoards();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (board: Board) => {
    if (!window.confirm(`Delete board "${board.name}"? All lists and cards will be permanently removed.`)) {
      return;
    }
    try {
      await api.deleteBoard(board.id);
      fetchBoards();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openImportModal = () => {
    setImportError(null);
    setImportModalOpen(true);
  };

  const closeImportModal = () => {
    setImportModalOpen(false);
    setImportError(null);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const result = await api.importTrello(parsed);
        closeImportModal();
        fetchBoards();
        if (result && result.id) {
          navigate(`/boards/${result.id}`);
        }
      } catch (err: any) {
        setImportError(err.message || 'Failed to import Trello board');
      } finally {
        setImporting(false);
      }
    };
    reader.onerror = () => {
      setImportError('Failed to read file');
      setImporting(false);
    };
    reader.readAsText(file);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        Loading boards...
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Boards</h1>
        <div className="btn-group">
          <button className="btn btn-secondary" onClick={openImportModal}>
            Import from Trello
          </button>
          <button className="btn btn-primary" onClick={openCreateModal}>
            New Board
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {boards.length === 0 ? (
        <div className="empty-state">
          <p>No boards yet. Create one or import from Trello.</p>
          <div className="btn-group" style={{ justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={openCreateModal}>
              New Board
            </button>
            <button className="btn btn-secondary" onClick={openImportModal}>
              Import from Trello
            </button>
          </div>
        </div>
      ) : (
        <div className="boards-grid">
          {boards.map((board) => (
            <div
              key={board.id}
              className="card"
              style={{
                borderLeft: `4px solid ${board.color || '#94a3b8'}`,
                cursor: 'pointer',
                marginBottom: 0,
              }}
              onClick={() => navigate(`/boards/${board.id}`)}
            >
              <div className="flex-between" style={{ marginBottom: '12px' }}>
                <h3
                  style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#0f172a',
                    marginBottom: 0,
                  }}
                >
                  {board.name}
                </h3>
                <div
                  className="btn-group"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => openEditModal(board)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(board)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#64748b' }}>
                <span>{board.list_count} {board.list_count === 1 ? 'list' : 'lists'}</span>
                <span>{board.card_count} {board.card_count === 1 ? 'card' : 'cards'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Board Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingBoard ? 'Edit Board' : 'New Board'}
      >
        <div className="form-group">
          <label>Name</label>
          <input
            type="text"
            className="form-control"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Board name"
            autoFocus
          />
        </div>
        <div className="form-group">
          <label>Color</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, color }))}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: color,
                  border: form.color === color ? '3px solid #0f172a' : '3px solid transparent',
                  cursor: 'pointer',
                  outline: form.color === color ? '2px solid #3b82f6' : 'none',
                  outlineOffset: '1px',
                  padding: 0,
                  transition: 'border-color 0.15s, outline 0.15s',
                }}
                title={color}
              />
            ))}
          </div>
        </div>
        <div className="form-actions">
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
          >
            {saving ? 'Saving...' : editingBoard ? 'Save Changes' : 'Create Board'}
          </button>
          <button className="btn btn-secondary" onClick={closeModal}>
            Cancel
          </button>
        </div>
      </Modal>

      {/* Import from Trello Modal */}
      <Modal
        isOpen={importModalOpen}
        onClose={closeImportModal}
        title="Import from Trello"
      >
        <div className="form-group">
          <label>Trello Export File (.json)</label>
          <div className="form-help" style={{ marginBottom: '12px' }}>
            Export your Trello board as JSON from Trello's menu, then select the file below.
          </div>
          <input
            type="file"
            className="form-control"
            accept=".json"
            onChange={handleImportFile}
            disabled={importing}
          />
        </div>
        {importing && (
          <div className="loading" style={{ padding: '16px' }}>
            <div className="spinner" />
            Importing...
          </div>
        )}
        {importError && (
          <div className="alert alert-error">{importError}</div>
        )}
        <div className="form-actions">
          <button className="btn btn-secondary" onClick={closeImportModal}>
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default BoardsList;
