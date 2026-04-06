import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import Modal from '../components/Modal';

interface ChecklistItem {
  id: number;
  card_id: number;
  text: string;
  checked: number;
  position: number;
}

interface Card {
  id: number;
  title: string;
  description: string;
  position: number;
  due_date: string | null;
  labels: string[];
  checklist: ChecklistItem[];
}

interface BoardList {
  id: number;
  name: string;
  position: number;
  cards: Card[];
}

interface BoardData {
  id: number;
  name: string;
  color: string;
  lists: BoardList[];
}

interface CardForm {
  title: string;
  description: string;
  due_date: string;
  labels: string;
}

const LABEL_COLORS: Record<string, string> = {
  bug: '#ef4444',
  feature: '#3b82f6',
  urgent: '#f59e0b',
  done: '#22c55e',
  blocked: '#f97316',
  review: '#8b5cf6',
  design: '#ec4899',
  backend: '#14b8a6',
  frontend: '#6366f1',
  docs: '#84cc16',
};

function getLabelColor(label: string): string {
  const key = label.toLowerCase().trim();
  if (LABEL_COLORS[key]) return LABEL_COLORS[key];
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6'];
  return colors[Math.abs(hash) % colors.length];
}

const emptyCardForm: CardForm = {
  title: '',
  description: '',
  due_date: '',
  labels: '',
};

