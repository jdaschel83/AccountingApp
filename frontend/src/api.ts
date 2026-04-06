const API_BASE = '/api';

async function request(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Categories
  getCategories: () => request('/categories'),
  createCategory: (data: any) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: number, data: any) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: number) => request(`/categories/${id}`, { method: 'DELETE' }),

  // Transactions
  getTransactions: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/transactions${query}`);
  },
  createTransaction: (data: any) => request('/transactions', { method: 'POST', body: JSON.stringify(data) }),
  updateTransaction: (id: number, data: any) => request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTransaction: (id: number) => request(`/transactions/${id}`, { method: 'DELETE' }),
  bulkCategorize: (ids: number[], category_id: number) =>
    request('/transactions/bulk-categorize', { method: 'POST', body: JSON.stringify({ ids, category_id }) }),
  bulkDelete: (ids: number[]) =>
    request('/transactions/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }),

  // Rules
  getRules: () => request('/rules'),
  createRule: (data: any) => request('/rules', { method: 'POST', body: JSON.stringify(data) }),
  updateRule: (id: number, data: any) => request(`/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRule: (id: number) => request(`/rules/${id}`, { method: 'DELETE' }),

  // Import
  parseCSV: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_BASE}/import/parse`, { method: 'POST', body: form });
    if (!res.ok) throw new Error('Failed to parse CSV');
    return res.json();
  },
  importTransactions: (data: any) => request('/import/transactions', { method: 'POST', body: JSON.stringify(data) }),
  importSales: (data: any) => request('/import/sales', { method: 'POST', body: JSON.stringify(data) }),
  getTemplates: () => request('/import/templates'),
  saveTemplate: (data: any) => request('/import/templates', { method: 'POST', body: JSON.stringify(data) }),
  deleteTemplate: (id: number) => request(`/import/templates/${id}`, { method: 'DELETE' }),

  // Invoices
  getInvoices: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/invoices${query}`);
  },
  getInvoice: (id: number) => request(`/invoices/${id}`),
  createInvoice: (data: any) => request('/invoices', { method: 'POST', body: JSON.stringify(data) }),
  updateInvoice: (id: number, data: any) => request(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteInvoice: (id: number) => request(`/invoices/${id}`, { method: 'DELETE' }),

  // Sales
  getSales: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/sales${query}`);
  },
  getSalesSummary: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/sales/summary${query}`);
  },

  // Reports
  getDashboard: () => request('/reports/dashboard'),
  getByCategory: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/reports/by-category${query}`);
  },
  getMonthly: (year?: string) => request(`/reports/monthly${year ? '?year=' + year : ''}`),

  // Boards
  getBoards: () => request('/boards'),
  getBoard: (id: number) => request(`/boards/${id}`),
  createBoard: (data: any) => request('/boards', { method: 'POST', body: JSON.stringify(data) }),
  updateBoard: (id: number, data: any) => request(`/boards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBoard: (id: number) => request(`/boards/${id}`, { method: 'DELETE' }),

  // Board Lists
  createList: (boardId: number, data: any) =>
    request(`/boards/${boardId}/lists`, { method: 'POST', body: JSON.stringify(data) }),
  updateList: (id: number, data: any) =>
    request(`/boards/lists/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteList: (id: number) =>
    request(`/boards/lists/${id}`, { method: 'DELETE' }),
  reorderLists: (listIds: number[]) =>
    request('/boards/lists/reorder', { method: 'PUT', body: JSON.stringify({ listIds }) }),

  // Board Cards
  createCard: (listId: number, data: any) =>
    request(`/boards/lists/${listId}/cards`, { method: 'POST', body: JSON.stringify(data) }),
  updateCard: (id: number, data: any) =>
    request(`/boards/cards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCard: (id: number) =>
    request(`/boards/cards/${id}`, { method: 'DELETE' }),
  reorderCards: (cards: any[]) =>
    request('/boards/cards/reorder', { method: 'PUT', body: JSON.stringify({ cards }) }),

  // Board Import
  importTrello: (jsonData: any) =>
    request('/boards/import/trello', { method: 'POST', body: JSON.stringify(jsonData) }),

  // Checklist Items
  addChecklistItem: (cardId: number, text: string) =>
    request(`/boards/cards/${cardId}/checklist`, { method: 'POST', body: JSON.stringify({ text }) }),
  updateChecklistItem: (id: number, data: { text?: string; checked?: boolean }) =>
    request(`/boards/checklist/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteChecklistItem: (id: number) =>
    request(`/boards/checklist/${id}`, { method: 'DELETE' }),

  // Settings
  getSettings: () => request('/settings'),
  updateSettings: (data: Record<string, string>) =>
    request('/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Backup
  getDatabases: () => request('/backup/databases'),
  downloadDatabase: (filename: string) => {
    const link = document.createElement('a');
    link.href = `${API_BASE}/backup/download/${encodeURIComponent(filename)}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
  backupAll: (destination: string) =>
    request('/backup/backup-all', { method: 'POST', body: JSON.stringify({ destination }) }),
};
