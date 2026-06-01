import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

interface LineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface BusinessInfo {
  business_name?: string;
  owner_name?: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface InvoiceData {
  invoice_number: string;
  client_name: string;
  client_contact_person?: string;
  client_email?: string;
  client_address?: string;
  date: string;
  due_date: string;
  notes?: string;
  items: LineItem[];
  business?: BusinessInfo;
}

const LOGO_PATH = path.join(__dirname, 'logo.png');
const ACCENT = '#1a56db';
const LIGHT_GRAY = '#f1f5f9';
const TEXT_DARK = '#1e293b';
const TEXT_MUTED = '#64748b';

export function generateInvoicePDF(invoice: InvoiceData): PDFKit.PDFDocument {
  const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
  const biz = invoice.business || {};
  const pageWidth = 612;
  const contentWidth = pageWidth - 100;

  // ── Header band ──────────────────────────────────────────────────────────────
  doc.rect(0, 0, pageWidth, 110).fill(ACCENT);

  // Logo
  const logoSize = 64;
  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, 50, 23, { width: logoSize, height: logoSize });
  }

  // Business info (right side of header)
  const bizX = 300;
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(13);
  doc.text(biz.business_name || 'Your Business', bizX, 28, { width: 260, align: 'right' });
  doc.font('Helvetica').fontSize(9).fillColor('rgba(255,255,255,0.85)');
  let bizY = 46;
  if (biz.owner_name) { doc.text(biz.owner_name, bizX, bizY, { width: 260, align: 'right' }); bizY += 13; }
  if (biz.address) { doc.text(biz.address, bizX, bizY, { width: 260, align: 'right' }); bizY += 13; }
  if (biz.phone) { doc.text(biz.phone, bizX, bizY, { width: 260, align: 'right' }); bizY += 13; }
  if (biz.email) { doc.text(biz.email, bizX, bizY, { width: 260, align: 'right' }); }

  // ── Invoice title + meta ─────────────────────────────────────────────────────
  doc.fillColor(ACCENT).font('Helvetica-Bold').fontSize(22);
  doc.text('INVOICE', 50, 130);

  doc.font('Helvetica').fontSize(10).fillColor(TEXT_MUTED);
  doc.text(`#${invoice.invoice_number}`, 50, 157);

  // Date block (right aligned) — label then value, stacked
  doc.font('Helvetica-Bold').fontSize(8).fillColor(TEXT_MUTED);
  doc.text('DATE', 420, 130, { width: 140, align: 'right' });
  doc.font('Helvetica').fontSize(10).fillColor(TEXT_DARK);
  doc.text(invoice.date, 420, 141, { width: 140, align: 'right' });

  doc.font('Helvetica-Bold').fontSize(8).fillColor(TEXT_MUTED);
  doc.text('DUE DATE', 420, 158, { width: 140, align: 'right' });
  doc.font('Helvetica').fontSize(10).fillColor(TEXT_DARK);
  doc.text(invoice.due_date, 420, 169, { width: 140, align: 'right' });

  // Divider
  doc.moveTo(50, 178).lineTo(562, 178).strokeColor('#e2e8f0').lineWidth(1).stroke();

  // ── Bill To ──────────────────────────────────────────────────────────────────
  doc.rect(50, 188, 220, 14).fill(LIGHT_GRAY);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(TEXT_MUTED);
  doc.text('BILL TO', 55, 191);

  doc.font('Helvetica-Bold').fontSize(11).fillColor(TEXT_DARK);
  doc.text(invoice.client_name, 50, 208);
  doc.font('Helvetica').fontSize(9).fillColor(TEXT_MUTED);
  let clientY = 223;
  if (invoice.client_contact_person) { doc.text(`Attn: ${invoice.client_contact_person}`, 50, clientY); clientY += 13; }
  if (invoice.client_email) { doc.text(invoice.client_email, 50, clientY); clientY += 13; }
  if (invoice.client_address) { doc.text(invoice.client_address, 50, clientY); clientY += 13; }

  // ── Line items table ─────────────────────────────────────────────────────────
  const tableTop = 290;

  // Table header background
  doc.rect(50, tableTop, contentWidth, 20).fill(ACCENT);
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff');
  doc.text('DESCRIPTION', 58, tableTop + 6, { width: 240 });
  doc.text('HRS', 300, tableTop + 6, { width: 60, align: 'right' });
  doc.text('RATE', 368, tableTop + 6, { width: 80, align: 'right' });
  doc.text('AMOUNT', 454, tableTop + 6, { width: 90, align: 'right' });

  // Rows
  let y = tableTop + 20;
  let total = 0;
  doc.font('Helvetica').fontSize(9).fillColor(TEXT_DARK);

  for (let i = 0; i < invoice.items.length; i++) {
    const item = invoice.items[i];
    if (i % 2 === 1) {
      doc.rect(50, y, contentWidth, 20).fill(LIGHT_GRAY);
    }
    doc.fillColor(TEXT_DARK);
    doc.text(item.description, 58, y + 6, { width: 234 });
    doc.text(String(item.quantity), 300, y + 6, { width: 60, align: 'right' });
    doc.text(`$${item.rate.toFixed(2)}`, 368, y + 6, { width: 80, align: 'right' });
    doc.text(`$${item.amount.toFixed(2)}`, 454, y + 6, { width: 90, align: 'right' });
    total += item.amount;
    y += 20;
  }

  // ── Total ────────────────────────────────────────────────────────────────────
  const totalBoxY = y + 10;
  doc.rect(370, totalBoxY, 192, 28).fill(ACCENT);
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#ffffff');
  doc.text('TOTAL', 378, totalBoxY + 8, { width: 80 });
  doc.text(`$${total.toFixed(2)}`, 378, totalBoxY + 8, { width: 176, align: 'right' });

  // ── Notes ────────────────────────────────────────────────────────────────────
  if (invoice.notes) {
    const notesY = totalBoxY + 50;
    doc.rect(50, notesY, contentWidth, 14).fill(LIGHT_GRAY);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(TEXT_MUTED).text('NOTES', 55, notesY + 3);
    doc.font('Helvetica').fontSize(9).fillColor(TEXT_DARK).text(invoice.notes, 50, notesY + 20, { width: contentWidth });
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  doc.moveTo(50, 720).lineTo(562, 720).strokeColor('#e2e8f0').lineWidth(1).stroke();
  doc.font('Helvetica').fontSize(8).fillColor(TEXT_MUTED);
  doc.text('Thank you for your business.', 50, 726, { width: contentWidth, align: 'center' });

  doc.end();
  return doc;
}