const Board: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [board, setBoard] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Card edit modal
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [cardForm, setCardForm] = useState<CardForm>(emptyCardForm);
  const [cardSaving, setCardSaving] = useState(false);

  // Checklist state
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');

  // Inline list name editing
  const [editingListId, setEditingListId] = useState<number | null>(null);
  const [editingListName, setEditingListName] = useState('');

  // Add card inline
  const [addingCardListId, setAddingCardListId] = useState<number | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');

  // Add list inline
  const [addingList, setAddingList] = useState(false);
  const [newListName, setNewListName] = useState('');

  // Drag and drop state for cards
  const [dragCardId, setDragCardId] = useState<number | null>(null);
  const [dragSourceListId, setDragSourceListId] = useState<number | null>(null);
  const [dropTargetListId, setDropTargetListId] = useState<number | null>(null);

  // Drag and drop state for lists
  const [dragListId, setDragListId] = useState<number | null>(null);
  const [dropTargetListPos, setDropTargetListPos] = useState<number | null>(null);

  const fetchBoard = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    api
      .getBoard(Number(id))
      .then((result: BoardData) => {
        setBoard(result);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  // --- List name editing ---

  const startEditingListName = (list: BoardList) => {
    setEditingListId(list.id);
    setEditingListName(list.name);
  };

  const saveListName = async () => {
    if (editingListId === null || !editingListName.trim()) {
      setEditingListId(null);
      return;
    }
    try {
      await api.updateList(editingListId, { name: editingListName.trim() });
      setEditingListId(null);
      fetchBoard();
    } catch (err: any) {
      setError(err.message);
      setEditingListId(null);
    }
  };

  const handleListNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveListName();
    } else if (e.key === 'Escape') {
      setEditingListId(null);
    }
  };

  // --- Delete list ---

  const handleDeleteList = async (list: BoardList) => {
    if (!window.confirm(`Delete list "${list.name}"? All cards in this list will be removed.`)) {
      return;
    }
    try {
      await api.deleteList(list.id);
      fetchBoard();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // --- Add card inline ---

  const startAddingCard = (listId: number) => {
    setAddingCardListId(listId);
    setNewCardTitle('');
  };

  const handleAddCard = async (listId: number) => {
    if (!newCardTitle.trim()) {
      setAddingCardListId(null);
      return;
    }
    try {
      await api.createCard(listId, { title: newCardTitle.trim() });
      setAddingCardListId(null);
      setNewCardTitle('');
      fetchBoard();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddCardKeyDown = (e: React.KeyboardEvent, listId: number) => {
    if (e.key === 'Enter') {
      handleAddCard(listId);
    } else if (e.key === 'Escape') {
      setAddingCardListId(null);
    }
  };

  // --- Add list inline ---

  const startAddingList = () => {
    setAddingList(true);
    setNewListName('');
  };

  const handleAddList = async () => {
    if (!newListName.trim() || !board) {
      setAddingList(false);
      return;
    }
    try {
      await api.createList(board.id, { name: newListName.trim() });
      setAddingList(false);
      setNewListName('');
      fetchBoard();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddList();
    } else if (e.key === 'Escape') {
      setAddingList(false);
    }
  };

  // --- Card edit modal ---

  const openCardModal = (card: Card) => {
    setEditingCard(card);
    setCardForm({
      title: card.title,
      description: card.description || '',
      due_date: card.due_date || '',
      labels: Array.isArray(card.labels) ? card.labels.join(', ') : '',
    });
    setChecklist(card.checklist || []);
    setNewChecklistText('');
    setCardModalOpen(true);
  };

  const closeCardModal = () => {
    setCardModalOpen(false);
    setEditingCard(null);
    setChecklist([]);
  };

  const handleSaveCard = async () => {
    if (!editingCard) return;
    setCardSaving(true);
    try {
      const labelsArray = cardForm.labels
        .split(',')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      await api.updateCard(editingCard.id, {
        title: cardForm.title,
        description: cardForm.description,
        due_date: cardForm.due_date || null,
        labels: labelsArray,
      });
      closeCardModal();
      fetchBoard();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCardSaving(false);
    }
  };

  const handleDeleteCard = async () => {
    if (!editingCard) return;
    if (!window.confirm(`Delete card "${editingCard.title}"?`)) return;
    setCardSaving(true);
    try {
      await api.deleteCard(editingCard.id);
      closeCardModal();
      fetchBoard();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCardSaving(false);
    }
  };

  // --- Checklist ---

  const handleAddChecklistItem = async () => {
    if (!editingCard || !newChecklistText.trim()) return;
    try {
      const item = await api.addChecklistItem(editingCard.id, newChecklistText.trim());
      setChecklist((prev) => [...prev, item]);
      setNewChecklistText('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleChecklistKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddChecklistItem();
    }
  };

  const handleToggleChecklistItem = async (item: ChecklistItem) => {
    try {
      const updated = await api.updateChecklistItem(item.id, { checked: !item.checked });
      setChecklist((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteChecklistItem = async (itemId: number) => {
    try {
      await api.deleteChecklistItem(itemId);
      setChecklist((prev) => prev.filter((i) => i.id !== itemId));
    } catch (err: any) {
      setError(err.message);
    }
  };

  // --- Card drag and drop ---

  const handleCardDragStart = (e: React.DragEvent, card: Card, listId: number) => {
    setDragCardId(card.id);
    setDragSourceListId(listId);
    e.dataTransfer.setData('text/plain', JSON.stringify({ cardId: card.id, sourceListId: listId }));
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
  };

  const handleCardDragEnd = () => {
    setDragCardId(null);
    setDragSourceListId(null);
    setDropTargetListId(null);
  };

  const handleListDragOver = (e: React.DragEvent, listId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragCardId !== null) {
      setDropTargetListId(listId);
    }
  };

  const handleListDragLeave = (e: React.DragEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    const currentTarget = e.currentTarget as HTMLElement;
    if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
      setDropTargetListId(null);
    }
  };

  const handleListDrop = async (e: React.DragEvent, targetListId: number) => {
    e.preventDefault();
    setDropTargetListId(null);

    if (dragCardId !== null) {
      try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        const cardId = data.cardId;
        const targetList = board?.lists.find((l) => l.id === targetListId);
        const newPosition = targetList ? targetList.cards.length : 0;

        await api.updateCard(cardId, { list_id: targetListId, position: newPosition });
        fetchBoard();
      } catch (err: any) {
        setError(err.message);
      }
      setDragCardId(null);
      setDragSourceListId(null);
      return;
    }

    if (dragListId !== null && board) {
      try {
        const currentOrder = board.lists.map((l) => l.id);
        const dragIndex = currentOrder.indexOf(dragListId);
        const targetIndex = currentOrder.indexOf(targetListId);
        if (dragIndex !== -1 && targetIndex !== -1 && dragIndex !== targetIndex) {
          const newOrder = [...currentOrder];
          newOrder.splice(dragIndex, 1);
          newOrder.splice(targetIndex, 0, dragListId);
          await api.reorderLists(newOrder);
          fetchBoard();
        }
      } catch (err: any) {
        setError(err.message);
      }
      setDragListId(null);
      setDropTargetListPos(null);
    }
  };

  // --- List drag and drop ---

  const handleListHeaderDragStart = (e: React.DragEvent, listId: number) => {
    setDragListId(listId);
    e.dataTransfer.setData('application/list-id', String(listId));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleListHeaderDragEnd = () => {
    setDragListId(null);
    setDropTargetListPos(null);
  };

  const handleListHeaderDragOver = (e: React.DragEvent, listId: number) => {
    e.preventDefault();
    if (dragListId !== null && dragListId !== listId) {
      setDropTargetListPos(listId);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        Loading board...
      </div>
    );
  }

  if (error && !board) {
    return <div className="alert alert-error">Failed to load board: {error}</div>;
  }

  if (!board) return null;

  const checklistChecked = checklist.filter((i) => i.checked).length;
  const checklistTotal = checklist.length;

  return (
    <div className="kanban-board">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            to="/boards"
            className="btn btn-secondary btn-sm"
            style={{ textDecoration: 'none' }}
          >
            &larr; Back
          </Link>
          <h1
            style={{
              borderLeft: `4px solid ${board.color || '#94a3b8'}`,
              paddingLeft: '12px',
            }}
          >
            {board.name}
          </h1>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="kanban-lists">
        {board.lists.map((list) => (
          <div
            key={list.id}
            className={`kanban-list${dropTargetListId === list.id && dragCardId !== null ? ' kanban-list-drop-target' : ''}${dropTargetListPos === list.id && dragListId !== null ? ' kanban-list-drop-target' : ''}`}
            onDragOver={(e) => {
              handleListDragOver(e, list.id);
              handleListHeaderDragOver(e, list.id);
            }}
            onDragLeave={handleListDragLeave}
            onDrop={(e) => handleListDrop(e, list.id)}
          >
            {/* List Header */}
            <div
              className="kanban-list-header"
              draggable
              onDragStart={(e) => handleListHeaderDragStart(e, list.id)}
              onDragEnd={handleListHeaderDragEnd}
              style={{ cursor: dragListId ? 'grabbing' : 'grab' }}
            >
              {editingListId === list.id ? (
                <input
                  type="text"
                  className="form-control"
                  value={editingListName}
                  onChange={(e) => setEditingListName(e.target.value)}
                  onBlur={saveListName}
                  onKeyDown={handleListNameKeyDown}
                  autoFocus
                  style={{ fontSize: '14px', fontWeight: 600, padding: '4px 8px' }}
                />
              ) : (
                <span
                  style={{
                    flex: 1,
                    fontWeight: 600,
                    fontSize: '14px',
                    color: '#0f172a',
                    cursor: 'text',
                  }}
                  onClick={() => startEditingListName(list)}
                >
                  {list.name}
                </span>
              )}
              <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '8px' }}>
                {list.cards.length}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                style={{
                  padding: '2px 6px',
                  fontSize: '14px',
                  lineHeight: 1,
                  marginLeft: '4px',
                  color: '#94a3b8',
                  border: 'none',
                  background: 'none',
                }}
                onClick={() => handleDeleteList(list)}
                title="Delete list"
              >
                &times;
              </button>
            </div>

            {/* Cards */}
            <div className="kanban-cards">
              {list.cards.map((card) => {
                const cl = card.checklist || [];
                const clDone = cl.filter((i) => i.checked).length;
                const clTotal = cl.length;
                return (
                  <div
                    key={card.id}
                    className={`kanban-card${dragCardId === card.id ? ' kanban-card-dragging' : ''}`}
                    draggable
                    onDragStart={(e) => handleCardDragStart(e, card, list.id)}
                    onDragEnd={handleCardDragEnd}
                    onClick={() => openCardModal(card)}
                  >
                    <div style={{ fontWeight: 500, fontSize: '14px', color: '#1e293b' }}>
                      {card.title}
                    </div>
                    {card.due_date && (
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                        Due: {card.due_date}
                      </div>
                    )}
                    {clTotal > 0 && (
                      <div style={{
                        fontSize: '12px',
                        color: clDone === clTotal ? '#22c55e' : '#64748b',
                        marginTop: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}>
                        <span style={{ fontSize: '14px' }}>{clDone === clTotal ? '\u2611' : '\u2610'}</span>
                        {clDone}/{clTotal}
                      </div>
                    )}
                    {Array.isArray(card.labels) && card.labels.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                        {card.labels.map((label, i) => (
                          <span
                            key={i}
                            style={{
                              display: 'inline-block',
                              padding: '1px 8px',
                              fontSize: '11px',
                              fontWeight: 600,
                              borderRadius: '9999px',
                              backgroundColor: `${getLabelColor(label)}20`,
                              color: getLabelColor(label),
                            }}
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Card */}
            <div className="kanban-add-card">
              {addingCardListId === list.id ? (
                <div>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Card title..."
                    value={newCardTitle}
                    onChange={(e) => setNewCardTitle(e.target.value)}
                    onKeyDown={(e) => handleAddCardKeyDown(e, list.id)}
                    onBlur={() => {
                      if (!newCardTitle.trim()) setAddingCardListId(null);
                    }}
                    autoFocus
                    style={{ fontSize: '13px', padding: '6px 8px', marginBottom: '6px' }}
                  />
                  <div className="btn-group">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleAddCard(list.id)}
                      disabled={!newCardTitle.trim()}
                    >
                      Add
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setAddingCardListId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => startAddingCard(list.id)}
                >
                  + Add Card
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Add List */}
        <div className="kanban-add-list">
          {addingList ? (
            <div>
              <input
                type="text"
                className="form-control"
                placeholder="List name..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={handleAddListKeyDown}
                onBlur={() => {
                  if (!newListName.trim()) setAddingList(false);
                }}
                autoFocus
                style={{ fontSize: '13px', padding: '6px 8px', marginBottom: '8px' }}
              />
              <div className="btn-group">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleAddList}
                  disabled={!newListName.trim()}
                >
                  Add List
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setAddingList(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={startAddingList}
            >
              + Add List
            </button>
          )}
        </div>
      </div>

      {/* Card Edit Modal */}
      <Modal
        isOpen={cardModalOpen}
        onClose={closeCardModal}
        title="Edit Card"
      >
        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            className="form-control"
            value={cardForm.title}
            onChange={(e) => setCardForm((prev) => ({ ...prev, title: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea
            className="form-control card-description"
            value={cardForm.description}
            onChange={(e) => setCardForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Add a description..."
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Due Date</label>
            <input
              type="date"
              className="form-control"
              value={cardForm.due_date}
              onChange={(e) => setCardForm((prev) => ({ ...prev, due_date: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>Labels</label>
            <input
              type="text"
              className="form-control"
              value={cardForm.labels}
              onChange={(e) => setCardForm((prev) => ({ ...prev, labels: e.target.value }))}
              placeholder="bug, feature, urgent"
            />
            <div className="form-help">Comma-separated</div>
          </div>
        </div>

        {/* Checklist */}
        <div className="form-group">
          <label>
            Checklist
            {checklistTotal > 0 && (
              <span className="text-muted" style={{ fontWeight: 400, marginLeft: '8px' }}>
                {checklistChecked}/{checklistTotal}
              </span>
            )}
          </label>
          {checklistTotal > 0 && (
            <div className="checklist-progress" style={{ marginBottom: '8px' }}>
              <div className="checklist-progress-bar">
                <div
                  className="checklist-progress-fill"
                  style={{ width: `${checklistTotal > 0 ? (checklistChecked / checklistTotal) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
          <div className="checklist-items">
            {checklist.map((item) => (
              <div key={item.id} className="checklist-item">
                <input
                  type="checkbox"
                  checked={!!item.checked}
                  onChange={() => handleToggleChecklistItem(item)}
                  className="checklist-checkbox"
                />
                <span className={`checklist-text${item.checked ? ' checklist-text-done' : ''}`}>
                  {item.text}
                </span>
                <button
                  className="checklist-delete"
                  onClick={() => handleDeleteChecklistItem(item.id)}
                  title="Remove"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
          <div className="checklist-add">
            <input
              type="text"
              className="form-control"
              placeholder="Add item..."
              value={newChecklistText}
              onChange={(e) => setNewChecklistText(e.target.value)}
              onKeyDown={handleChecklistKeyDown}
              style={{ fontSize: '13px', padding: '6px 8px' }}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={handleAddChecklistItem}
              disabled={!newChecklistText.trim()}
              style={{ flexShrink: 0 }}
            >
              Add
            </button>
          </div>
        </div>

        <div className="form-actions">
          <button
            className="btn btn-primary"
            onClick={handleSaveCard}
            disabled={cardSaving || !cardForm.title.trim()}
          >
            {cardSaving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            className="btn btn-danger"
            onClick={handleDeleteCard}
            disabled={cardSaving}
          >
            Delete
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-secondary" onClick={closeCardModal}>
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Board;
