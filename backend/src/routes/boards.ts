import { Router } from 'express';
import db from '../database';

const router = Router();

// ─── BOARDS ────────────────────────────────────────────────────────────────────

// List all boards with list count and card count
router.get('/', (_req, res) => {
  const boards = db.prepare(`
    SELECT
      b.*,
      COUNT(DISTINCT l.id) as list_count,
      COUNT(DISTINCT c.id) as card_count
    FROM boards b
    LEFT JOIN lists l ON l.board_id = b.id
    LEFT JOIN cards c ON c.list_id = l.id
    GROUP BY b.id
    ORDER BY b.created_at DESC
  `).all();
  res.json(boards);
});

// Get single board with all lists and cards
router.get('/:id', (req, res) => {
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });

  const lists = db.prepare('SELECT * FROM lists WHERE board_id = ? ORDER BY position').all(req.params.id);

  const listsWithCards = (lists as any[]).map((list: any) => {
    const cards = db.prepare('SELECT * FROM cards WHERE list_id = ? ORDER BY position').all(list.id);
    const parsedCards = (cards as any[]).map((card: any) => {
      const checklist = db.prepare('SELECT * FROM checklist_items WHERE card_id = ? ORDER BY position').all(card.id);
      return {
        ...card,
        labels: JSON.parse(card.labels || '[]'),
        checklist,
      };
    });
    return { ...list, cards: parsedCards };
  });

  res.json({ ...(board as any), lists: listsWithCards });
});

// Create board
router.post('/', (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const result = db.prepare('INSERT INTO boards (name, color) VALUES (?, ?)').run(name, color || '#3b82f6');
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(board);
});

// Update board
router.put('/:id', (req, res) => {
  const { name, color } = req.body;
  const existing = db.prepare('SELECT * FROM boards WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Board not found' });

  db.prepare('UPDATE boards SET name = COALESCE(?, name), color = COALESCE(?, color) WHERE id = ?')
    .run(name, color, req.params.id);
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(req.params.id);
  res.json(board);
});

