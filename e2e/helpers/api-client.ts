const BASE = 'http://localhost:3001/api';

async function req(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${init?.method ?? 'GET'} ${path} → ${res.status}: ${body}`);
  }
  return res.json();
}

// ---- Contacts ----

export async function createContact(data: { name: string; type?: string; email?: string; company?: string }) {
  return req('/contacts', {
    method: 'POST',
    body: JSON.stringify({ type: 'business', ...data }),
  });
}

export async function deleteContact(id: number) {
  return req(`/contacts/${id}`, { method: 'DELETE' });
}

export async function findContactByName(name: string): Promise<{ id: number } | null> {
  const contacts: { id: number; name: string }[] = await req(
    `/contacts?search=${encodeURIComponent(name)}`
  );
  return contacts.find((c) => c.name === name) ?? null;
}

// ---- Transactions ----

export async function createTransaction(data: {
  date: string;
  description: string;
  amount: number;
  type: 'expense' | 'income';
}) {
  return req('/transactions', { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteTransaction(id: number) {
  return req(`/transactions/${id}`, { method: 'DELETE' });
}

export async function findTransactionByDescription(desc: string): Promise<{ id: number } | null> {
  const result: { transactions: { id: number; description: string }[] } = await req(
    `/transactions?search=${encodeURIComponent(desc)}&limit=5`
  );
  return result.transactions.find((t) => t.description === desc) ?? null;
}

// ---- Invoices ----

export async function createInvoice(data: {
  invoice_number: string;
  client_name: string;
  date: string;
  due_date: string;
  status?: string;
  items?: object[];
}) {
  return req('/invoices', {
    method: 'POST',
    body: JSON.stringify({ status: 'unpaid', items: [], ...data }),
  });
}

export async function deleteInvoice(id: number) {
  return req(`/invoices/${id}`, { method: 'DELETE' });
}

export async function findInvoiceByNumber(num: string): Promise<{ id: number } | null> {
  const invoices: { id: number; invoice_number: string }[] = await req('/invoices');
  return invoices.find((i) => i.invoice_number === num) ?? null;
}

// ---- Time Entries ----

export async function createTimeEntry(data: {
  date: string;
  description: string;
  hours: number;
  contact_id?: number;
}) {
  return req('/time-tracking/entries', {
    method: 'POST',
    body: JSON.stringify({ billable: true, ...data }),
  });
}

export async function deleteTimeEntry(id: number) {
  return req(`/time-tracking/entries/${id}`, { method: 'DELETE' });
}

export async function findTimeEntryByDescription(desc: string): Promise<{ id: number } | null> {
  const entries: { id: number; description: string }[] = await req('/time-tracking/entries');
  return entries.find((e) => e.description === desc) ?? null;
}

export async function discardActiveTimer() {
  try {
    await req('/time-tracking/timer', { method: 'DELETE' });
  } catch {
    // no active timer — that's fine
  }
}