// Delete board (cascade deletes lists and cards)
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM boards WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Board not found' });

  db.prepare('DELETE FROM boards WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── LISTS ─────────────────────────────────────────────────────────────────────

// Create list
router.post('/:boardId/lists', (req, res) => {
  const { name, position } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(req.params.boardId);
  if (!board) return res.status(404).json({ error: 'Board not found' });

  let pos = position;
  if (pos === undefined || pos === null) {
    const maxPos = db.prepare('SELECT MAX(position) as maxPos FROM lists WHERE board_id = ?').get(req.params.boardId) as any;
    pos = (maxPos?.maxPos ?? -1) + 1;
  }

  const result = db.prepare('INSERT INTO lists (board_id, name, position) VALUES (?, ?, ?)').run(req.params.boardId, name, pos);
  const list = db.prepare('SELECT * FROM lists WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(list);
});

// Update list
router.put('/lists/:id', (req, res) => {
  const { name, position } = req.body;
  const existing = db.prepare('SELECT * FROM lists WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'List not found' });

  db.prepare('UPDATE lists SET name = COALESCE(?, name), position = COALESCE(?, position) WHERE id = ?')
    .run(name, position !== undefined ? position : null, req.params.id);
  const list = db.prepare('SELECT * FROM lists WHERE id = ?').get(req.params.id);
  res.json(list);
});

// Delete list
router.delete('/lists/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM lists WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'List not found' });

  db.prepare('DELETE FROM lists WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Bulk reorder lists
router.put('/lists/reorder', (req, res) => {
  const { listIds } = req.body;
  if (!Array.isArray(listIds)) return res.status(400).json({ error: 'listIds must be an array' });

  const updateStmt = db.prepare('UPDATE lists SET position = ? WHERE id = ?');
  const reorder = db.transaction((ids: number[]) => {
    ids.forEach((id, index) => {
      updateStmt.run(index, id);
    });
  });
  reorder(listIds);

  res.json({ success: true });
});

// ─── CARDS ─────────────────────────────────────────────────────────────────────

// Create card
router.post('/lists/:listId/cards', (req, res) => {
  const { title, description, due_date, labels } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const list = db.prepare('SELECT * FROM lists WHERE id = ?').get(req.params.listId);
  if (!list) return res.status(404).json({ error: 'List not found' });

  const maxPos = db.prepare('SELECT MAX(position) as maxPos FROM cards WHERE list_id = ?').get(req.params.listId) as any;
  const position = (maxPos?.maxPos ?? -1) + 1;

  const labelsJson = JSON.stringify(labels || []);

  const result = db.prepare(
    'INSERT INTO cards (list_id, title, description, position, due_date, labels) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(req.params.listId, title, description || null, position, due_date || null, labelsJson);

  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(result.lastInsertRowid) as any;
  res.status(201).json({ ...card, labels: JSON.parse(card.labels || '[]') });
});

// Update card
router.put('/cards/:id', (req, res) => {
  const { title, description, due_date, labels, list_id, position } = req.body;
  const existing = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Card not found' });

  const labelsJson = labels !== undefined ? JSON.stringify(labels) : undefined;

  db.prepare(`
    UPDATE cards SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      due_date = COALESCE(?, due_date),
      labels = COALESCE(?, labels),
      list_id = COALESCE(?, list_id),
      position = COALESCE(?, position)
    WHERE id = ?
  `).run(
    title || null,
    description !== undefined ? description : null,
    due_date !== undefined ? due_date : null,
    labelsJson || null,
    list_id || null,
    position !== undefined ? position : null,
    req.params.id
  );

  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id) as any;
  res.json({ ...card, labels: JSON.parse(card.labels || '[]') });
});

// Delete card
router.delete('/cards/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Card not found' });

  db.prepare('DELETE FROM cards WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Bulk reorder cards (handles within-list and cross-list moves)
router.put('/cards/reorder', (req, res) => {
  const { cards } = req.body;
  if (!Array.isArray(cards)) return res.status(400).json({ error: 'cards must be an array' });

  const updateStmt = db.prepare('UPDATE cards SET list_id = ?, position = ? WHERE id = ?');
  const reorder = db.transaction((items: { id: number; list_id: number; position: number }[]) => {
    for (const item of items) {
      updateStmt.run(item.list_id, item.position, item.id);
    }
  });
  reorder(cards);

  res.json({ success: true });
});

// ─── CHECKLIST ITEMS ──────────────────────────────────────────────────────────

// Get checklist items for a card
router.get('/cards/:cardId/checklist', (req, res) => {
  const items = db.prepare('SELECT * FROM checklist_items WHERE card_id = ? ORDER BY position').all(req.params.cardId);
  res.json(items);
});

// Add checklist item
router.post('/cards/:cardId/checklist', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required' });

  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.cardId);
  if (!card) return res.status(404).json({ error: 'Card not found' });

  const maxPos = db.prepare('SELECT MAX(position) as maxPos FROM checklist_items WHERE card_id = ?').get(req.params.cardId) as any;
  const position = (maxPos?.maxPos ?? -1) + 1;

  const result = db.prepare('INSERT INTO checklist_items (card_id, text, position) VALUES (?, ?, ?)').run(req.params.cardId, text, position);
  const item = db.prepare('SELECT * FROM checklist_items WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(item);
});

// Update checklist item (toggle checked or edit text)
router.put('/checklist/:id', (req, res) => {
  const { text, checked } = req.body;
  const existing = db.prepare('SELECT * FROM checklist_items WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Checklist item not found' });

  db.prepare('UPDATE checklist_items SET text = COALESCE(?, text), checked = COALESCE(?, checked) WHERE id = ?')
    .run(text !== undefined ? text : null, checked !== undefined ? (checked ? 1 : 0) : null, req.params.id);
  const item = db.prepare('SELECT * FROM checklist_items WHERE id = ?').get(req.params.id);
  res.json(item);
});

// Delete checklist item
router.delete('/checklist/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM checklist_items WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Checklist item not found' });

  db.prepare('DELETE FROM checklist_items WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── TRELLO IMPORT ─────────────────────────────────────────────────────────────

// Import Trello JSON export
router.post('/import/trello', (req, res) => {
  try {
    const trelloData = req.body;

    if (!trelloData || !trelloData.name) {
      return res.status(400).json({ error: 'Invalid Trello JSON: missing board name' });
    }

    const importBoard = db.transaction(() => {
      // Create board
      const boardResult = db.prepare('INSERT INTO boards (name) VALUES (?)').run(trelloData.name);
      const boardId = boardResult.lastInsertRowid;

      // Filter out closed lists and sort by position
      const trelloLists = (trelloData.lists || [])
        .filter((l: any) => !l.closed)
        .sort((a: any, b: any) => a.pos - b.pos);

      // Map old Trello list ids to new list ids
      const listIdMap = new Map<string, number>();

      trelloLists.forEach((trelloList: any, index: number) => {
        const listResult = db.prepare('INSERT INTO lists (board_id, name, position) VALUES (?, ?, ?)')
          .run(boardId, trelloList.name, index);
        listIdMap.set(trelloList.id, Number(listResult.lastInsertRowid));
      });

      // Filter out closed cards and sort by position
      const trelloCards = (trelloData.cards || [])
        .filter((c: any) => !c.closed)
        .sort((a: any, b: any) => a.pos - b.pos);

      // Track card positions per list
      const listCardPositions = new Map<number, number>();

      for (const trelloCard of trelloCards) {
        const newListId = listIdMap.get(trelloCard.idList);
        if (!newListId) continue; // skip cards from closed/missing lists

        const position = listCardPositions.get(newListId) || 0;
        listCardPositions.set(newListId, position + 1);

        const labels = (trelloCard.labels || []).map((l: any) => l.name || l.color).filter(Boolean);
        const labelsJson = JSON.stringify(labels);

        db.prepare(
          'INSERT INTO cards (list_id, title, description, position, due_date, labels) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(newListId, trelloCard.name, trelloCard.desc || null, position, trelloCard.due || null, labelsJson);
      }

      // Return created board with lists and cards
      const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(boardId);
      const lists = db.prepare('SELECT * FROM lists WHERE board_id = ? ORDER BY position').all(boardId);
      const listsWithCards = (lists as any[]).map((list: any) => {
        const cards = db.prepare('SELECT * FROM cards WHERE list_id = ? ORDER BY position').all(list.id);
        const parsedCards = (cards as any[]).map((card: any) => ({
          ...card,
          labels: JSON.parse(card.labels || '[]'),
        }));
        return { ...list, cards: parsedCards };
      });

      return { ...(board as any), lists: listsWithCards };
    });

    const result = importBoard();
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to import Trello board', details: error.message });
  }
});

export default router;
